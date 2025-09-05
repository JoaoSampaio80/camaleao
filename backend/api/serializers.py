from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.validators import validate_email as core_validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import password_validation
from .models import (
    User, Checklist, InventarioDados, Risk, ActionPlan, MonitoringAction, Incident, ExigenciaLGPD, 
    LikelihoodItem, ImpactItem, ControlEffectivenessItem, RiskLevelBand, Instruction)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        # AQUI é onde a magia acontece. Por padrão, ele usa o 'username',
        # mas você pode sobrescrever para usar o 'email'
        attrs['email'] = attrs.get('email', '').strip().lower() # Usa o campo 'email' como 'username'
        return super().validate(attrs)
    
    @classmethod
    def get_token(cls, user):
        t = super().get_token(user)
        t['email'] = user.email
        t['first_name'] = getattr(user, 'first_name', '') or ''
        t['role'] = getattr(user, 'role', '') or ''
        return t

# Serializer para o modelo User (incluindo o campo 'role')
class UserSerializer(serializers.ModelSerializer):    
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    refresh = serializers.CharField(write_only=True, required=False, allow_blank=True) 
    phone_number = serializers.CharField(required=False, allow_blank=True)
    appointment_date = serializers.DateField(required=False)
    appointment_validity = serializers.DateField(required=False)
    avatar = serializers.ImageField(required=False, allow_null=True)
    remove_avatar = serializers.BooleanField(write_only=True, required=False)
     
    
    class Meta:
        model = User
        # Inclua todos os campos que você quer que sejam acessíveis via API
        # e que não sejam confidenciais (como a senha criptografada).
        fields = (
            'id', 
            'email', 
            'first_name', 
            'last_name',
            'phone_number',            
            'appointment_date',
            'appointment_validity', 
            'role',
            'is_staff', 
            'is_active', 
            'date_joined', 
            'last_login', 
            'password', 
            'avatar',
            'remove_avatar', 
            'current_password', 
            'refresh',
        )
        read_only_fields = ('is_staff', 'is_active', 'date_joined', 'last_login')
        extra_kwargs = {
            'avatar': {'required': False, 'allow_null': True},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # Se o avatar existir e houver request, torne a URL absoluta
        if data.get('avatar') and request:
            try:
                data['avatar'] = request.build_absolute_uri(data['avatar'])
            except Exception:
                pass
        return data

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
            
        new_password = data.get('password')
        if new_password:
            req = self.context.get('request')
            is_self = bool(req and req.user and self.instance and req.user.pk == self.instance.pk)
            if is_self:
                current = data.get('current_password') or ''
                if not current:
                    raise serializers.ValidationError({'current_password': 'Informe sua senha atual.'})
                if not self.instance.check_password(current):
                    raise serializers.ValidationError({'current_password': 'Senha atual incorreta.'})
            # valida regras de senha do Django (sempre que houver mudança)
            password_validation.validate_password(new_password, self.instance or (req.user if req else None))
        return data
    # Método de validação personalizado para o campo 'email'
    def validate_email(self, value):
        # A validação de e-mail padrão do Django já garante o formato.
        # Aqui, vamos garantir que o e-mail não seja de um domínio proibido.
        # No seu caso, se o Django estava rejeitando domínios de teste,
        # podemos ser mais flexíveis.
        
        # Lista de domínios de teste que queremos permitir
        allowed_test_domains = [
            'test.com', 'example.com', 'ficticio.com',
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
    
    def validate_avatar(self, value):
        """
        (Opcional) Validação de imagem: tamanho e mimetype.
        Ajuste limites e mimetypes conforme sua necessidade.
        """
        if value is None:
            return value

        max_mb = 5
        if hasattr(value, 'size') and value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Tamanho máximo do avatar é {max_mb}MB.")

        valid_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
        content_type = getattr(value, 'content_type', None)
        if content_type and content_type not in valid_types:
            raise serializers.ValidationError("Formato inválido. Use JPEG, JPG, PNG ou WEBP.")
        return value   

    def create(self, validated_data):
        # Remove a senha dos dados validados para que não seja passada diretamente
        # para o User.objects.create()
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password) # Define a senha de forma segura
        user.save()
        return user

    def update(self, instance, validated_data):
        # Campos não-modelo (não devem ir para setattr)
        remove = validated_data.pop('remove_avatar', False)
        validated_data.pop('current_password', None)
        validated_data.pop('refresh', None)
        new_password = validated_data.pop('password', None)

        # Remoção de avatar
        if remove:
            if instance.avatar:
                instance.avatar.delete(save=False)
            instance.avatar = None

        # Upload de avatar (se vier)
        if 'avatar' in validated_data:
            new_file = validated_data.pop('avatar')
            if new_file is not None:
                if instance.avatar:
                    instance.avatar.delete(save=False)
            instance.avatar = new_file
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # Troca de senha (se solicitada)
        if new_password:
            instance.set_password(new_password)
            
        instance.save()
        return instance
    
# Serializer para o modelo ExigenciaLGPD
class ExigenciaLGPDSerializer(serializers.ModelSerializer):
    upload_por = serializers.ReadOnlyField(source='upload_por.email') # Exibe o email do usuário

    class Meta:
        model = ExigenciaLGPD
        fields = '__all__'            

class ChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checklist
        fields = '__all__'
        
# Serializer para o modelo InventarioDados
class InventarioDadosSerializer(serializers.ModelSerializer):
    criado_por = serializers.ReadOnlyField(source='criado_por.email')

    class Meta:
        model = InventarioDados
        fields = '__all__'
        read_only_fields = ('criado_por', 'data_criacao', 'data_atualizacao')

    def validate(self, attrs):
        """
        POST/PUT: exige todos os campos obrigatórios (todas as etapas, exceto 'observacao').
        PATCH: valida apenas os campos enviados (edição parcial).
        """
        request = self.context.get('request')
        method = (getattr(request, 'method', '') or '').upper()

        required = [
            # Etapa 1
            'unidade', 'setor', 'responsavel_email', 'processo_negocio',
            'finalidade', 'dados_pessoais', 'tipo_dado', 'origem', 'formato',
            'impresso', 'titulares', 'dados_menores', 'base_legal',
            # Etapa 2
            'pessoas_acesso', 'atualizacoes', 'transmissao_interna', 'transmissao_externa',
            'local_armazenamento_digital', 'controlador_operador', 'motivo_retencao',
            'periodo_retencao', 'exclusao', 'forma_exclusao', 'transferencia_terceiros',
            'quais_dados_transferidos', 'transferencia_internacional', 'empresa_terceira',
            # Etapa 3
            'adequado_contratualmente', 'paises_tratamento', 'medidas_seguranca', 'consentimentos',
        ]

        if method == 'PATCH':
            for f, v in attrs.items():
                if f in required and not str(v or '').strip():
                    raise serializers.ValidationError({f: 'Campo obrigatório.'})
            return attrs

        if method in ('POST', 'PUT'):
            instance = getattr(self, 'instance', None)
            missing = []
            for f in required:
                value = attrs.get(f, None)
                if value is None and instance is not None:
                    value = getattr(instance, f, '')
                if not str(value or '').strip():
                    missing.append(f)
            if missing:
                # mensagem genérica (o front já destaca localmente)
                raise serializers.ValidationError('Existem campos obrigatórios pendentes.')
        return attrs

# Serializer para o modelo MatrizRisco
class RiskSerializer(serializers.ModelSerializer):
    # valores/labels prontos para o front
    probabilidade_value = serializers.IntegerField(source='probabilidade.value', read_only=True)
    probabilidade_label = serializers.CharField(source='probabilidade.label_pt', read_only=True)
    impacto_value = serializers.IntegerField(source='impacto.value', read_only=True)
    impacto_label = serializers.CharField(source='impacto.label_pt', read_only=True)
    eficacia_label = serializers.CharField(source='eficacia.label_pt', read_only=True, default=None)

    # score residual estimado (se existir eficácia)
    residual_pontuacao = serializers.SerializerMethodField()

    class Meta:
        model = Risk
        fields = "__all__"  # inclui campos do modelo
        # e mais os auxiliares:
        extra_fields = (
            'probabilidade_value', 'probabilidade_label',
            'impacto_value', 'impacto_label',
            'eficacia_label', 'residual_pontuacao',
        )

    existe_controle = serializers.SerializerMethodField()

    def get_existe_controle(self, obj):
        return bool((getattr(obj, "medidas_controle", "") or "").strip())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # garantir que extras estejam presentes mesmo com fields="__all__"
        data.update({
            'probabilidade_value': getattr(getattr(instance, 'probabilidade', None), 'value', None),
            'probabilidade_label': getattr(getattr(instance, 'probabilidade', None), 'label_pt', None),
            'impacto_value': getattr(getattr(instance, 'impacto', None), 'value', None),
            'impacto_label': getattr(getattr(instance, 'impacto', None), 'label_pt', None),
            'eficacia_label': getattr(getattr(instance, 'eficacia', None), 'label_pt', None),
            'residual_pontuacao': self.get_residual_pontuacao(instance),
        })
        return data

    def get_residual_pontuacao(self, obj):
        """
        Estima pontuação residual com base na eficácia (média do range).
        Se não houver eficácia, retorna a pontuação inerente.
        """
        if not obj.eficacia_id:
            return obj.pontuacao
        eff = obj.eficacia
        try:
            avg = (eff.reduction_min + eff.reduction_max) / 2.0
        except Exception:
            return obj.pontuacao
        return int(round(obj.pontuacao * (1 - (avg / 100.0))))
    
    def validate(self, attrs):
        inst = getattr(self, "instance", None)

        medidas = attrs.get("medidas_controle")
        if medidas is None and inst is not None:
            medidas = inst.medidas_controle

        tipo = attrs.get("tipo_controle")
        if tipo is None and inst is not None:
            tipo = inst.tipo_controle

        eficacia = attrs.get("eficacia")
        if eficacia is None and inst is not None:
            eficacia = inst.eficacia

        existe = bool((medidas or "").strip())
        errors = {}
        if existe:
            if not tipo:
                errors["tipo_controle"] = "Informe se o controle é Preventivo (C) ou Detectivo (D)."
        else:
            if tipo:
                errors["tipo_controle"] = "Deixe vazio quando não existe controle."
            if eficacia:
                errors["eficacia"] = "Não defina eficácia quando não existe controle."

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

# Serializer para o modelo PlanoAcao
class ActionPlanSerializer(serializers.ModelSerializer):
    # ajuda o front a exibir o vínculo
    risco_risco_fator = serializers.ReadOnlyField(source='risco.risco_fator')

    class Meta:
        model = ActionPlan
        fields = "__all__"

    def validate(self, attrs):
        import datetime
        prazo = attrs.get("prazo") or (self.instance.prazo if self.instance else None)
        if prazo and prazo < datetime.date.today():
            raise serializers.ValidationError({"prazo": "Prazo não pode ser no passado."})
        return attrs

class MonitoringActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitoringAction
        fields = "__all__"

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = "__all__"

class LikelihoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LikelihoodItem
        fields = ("id", "value", "label_pt")

class ImpactItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactItem
        fields = ("id", "value", "label_pt")

class ControlEffectivenessItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlEffectivenessItem
        fields = ("id", "value", "label_pt", "reduction_min", "reduction_max")

class RiskLevelBandSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskLevelBand
        fields = ("id", "name", "min_score", "max_score", "color")

class InstructionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instruction
        fields = ("id", "title", "content", "updated_at")