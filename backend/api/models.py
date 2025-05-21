from django.db import models


class DPO(models.Model):
    nome = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    cargo = models.CharField(max_length=100)
    data_nomeacao = models.DateField()
    validade_nomeacao = models.DateField() # Será calculada no frontend ou no serializer

    def __str__(self):
        return self.nome