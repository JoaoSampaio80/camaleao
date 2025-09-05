from rest_framework import status
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.views import APIView
from django.http import FileResponse, Http404, HttpResponse
from django.db import transaction
from django.db.models import Count, F, Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from zoneinfo import ZoneInfo
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, PageBreak, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus.doctemplate import LayoutError
from xml.sax.saxutils import escape
from collections import Counter


from .serializers import (
    MyTokenObtainPairSerializer, UserSerializer, ChecklistSerializer,
    InventarioDadosSerializer, RiskSerializer, ActionPlanSerializer, MonitoringActionSerializer, IncidentSerializer,
    ExigenciaLGPDSerializer
)
from .models import User, Checklist, InventarioDados, Risk, ActionPlan, MonitoringAction, Incident, ExigenciaLGPD
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

        # Mapeamento de campos (reutiliza a mesma ordem dos outros exports)
        field_map = [
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

        # Estilos
        styles = getSampleStyleSheet()
        title_style = styles['Heading3']
        title_style.spaceAfter = 6

        label_style = ParagraphStyle(
            'Label',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            spaceAfter=0,
            spaceBefore=0,
        )
        value_style = ParagraphStyle(
            'Value',
            parent=styles['Normal'],
            fontSize=9,
            leading=11,
            spaceAfter=0,
            spaceBefore=0,
        )

        # Helpers de formatação        
        br_tz = ZoneInfo("America/Sao_Paulo")

        def fmt_val(v):
            if isinstance(v, bool):
                return 'Sim' if v else 'Não'
            if isinstance(v, datetime.datetime):
                if timezone.is_naive(v):
                    v = timezone.make_aware(v, timezone.get_default_timezone())
                return timezone.localtime(v, br_tz).strftime('%d/%m/%Y %H:%M')
            if isinstance(v, datetime.date):
                return v.strftime('%d/%m/%Y')
            return '' if v is None else str(v)

        # Montagem do PDF (cartões)
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=18, rightMargin=18, topMargin=24, bottomMargin=24
        )

        story = []
        from reportlab.platypus import Table, TableStyle
        from reportlab.lib import colors

        # Larguras: (Label, Value, Label, Value)
        col_widths = [90, 300, 110, 300]  # ~800pt úteis em A4 paisagem com margens

        for idx, obj in enumerate(qs.iterator(), start=1):
            # Título do cartão
            titulo = f"Inventário #{getattr(obj, 'id', '')}"
            subtitulo_bits = []
            if getattr(obj, 'unidade', ''): subtitulo_bits.append(str(obj.unidade))
            if getattr(obj, 'setor', ''): subtitulo_bits.append(str(obj.setor))
            if subtitulo_bits:
                titulo += f" — {' / '.join(subtitulo_bits)}"

            story.append(Paragraph(escape(titulo), title_style))
            story.append(Spacer(1, 4))

            # Constrói pares (label, value)
            pairs = []
            for field, label in field_map:
                if field == 'criado_por':
                    v = getattr(getattr(obj, 'criado_por', None), 'email', '') or ''
                else:
                    v = getattr(obj, field, '')
                pairs.append((
                    Paragraph(escape(label), label_style),
                    Paragraph(escape(fmt_val(v)).replace('\n', '<br/>'), value_style),
                ))

            # Converte para linhas com 2 pares por linha -> 4 colunas
            data = []
            it = iter(pairs)
            for p in it:
                row = [p[0], p[1]]  # label, value
                try:
                    p2 = next(it)
                    row.extend([p2[0], p2[1]])
                except StopIteration:
                    # linha ímpar: completa com vazio
                    row.extend(['', ''])
                data.append(row)

            table = Table(data, colWidths=col_widths, repeatRows=0)
            table.setStyle(TableStyle([
                # grade fina
                ('GRID', (0,0), (-1,-1), 0.25, colors.grey),

                # rótulos com leve fundo
                ('BACKGROUND', (0,0), (-1,-1), colors.white),
                ('BACKGROUND', (0,0), (-1,-1), colors.white),
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F0F4FF')),
                ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F0F4FF')),

                # alinhamentos & padding
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ALIGN',  (0,0), (-1,-1), 'LEFT'),
                ('LEFTPADDING',  (0,0), (-1,-1), 4),
                ('RIGHTPADDING', (0,0), (-1,-1), 4),
                ('TOPPADDING',   (0,0), (-1,-1), 2),
                ('BOTTOMPADDING',(0,0), (-1,-1), 2),

                # quebra de linha até para palavras longas
                ('WORDWRAP', (0,0), (-1,-1), 'CJK'),
            ]))

            story.append(table)

            # página nova por registro (mais legível)
            story.append(PageBreak())

        # Remove o último PageBreak se existir
        if story and isinstance(story[-1], PageBreak):
            story.pop()

        doc.build(story)

        # Nome do arquivo “03-09-2025_16h33min”
        dt_now = timezone.localtime(timezone.now(), timezone=br_tz)
        ts = f"{dt_now.day:02d}-{dt_now.month:02d}-{dt_now.year}_{dt_now.hour:02d}h{dt_now.minute:02d}min"
        file_name = f"inventarios-{ts}.pdf"

        pdf_bytes = buffer.getvalue()
        buffer.close()

        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f"attachment; filename*=UTF-8''{file_name}; filename=\"{file_name}\""
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp

   

# ViewSet para MatrizRisco
class RiskViewSet(viewsets.ModelViewSet):
    queryset = Risk.objects.all().select_related("probabilidade", "impacto", "eficacia")
    serializer_class = RiskSerializer
    permission_classes = [IsDPOOrManager]

    # filtros/busca/ordenação padrão
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "matriz_filial": ["exact", "icontains"],
        "setor": ["exact", "icontains"],
        "processo": ["exact", "icontains"],
        "risco_residual": ["exact"],
        "tipo_controle": ["exact"],
        "probabilidade": ["exact"],
        "impacto": ["exact"],
    }
    search_fields = ["risco_fator", "processo", "setor", "matriz_filial"]
    ordering_fields = ["pontuacao", "criado_em", "atualizado_em"]
    ordering = ["-criado_em"]

    def perform_create(self, serializer):
        # não passar 'criado_por' (o modelo Risk não tem esse campo)
        serializer.save()

    @action(detail=False, methods=["get"])
    def ranking(self, request):
        """
        Lista de riscos ordenada por pontuação (desc).
        Aceita mesmos filtros/busca do list().
        """
        qs = self.filter_queryset(self.get_queryset()).order_by("-pontuacao", "-criado_em")
        data = [
            {
                "id": r.id,
                "matriz_filial": r.matriz_filial,
                "setor": r.setor,
                "processo": r.processo,
                "risco_fator": r.risco_fator,
                "probabilidade": r.probabilidade.value if r.probabilidade_id else None,
                "impacto": r.impacto.value if r.impacto_id else None,
                "pontuacao": r.pontuacao,
                "risco_residual": r.risco_residual,
            }
            for r in qs
        ]
        return Response(data)

    @action(detail=False, methods=["get"])
    def heatmap(self, request):
        """
        Buckets de contagem por (probabilidade x impacto).
        Retorna: {"buckets": {"1-1": 0, "1-2": 3, ...}}
        """
        buckets = {}
        qs = self.filter_queryset(self.get_queryset())
        for r in qs:
            if not (r.probabilidade_id and r.impacto_id):
                continue
            key = f"{r.probabilidade.value}-{r.impacto.value}"
            buckets[key] = buckets.get(key, 0) + 1
        return Response({"buckets": buckets})
    
    @action(detail=False, methods=['get'], url_path=r'export/xlsx')
    def export_xlsx(self, request):
        qs = self.filter_queryset(self.get_queryset()).order_by('setor', '-pontuacao', 'processo')

        # Cabeçalhos no padrão da planilha “Avaliação de Riscos”
        headers = [
            "ID", "Matriz/Filial", "Setores", "Processo de Negócio Envolvido",
            "Risco e Fator de Risco", "Probabilidade (1-5)", "Impacto (1-5)",
            "Pontuação do Risco", "Medidas de Controle", "Tipo Controle (C/D)",
            "Eficácia do Controle (rótulo)", "Risco Residual", "Resposta ao Risco",
            "Criado em", "Atualizado em",
        ]

        # monta linhas
        br_tz = ZoneInfo("America/Sao_Paulo")
        rows = []
        for r in qs.iterator():
            criado = timezone.localtime(r.criado_em, br_tz).strftime('%d/%m/%Y %H:%M') if r.criado_em else ""
            atualizado = timezone.localtime(r.atualizado_em, br_tz).strftime('%d/%m/%Y %H:%M') if r.atualizado_em else ""
            existe = "Sim" if bool((r.medidas_controle or "").strip()) else "Não"
            rows.append([
                r.id,
                r.matriz_filial,
                r.setor,
                r.processo,
                r.risco_fator,
                getattr(getattr(r, 'probabilidade', None), 'value', None),
                getattr(getattr(r, 'impacto', None), 'value', None),
                r.pontuacao,
                r.medidas_controle or "",
                existe,
                r.tipo_controle or "",
                getattr(getattr(r, 'eficacia', None), 'label_pt', None) or "",
                r.risco_residual,
                r.resposta_risco or "",
                criado,
                atualizado,
            ])

        # escreve XLSX
        output = BytesIO()
        wb = Workbook()
        ws = wb.active
        ws.title = "Avaliação de Riscos"

        header_font = Font(bold=True)
        fill = PatternFill(start_color="FFF4CC", end_color="FFF4CC", fill_type="solid")
        for c, label in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=c, value=label)
            cell.font = header_font
            cell.fill = fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for r_idx, row in enumerate(rows, start=2):
            for c_idx, val in enumerate(row, start=1):
                ws.cell(row=r_idx, column=c_idx, value=val)

        for col_idx, label in enumerate(headers, start=1):
            width = max(10, min(60, len(str(label)) + 2))
            ws.column_dimensions[get_column_letter(col_idx)].width = width

        wb.save(output); output.seek(0)

        # nome do arquivo
        dt = timezone.localtime(timezone.now(), timezone=br_tz)
        file_name = f"avaliacao-riscos_{dt:%d-%m-%Y_%Hh%Mmin}.xlsx"

        resp = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        resp['Content-Disposition'] = f"attachment; filename*=UTF-8''{file_name}; filename=\"{file_name}\""
        resp['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp

    @action(detail=False, methods=['get'], url_path=r'stats/by-band')
    def stats_by_band(self, request):
        """
        Contagem por faixa de risco residual (baixo/medio/alto/critico).
        """
        qs = self.filter_queryset(self.get_queryset())
        counter = Counter((r.risco_residual or '').lower() for r in qs)
        data = {
            "baixo": counter.get("baixo", 0),
            "medio": counter.get("medio", 0),
            "alto": counter.get("alto", 0),
            "critico": counter.get("critico", 0),
        }
        return Response(data)

# ViewSet para PlanoAcao
class ActionPlanViewSet(viewsets.ModelViewSet):
    queryset = ActionPlan.objects.all().select_related("risco")
    serializer_class = ActionPlanSerializer
    permission_classes = [IsDPOOrManager]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "status": ["exact"],
        "setor_proprietario": ["exact", "icontains"],
        "matriz_filial": ["exact", "icontains"],
        "risco": ["exact"],
    }
    search_fields = ["descricao", "responsavel_execucao", "processo", "risco__risco_fator"]
    ordering_fields = ["prazo", "id"]
    ordering = ["prazo"]

    def perform_create(self, serializer):
        # NÃO passar 'responsavel' (não existe no modelo). Deixe o payload popular 'responsavel_execucao'.
        serializer.save()

    @action(detail=False, methods=['get'], url_path=r'stats/overdue')
    def stats_overdue(self, request):
        """
        Planos atrasados (não concluídos e com prazo < hoje).
        """
        today = timezone.localdate()
        qs = self.filter_queryset(self.get_queryset()).filter(
            status__in=["nao_iniciado", "andamento"],
            prazo__lt=today,
        ).select_related("risco")

        items = []
        for ap in qs:
            dias = (today - ap.prazo).days
            items.append({
                "id": ap.id,
                "risco_id": ap.risco_id,
                "risco_risco_fator": getattr(ap.risco, "risco_fator", ""),
                "setor_proprietario": ap.setor_proprietario,
                "prazo": ap.prazo.strftime("%Y-%m-%d"),
                "dias_atraso": dias,
                "status": ap.status,
            })

        return Response({"count": len(items), "items": items})

class MonitoringActionViewSet(viewsets.ModelViewSet):
    queryset = MonitoringAction.objects.all()
    serializer_class = MonitoringActionSerializer
    permission_classes = [IsDPOOrManager]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["framework_requisito", "responsavel", "escopo"]
    ordering_fields = ["data_monitoramento", "data_conclusao", "id"]
    ordering = ["-data_monitoramento"]

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer
    permission_classes = [IsDPOOrManager]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["descricao", "fonte", "responsavel_analise", "decisoes_resolucao"]
    ordering_fields = ["data_registro", "data_encerramento", "numero_registro"]
    ordering = ["-data_registro"]

class RiskConfigView(APIView):
    """
    Retorna a parametrização usada pela Matriz de Riscos.
    GET /risk-config/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import LikelihoodItem, ImpactItem, ControlEffectivenessItem, RiskLevelBand, Instruction
        from .serializers import (
            LikelihoodItemSerializer, ImpactItemSerializer,
            ControlEffectivenessItemSerializer, RiskLevelBandSerializer,
            InstructionSerializer
        )
        likelihood = LikelihoodItem.objects.all().order_by("value")
        impact = ImpactItem.objects.all().order_by("value")
        effectiveness = ControlEffectivenessItem.objects.all().order_by("value")
        bands = RiskLevelBand.objects.all().order_by("min_score")
        instructions = Instruction.objects.all().order_by("updated_at")

        data = {
            "likelihood": LikelihoodItemSerializer(likelihood, many=True).data,
            "impact": ImpactItemSerializer(impact, many=True).data,
            "effectiveness": ControlEffectivenessItemSerializer(effectiveness, many=True).data,
            "bands": RiskLevelBandSerializer(bands, many=True).data,
            "instructions": InstructionSerializer(instructions, many=True).data,
        }
        return Response(data)