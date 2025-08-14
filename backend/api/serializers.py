from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.validators import validate_email as core_validate_email
from django.core.exceptions import ValidationError

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # AQUI é onde a magia acontece. Por padrão, ele usa o 'username',
        # mas você pode sobrescrever para usar o 'email'
        attrs['username'] = attrs.get('email') # Usa o campo 'email' como 'username'
        return super().validate(attrs)

# Serializer para o modelo User (incluindo o campo 'role')
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    appointment_date = serializers.DateField(required=False)
    appointment_validity = serializers.DateField(required=False)
    class Meta:
        model = User
        # Inclua todos os campos que você quer que sejam acessíveis via API
        # e que não sejam confidenciais (como a senha criptografada).
        fields = (
            'id', 'email', 'first_name', 'last_name',
            'phone_number', 'job_title', 'appointment_date',
            'appointment_validity', 'role',
            'is_staff', 'is_active', 'date_joined', 'last_login', 'password'
        )
        read_only_fields = ('is_staff', 'is_active', 'date_joined', 'last_login')
    def validate(self, data):
        """
        Valida que:
        1. Campos de data de nomeação e telefone são obrigatórios para o DPO.
        2. Não pode haver mais de um usuário com a função de DPO.
        """
        # Regra 1: Validação de campos obrigatórios para DPO
        if data.get('role') == 'dpo':
            # Verifica se os campos de data estão presentes
            if not data.get('appointment_date'):
                raise serializers.ValidationError({"appointment_date": "Este campo é obrigatório para um DPO."})
            if not data.get('appointment_validity'):
                raise serializers.ValidationError({"appointment_validity": "Este campo é obrigatório para um DPO."})
            if not data.get('phone_number'):
                raise serializers.ValidationError({"phone_number": "Este campo é obrigatório para um DPO."})
            # Regra 2: Garante que só há um DPO
            # Exclui o próprio usuário da consulta, caso seja uma atualização
            # 'self.instance' se refere ao objeto sendo atualizado
            existing_dpo = User.objects.filter(role='dpo')
            if self.instance: # Se é uma atualização
                existing_dpo = existing_dpo.exclude(pk=self.instance.pk)

            if existing_dpo.exists():
                raise serializers.ValidationError({"role": "Já existe um usuário com a função de DPO."})
        return data
    # Método de validação personalizado para o campo 'email'
    def validate_email(self, value):
        # A validação de e-mail padrão do Django já garante o formato.
        # Aqui, vamos garantir que o e-mail não seja de um domínio proibido.
        # No seu caso, se o Django estava rejeitando domínios de teste,
        # podemos ser mais flexíveis.
        
        # Lista de domínios de teste que queremos permitir
        allowed_test_domains = [
            'test.com', 'example.com', 'ficticio.com', 'localhost'
        ]
        
        # Verificamos se o e-mail termina com um dos domínios permitidos para teste
        if not any(value.endswith(f'@{domain}') for domain in allowed_test_domains):
            try:
                # Se não for um e-mail de teste, usamos o validador padrão do Django
                # para garantir que o e-mail real seja válido.
                core_validate_email(value)
            except ValidationError:
                raise serializers.ValidationError("O formato do e-mail não é válido.")

        return value   

    def create(self, validated_data):
        # Remove a senha dos dados validados para que não seja passada diretamente
        # para o User.objects.create()
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password is not None:
            user.set_password(password) # Define a senha de forma segura
        user.save()
        return user

    def update(self, instance, validated_data):
        # Lida com a atualização da senha separadamente para segurança
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance

class ChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checklist
        fields = '__all__'
        
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