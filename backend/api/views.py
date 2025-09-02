from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.http import FileResponse, Http404
from django.db import transaction

from .serializers import (
    MyTokenObtainPairSerializer, UserSerializer, ChecklistSerializer,
    InventarioDadosSerializer, MatrizRiscoSerializer, PlanoAcaoSerializer,
    ExigenciaLGPDSerializer
)
from .models import User, Checklist, InventarioDados, MatrizRisco, PlanoAcao, ExigenciaLGPD
from .permissions import IsRoleAdmin, IsAdminOrDPO, IsDPOOrManager

try:
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.exceptions import TokenError
    SIMPLEJWT_BLACKLIST_AVAILABLE = True
except Exception:
    SIMPLEJWT_BLACKLIST_AVAILABLE = False

# View para o login JWT
class MyTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = MyTokenObtainPairSerializer

# ViewSet para o modelo User
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    queryset = User.objects.none()

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='dpo'
    )
    def dpo(self, request):
        user = User.objects.filter(role__iexact='dpo').order_by('id').first()
        if not user:
            return Response({'detail': 'DPO não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        data = self.get_serializer(user, context={'request': request}).data
        return Response(data)

    def get_queryset(self):
        user = self.request.user
        if not (user and user.is_authenticated):
            return User.objects.none()

        # admin vê todos
        if user.is_superuser or getattr(user, 'role', '') == 'admin':
            qs = User.objects.all().order_by('email')
            q = self.request.query_params.get('q')  # ex.: ?q=joao
            if q:
                from django.db.models import Q
                qs = qs.filter(
                    Q(email__icontains=q) |
                    Q(first_name__icontains=q) |
                    Q(last_name__icontains=q)
                )
            return qs

        # não-admin:
        if self.action == 'list':
            return User.objects.none()            # não expõe diretório de usuários
        if self.action == 'retrieve':
            return User.objects.filter(pk=user.pk)  # só o próprio
        return User.objects.none()

    def get_permissions(self):
        # apenas admin pode criar/editar/apagar/listar
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'list']:
            return [IsRoleAdmin()]
        # retrieve e actions custom (me): autenticado
        return [permissions.IsAuthenticated()]

    # Sobrescreve o método perform_create para definir a senha do usuário
    def perform_create(self, serializer):
        serializer.save()
        

    # Sobrescreve o método perform_update para definir a senha do usuário
    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({'detail': 'Você não pode excluir a si mesmo.'},
                            status=status.HTTP_400_BAD_REQUEST)
        # (opcional) limpar avatar do storage antes de apagar o usuário
        if getattr(user, 'avatar', None):
            user.avatar.delete(save=False)
        return super().destroy(request, *args, **kwargs)

    # GET /users/me/ -> dados do próprio usuário
    @action(
        detail=False, 
        methods=['get', 'patch'], 
        permission_classes=[permissions.IsAuthenticated], 
        url_path='me', 
        parser_classes=[JSONParser, MultiPartParser, FormParser],
    )
    def me(self, request):
        user = request.user

        if request.method.lower() == 'get':
            serializer = self.get_serializer(user, context={'request': request})
            return Response(serializer.data)

        # Delega tudo ao serializer (avatar, remove_avatar, current_password/password, etc.)
        serializer = self.get_serializer(
            instance=user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        # Detecta se haverá troca de senha antes de salvar
        password_changed = bool(serializer.validated_data.get('password'))

        with transaction.atomic():
            serializer.save()

        # Blacklist opcional do refresh token ao trocar senha
        if password_changed and SIMPLEJWT_BLACKLIST_AVAILABLE:
            raw_refresh = request.data.get('refresh')
            if raw_refresh:
                try:
                    RefreshToken(raw_refresh).blacklist()
                except TokenError:
                    # token inválido/expirado/ausente -> ignore
                    pass

        data_out = self.get_serializer(user, context={'request': request}).data
        data_out['reauth_required'] = bool(password_changed)
        return Response(data_out, status=status.HTTP_200_OK)        
    
# ViewSet para gerenciar o checklist da LGPD
class ChecklistViewSet(viewsets.ModelViewSet):
    queryset = Checklist.objects.all().order_by('id')
    serializer_class = ChecklistSerializer    

    # Esta função controla as permissões de acesso para cada ação da API
    def get_permissions(self):
        # Permite que Administradores e DPOs criem, alterem e excluam itens
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrDPO()]  # admin ou dpo
        return [permissions.IsAuthenticated()]  # leitura para autenticados

# ViewSet para InventarioDados
class InventarioDadosViewSet(viewsets.ModelViewSet):
    queryset = InventarioDados.objects.all().order_by('-data_criacao')
    serializer_class = InventarioDadosSerializer
    permission_classes = [IsDPOOrManager] # Permissões para DPO e Gerente

    def perform_create(self, serializer):
        # Automaticamente define o usuário que criou o registro
        serializer.save(criado_por=self.request.user)

# ViewSet para MatrizRisco
class MatrizRiscoViewSet(viewsets.ModelViewSet):
    queryset = MatrizRisco.objects.all().order_by('-data_criacao')
    serializer_class = MatrizRiscoSerializer
    permission_classes = [IsDPOOrManager]

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

# ViewSet para PlanoAcao
class PlanoAcaoViewSet(viewsets.ModelViewSet):
    queryset = PlanoAcao.objects.all().order_by('data_limite')
    serializer_class = PlanoAcaoSerializer
    permission_classes = [IsDPOOrManager]

    def perform_create(self, serializer):
        # Responsável pode ser setado manualmente ou via request.user dependendo da lógica
        # Por enquanto, mantemos a lógica de salvamento padrão, mas você pode modificar aqui
        # para que o responsável seja o usuário logado se for o caso
        # Se quiser permitir enviar 'responsavel' no corpo, troque para:
        # serializer.save(responsavel=self.request.data.get('responsavel', self.request.user))
        serializer.save(responsavel=self.request.user) # responsavel deve vir no request.data

# ViewSet para ExigenciaLGPD
class ExigenciaLGPDViewSet(viewsets.ModelViewSet):
    queryset = ExigenciaLGPD.objects.all().order_by('titulo')
    serializer_class = ExigenciaLGPDSerializer
    
    # leitura para autenticados; escrita só admin/dpo
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrDPO()]
        # leitura
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        # Automaticamente define o usuário que fez o upload
        serializer.save(upload_por=self.request.user)

    # Action para download do arquivo
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download(self, request, pk=None):
        instance = self.get_object()
        if instance.arquivo_comprovacao:
            try:
                return FileResponse(
                    open(instance.arquivo_comprovacao.path, 'rb'),
                    filename=instance.arquivo_comprovacao.name,
                    as_attachment=True
                )
            except FileNotFoundError:
                raise Http404("Arquivo não encontrado.")
        return Response({'detail': 'Nenhum arquivo anexado.'}, status=status.HTTP_404_NOT_FOUND)