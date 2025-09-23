from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Import necessário para registrar os receivers dos signals
        # Evite mover este import para o topo do módulo.
        from . import signals
