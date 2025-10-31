# api/management/commands/update_overdue_actions.py
from django.core.management.base import BaseCommand
from api.services import update_overdue_actions


class Command(BaseCommand):
    help = (
        "Atualiza automaticamente o status das ações com prazo vencido para 'atrasado'."
    )

    def handle(self, *args, **options):
        updated = update_overdue_actions()
        if updated == 0:
            self.stdout.write(
                self.style.SUCCESS("Nenhuma ação precisa de atualização.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"{updated} plano(s) atualizado(s) para 'atrasado'.")
            )
