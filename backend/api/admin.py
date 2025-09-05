from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.translation import gettext_lazy as _
from django.urls import path
from django.shortcuts import redirect
from django.utils.html import format_html

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
                    'tipo_controle', 'criado_em')
    list_filter = ('setor', 'risco_residual', 'tipo_controle', 'probabilidade', 'impacto')
    search_fields = ('matriz_filial', 'setor', 'processo', 'risco_fator')    
    date_hierarchy = 'criado_em'
    readonly_fields = ('pontuacao',)
    autocomplete_fields = ('probabilidade','impacto','eficacia')
    inlines = [ActionPlanInline]

    # Botão “Adicionar plano” na página do risco
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<int:risk_id>/add-plan/', self.admin_site.admin_view(self.add_plan_redirect),
                 name='risk-add-plan'),
        ]
        return custom + urls

    def add_plan_link(self, obj):
        url = f"{obj.id}/add-plan/"
        return format_html('<a class="button" href="{}">Adicionar Plano</a>', url)
    add_plan_link.short_description = "Ações"

    def add_plan_redirect(self, request, risk_id: int):
        return redirect(f"/admin/{ActionPlan._meta.app_label}/{ActionPlan._meta.model_name}/add/?risco={risk_id}")

@admin.register(ActionPlan)
class ActionPlanAdmin(admin.ModelAdmin):
    list_display = ('risco', 'matriz_filial', 'setor_proprietario', 'processo',
                    'descricao', 'responsavel_execucao', 'prazo', 'status')
    list_filter = ('status', 'prazo')
    # busca pelo campo do relacionado (Risk.risco_fator):
    search_fields = ('risco__risco_fator', 'descricao', 'responsavel_execucao')
    raw_id_fields = ('risco',)
    date_hierarchy = "prazo"
    # REMOVE o list_select_related de campo que não é FK:
    list_select_related = ("risco",)

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