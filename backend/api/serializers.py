from rest_framework import serializers
from .models import *
from datetime import timedelta

class DPOSerializer(serializers.ModelSerializer):
    class Meta:
        model = DPO
        fields = ['id', 'nome', 'email', 'telefone', 'cargo', 'data_nomeacao', 'validade_nomeacao']
        read_only_fields = ['validade_nomeacao'] # Vamos calcular no frontend ou no save do model

    def create(self, validated_data):
        # Calcula a validade da nomeação (2 anos após a data de nomeação)
        data_nomeacao = validated_data['data_nomeacao']
        validated_data['validade_nomeacao'] = data_nomeacao + timedelta(days=365 * 2) # Aproximadamente 2 anos

        return DPO.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # Atualiza os campos
        instance.nome = validated_data.get('nome', instance.nome)
        instance.email = validated_data.get('email', instance.email)
        instance.telefone = validated_data.get('telefone', instance.telefone)
        instance.cargo = validated_data.get('cargo', instance.cargo)
        instance.data_nomeacao = validated_data.get('data_nomeacao', instance.data_nomeacao)

        # Recalcula a validade da nomeação se a data de nomeação for alterada
        if 'data_nomeacao' in validated_data:
            instance.validade_nomeacao = validated_data['data_nomeacao'] + timedelta(days=365 * 2)

        instance.save()
        return instance