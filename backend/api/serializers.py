from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # AQUI é onde a magia acontece. Por padrão, ele usa o 'username',
        # mas você pode sobrescrever para usar o 'email'
        attrs['username'] = attrs.get('email') # Usa o campo 'email' como 'username'
        return super().validate(attrs)

# Serializer para o modelo User (incluindo o campo 'role')
class UserSerializer(serializers.ModelSerializer):
    # password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        # Inclua todos os campos que você quer que sejam acessíveis via API
        # e que não sejam confidenciais (como a senha criptografada).
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone_number', 'job_title', 'appointment_date',
            'appointment_validity', 'role',
            'is_staff', 'is_active', 'date_joined', 'last_login'
        )
        read_only_fields = ('is_staff', 'is_active', 'date_joined', 'last_login')

    
   

    # def create(self, validated_data):
    #     # Remove a senha dos dados validados para que não seja passada diretamente
    #     # para o User.objects.create()
    #     password = validated_data.pop('password', None)
    #     user = User.objects.create(**validated_data)
    #     if password is not None:
    #         user.set_password(password) # Define a senha de forma segura
    #     user.save()
    #     return user

    # def update(self, instance, validated_data):
    #     # Lida com a atualização da senha separadamente para segurança
    #     password = validated_data.pop('password', None)
    #     for attr, value in validated_data.items():
    #         setattr(instance, attr, value)
    #     if password is not None:
    #         instance.set_password(password)
    #     instance.save()
    #     return instance

# Serializer para o modelo InventarioDados
class InventarioDadosSerializer(serializers.ModelSerializer):
    criado_por = serializers.ReadOnlyField(source='criado_por.email') # Exibe o email do usuário

    class Meta:
        model = InventarioDados
        fields = '__all__' # Inclui todos os campos do modelo

# Serializer para o modelo MatrizRisco
class MatrizRiscoSerializer(serializers.ModelSerializer):
    criado_por = serializers.ReadOnlyField(source='criado_por.email') # Exibe o email do usuário
    # Adiciona o nome do processo afetado para facilitar a leitura na API
    processo_afetado_nome = serializers.ReadOnlyField(source='processo_afetado.nome_processo')

    class Meta:
        model = MatrizRisco
        fields = '__all__'

# Serializer para o modelo PlanoAcao
class PlanoAcaoSerializer(serializers.ModelSerializer):
    responsavel = serializers.ReadOnlyField(source='responsavel.email') # Exibe o email do responsável
    # Adiciona a descrição do risco associado para facilitar a leitura
    risco_descricao = serializers.ReadOnlyField(source='risco.descricao_risco')

    class Meta:
        model = PlanoAcao
        fields = '__all__'

# Serializer para o modelo ExigenciaLGPD
class ExigenciaLGPDSerializer(serializers.ModelSerializer):
    upload_por = serializers.ReadOnlyField(source='upload_por.email') # Exibe o email do usuário

    class Meta:
        model = ExigenciaLGPD
        fields = '__all__'
        # Se você quiser controlar quais campos são de leitura/escrita, pode fazer:
        # fields = ['id', 'titulo', 'descricao', 'artigos_referencia', 'arquivo_comprovacao', 'upload_por', 'data_upload']
        # read_only_fields = ['upload_por', 'data_upload']