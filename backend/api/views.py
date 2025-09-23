from django.shortcuts import render
from django.db.models import Q
from rest_framework import viewsets, permissions
from .serializers import *
from .models import *
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView # Para login JWT
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from .permissions import IsAdminOrDPO, IsAdminOrDPOOrManagerLimited, IsAdminOrReadOnly # Vamos criar estas permissões
from .utils import criar_notificacao
from django.utils.timezone import now


# View para o login JWT
class MyTokenObtainPairView(TokenObtainPairView):
    pass


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('email')
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminOrDPOOrManagerLimited]
        else:
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()


class InventarioDadosViewSet(viewsets.ModelViewSet):
    queryset = InventarioDados.objects.all().order_by('-data_criacao')
    serializer_class = InventarioDadosSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDPOOrManagerLimited]

    def perform_create(self, serializer):
        instance = serializer.save(criado_por=self.request.user)

        criar_notificacao(
            tipo='InventarioDados',
            mensagem=f'Novo Inventário criado por {self.request.user.email}',
            gerado_por=self.request.user,
            objeto_referencia=f"InventarioDados:{instance.id}",
            data_evento=instance.data_criacao
        )

    def perform_update(self, serializer):
        inventario = self.get_object()
        if self.request.user.role == 'manager' and inventario.criado_por != self.request.user:
            raise PermissionDenied("Gerentes só podem editar inventários que criaram.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        inventario = self.get_object()
        if request.user.role == 'manager':
            raise PermissionDenied("Gerentes não podem excluir inventários diretamente. Solicite a exclusão.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def solicitar_exclusao(self, request, pk=None):
        inventario = self.get_object()

        if request.user.role != 'manager':
            return Response(
                {"detail": "Apenas gerentes podem solicitar exclusão."},
                status=status.HTTP_403_FORBIDDEN
            )

        if inventario.criado_por != request.user:
            return Response(
                {"detail": "Você só pode solicitar exclusão de inventários que você criou."},
                status=status.HTTP_403_FORBIDDEN
            )

        criar_notificacao(
            tipo='solicitacao_exclusao',
            mensagem=f'{request.user.email} solicitou a exclusão do Inventário de Dados #{inventario.id}.',
            gerado_por=request.user,
            objeto_referencia=f"InventarioDados:{inventario.id}",
            data_evento=now().date()
        )

        return Response({"detail": "Solicitação de exclusão enviada ao DPO/Admin."}, status=status.HTTP_200_OK)


class MatrizRiscoViewSet(viewsets.ModelViewSet):
    queryset = MatrizRisco.objects.all().order_by('-data_criacao')
    serializer_class = MatrizRiscoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDPOOrManagerLimited]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return self.queryset.filter(Q(criado_por=user) | Q(criado_por__isnull=True))
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role == 'manager' and instance.criado_por != request.user:
            criar_notificacao(
                tipo='SolicitacaoExclusao',
                mensagem=f'{request.user.email} solicitou exclusão da Matriz de Risco.',
                gerado_por=request.user,
                objeto_referencia=f'MatrizRisco:{instance.id}'
            )
            return Response({'detail': 'Solicitação de exclusão enviada ao DPO.'}, status=202)
        return super().destroy(request, *args, **kwargs)


class PlanoAcaoViewSet(viewsets.ModelViewSet):
    queryset = PlanoAcao.objects.all().order_by('data_limite')
    serializer_class = PlanoAcaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDPOOrManagerLimited]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return self.queryset.filter(Q(responsavel=user) | Q(criado_por=user))
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role == 'manager' and instance.criado_por != request.user:
            criar_notificacao(
                tipo='SolicitacaoExclusao',
                mensagem=f'{request.user.email} solicitou exclusão do Plano de Ação.',
                gerado_por=request.user,
                objeto_referencia=f'PlanoAcao:{instance.id}'
            )
            return Response({'detail': 'Solicitação de exclusão enviada ao DPO.'}, status=202)
        return super().destroy(request, *args, **kwargs)


class ExigenciasLGPDViewSet(viewsets.ModelViewSet):
    queryset = ExigenciasLGPD.objects.all().order_by('atividade')
    serializer_class = ExigenciasLGPDSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDPOOrManagerLimited]

    def perform_create(self, serializer):
        serializer.save(upload_por=self.request.user)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download(self, request, pk=None):
        instance = self.get_object()
        if instance.arquivo_comprovacao:
            try:
                return FileResponse(open(instance.arquivo_comprovacao.path, 'rb'),
                                    filename=instance.arquivo_comprovacao.name,
                                    as_attachment=True)
            except FileNotFoundError:
                raise Http404("Arquivo não encontrado.")
        return Response({'detail': 'Nenhum arquivo anexado.'}, status=404)


class NotificacaoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notificacao.objects.all().order_by('-data_criacao')
    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDPOOrManagerLimited]

    def get_queryset(self):
        return self.queryset.exclude(lida_por=self.request.user)

    @action(detail=True, methods=['post'])
    def marcar_lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida_por.add(request.user)
        return Response({'status': 'Notificação marcada como lida.'})