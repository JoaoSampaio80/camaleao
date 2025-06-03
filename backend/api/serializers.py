from rest_framework import serializers
from .models import *

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
    criado_por = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False, # Definido na view com perform_create
        allow_null=True
    )
    criado_por_email = serializers.SerializerMethodField(read_only=True) # Campo apenas para leitura

    class Meta:
        model = InventarioDados
        fields = '__all__'
        read_only_fields = ('data_criacao', 'data_atualizacao') # Campos gerenciados automaticamente

    def get_criado_por_email(self, obj):
        return obj.criado_por.email if obj.criado_por else None

class MatrizRiscoSerializer(serializers.ModelSerializer):
    # Campo processo_afetado: espera ID para escrita, mostra nome para leitura
    processo_afetado = serializers.PrimaryKeyRelatedField(
        queryset=InventarioDados.objects.all()
    )
    processo_afetado_nome = serializers.SerializerMethodField(read_only=True)

    # Campo criado_por: espera ID para escrita, mostra email para leitura
    criado_por = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False, # Definido na view com perform_create
        allow_null=True
    )
    criado_por_email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MatrizRisco
        fields = '__all__'
        read_only_fields = ('data_criacao', 'data_atualizacao', 'nivel_risco') # Nível de risco pode ser calculado

    def get_processo_afetado_nome(self, obj):
        return obj.processo_afetado.nome_processo if obj.processo_afetado else None

    def get_criado_por_email(self, obj):
        return obj.criado_por.email if obj.criado_por else None

class PlanoAcaoSerializer(serializers.ModelSerializer):
    # Campo risco: espera ID para escrita, mostra descrição para leitura
    risco = serializers.PrimaryKeyRelatedField(
        queryset=MatrizRisco.objects.all()
    )
    risco_descricao = serializers.SerializerMethodField(read_only=True)

    # Campo responsavel: espera ID para escrita, mostra email para leitura
    responsavel = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        allow_null=True # No seu modelo é null=True
    )
    responsavel_email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PlanoAcao
        fields = '__all__'
        read_only_fields = ('data_criacao', 'data_atualizacao')

    def get_risco_descricao(self, obj):
        return obj.risco.descricao_risco if obj.risco else None

    def get_responsavel_email(self, obj):
        return obj.responsavel.email if obj.responsavel else None

class ExigenciaLGPDSerializer(serializers.ModelSerializer):
    # Campo upload_por: espera ID para escrita, mostra email para leitura
    upload_por = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False, # Definido na view com perform_create
        allow_null=True
    )
    upload_por_email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExigenciaLGPD
        fields = '__all__'
        read_only_fields = ('data_upload', 'data_atualizacao') # Campos gerenciados automaticamente

    def get_upload_por_email(self, obj):
        return obj.upload_por.email if obj.upload_por else None