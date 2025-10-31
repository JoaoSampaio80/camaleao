# api/management/commands/update_overdue_actions.py
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import ActionPlan


class Command(BaseCommand):
    help = (
        "Atualiza automaticamente o status das ações com prazo vencido para 'atrasado'."
    )

    def handle(self, *args, **options):
        hoje = timezone.localdate()

        queryset = ActionPlan.objects.filter(prazo__lt=hoje).exclude(
            status__in=["concluido", "atrasado"]
        )

        total = queryset.count()

        if total == 0:
            self.stdout.write(
                self.style.SUCCESS("Nenhuma ação precisa de atualização.")
            )
            return

        updated = queryset.update(status="atrasado")

        self.stdout.write(
            self.style.SUCCESS(
                f"{updated} plano(s) de ação atualizado(s) para 'atrasado' ({hoje})."
            )
        )
