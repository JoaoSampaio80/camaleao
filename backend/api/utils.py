from .models import Notificacao, ExigenciasLGPD
from django.utils.timezone import now
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

def criar_notificacao(
    tipo,
    mensagem,
    gerado_por=None,
    origem_externa=None,
    objeto_referencia=None,
    data_evento=None
):
    try:
        notificacao = Notificacao.objects.create(
            tipo=tipo,
            mensagem=mensagem,
            gerado_por=gerado_por,
            origem_externa=origem_externa,
            objeto_referencia=objeto_referencia,
            data_evento=data_evento or now()
        )
        logger.info(f"Notificação criada: {notificacao}")
        return notificacao
    except Exception as e:
        logger.error(f"Erro ao criar notificação: {e}", exc_info=True)
        return None
def verificar_documentos_lgpd():
    """
    Verifica automaticamente os documentos da tabela ExigenciasLGPD
    e gera notificações caso estejam vencidos ou próximos do vencimento.
    """
    try:
        hoje = now().date()
        limite_proximidade = hoje + timedelta(days=7)

        documentos = ExigenciasLGPD.objects.filter(proxima_revisao__isnull=False)

        for doc in documentos:
            if doc.proxima_revisao < hoje:
                tipo = 'documento_vencido'
                mensagem = f"O documento '{doc.titulo}' está vencido desde {doc.proxima_revisao}."
            elif hoje <= doc.proxima_revisao <= limite_proximidade:
                tipo = 'documento_vencendo'
                mensagem = f"O documento '{doc.titulo}' vence em breve ({doc.proxima_revisao})."
            else:
                continue

            criar_notificacao(
                tipo=tipo,
                mensagem=mensagem,
                objeto_referencia=f"ExigenciasLGPD:{doc.id}",
                data_evento=doc.proxima_revisao
            )

        logger.info("Verificação de documentos LGPD concluída.")
        
    except Exception as e:
        logger.error(f"Erro ao verificar documentos LGPD: {e}", exc_info=True)