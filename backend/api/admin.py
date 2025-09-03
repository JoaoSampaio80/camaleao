from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin # Importa o UserAdmin base
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.translation import gettext_lazy as _
from django.shortcuts import redirect
from django.urls import reverse

from .models import (User, Checklist, InventarioDados, MatrizRisco, PlanoAcao, ExigenciaLGPD, )

class UserCreationFormEmail(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        # inclua aqui só os campos que quer pedir na criação via admin
        fields = ("email", "role", "is_staff", "is_active")


class UserChangeFormEmail(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = ("email", "first_name", "last_name", "phone_number",
                  "appointment_date", "appointment_validity", "role",
                  "is_active", "is_staff", "is_superuser", "groups", "user_permissions")

# Admin personalizado para o seu modelo User
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

    # organização dos campos na edição
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Informações pessoais"), {
            "fields": ("first_name", "last_name", "phone_number", "avatar")
        }),
        (_("DPO"), {
            "fields": ("appointment_date", "appointment_validity")
        }),
        (_("Permissões"), {
            "fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")
        }),
        (_("Datas importantes"), {"fields": ("last_login", "date_joined")}),
    )

    # campos na criação (note password1/password2)
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "role", "is_staff", "is_active"),
        }),
    )
    # Garante que 'password2' esteja disponível no form de adição para confirmação de senha
    # (Você pode precisar de um formulário de usuário personalizado para isso)
    # No entanto, para fins de admin, Django geralmente gerencia a senha.

# Registra o modelo User com o seu Admin personalizado


@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = ('atividade', 'descricao', 'is_completed', 'created_at', 'updated_at')
    list_filter = ('atividade', 'is_completed')
    search_fields = ('atividade',)

# Registra os outros modelos
@admin.register(InventarioDados)
class InventarioDadosAdmin(admin.ModelAdmin):
    # Colunas na listagem
    list_display = (
        'processo_negocio', 'unidade', 'setor', 'tipo_dado',
        'formato', 'controlador_operador', 'criado_por', 'data_criacao',
    )
    # Filtros laterais
    list_filter = (
        'unidade', 'tipo_dado', 'formato', 'impresso',
        'dados_menores', 'controlador_operador',
        'transferencia_terceiros', 'transferencia_internacional',
        'adequado_contratualmente', 'criado_por',
    )
    # Busca
    search_fields = (
        'processo_negocio', 'setor', 'responsavel_email',
        'empresa_terceira', 'paises_tratamento',
    )
    # Otimizações
    raw_id_fields = ('criado_por',)
    date_hierarchy = "data_criacao"
    list_select_related = ("criado_por",)
    ordering = ('-data_criacao',)

    # Campos somente leitura
    readonly_fields = ('data_criacao', 'data_atualizacao')

    # Formulário organizado por etapas
    fieldsets = (
        (_("Metadados"), {
            "fields": ("criado_por", "data_criacao", "data_atualizacao"),
        }),
        (_("Etapa 1 — Contexto e Coleta"), {
            "fields": (
                "unidade", "setor", "responsavel_email", "processo_negocio",
                "finalidade", "dados_pessoais", "tipo_dado", "origem",
                "formato", "impresso", "titulares", "dados_menores", "base_legal",
            )
        }),
        (_("Etapa 2 — Armazenamento, Retenção e Transferências"), {
            "fields": (
                "pessoas_acesso", "atualizacoes", "transmissao_interna", "transmissao_externa",
                "local_armazenamento_digital", "controlador_operador", "motivo_retencao",
                "periodo_retencao", "exclusao", "forma_exclusao",
                "transferencia_terceiros", "quais_dados_transferidos",
                "transferencia_internacional", "empresa_terceira",
            )
        }),
        (_("Etapa 3 — Segurança e Observações"), {
            "fields": (
                "adequado_contratualmente", "paises_tratamento",
                "medidas_seguranca", "consentimentos", "observacao",
            )
        }),
    )

@admin.register(MatrizRisco)
class MatrizRiscoAdmin(admin.ModelAdmin):
    list_display = ('processo_afetado', 'descricao_risco', 'probabilidade', 'impacto', 'nivel_risco', 'criado_por', 'data_criacao')
    list_filter = ('probabilidade', 'impacto', 'nivel_risco', 'criado_por')
    search_fields = ('descricao_risco', 'processo_afetado__processo_negocio')
    raw_id_fields = ('processo_afetado', 'criado_por',)
    date_hierarchy = "data_criacao"
    list_select_related = ("criado_por",)

@admin.register(PlanoAcao)
class PlanoAcaoAdmin(admin.ModelAdmin):
    list_display = ('risco', 'acao_mitigacao', 'responsavel', 'data_limite', 'status', 'data_criacao')
    list_filter = ('status', 'responsavel', 'data_limite')
    search_fields = ('acao_mitigacao', 'risco__descricao_risco')
    raw_id_fields = ('risco', 'responsavel',)
    date_hierarchy = "data_criacao"
    list_select_related = ("responsavel", "risco")

@admin.register(ExigenciaLGPD)
class ExigenciaLGPDAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'artigos_referencia', 'upload_por', 'data_upload', 'arquivo_comprovacao')
    list_filter = ('upload_por', 'data_upload')
    search_fields = ('titulo', 'descricao', 'artigos_referencia')
    raw_id_fields = ('upload_por',)
    date_hierarchy = "data_upload"
    list_select_related = ("upload_por",)