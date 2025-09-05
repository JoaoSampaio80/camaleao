import uuid, os
import datetime
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


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
        indexes = [
            models.Index(fields=['unidade']),
            models.Index(fields=['setor']),
            models.Index(fields=['responsavel_email']),
            models.Index(fields=['processo_negocio']),
            models.Index(fields=['data_criacao']),
        ]

    def __str__(self):
        return self.processo_negocio or f"Inventário #{self.pk}"
    
class LikelihoodItem(models.Model):
    value = models.PositiveSmallIntegerField(unique=True)   # 1..5
    label_pt = models.CharField(max_length=60)
    class Meta:
        ordering = ["-value"]
        verbose_name = "Probabilidade"
        verbose_name_plural = "Probabilidade (itens)"
    def __str__(self):
        return f"{self.value} - {self.label_pt}"

class ImpactItem(models.Model):
    value = models.PositiveSmallIntegerField(unique=True)   # 1..5
    label_pt = models.CharField(max_length=60)
    class Meta:
        ordering = ["-value"]
        verbose_name = "Impacto"
        verbose_name_plural = "Impacto (itens)"
    def __str__(self):
        return f"{self.value} - {self.label_pt}"

class ControlEffectivenessItem(models.Model):
    value = models.PositiveSmallIntegerField(unique=True)   # 1..5
    label_pt = models.CharField(max_length=60)              # "Muito efetivo", etc.
    reduction_min = models.PositiveSmallIntegerField()      # 0..100
    reduction_max = models.PositiveSmallIntegerField()
    class Meta:
        ordering = ["-value"]
        verbose_name = "Efetividade do Controle"
        verbose_name_plural = "Efetividade do Controle (itens)"
    def __str__(self):
        return f"{self.value} - {self.label_pt} ({self.reduction_min}-{self.reduction_max}%)"

class RiskLevelBand(models.Model):
    name = models.CharField(max_length=40)                  # Baixo/Médio/Alto/Crítico
    color = models.CharField(max_length=7)                  # "#C00000"
    min_score = models.PositiveSmallIntegerField()
    max_score = models.PositiveSmallIntegerField()
    class Meta:
        ordering = ["min_score"]
        verbose_name = "Nível de Risco (faixa)"
        verbose_name_plural = "Níveis de Risco (faixas)"
    def __str__(self):
        return f"{self.name} ({self.min_score}-{self.max_score})"

class Instruction(models.Model):
    title = models.CharField(max_length=120)
    body_md = models.TextField()                            # markdown
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.title


class Risk(models.Model):
    matriz_filial = models.CharField(max_length=120)
    setor = models.CharField(max_length=120)
    processo = models.CharField(max_length=200)
    risco_fator = models.TextField()  # "Risco e Fator de Risco"
    # chave/parametrização
    probabilidade = models.ForeignKey("LikelihoodItem", on_delete=models.PROTECT)
    impacto = models.ForeignKey("ImpactItem", on_delete=models.PROTECT)
    pontuacao = models.IntegerField(editable=False, default=0)  # prob * impacto (calculado)
    medidas_controle = models.TextField(blank=True)
    tipo_controle = models.CharField(max_length=1, choices=[("C","Preventivo"),("D","Detectivo")], blank=True)
    eficacia = models.ForeignKey("ControlEffectivenessItem", null=True, blank=True, on_delete=models.SET_NULL)
    risco_residual = models.CharField(max_length=20, choices=[("baixo","Baixo"),("medio","Médio"),("alto","Alto")], blank=True )
    resposta_risco = models.TextField(blank=True)  # plano de ação
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Risco"
        verbose_name_plural = "Riscos"

    def save(self, *args, **kwargs):
        # calcula a pontuação inerente toda vez que salvar
        try:
            p = int(self.probabilidade.value)
            i = int(self.impacto.value)
            self.pontuacao = p * i
        except Exception:
            # em caso de criação incompleta (FKs ainda não setadas)
            self.pontuacao = self.pontuacao or 0

        # se o residual não foi informado, tenta deduzir pelas faixas
        if not self.risco_residual:
            try:
                from .models import RiskLevelBand  # import local para evitar ordem de import
                band = RiskLevelBand.objects.filter(
                    min_score__lte=self.pontuacao,
                    max_score__gte=self.pontuacao
                ).first()
                if band:
                    nome = band.name.strip().lower()
                    mapa = {"baixo":"baixo", "médio":"medio", "medio":"medio", "alto":"alto", "crítico":"critico", "critico":"critico"}
                    self.risco_residual = mapa.get(nome, self.risco_residual)
            except Exception:
                pass    
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.risco_fator[:60]}..."
    

    def clean(self):
        errors = {}
        # "Existe controle" = True se houver texto nas medidas
        existe_controle = bool((self.medidas_controle or "").strip())

        if existe_controle:
            if not self.tipo_controle:
                errors["tipo_controle"] = "Informe se o controle é Preventivo (C) ou Detectivo (D)."
        else:
            if self.tipo_controle:
                errors["tipo_controle"] = "Deixe vazio quando não existe controle."
            if self.eficacia_id:
                errors["eficacia"] = "Não defina eficácia quando não existe controle."

        if errors:
            raise ValidationError(errors)


class ActionPlan(models.Model):
    risco = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name="planos")
    matriz_filial = models.CharField(max_length=120)
    setor_proprietario = models.CharField(max_length=120)
    processo = models.CharField(max_length=200)
    descricao = models.TextField()  # "Plano de Ação adicional"
    como = models.TextField(blank=True)
    responsavel_execucao = models.CharField(max_length=120)
    prazo = models.DateField()
    status = models.CharField(max_length=20, choices=[("nao_iniciado","Não iniciado"),("andamento","Em andamento"),("concluido","Concluído")])

    class Meta:
        verbose_name = "Plano de Ação"
        verbose_name_plural = "Planos de Ação"
        ordering = ["prazo"]

    def __str__(self):
        return f"{self.descricao[:60]}..."
    
    def clean(self):        
        if self.prazo and self.prazo < datetime.date.today():
            raise ValidationError({"prazo": "Prazo não pode ser no passado."})


class MonitoringAction(models.Model):
    framework_requisito = models.CharField(max_length=200)
    escopo = models.TextField()
    data_monitoramento = models.DateField()
    criterio_avaliacao = models.CharField(max_length=200)
    responsavel = models.CharField(max_length=120)
    data_conclusao = models.DateField(null=True, blank=True)
    deficiencias = models.TextField(blank=True)
    corretivas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Ação de Monitoramento"
        verbose_name_plural = "Ações de Monitoramento"

    def __str__(self):
        return f"{self.framework_requisito} - {self.data_monitoramento}"

class Incident(models.Model):
    numero_registro = models.AutoField(primary_key=True)
    descricao = models.TextField()
    fonte = models.CharField(max_length=120)
    data_registro = models.DateField()
    responsavel_analise = models.CharField(max_length=120)
    data_final_analise = models.DateField(null=True, blank=True)
    acao_recomendada = models.TextField(blank=True)
    recomendacoes_reportadas = models.CharField(max_length=200, blank=True)
    data_reporte = models.DateField(null=True, blank=True)
    decisoes_resolucao = models.TextField(blank=True)
    data_encerramento = models.DateField(null=True, blank=True)
    fonte_informada = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Incidente"
        verbose_name_plural = "Incidentes"

    def __str__(self):
        return f"Incidente #{self.numero_registro}"


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