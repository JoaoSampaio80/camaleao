from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid, os
from django.conf import settings

class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superusuário precisa ter is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superusuário precisa ter is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
    
def avatar_upload_to(instance, filename):
    # preserva a extensão original em minúsculo
    ext = os.path.splitext(filename)[1].lower() or '.jpg'
    # gera um nome único pra evitar cache preso do navegador/CDN
    return f'avatars/{uuid.uuid4().hex}{ext}'

class User(AbstractUser):
    """
    Modelo de usuário personalizado para o sistema LGPD.
    Define os papéis (admin, dpo, gerente) e campos adicionais.
    """
    # Sobrescreve o campo email para garantir que seja único e não nulo
    username = None
    email = models.EmailField(unique=True, blank=False, null=False)

    # Campos adicionais para o usuário
    phone_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Telefone")    
    appointment_date = models.DateField(blank=True, null=True, verbose_name="Data de Nomeação")
    appointment_validity = models.DateField(blank=True, null=True, verbose_name="Validade da Nomeação")
    avatar = models.ImageField(upload_to=avatar_upload_to, null=True, blank=True)

    # Campo para definir o papel do usuário (Admin, DPO, Gerente)
    USER_ROLES = (
        ('admin', 'Administrador'),
        ('dpo', 'DPO'),
        ('gerente', 'Gerente'),
    )
    role = models.CharField(max_length=20, choices=USER_ROLES, default='gerente', verbose_name="Função do Usuário")

    # Define o campo de login para ser o email
    USERNAME_FIELD = 'email'    
   
    # Define os campos requeridos ao criar um superusuário via createsuperuser
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

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
    Modelo alinhado com o frontend (3 etapas).
    """
    # Choices usados no frontend
    UNIDADE_CHOICES = (('matriz', 'Matriz'), ('filial', 'Filial'))
    TIPO_DADO_CHOICES = (('pessoal', 'Pessoal'), ('sensivel', 'Sensível'), ('anonimizado', 'Anonimizado'))
    FORMATO_CHOICES = (('digital', 'Digital'), ('fisico', 'Físico'), ('hibrido', 'Físico e Digital'))
    SIM_NAO_CHOICES = (('sim', 'Sim'), ('nao', 'Não'))
    CONTROLADOR_OPERADOR_CHOICES = (
        ('controlador', 'Controlador'),
        ('operador', 'Operador'),
        ('ambos', 'Ambos'),
    )

    # Metadados
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inventarios_criados',
        verbose_name="Criado por"
    )
    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    # --------- ETAPA 1 ---------
    unidade = models.CharField(max_length=10, choices=UNIDADE_CHOICES, blank=True, null=True)
    setor = models.CharField(max_length=120, blank=True, null=True)
    responsavel_email = models.EmailField(max_length=254, blank=True, null=True)
    processo_negocio = models.CharField(max_length=200, blank=True, null=True)
    finalidade = models.TextField(blank=True, null=True)
    dados_pessoais = models.TextField(blank=True, null=True)
    tipo_dado = models.CharField(max_length=12, choices=TIPO_DADO_CHOICES, blank=True, null=True)
    origem = models.CharField(max_length=200, blank=True, null=True)
    formato = models.CharField(max_length=16, choices=FORMATO_CHOICES, blank=True, null=True)
    impresso = models.CharField(max_length=3, choices=SIM_NAO_CHOICES, blank=True, null=True)
    titulares = models.TextField(blank=True, null=True)
    dados_menores = models.CharField(max_length=3, choices=SIM_NAO_CHOICES, blank=True, null=True)
    base_legal = models.TextField(blank=True, null=True)

    # --------- ETAPA 2 ---------
    pessoas_acesso = models.TextField(blank=True, null=True)
    atualizacoes = models.TextField(blank=True, null=True)
    transmissao_interna = models.TextField(blank=True, null=True)
    transmissao_externa = models.TextField(blank=True, null=True)
    local_armazenamento_digital = models.CharField(max_length=200, blank=True, null=True)
    controlador_operador = models.CharField(max_length=12, choices=CONTROLADOR_OPERADOR_CHOICES, blank=True, null=True)
    motivo_retencao = models.TextField(blank=True, null=True)
    periodo_retencao = models.CharField(max_length=100, blank=True, null=True)
    exclusao = models.TextField(blank=True, null=True)
    forma_exclusao = models.TextField(blank=True, null=True)
    transferencia_terceiros = models.CharField(max_length=3, choices=SIM_NAO_CHOICES, blank=True, null=True)
    quais_dados_transferidos = models.TextField(blank=True, null=True)
    transferencia_internacional = models.CharField(max_length=3, choices=SIM_NAO_CHOICES, blank=True, null=True)
    empresa_terceira = models.CharField(max_length=200, blank=True, null=True)

    # --------- ETAPA 3 ---------
    adequado_contratualmente = models.CharField(max_length=3, choices=SIM_NAO_CHOICES, blank=True, null=True)
    paises_tratamento = models.CharField(max_length=200, blank=True, null=True)
    medidas_seguranca = models.TextField(blank=True, null=True)
    consentimentos = models.TextField(blank=True, null=True)
    observacao = models.TextField(blank=True, null=True)  # único opcional no front; aqui também opcional no BD

    class Meta:
        verbose_name = "Inventário de Dados"
        verbose_name_plural = "Inventários de Dados"
        ordering = ('-data_criacao',)

    def __str__(self):
        return self.processo_negocio or f"Inventário #{self.pk}"


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
        try:
            proc = getattr(self.processo_afetado, 'processo_negocio', '') or ''
        except Exception:
            proc = ''
        return f"Risco: {self.descricao_risco[:50]}... (Processo: {proc or 'N/D'})"

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