from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Modelo de usuário personalizado para o sistema LGPD.
    Define os papéis (admin, dpo, gerente) e campos adicionais.
    """
    # Sobrescreve o campo email para garantir que seja único e não nulo
    email = models.EmailField(unique=True, blank=False, null=False)

    # Campos adicionais para o usuário
    phone_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Telefone")
    job_title = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cargo")
    appointment_date = models.DateField(blank=True, null=True, verbose_name="Data de Nomeação")
    appointment_validity = models.DateField(blank=True, null=True, verbose_name="Validade da Nomeação")

    # Campo para definir o papel do usuário (Admin, DPO, Gerente)
    USER_ROLES = (
        ('admin', 'Administrador'),
        ('dpo', 'DPO'),
        ('gerente', 'Gerente'),
    )
    role = models.CharField(max_length=20, choices=USER_ROLES, default='gerente', verbose_name="Função do Usuário")

    # Define o campo de login para ser o email
    USERNAME_FIELD = 'email'
    # Remove o username padrão do AbstractUser e o torna opcional,
    # pois estamos usando email como USERNAME_FIELD
    # (Adicione esta linha se quiser que o username possa ser nulo,
    # caso contrário, ele será automaticamente gerado ou não usado se você não o preencher)
    username = None # Descomente esta linha se você não quiser usar o campo username

    # Define os campos requeridos ao criar um superusuário via createsuperuser
    REQUIRED_FIELDS = [] # Mantemos username aqui para o createsuperuser,
                                   # mas ele não será usado para login se USERNAME_FIELD for email.
                                   # Se você quiser que o username seja completamente opcional,
                                   # pode remover 'username' daqui e garantir que o email seja fornecido.

    def __str__(self):
        """Retorna a representação em string do objeto User."""
        return self.email

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

class Checklist(models.Model):
    """
    Modelo para os itens do checklist da LGPD.
    """
    atividade = models.CharField(max_length=255, verbose_name="Atividade")
    descricao = models.TextField(verbose_name="Descrição")
    is_completed = models.BooleanField(default=False, verbose_name="Concluído")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Checklist LGPD"
        verbose_name_plural = "Checklist LGPD"
        ordering = ['created_at']

    def __str__(self):
        return self.atividade
    
class InventarioDados(models.Model):
    """
    Modelo para o formulário de Inventário de Dados.
    Registra informações sobre processos que coletam e usam dados pessoais.
    """
    nome_processo = models.CharField(max_length=255, verbose_name="Nome do Processo")
    tipo_dado = models.CharField(max_length=100, verbose_name="Tipo de Dado Pessoal",
        choices=[
            ('comuns', 'Dados Pessoais Comuns'),
            ('sensíveis', 'Dados Pessoais Sensíveis'),
            ('anonimizados', 'Dados Anonimizados'),
            ('pseudonimizados', 'Dados Pseudonimizados'),
        ]
    )
    finalidade_coleta = models.TextField(verbose_name="Finalidade da Coleta")
    base_legal = models.CharField(max_length=255, verbose_name="Base Legal da LGPD")
    forma_coleta = models.CharField(max_length=255, verbose_name="Forma de Coleta")
    periodo_retencao = models.CharField(max_length=100, verbose_name="Período de Retenção")
    compartilhamento_terceiros = models.BooleanField(default=False, verbose_name="Compartilhamento com Terceiros?")
    nome_terceiro = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nome do Terceiro (se houver)")
    observacoes = models.TextField(blank=True, null=True, verbose_name="Observações Adicionais")

    # Relacionamento com o usuário que criou o registro
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='inventarios_criados', verbose_name="Criado por")
    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    def __str__(self):
        """Retorna o nome do processo como representação em string."""
        return self.nome_processo

    class Meta:
        verbose_name = "Inventário de Dados"
        verbose_name_plural = "Inventários de Dados"
        ordering = ['nome_processo'] # Ordena por nome do processo por padrão


class MatrizRisco(models.Model):
    """
    Modelo para o formulário de Matriz de Risco.
    Avalia riscos associados a processos de tratamento de dados.
    """
    # Relaciona o risco a um registro de inventário de dados
    processo_afetado = models.ForeignKey(InventarioDados, on_delete=models.CASCADE, related_name='riscos', verbose_name="Processo Afetado")

    descricao_risco = models.TextField(verbose_name="Descrição do Risco")
    probabilidade = models.CharField(max_length=50, verbose_name="Probabilidade",
        choices=[
            ('baixa', 'Baixa'),
            ('media', 'Média'),
            ('alta', 'Alta'),
        ]
    )
    impacto = models.CharField(max_length=50, verbose_name="Impacto",
        choices=[
            ('baixo', 'Baixo'),
            ('medio', 'Médio'),
            ('alto', 'Alto'),
        ]
    )
    nivel_risco = models.CharField(max_length=50, blank=True, null=True, verbose_name="Nível de Risco Calculado")
    # Pode ser calculado no backend ou preenchido manualmente

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='riscos_criados', verbose_name="Criado por")
    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    def __str__(self):
        """Retorna a descrição do risco e o processo associado."""
        return f"Risco: {self.descricao_risco[:50]}... (Processo: {self.processo_afetado.nome_processo})"

    class Meta:
        verbose_name = "Matriz de Risco"
        verbose_name_plural = "Matrizes de Risco"
        ordering = ['-data_criacao'] # Ordena por data de criação decrescente


class PlanoAcao(models.Model):
    """
    Modelo para o formulário de Plano de Ação.
    Define ações para mitigar riscos identificados.
    """
    # Relaciona o plano de ação a um risco específico
    risco = models.ForeignKey(MatrizRisco, on_delete=models.CASCADE, related_name='planos_acao', verbose_name="Risco Associado")

    acao_mitigacao = models.TextField(verbose_name="Ação de Mitigação")
    responsavel = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='planos_responsaveis', verbose_name="Responsável pela Ação")
    data_limite = models.DateField(verbose_name="Data Limite para Conclusão")
    status = models.CharField(max_length=50, default='Pendente', verbose_name="Status da Ação",
        choices=[
            ('pendente', 'Pendente'),
            ('em_andamento', 'Em Andamento'),
            ('concluido', 'Concluído'),
            ('cancelado', 'Cancelado'),
        ]
    )
    observacoes = models.TextField(blank=True, null=True, verbose_name="Observações do Plano de Ação")

    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    def __str__(self):
        """Retorna a ação de mitigação e o status."""
        return f"Ação: {self.acao_mitigacao[:50]}... (Status: {self.status})"

    class Meta:
        verbose_name = "Plano de Ação"
        verbose_name_plural = "Planos de Ação"
        ordering = ['data_limite'] # Ordena por data limite


class ExigenciaLGPD(models.Model):
    """
    Modelo para o formulário de Exigências da Lei e Artigos de Referência.
    Permite registrar exigências legais e anexar evidências de cumprimento.
    """
    titulo = models.CharField(max_length=255, verbose_name="Título da Exigência")
    descricao = models.TextField(verbose_name="Descrição Detalhada")
    artigos_referencia = models.CharField(max_length=255, blank=True, null=True, verbose_name="Artigos de Referência (LGPD)")

    # Campo para o upload do arquivo de comprovação
    # Os arquivos serão salvos na pasta definida por MEDIA_ROOT/comprovantes_lgpd/
    arquivo_comprovacao = models.FileField(
        upload_to='comprovantes_lgpd/',
        blank=True,
        null=True,
        verbose_name="Arquivo de Comprovação"
    )

    data_upload = models.DateTimeField(auto_now_add=True, verbose_name="Data de Upload")
    upload_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Upload feito por")
    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    def __str__(self):
        """Retorna o título da exigência."""
        return self.titulo

    class Meta:
        verbose_name = "Exigência da LGPD"
        verbose_name_plural = "Exigências da LGPD"
        ordering = ['titulo'] # Ordena por título