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
        ('manager', 'Gerente'),
    )
    role = models.CharField(max_length=20, choices=USER_ROLES, default='manager', verbose_name="Função do Usuário")

    # Define o campo de login para ser o email
    USERNAME_FIELD = 'email'
    # Remove o username padrão do AbstractUser e o torna opcional,
    # pois estamos usando email como USERNAME_FIELD
    # (Adicione esta linha se quiser que o username possa ser nulo,
    # caso contrário, ele será automaticamente gerado ou não usado se você não o preencher)
    # username = None # Descomente esta linha se você não quiser usar o campo username

    # Define os campos requeridos ao criar um superusuário via createsuperuser
    REQUIRED_FIELDS = ['username'] # Mantemos username aqui para o createsuperuser,
                                   # mas ele não será usado para login se USERNAME_FIELD for email.
                                   # Se você quiser que o username seja completamente opcional,
                                   # pode remover 'username' daqui e garantir que o email seja fornecido.

    def __str__(self):
        """Retorna a representação em string do objeto User."""
        return self.email

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"


class InventarioDados(models.Model):
    """
    Modelo para o formulário de Inventário de Dados.
    Registra informações sobre processos que coletam e usam dados pessoais.
    """
    unidade = models.CharField(max_length=20, verbose_name="Matriz / Filial", choices=[
            ('matriz', 'Matriz'),
            ('filial', 'Filial'),
            ('ambos', 'Matriz / Filial')
        ],
        default='', blank=True
    )

    setor = models.CharField(max_length=255, verbose_name="Setor", default='', blank=True)

    responsavel = models.CharField(max_length=255, verbose_name="Responsável (Email)", default='', blank=True)

    processo = models.CharField(max_length=255, verbose_name="Processo de negócio", default='', blank=True)

    finalidade = models.TextField(verbose_name="Finalidade", default='', blank=True)

    origem = models.TextField(verbose_name="Origem", default='')

    formato = models.CharField(max_length=30, verbose_name="Formato", choices=[
            ('fisico', 'Físico'),
            ('digital', 'Digital'),
            ('ambos', 'Físico / Digital')
        ],
        default='', blank=True
    )

    ativos_associados = models.CharField(max_length=255,  verbose_name="Ativos associados", default='', blank=True)

    impresso = models.CharField(max_length=10, verbose_name="É impresso?", choices=[
            ('sim', 'Sim'),
            ('nao', 'Não')
        ],
        default='', blank=True
    )

    dados_pessoais_tratados = models.TextField(verbose_name="Dados pessoais tratados", default='', blank=True)

    tipo_dado = models.CharField(max_length=100, verbose_name="Tipo de Dado", choices=[
            ('sensivel', 'Sensível'),
            ('nao_sensivel', 'Não Sensível'),
            ('ambos', 'Sensível e Não Sensível'),
            ('nao_aplica', 'Não se Aplica'),
        ],
        default='', blank=True
    )

    titular_dados = models.CharField(max_length=255, verbose_name="Titular dos dados", default='', blank=True)

    dados_menores = models.CharField(max_length=20, verbose_name="Dados de criança / adolescente ou vulnerável", choices=[
            ('sim', 'Sim'),
            ('nao', 'Não'),
            ('nao_aplica', 'Não se Aplica')
        ],
        default='', blank=True
    )

    base_legal = models.TextField(verbose_name="Base legal", default='', blank=True)

    pessoas_acesso = models.CharField(max_length=255, verbose_name="Pessoas com acesso", default='', blank=True)

    atualizacoes = models.CharField(max_length=255, verbose_name="Atualizações", default='', blank=True)

    transmissao_interna = models.CharField(max_length=255, verbose_name="Transmissão interna", default='', blank=True)

    transmissao_externa = models.CharField(max_length=255, verbose_name="Transmissão externa", default='', blank=True)

    locais_armazenamento = models.CharField(max_length=255, verbose_name="Locais de armazenamento (Digital e físico)", default='', blank=True)

    controlador_operador = models.CharField(max_length=30, verbose_name="Controlador / Operador", choices=[
            ('controlador', 'Controlador'),
            ('operador', 'Operador'),
            ('ambos', 'Controlador / Operador'),
            ('nao_aplica', 'Não se Aplica')
        ],
        default='', blank=True
    )

    motivo_retencao = models.CharField(max_length=255, verbose_name="Motivo da retenção", default='', blank=True)

    periodo_retencao = models.CharField(max_length=100, verbose_name="Período de Retenção", default='', blank=True)

    exclusao = models.CharField(max_length=100, verbose_name="Exclusão", default='', blank=True)

    forma_exclusao = models.CharField(max_length=255, verbose_name="Forma de exclusão", default='', blank=True)

    transf_terceiros = models.CharField(max_length=10, verbose_name="Transferência para terceiros?", choices=[
            ('sim', 'Sim'),
            ('nao', 'Não')
        ],
        default='', blank=True
    )

    dados_transferidos = models.CharField(max_length=255, verbose_name="Dados são transferidos", default='', blank=True)

    empresa_terceira = models.CharField(max_length=255, verbose_name="Empresa terceira", default='', blank=True)

    transf_internacional = models.CharField(max_length=20, verbose_name="Ocorre transferência internacional?", choices=[
            ('sim', 'Sim'),
            ('nao', 'Não'),
            ('nao_aplica', 'Não se Aplica')
        ],
        default='', blank=True
    )

    adequado_contrato = models.CharField(max_length=20, verbose_name="Adequado contratualmente?", choices=[
            ('sim', 'Sim'),
            ('nao', 'Não'),
            ('nao_aplica', 'Não se Aplica')
        ],
        default='', blank=True
    )

    paises_env_tratamento = models.CharField(max_length=255, verbose_name="Países envolvidos no tratamento", default='', blank=True)

    medidas_seguranca = models.CharField(max_length=255, verbose_name="Medidas de segurança envolvidas", default='', blank=True)

    consentimentos = models.CharField(max_length=255, verbose_name="Consentimentos", default='', blank=True)

    observacao_extra = models.TextField(verbose_name="Observação", default='', blank=True)

    # Relacionamento com o usuário que criou o registro
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='inventarios_criados', 
    verbose_name="Criado por")

    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")

    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    def __str__(self):
        """Retorna o nome do processo como representação em string."""
        return self.nome_processo

    class Meta:
        verbose_name = "Inventário de Dados"
        verbose_name_plural = "Inventários de Dados"
        ordering = ['-data_criacao'] 


class MatrizRisco(models.Model):
    """
    Modelo para o formulário de Matriz de Risco.
    Avalia riscos associados a processos de tratamento de dados.
    """
    # Relaciona o risco a um registro de inventário de dados
    processo = models.ForeignKey(InventarioDados, on_delete=models.CASCADE, related_name='riscos', 
    verbose_name="Processo de negócio", null=True, blank=True)

    descricao_risco = models.TextField(verbose_name="Descrição do Risco", default='')

    probabilidade = models.CharField(max_length=1, choices=[(str(i), str(i)) for i in range(1, 6)], 
    verbose_name="Probabilidade [1-5]", default='', blank=True)

    impacto = models.CharField(max_length=1, choices=[(str(i), str(i)) for i in range(1, 6)], verbose_name="Impacto [1-5]", 
    default='', blank=True)

    pontuacao_risco = models.PositiveIntegerField(editable=False, verbose_name="Pontuação do Risco", default=0)

    controle_existente = models.CharField(max_length=255, verbose_name="Controle existente", default='', blank=True)

    tipo_controle = models.CharField(max_length=20, verbose_name="Tipo de Controle", choices=[
            ('preventivo', 'Preventivo'),
            ('detectivo', 'Detectivo'),
            ('nao_se_aplica', 'Não se aplica'),
        ],
        default='', blank=True
    )

    eficacia_controle = models.CharField(max_length=20, choices=[
        ('1', '1'),
        ('2', '2'),
        ('3', '3'),
        ('4', '4'),
        ('5', '5'),
        ('na', 'Não se aplica'),
        ('', '---------')  # opcional: representa o valor vazio no admin
    ],
    verbose_name="Avaliação da Eficácia do Controle [1-5]", default='', blank=True
    )

    risco_residual = models.CharField(max_length=20, verbose_name="Risco Residual", choices=[
            ('alto', 'Alto'),
            ('medio', 'Médio'),
            ('baixo', 'Baixo'),
            ('nao_se_aplica', 'Não se aplica'),
        ],
        default='', blank=True
    )

    resposta_ao_risco = models.TextField(verbose_name="Resposta ao Risco", default='', blank=True)

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='riscos_criados', 
    verbose_name="Criado por")

    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")

    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    def save(self, *args, **kwargs):
        try:
            self.pontuacao_risco = int(self.probabilidade) * int(self.impacto)
        except (ValueError, TypeError):
            self.pontuacao_risco = 0
        super().save(*args, **kwargs)

    def __str__(self):
        """Retorna a descrição do risco e o processo associado."""
        processo_nome = self.processo.nome_processo if self.processo else "Sem processo"
        return f"Risco: {self.descricao_risco[:50]}... (Processo: {processo.nome})"


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