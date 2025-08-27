from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from django.http import FileResponse, Http404

from .serializers import (
    MyTokenObtainPairSerializer, UserSerializer, ChecklistSerializer,
    InventarioDadosSerializer, MatrizRiscoSerializer, PlanoAcaoSerializer,
    ExigenciaLGPDSerializer
)
from .models import User, Checklist, InventarioDados, MatrizRisco, PlanoAcao, ExigenciaLGPD
from .permissions import IsRoleAdmin, IsAdminOrDPO, IsDPOOrManager

# View para o login JWT
class MyTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = MyTokenObtainPairSerializer

# ViewSet para o modelo User
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if not (user and user.is_authenticated):
            return User.objects.none()

        # admin vê todos
        if user.is_superuser or getattr(user, 'role', '') == 'admin':
            return User.objects.all().order_by('email')

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

    # GET /users/me/ -> dados do próprio usuário
    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated], url_path='me')
    def me(self, request):
        user = request.user

        if request.method.lower() == 'get':
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        ALLOWED_FIELDS = {
            'first_name',
            'last_name',
            'phone_number',            
            'appointment_date',
            'appointment_validity',
            'password',  # UserSerializer.update já faz set_password()
            'current_password', # current_password só para verificação
        }
        FORBIDDEN_FIELDS = {
            'role', 'is_staff', 'is_superuser', 'groups', 'user_permissions',
            'last_login', 'date_joined', 'id', 'pk',
            'email',  # permitir troca de e-mail? remova daqui e adicione em ALLOWED_FIELDS
        }

        # bloqueia se vier campo proibido
        bad = FORBIDDEN_FIELDS.intersection(request.data.keys())
        if bad:
            return Response(
                {'detail': f'Campo(s) não permitido(s): {", ".join(sorted(bad))}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # mantém só campos permitidos
        data = {k: v for k, v in request.data.items() if k in ALLOWED_FIELDS}

        def _clean(v):
            if isinstance(v, str):
                v = v.strip()
                return None if v == '' else v
            return v

        cleaned = {k: _clean(v) for k, v in data.items()}

        # se estiver tentando trocar senha, exigir current_password correto
        if cleaned.get('password') is not None:
            current = cleaned.get('current_password')
            if not current:
                return Response({'current_password': 'Obrigatória para trocar a senha.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(current):
                return Response({'current_password': 'Senha atual incorreta.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # datas vazias devem virar None (model permite null/blank)
        for k in ('appointment_date', 'appointment_validity'):
            if k in cleaned and (cleaned[k] == '' or cleaned[k] is None):
                cleaned[k] = None

        # não persistir current_password
        cleaned.pop('current_password', None)

        # se nada útil sobrou
        if not any(v is not None for v in cleaned.values()):
            return Response({'detail': 'Nenhum campo permitido para atualizar.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance=user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
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