from .models import Notificacao

def criar_notificacao(tipo, mensagem, gerado_por=None, origem_externa=None, objeto_referencia=None, data_evento=None):
    Notificacao.objects.create(
        tipo=tipo,
        mensagem=mensagem,
        gerado_por=gerado_por,
        origem_externa=origem_externa,
        objeto_referencia=objeto_referencia,
        data_evento=data_evento
    )