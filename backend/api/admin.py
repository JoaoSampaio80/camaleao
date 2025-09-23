# backend/api/admin.py
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.utils.html import format_html
from django import forms

from .utils.email import send_html_email
from .models import (
    User,
    DocumentosLGPD,
    Checklist,
    InventarioDados,
    Risk,
    ActionPlan,
    MonitoringAction,
    Incident,
    LikelihoodItem,
    ImpactItem,
    ControlEffectivenessItem,
    RiskLevelBand,
    Instruction,
)

# ===== User admin =====


class UserCreationFormEmail(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "role", "is_staff", "is_active")


class UserChangeFormEmail(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "appointment_date",
            "appointment_validity",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserCreationFormEmail
    form = UserChangeFormEmail
    model = User

    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active", "is_superuser", "groups")
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            _("Informações pessoais"),
            {"fields": ("first_name", "last_name", "phone_number", "avatar")},
        ),
        (_("DPO"), {"fields": ("appointment_date", "appointment_validity")}),
        (
            _("Permissões"),
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (_("Datas importantes"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "role",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )

    actions = ["reenviar_boas_vindas"]

    @admin.action(description="Reenviar e-mail de boas-vindas")
    def reenviar_boas_vindas(self, request, queryset):
        enviados = 0
        for u in queryset:
            if not u.email:
                continue
            ctx = {
                "first_name": (getattr(u, "first_name", "") or None),
                "username": (getattr(u, "username", "") or None),
            }
            sent = send_html_email(
                subject="Bem-vindo(a) ao Camaleão",
                to_email=u.email,
                template_name="emails/welcome",
                context=ctx,
            )
            enviados += int(bool(sent))
        self.message_user(request, f"E-mails enviados: {enviados}", level=messages.INFO)


@admin.register(DocumentosLGPD)
class DocumentosLGPDAdmin(admin.ModelAdmin):
    list_display = (
        "atividade_short",
        "dimensao",
        "criticidade",
        "status",
        "proxima_revisao",
        "has_arquivo",
        "created_at",
        "updated_at",
    )
    list_filter = ("dimensao", "criticidade", "status", "proxima_revisao", "created_at")
    search_fields = ("atividade", "base_legal", "evidencia", "comentarios")
    readonly_fields = ("criado_por", "created_at", "updated_at")  # <- travado
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_per_page = 25

    fieldsets = (
        (
            "Informações principais",
            {"fields": ("dimensao", "atividade", "base_legal", "evidencia")},
        ),
        ("Revisão e comentários", {"fields": ("proxima_revisao", "comentarios")}),
        ("Status", {"fields": ("criticidade", "status")}),
        ("Anexo", {"fields": ("arquivo",)}),
        (
            "Auditoria",
            {
                "fields": (
                    "criado_por",
                    "created_at",
                    "updated_at",
                )  # aparece, mas bloqueado
            },
        ),
    )

    def atividade_short(self, obj):
        text = obj.atividade or ""
        return (text[:80] + "…") if len(text) > 80 else text

    atividade_short.short_description = "Atividade"

    def has_arquivo(self, obj):
        return bool(obj.arquivo)

    has_arquivo.boolean = True
    has_arquivo.short_description = "Arquivo?"

    def save_model(self, request, obj, form, change):
        # Preenche automaticamente no create e não permite edição manual
        if not change and not obj.criado_por_id:
            obj.criado_por = request.user
        super().save_model(request, obj, form, change)


# ===== Checklist =====
@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = (
        "atividade",
        "descricao",
        "is_completed",
        "created_at",
        "updated_at",
    )
    list_filter = ("atividade", "is_completed")
    search_fields = ("atividade",)


# ===== Inventário =====
@admin.register(InventarioDados)
class InventarioDadosAdmin(admin.ModelAdmin):
    list_display = (
        "processo_negocio",
        "unidade",
        "setor",
        "tipo_dado",
        "formato",
        "controlador_operador",
        "criado_por",
        "data_criacao",
    )
    list_filter = (
        "unidade",
        "tipo_dado",
        "formato",
        "impresso",
        "dados_menores",
        "controlador_operador",
        "transferencia_terceiros",
        "transferencia_internacional",
        "adequado_contratualmente",
        "criado_por",
    )
    search_fields = (
        "processo_negocio",
        "setor",
        "responsavel_email",
        "empresa_terceira",
        "paises_tratamento",
    )
    raw_id_fields = ("criado_por",)
    date_hierarchy = "data_criacao"
    list_select_related = ("criado_por",)
    ordering = ("-data_criacao",)
    readonly_fields = ("data_criacao", "data_atualizacao")

    fieldsets = (
        (
            _("Metadados"),
            {"fields": ("criado_por", "data_criacao", "data_atualizacao")},
        ),
        (
            _("Etapa 1 — Contexto e Coleta"),
            {
                "fields": (
                    "unidade",
                    "setor",
                    "responsavel_email",
                    "processo_negocio",
                    "finalidade",
                    "dados_pessoais",
                    "tipo_dado",
                    "origem",
                    "formato",
                    "impresso",
                    "titulares",
                    "dados_menores",
                    "base_legal",
                )
            },
        ),
        (
            _("Etapa 2 — Armazenamento, Retenção e Transferências"),
            {
                "fields": (
                    "pessoas_acesso",
                    "atualizacoes",
                    "transmissao_interna",
                    "transmissao_externa",
                    "local_armazenamento_digital",
                    "controlador_operador",
                    "motivo_retencao",
                    "periodo_retencao",
                    "exclusao",
                    "forma_exclusao",
                    "transferencia_terceiros",
                    "quais_dados_transferidos",
                    "transferencia_internacional",
                    "empresa_terceira",
                )
            },
        ),
        (
            _("Etapa 3 — Segurança e Observações"),
            {
                "fields": (
                    "adequado_contratualmente",
                    "paises_tratamento",
                    "medidas_seguranca",
                    "consentimentos",
                    "observacao",
                )
            },
        ),
    )


# ===== Parametrizações =====
@admin.register(LikelihoodItem)
class LikelihoodItemAdmin(admin.ModelAdmin):
    list_display = ("value", "label_pt")
    search_fields = ("label_pt",)


@admin.register(ImpactItem)
class ImpactItemAdmin(admin.ModelAdmin):
    list_display = ("value", "label_pt")
    search_fields = ("label_pt",)


@admin.register(ControlEffectivenessItem)
class ControlEffectivenessItemAdmin(admin.ModelAdmin):
    list_display = ("value", "label_pt", "reduction_min", "reduction_max")
    search_fields = ("label_pt",)


@admin.register(RiskLevelBand)
class RiskLevelBandAdmin(admin.ModelAdmin):
    list_display = ("name", "min_score", "max_score", "color")
    search_fields = ("name",)


@admin.register(Instruction)
class InstructionAdmin(admin.ModelAdmin):
    list_display = ("title", "updated_at")
    search_fields = ("title",)


# ===== Risco & Ação =====
class ActionPlanInline(admin.TabularInline):
    model = ActionPlan
    extra = 1
    fields = (
        "matriz_filial",
        "setor_proprietario",
        "processo",
        "descricao",
        "como",
        "responsavel_execucao",
        "prazo",
        "status",
    )
    show_change_link = True


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "matriz_filial",
        "setor",
        "processo",
        "risco_fator",
        "probabilidade",
        "impacto",
        "pontuacao",
        "medidas_controle",
        "risco_residual",
        "tipo_controle",
        "criado_em",
        "add_plano_acao",
    )
    list_filter = (
        "setor",
        "risco_residual",
        "tipo_controle",
        "probabilidade",
        "impacto",
    )
    search_fields = ("matriz_filial", "setor", "processo", "risco_fator")
    date_hierarchy = "criado_em"
    readonly_fields = ("pontuacao",)
    autocomplete_fields = ("probabilidade", "impacto", "eficacia")
    inlines = [ActionPlanInline]
    list_display_links = ("id", "matriz_filial")

    def add_plano_acao(self, obj):
        url = reverse("admin:api_actionplan_add") + f"?risco={obj.id}"
        return format_html('<a class="button" href="{}">➕ Plano</a>', url)

    add_plano_acao.short_description = "Novo Plano"


class ActionPlanAdminForm(forms.ModelForm):
    # (mantido igual ao que você tinha, sem alterações funcionais)
    risco_display = forms.CharField(
        label="Risco",
        required=False,
        disabled=True,
        widget=forms.Textarea(
            attrs={
                "rows": 3,
                "style": "width:100%; resize:vertical; white-space:pre-wrap; overflow:auto;",
            }
        ),
    )
    matriz_display = forms.CharField(
        label="Matriz/Filial", required=False, disabled=True
    )
    setor_display = forms.CharField(
        label="Setor proprietário", required=False, disabled=True
    )
    processo_display = forms.CharField(label="Processo", required=False, disabled=True)

    class Meta:
        model = ActionPlan
        fields = [
            "risco_display",
            "matriz_display",
            "setor_display",
            "processo_display",
            "risco",
            "matriz_filial",
            "setor_proprietario",
            "processo",
            "descricao",
            "como",
            "responsavel_execucao",
            "prazo",
            "status",
        ]


@admin.register(ActionPlan)
class ActionPlanAdmin(admin.ModelAdmin):
    form = ActionPlanAdminForm
    list_display = (
        "risco",
        "matriz_filial",
        "setor_proprietario",
        "processo",
        "descricao",
        "responsavel_execucao",
        "prazo",
        "status",
    )
    list_filter = ("status", "prazo")
    search_fields = ("risco__risco_fator", "descricao", "responsavel_execucao")
    autocomplete_fields = ("risco",)
    date_hierarchy = "prazo"
    list_select_related = ("risco",)

    # (resto igual ao seu: get_form, save_model, etc.)
    def get_form(self, request, obj=None, **kwargs):
        from .models import Risk

        base_form_class = super().get_form(request, obj, **kwargs)
        is_add = obj is None
        risco_id = request.GET.get("risco")

        class FormWithInitials(base_form_class):
            def __init__(self, *args, **kw):
                initial = dict(kw.get("initial") or {})
                r = None
                if is_add and risco_id:
                    try:
                        r = Risk.objects.get(pk=risco_id)
                    except Risk.DoesNotExist:
                        r = None

                    initial.setdefault(
                        "risco_display", (str(r) if r else f"#{risco_id}")
                    )
                    if r:
                        initial.setdefault("matriz_display", r.matriz_filial or "")
                        initial.setdefault("setor_display", r.setor or "")
                        initial.setdefault("processo_display", r.processo or "")
                    initial.setdefault("risco", risco_id)
                    if r:
                        initial.setdefault("matriz_filial", r.matriz_filial or "")
                        initial.setdefault("setor_proprietario", r.setor or "")
                        initial.setdefault("processo", r.processo or "")

                kw["initial"] = initial
                super().__init__(*args, **kw)

                if "descricao" in self.fields:
                    self.fields["descricao"].widget.attrs["autofocus"] = "autofocus"

                if is_add and risco_id:
                    for real in (
                        "risco",
                        "matriz_filial",
                        "setor_proprietario",
                        "processo",
                    ):
                        if real in self.fields:
                            self.fields[real].widget = forms.HiddenInput()
                else:
                    for disp in (
                        "risco_display",
                        "matriz_display",
                        "setor_display",
                        "processo_display",
                    ):
                        if disp in self.fields:
                            self.fields[disp].widget = forms.HiddenInput()

        return FormWithInitials

    def save_model(self, request, obj, form, change):
        if not change:
            risco_id = request.GET.get("risco")
            if risco_id:
                try:
                    obj.risco_id = int(risco_id)
                except ValueError:
                    pass
                r = getattr(obj, "risco", None)
                if r:
                    obj.matriz_filial = obj.matriz_filial or (r.matriz_filial or "")
                    obj.setor_proprietario = obj.setor_proprietario or (r.setor or "")
                    obj.processo = obj.processo or (r.processo or "")
        super().save_model(request, obj, form, change)


# ===== Monitoramento & Incidentes =====
@admin.register(MonitoringAction)
class MonitoringActionAdmin(admin.ModelAdmin):
    list_display = ("id", "framework_requisito", "data_monitoramento", "responsavel")
    search_fields = ("framework_requisito", "responsavel")
    date_hierarchy = "data_monitoramento"


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = (
        "numero_registro",
        "fonte",
        "data_registro",
        "responsavel_analise",
        "data_encerramento",
        "fonte_informada",
    )
    search_fields = ("numero_registro", "descricao", "fonte", "responsavel_analise")
    list_filter = ("fonte_informada",)
    date_hierarchy = "data_registro"
