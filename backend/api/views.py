from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.http import FileResponse, Http404, HttpResponse
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from zoneinfo import ZoneInfo
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle


from .serializers import (
    MyTokenObtainPairSerializer, UserSerializer, ChecklistSerializer,
    InventarioDadosSerializer, MatrizRiscoSerializer, PlanoAcaoSerializer,
    ExigenciaLGPDSerializer
)
from .models import User, Checklist, InventarioDados, MatrizRisco, PlanoAcao, ExigenciaLGPD
from .permissions import IsRoleAdmin, IsAdminOrDPO, IsDPOOrManager, SimpleRolePermission
from .pagination import DefaultPagination

import csv
import datetime

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
    lookup_value_regex = r'\d+'
    queryset = (
        InventarioDados.objects
        .select_related('criado_por')      # evita N+1 no autor
        .order_by('-data_criacao')         # default
    )
    serializer_class = InventarioDadosSerializer
    permission_classes = [SimpleRolePermission]
    pagination_class = DefaultPagination

    # Campo que identifica o "dono" do registro (para escopo 'own')
    OWN_FIELD = 'criado_por'

    # Regras por ação e papel:
    # - Admin & DPO: CRUD total
    # - Gerente: listar/ver/criar; editar apenas os próprios; NUNCA excluir
    ROLE_PERMS = {
        'list':            {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
        'retrieve':        {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
        'create':          {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
        'update':          {'admin': 'any', 'dpo': 'any', 'gerente': 'own'},
        'partial_update':  {'admin': 'any', 'dpo': 'any', 'gerente': 'own'},
        'destroy':         {'admin': 'any', 'dpo': 'any', 'gerente': None},
        'export_csv':      {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
        'export_xlsx':     {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
        'export_pdf':      {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
    }

    # Busca e ordenação no backend (DRF)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'unidade',
        'setor',
        'responsavel_email',
        'processo_negocio',
        'finalidade', 
        'dados_pessoais',
    ]
    ordering_fields = [
        'id',
        'unidade',
        'setor',
        'responsavel_email',
        'processo_negocio',
        'data_criacao',
    ]
    ordering = ['-data_criacao']  # default (reforço)

    filterset_fields = {
        'unidade': ['exact', 'icontains'],
        'setor': ['exact', 'icontains'],
        'responsavel_email': ['exact', 'icontains'],
        'processo_negocio': ['exact', 'icontains'],
        'controlador_operador': ['exact'],
        'impresso': ['exact'],
        'dados_menores': ['exact'],
        'transferencia_terceiros': ['exact'],
        'transferencia_internacional': ['exact'],
        'tipo_dado': ['exact'],
        'formato': ['exact'],
        'adequado_contratualmente': ['exact'],
    }

    SIMPLE_FILTERS = {
        'unidade': 'unidade',
        'setor': 'setor',
        'responsavel_email': 'responsavel_email',
        'processo_negocio': 'processo_negocio',
        'controlador_operador': 'controlador_operador',
        'impresso': 'impresso',
        'dados_menores': 'dados_menores',
        'transferencia_terceiros': 'transferencia_terceiros',
        'transferencia_internacional': 'transferencia_internacional',
        'tipo_dado': 'tipo_dado',
        'formato': 'formato',
        'adequado_contratualmente': 'adequado_contratualmente',
    }

    def get_queryset(self):
        qs = super().get_queryset()

        # aplica “escopo” por papel/ação (admin/dpo = any; gerente = own para update/partial_update)
        user = self.request.user
        role = getattr(user, 'role', '') or ''
        action = getattr(self, 'action', 'list')
        scope = self.ROLE_PERMS.get(action, {}).get(role) or self.ROLE_PERMS.get(action, {}).get('admin')

        if scope == 'own':
            qs = qs.filter(**{self.OWN_FIELD: user})

        # filtros exatos pelos query params
        params = self.request.query_params
        for qp, field in self.SIMPLE_FILTERS.items():
            v = params.get(qp)
            if v is None or v == '':
                continue
            if field in {
                'impresso',
                'dados_menores',
                'transferencia_terceiros', 
                'transferencia_internacional', 
                'adequado_contratualmente'
            }:
                # normaliza 'sim'/'nao' -> True/False
                v = str(v).strip().lower()
                if v in ('true', '1', 'sim', 'yes'): 
                    v = True
                elif v in ('false', '0', 'nao', 'não', 'no'): 
                    v = False
                else: 
                    continue
            qs = qs.filter(**{field: v})

        return qs

    def perform_create(self, serializer):
        # Define automaticamente quem criou
        serializer.save(criado_por=self.request.user)

    def _export_cols_and_rows(self, qs):
        """Reaproveita cabeçalhos e formatação (bool/data) para todos os formatos."""
        cols = [
            ('id', 'ID'),
            ('unidade', 'Unidade'),
            ('setor', 'Setor'),
            ('responsavel_email', 'Responsável (E-mail)'),
            ('processo_negocio', 'Processo de Negócio'),
            ('finalidade', 'Finalidade'),
            ('dados_pessoais', 'Dados Pessoais'),
            ('tipo_dado', 'Tipo de Dado'),
            ('origem', 'Origem'),
            ('formato', 'Formato'),
            ('impresso', 'Impresso'),
            ('titulares', 'Titulares'),
            ('dados_menores', 'Dados de menores'),
            ('base_legal', 'Base Legal'),
            ('pessoas_acesso', 'Pessoas com Acesso'),
            ('atualizacoes', 'Atualizações (Quando)'),
            ('transmissao_interna', 'Transmissão Interna'),
            ('transmissao_externa', 'Transmissão Externa'),
            ('local_armazenamento_digital', 'Local Armazenamento (Digital)'),
            ('controlador_operador', 'Controlador/Operador'),
            ('motivo_retencao', 'Motivo Retenção'),
            ('periodo_retencao', 'Período Retenção'),
            ('exclusao', 'Exclusão'),
            ('forma_exclusao', 'Forma Exclusão'),
            ('transferencia_terceiros', 'Transf. a Terceiros'),
            ('quais_dados_transferidos', 'Quais Dados Transferidos'),
            ('transferencia_internacional', 'Transf. Internacional'),
            ('empresa_terceira', 'Empresa Terceira'),
            ('adequado_contratualmente', 'Adequado Contratualmente'),
            ('paises_tratamento', 'Países Tratamento'),
            ('medidas_seguranca', 'Medidas de Segurança'),
            ('consentimentos', 'Consentimentos'),
            ('observacao', 'Observação'),
            ('criado_por', 'Criado por (email)'),
            ('data_criacao', 'Data Criação'),
            ('data_atualizacao', 'Última Atualização'),
        ]

        br_tz = ZoneInfo("America/Sao_Paulo")
        rows = []
        for obj in qs.iterator():
            row = []
            for field, _ in cols:
                if field == 'criado_por':
                    val = getattr(getattr(obj, 'criado_por', None), 'email', '') or ''
                else:
                    val = getattr(obj, field, '')

                if isinstance(val, bool):
                    val = 'Sim' if val else 'Não'
                elif isinstance(val, datetime.datetime):
                    if timezone.is_naive(val):
                        val = timezone.make_aware(val, timezone.get_default_timezone())
                    val = timezone.localtime(val, br_tz).strftime('%d/%m/%Y %H:%M')
                elif isinstance(val, datetime.date):
                    val = val.strftime('%d/%m/%Y')
                row.append(val if val is not None else '')
            rows.append(row)
        return cols, rows
    
    @staticmethod
    def _timestamp_br():
        br_tz = ZoneInfo("America/Sao_Paulo")
        dt = timezone.localtime(timezone.now(), timezone=br_tz)
        return f"{dt.day:02d}-{dt.month:02d}-{dt.year}_{dt.hour:02d}h{dt.minute:02d}min"

    @action(detail=False, methods=['get'], url_path=r'export/csv')
    def export_csv(self, request):
        qs = self.filter_queryset(self.get_queryset())
        cols, rows = self._export_cols_and_rows(qs)
        headers = [label for _, label in cols]

        file_name = f"inventarios-{self._timestamp_br()}.csv"
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = f"attachment; filename*=UTF-8''{file_name}; filename=\"{file_name}\""
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        resp.write('\ufeff')  # BOM para Excel abrir acentos certinho

        writer = csv.writer(resp, lineterminator='\n')
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return resp

    @action(detail=False, methods=['get'], url_path=r'export/xlsx')
    def export_xlsx(self, request):
        qs = self.filter_queryset(self.get_queryset())
        cols, rows = self._export_cols_and_rows(qs)
        headers = [label for _, label in cols]

        output = BytesIO()
        wb = Workbook()
        ws = wb.active
        ws.title = "Inventários"

        header_font = Font(bold=True)
        fill = PatternFill(start_color="E6F0FF", end_color="E6F0FF", fill_type="solid")
        for c, label in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=c, value=label)
            cell.font = header_font
            cell.fill = fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for r, row in enumerate(rows, start=2):
            for c, val in enumerate(row, start=1):
                ws.cell(row=r, column=c, value=val)

        for col_idx, label in enumerate(headers, start=1):
            width = max(10, min(50, len(str(label)) + 2))
            ws.column_dimensions[get_column_letter(col_idx)].width = width

        wb.save(output)
        output.seek(0)

        file_name = f"inventarios-{self._timestamp_br()}.xlsx"
        resp = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        resp['Content-Disposition'] = f"attachment; filename*=UTF-8''{file_name}; filename=\"{file_name}\""
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp

    @action(detail=False, methods=['get'], url_path=r'export/pdf')
    def export_pdf(self, request):
        qs = self.filter_queryset(self.get_queryset())
        cols, rows = self._export_cols_and_rows(qs)
        headers = [label for _, label in cols]

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=18, rightMargin=18, topMargin=24, bottomMargin=24
        )

        data = [headers] + rows
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E6F0FF")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
            ('FONTSIZE', (0,1), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))

        doc.build([table])
        pdf_bytes = buffer.getvalue()
        buffer.close()

        file_name = f"inventarios-{self._timestamp_br()}.pdf"
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f"attachment; filename*=UTF-8''{file_name}; filename=\"{file_name}\""
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp   

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