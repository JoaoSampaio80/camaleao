from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.translation import gettext_lazy as _
from django.urls import path
from django.shortcuts import redirect
from django.utils.html import format_html
from django.urls import reverse
from django import forms

from .models import (
    # seus modelos
    User, Checklist, InventarioDados, ExigenciaLGPD,
    # risco e cia
    Risk, ActionPlan, MonitoringAction, Incident,
    # parametrização
    LikelihoodItem, ImpactItem, ControlEffectivenessItem, RiskLevelBand, Instruction
)

class UserCreationFormEmail(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "role", "is_staff", "is_active")

class UserChangeFormEmail(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = ("email", "first_name", "last_name", "phone_number",
                  "appointment_date", "appointment_validity", "role",
                  "is_active", "is_staff", "is_superuser", "groups", "user_permissions")

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
        (_("Informações pessoais"), {"fields": ("first_name", "last_name", "phone_number", "avatar")}),
        (_("DPO"), {"fields": ("appointment_date", "appointment_validity")}),
        (_("Permissões"), {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Datas importantes"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "role", "is_staff", "is_active"),
        }),
    )

@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = ('atividade', 'descricao', 'is_completed', 'created_at', 'updated_at')
    list_filter = ('atividade', 'is_completed')
    search_fields = ('atividade',)

@admin.register(InventarioDados)
class InventarioDadosAdmin(admin.ModelAdmin):
    list_display = ('processo_negocio', 'unidade', 'setor', 'tipo_dado',
                    'formato', 'controlador_operador', 'criado_por', 'data_criacao')
    list_filter = ('unidade', 'tipo_dado', 'formato', 'impresso', 'dados_menores',
                   'controlador_operador', 'transferencia_terceiros', 'transferencia_internacional',
                   'adequado_contratualmente', 'criado_por')
    search_fields = ('processo_negocio', 'setor', 'responsavel_email', 'empresa_terceira', 'paises_tratamento')
    raw_id_fields = ('criado_por',)
    date_hierarchy = "data_criacao"
    list_select_related = ("criado_por",)
    ordering = ('-data_criacao',)
    readonly_fields = ('data_criacao', 'data_atualizacao')

    fieldsets = (
        (_("Metadados"), {"fields": ("criado_por", "data_criacao", "data_atualizacao")}),
        (_("Etapa 1 — Contexto e Coleta"), {
            "fields": ("unidade", "setor", "responsavel_email", "processo_negocio",
                       "finalidade", "dados_pessoais", "tipo_dado", "origem",
                       "formato", "impresso", "titulares", "dados_menores", "base_legal")
        }),
        (_("Etapa 2 — Armazenamento, Retenção e Transferências"), {
            "fields": ("pessoas_acesso", "atualizacoes", "transmissao_interna", "transmissao_externa",
                       "local_armazenamento_digital", "controlador_operador", "motivo_retencao",
                       "periodo_retencao", "exclusao", "forma_exclusao",
                       "transferencia_terceiros", "quais_dados_transferidos",
                       "transferencia_internacional", "empresa_terceira")
        }),
        (_("Etapa 3 — Segurança e Observações"), {
            "fields": ("adequado_contratualmente", "paises_tratamento",
                       "medidas_seguranca", "consentimentos", "observacao")
        }),
    )

@admin.register(ExigenciaLGPD)
class ExigenciaLGPDAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'artigos_referencia', 'upload_por', 'data_upload', 'arquivo_comprovacao')
    list_filter = ('upload_por', 'data_upload')
    search_fields = ('titulo', 'descricao', 'artigos_referencia')
    raw_id_fields = ('upload_por',)
    date_hierarchy = "data_upload"
    list_select_related = ("upload_por",)

@admin.register(LikelihoodItem)
class LikelihoodItemAdmin(admin.ModelAdmin):
    list_display = ('value', 'label_pt')
    search_fields = ('label_pt',)

@admin.register(ImpactItem)
class ImpactItemAdmin(admin.ModelAdmin):
    list_display = ('value', 'label_pt')
    search_fields = ('label_pt',)

@admin.register(ControlEffectivenessItem)
class ControlEffectivenessItemAdmin(admin.ModelAdmin):
    list_display = ('value', 'label_pt', 'reduction_min', 'reduction_max')
    search_fields = ('label_pt',)

@admin.register(RiskLevelBand)
class RiskLevelBandAdmin(admin.ModelAdmin):
    list_display = ('name', 'min_score', 'max_score', 'color')
    search_fields = ('name',)

@admin.register(Instruction)
class InstructionAdmin(admin.ModelAdmin):
    list_display = ('title', 'updated_at')
    search_fields = ('title',)

class ActionPlanInline(admin.TabularInline):
    model = ActionPlan
    extra = 1
    fields = ("matriz_filial","setor_proprietario","processo","descricao","como",
              "responsavel_execucao","prazo","status")
    show_change_link = True


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ('id', 'matriz_filial', 'setor', 'processo', 'risco_fator',
                    'probabilidade', 'impacto', 'pontuacao', 'medidas_controle', 'risco_residual',
                    'tipo_controle', 'criado_em', 'add_plano_acao',)
    list_filter = ('setor', 'risco_residual', 'tipo_controle', 'probabilidade', 'impacto')
    search_fields = ('matriz_filial', 'setor', 'processo', 'risco_fator')    
    date_hierarchy = 'criado_em'
    readonly_fields = ('pontuacao',)
    autocomplete_fields = ('probabilidade','impacto','eficacia')
    inlines = [ActionPlanInline]
    list_display_links = ('id', 'matriz_filial')
        
    def add_plano_acao(self, obj):
        """
        Botão que abre a tela de criação de ActionPlan já com o risco pré-selecionado (?risco=<id>).
        """
        url = reverse('admin:api_actionplan_add') + f'?risco={obj.id}'
        return format_html('<a class="button" href="{}">➕ Plano</a>', url)
    add_plano_acao.short_description = "Novo Plano"

class ActionPlanAdminForm(forms.ModelForm):
    # Campos só para exibição (não-modelo)
    risco_display = forms.CharField(
        label="Risco",
        required=False,
        disabled=True,
        widget=forms.Textarea(attrs={
            "rows": 3,
            "style": "width:100%; resize:vertical; white-space:pre-wrap; overflow:auto;",
        })
    )
    matriz_display = forms.CharField(
        label="Matriz/Filial",
        required=False,
        disabled=True,
        widget=forms.TextInput(attrs={"style": "width:100%;"})
    )
    setor_display = forms.CharField(
        label="Setor proprietário",
        required=False,
        disabled=True,
        widget=forms.TextInput(attrs={"style": "width:100%;"})
    )
    processo_display = forms.CharField(
        label="Processo",
        required=False,
        disabled=True,
        widget=forms.TextInput(attrs={"style": "width:100%;"})
    )

    class Meta:
        model = ActionPlan
        fields = [
            # displays primeiro
            "risco_display",
            "matriz_display", "setor_display", "processo_display",
            # campos reais (serão hidden no ADD via ?risco=)
            "risco", "matriz_filial", "setor_proprietario", "processo",
            # editáveis
            "descricao", "como", "responsavel_execucao", "prazo", "status",
        ]

@admin.register(ActionPlan)
class ActionPlanAdmin(admin.ModelAdmin):
    form = ActionPlanAdminForm

    list_display = ('risco', 'matriz_filial', 'setor_proprietario', 'processo',
                    'descricao', 'responsavel_execucao', 'prazo', 'status')
    list_filter = ('status', 'prazo')
    search_fields = ('risco__risco_fator', 'descricao', 'responsavel_execucao')
    autocomplete_fields = ('risco',)  # ok; no ADD vamos esconder widget
    date_hierarchy = "prazo"
    list_select_related = ("risco",)

    fieldsets = (
        ("Referências do Risco", {
            "fields": (
                # exibição
                "risco_display",
                "matriz_display", "setor_display", "processo_display",
                # reais (hidden no ADD)
                "risco", "matriz_filial", "setor_proprietario", "processo",
            )
        }),
        ("Execução do Plano", {
            "fields": (
                "descricao",
                "como",
                "responsavel_execucao",
                "prazo",
                "status",
            )
        }),
    )

    def get_form(self, request, obj=None, **kwargs):
        """
        No ADD com ?risco=<id>:
          - Preenche displays com dados do Risk
          - Esconde campos reais com HiddenInput + initial
          - Foco em 'descricao'
        Na edição: mostra campos reais normalmente e oculta os displays.
        """
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

                    # Iniciais para displays
                    initial.setdefault("risco_display", (str(r) if r else f"#{risco_id}"))
                    if r:
                        initial.setdefault("matriz_display", r.matriz_filial or "")
                        initial.setdefault("setor_display", r.setor or "")
                        initial.setdefault("processo_display", r.processo or "")
                    # Iniciais para campos reais (irão hidden)
                    initial.setdefault("risco", risco_id)
                    if r:
                        initial.setdefault("matriz_filial", r.matriz_filial or "")
                        initial.setdefault("setor_proprietario", r.setor or "")
                        initial.setdefault("processo", r.processo or "")

                kw["initial"] = initial
                super().__init__(*args, **kw)

                # Foco em 'descricao'
                if "descricao" in self.fields:
                    self.fields["descricao"].widget.attrs["autofocus"] = "autofocus"

                if is_add and risco_id:
                    # esconder campos reais (mas enviar no POST)
                    for real in ("risco", "matriz_filial", "setor_proprietario", "processo"):
                        if real in self.fields:
                            self.fields[real].widget = forms.HiddenInput()
                else:
                    # em edição: esconder os displays
                    for disp in ("risco_display", "matriz_display", "setor_display", "processo_display"):
                        if disp in self.fields:
                            self.fields[disp].widget = forms.HiddenInput()

        return FormWithInitials

    def save_model(self, request, obj, form, change):
        """
        Segurança: no ADD com ?risco=<id> força vínculo e garante cópia dos campos
        mesmo que o browser não envie (e.g., se mexer no HTML).
        """
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

@admin.register(MonitoringAction)
class MonitoringActionAdmin(admin.ModelAdmin):
    list_display = ("id", "framework_requisito", "data_monitoramento", "responsavel")
    search_fields = ("framework_requisito", "responsavel")
    date_hierarchy = "data_monitoramento"

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("numero_registro", "fonte", "data_registro", "responsavel_analise",
                    "data_encerramento", "fonte_informada")
    search_fields = ("numero_registro", "descricao", "fonte", "responsavel_analise")
    list_filter = ("fonte_informada",)
    date_hierarchy = "data_registro"