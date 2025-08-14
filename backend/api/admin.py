from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin # Importa o UserAdmin base
from .models import *

# Admin personalizado para o seu modelo User
class CustomUserAdmin(BaseUserAdmin):
    # Campos a serem exibidos na lista de usuários no admin
    list_display = ('email', 'role', 'job_title', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('email', 'job_title')
    ordering = ('email',)

    # Define os fieldsets para organizar os campos na página de edição do usuário
    # Adapte estes fieldsets para incluir todos os campos do seu modelo User
    fieldsets = (
        (None, {'fields': ('email', 'password')}), # Informações de login
        ('Informações Pessoais', {'fields': ('first_name', 'last_name', 'phone_number', 'job_title', 'appointment_date', 'appointment_validity')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'role', 'groups', 'user_permissions')}),
        ('Datas Importantes', {'fields': ('last_login', 'date_joined')}),
    )
    # Se você definiu 'username = None' no seu models.py e removeu-o de REQUIRED_FIELDS,
    # você pode precisar ajustar os fieldsets e o add_fieldsets para refletir isso.
    # Para o propósito inicial, manter o username no fieldset é seguro.

    # Campos para a página de criação de novo usuário
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'password2', 'role', 'phone_number', 'job_title'),
        }),
    )
    # Garante que 'password2' esteja disponível no form de adição para confirmação de senha
    # (Você pode precisar de um formulário de usuário personalizado para isso)
    # No entanto, para fins de admin, Django geralmente gerencia a senha.

# Registra o modelo User com o seu Admin personalizado
admin.site.register(User, CustomUserAdmin)

# Registra os outros modelos
@admin.register(InventarioDados)
class InventarioDadosAdmin(admin.ModelAdmin):
    list_display = ('nome_processo', 'tipo_dado', 'base_legal', 'criado_por', 'data_criacao')
    list_filter = ('tipo_dado', 'base_legal', 'criado_por')
    search_fields = ('nome_processo', 'finalidade_coleta')
    raw_id_fields = ('criado_por',) # Para facilitar a seleção de usuários em massa

@admin.register(MatrizRisco)
class MatrizRiscoAdmin(admin.ModelAdmin):
    list_display = ('processo_afetado', 'descricao_risco', 'probabilidade', 'impacto', 'nivel_risco', 'criado_por', 'data_criacao')
    list_filter = ('probabilidade', 'impacto', 'nivel_risco', 'criado_por')
    search_fields = ('descricao_risco', 'processo_afetado__nome_processo')
    raw_id_fields = ('processo_afetado', 'criado_por',)

@admin.register(PlanoAcao)
class PlanoAcaoAdmin(admin.ModelAdmin):
    list_display = ('risco', 'acao_mitigacao', 'responsavel', 'data_limite', 'status', 'data_criacao')
    list_filter = ('status', 'responsavel', 'data_limite')
    search_fields = ('acao_mitigacao', 'risco__descricao_risco')
    raw_id_fields = ('risco', 'responsavel',)

@admin.register(ExigenciaLGPD)
class ExigenciaLGPDAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'artigos_referencia', 'upload_por', 'data_upload', 'arquivo_comprovacao')
    list_filter = ('upload_por', 'data_upload')
    search_fields = ('titulo', 'descricao', 'artigos_referencia')
    raw_id_fields = ('upload_por',)
@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = ('atividade', 'descricao', 'is_completed', 'created_at', 'updated_at')
    list_filter = ('atividade', 'is_completed')
    search_fields = ('atividade',)
    
