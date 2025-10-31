# api/services.py
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q
from .models import ActionPlan

# Chaves de cache (podem ir para settings)
OVERDUE_LAST_RUN_KEY = "overdue:last_run_date"
OVERDUE_LOCK_KEY = "overdue:update_lock"
OVERDUE_LOCK_TTL = 60  # segundos (evita concorrência)


def update_overdue_actions() -> int:
    """
    Marca como 'atrasado' todos os ActionPlan com prazo < hoje,
    cujo status não seja 'concluido' nem 'atrasado'.
    Retorna a quantidade atualizada.
    """
    hoje = timezone.localdate()
    qs = ActionPlan.objects.filter(prazo__lt=hoje).exclude(
        status__in=["concluido", "atrasado"]
    )
    return qs.update(status="atrasado")


def update_overdue_actions_if_needed(force: bool = False) -> int:
    """
    Roda a atualização no máximo 1x ao dia (por data local),
    usando cache para evitar repetição em múltiplas chamadas.
    Se force=True, ignora a data e roda mesmo assim.
    """
    hoje = str(timezone.localdate())

    if not force:
        last_run = cache.get(OVERDUE_LAST_RUN_KEY)
        if last_run == hoje:
            return 0  # já rodou hoje

    # lock curto para evitar corrida entre múltiplas requisições simultâneas
    got_lock = cache.add(OVERDUE_LOCK_KEY, "1", OVERDUE_LOCK_TTL)
    if not got_lock and not force:
        return 0  # outro processo está rodando agora

    try:
        updated = update_overdue_actions()
        cache.set(OVERDUE_LAST_RUN_KEY, hoje, 60 * 60 * 24)  # 24h
        return updated
    finally:
        cache.delete(OVERDUE_LOCK_KEY)
