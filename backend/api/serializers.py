from rest_framework import serializers
from .models import *
from django.contrib.auth.models import AbstractUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone_number', 'job_title', 'appointment_date',
            'appointment_validity', 'role',
            'is_staff', 'is_active', 'date_joined', 'last_login', 'password',
        )
        read_only_fields = ('is_staff', 'is_active', 'date_joined', 'last_login')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False} # password pode não ser obrigatório em PUT/PATCH
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # É uma boa prática usar super().create para que o ModelSerializer cuide da criação padrão
        user = super().create(validated_data)
        if password is not None:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        # Use super().update para lidar com os campos não-senha de forma eficiente
        instance = super().update(instance, validated_data)
        if password is not None:
            instance.set_password(password) # Define a nova senha
        instance.save()
        return instance

class InventarioDadosSerializer(serializers.ModelSerializer):
    # Para escrita (POST/PUT), espera o ID do usuário. Para leitura (GET), mostra o email.
    criado_por = serializers.SlugRelatedField(
    queryset=User.objects.all(),
    slug_field='email',  # campo do usuário que será mostrado na leitura
    required=False,
    allow_null=True
)

    class Meta:
        model = InventarioDados
        fields = '__all__'
        read_only_fields = ('data_criacao', 'data_atualizacao') # Campos gerenciados automaticamente


class MatrizRiscoSerializer(serializers.ModelSerializer):
    # Para escrita, utiliza o ID (chave primária), que é seguro e único
    def validate_processo(self, value):
        if value == '':
            return None
        return value
    processo = serializers.PrimaryKeyRelatedField(    
        queryset=InventarioDados.objects.all(),
        required=False,
        allow_null=True,
        default=None,
    )

    # Campo extra para leitura — exibe o nome do processo
    processo_nome = serializers.SerializerMethodField(read_only=True)

    # Para escrita: usa o email do usuário
    criado_por = serializers.SlugRelatedField(
        queryset=User.objects.all(),
        slug_field='email',
        required=False,
        allow_null=True
    )

    # Campo extra para leitura — mostra o email de quem criou
    criado_por_email = serializers.SerializerMethodField(read_only=True)
    probabilidade = serializers.IntegerField(allow_null=True, required=False)
    impacto = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = MatrizRisco
        fields = '__all__'
        read_only_fields = (
            'data_criacao',
            'data_atualizacao',
            'pontuacao_risco',  # este campo é calculado automaticamente no `save()`
        )

    # def get_processo_nome(self, obj):
    #     return obj.processo.processo if obj.processo else None
    def get_processo_nome(self, obj):
        try:
            return obj.processo.processo
        except Exception:
            return None

    def get_criado_por_email(self, obj):
        return obj.criado_por.email if obj.criado_por else None
    

class PlanoAcaoSerializer(serializers.ModelSerializer):
    # Campo risco: espera ID para escrita, mostra descrição para leitura
    risco = serializers.SlugRelatedField(queryset=MatrizRisco.objects.all(), slug_field='descricao_risco')

    # Campo responsavel: espera ID para escrita, mostra email para leitura
    responsavel = serializers.SlugRelatedField(queryset=User.objects.all(), slug_field='email', allow_null=True)

    class Meta:
        model = PlanoAcao
        fields = '__all__'
        read_only_fields = ('data_criacao', 'data_atualizacao')
    

class ExigenciasLGPDSerializer(serializers.ModelSerializer):
    # Campo upload_por: espera ID para escrita, mostra email para leitura
    upload_por = serializers.SlugRelatedField(queryset=User.objects.all(), slug_field='email', required=False, allow_null=True)

    class Meta:
        model = ExigenciasLGPD
        fields = '__all__'
        read_only_fields = ('data_upload', 'data_atualizacao') # Campos gerenciados automaticamente
    

class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    gerado_por = serializers.StringRelatedField(read_only=True)
    lida_por = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Notificacao
        fields = [
            'id',
            'tipo',
            'tipo_display',
            'mensagem',
            'gerado_por',
            'origem_externa',
            'data_criacao',
            'lida_por',
            'objeto_referencia',
            'data_evento',
        ]