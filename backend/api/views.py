from django.shortcuts import render
from rest_framework import viewsets, permissions
from .serializers import *
from .models import *
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView # Para login JWT
from rest_framework.decorators import action
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from .permissions import IsAdminOrDPO, IsDPOOrManager, IsAdminOrReadOnly # Vamos criar estas permissões

# View para o login JWT
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# ViewSet para o modelo User
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('email')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated] # Usuário deve estar autenticado para acessar

    def get_permissions(self):
        # Permissões mais granulares:
        # Apenas administradores podem criar, atualizar ou deletar usuários.
        # Todos autenticados podem ver a lista de usuários.
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminOrDPO] # Assumindo que apenas admins podem gerenciar usuários
        elif self.action in ['list', 'retrieve']:
            self.permission_classes = [permissions.IsAuthenticated] # Todos autenticados podem listar/ver detalhes
        return super().get_permissions()

    # Sobrescreve o método perform_create para definir a senha do usuário
    def perform_create(self, serializer):
        serializer.save()
        

    # Sobrescreve o método perform_update para definir a senha do usuário
    def perform_update(self, serializer):
        serializer.save()
        

# ViewSet para gerenciar o checklist da LGPD
class ChecklistViewSet(viewsets.ModelViewSet):
    queryset = Checklist.objects.all().order_by('id')
    serializer_class = ChecklistSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Esta função controla as permissões de acesso para cada ação da API
    def get_permissions(self):
        # Permite que Administradores e DPOs criem, alterem e excluam itens
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminOrDPO]
        # Para visualização (list) e leitura de um item específico (retrieve),
        # qualquer usuário autenticado pode acessar
        elif self.action in ['list', 'retrieve']:
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()

# ViewSet para InventarioDados
class InventarioDadosViewSet(viewsets.ModelViewSet):
    queryset = InventarioDados.objects.all().order_by('-data_criacao')
    serializer_class = InventarioDadosSerializer
    permission_classes = [permissions.IsAuthenticated, IsDPOOrManager] # Permissões para DPO e Gerente

    def perform_create(self, serializer):
        # Automaticamente define o usuário que criou o registro
        serializer.save(criado_por=self.request.user)

# ViewSet para MatrizRisco
class MatrizRiscoViewSet(viewsets.ModelViewSet):
    queryset = MatrizRisco.objects.all().order_by('-data_criacao')
    serializer_class = MatrizRiscoSerializer
    permission_classes = [permissions.IsAuthenticated, IsDPOOrManager]

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

# ViewSet para PlanoAcao
class PlanoAcaoViewSet(viewsets.ModelViewSet):
    queryset = PlanoAcao.objects.all().order_by('data_limite')
    serializer_class = PlanoAcaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsDPOOrManager]

    def perform_create(self, serializer):
        # Responsável pode ser setado manualmente ou via request.user dependendo da lógica
        # Por enquanto, mantemos a lógica de salvamento padrão, mas você pode modificar aqui
        # para que o responsável seja o usuário logado se for o caso
        serializer.save(responsavel=self.request.user) # responsavel deve vir no request.data

# ViewSet para ExigenciaLGPD
class ExigenciaLGPDViewSet(viewsets.ModelViewSet):
    queryset = ExigenciaLGPD.objects.all().order_by('titulo')
    serializer_class = ExigenciaLGPDSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDPO] # Apenas Admin e DPO gerenciam exigências

    def perform_create(self, serializer):
        # Automaticamente define o usuário que fez o upload
        serializer.save(upload_por=self.request.user)

    # Action para download do arquivo
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download(self, request, pk=None):
        instance = self.get_object()
        if instance.arquivo_comprovacao:
            file_path = instance.arquivo_comprovacao.path
            if file_path:
                try:
                    return FileResponse(open(file_path, 'rb'), filename=instance.arquivo_comprovacao.name, as_attachment=True)
                except FileNotFoundError:
                    raise Http404("Arquivo não encontrado.")
            else:
                return Response({'detail': 'Nenhum arquivo anexado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Nenhum arquivo anexado.'}, status=status.HTTP_404_NOT_FOUND)