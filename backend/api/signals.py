# backend/api/signals.py
from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .utils.email import send_html_email


# Resolve o modelo concreto do usuário a partir de AUTH_USER_MODEL
UserModel = apps.get_model(settings.AUTH_USER_MODEL)

@receiver(post_save, sender=UserModel)
def send_welcome_on_user_created(sender, instance, created: bool, **kwargs):
    """
    Envia o e-mail de boas-vindas somente na criação do usuário.
    Usa transaction.on_commit para garantir que o registro já existe no banco
    antes de tentar enviar (evita edge-cases com transações).
    """
    if not created:
        return

    email = getattr(instance, "email", None)
    if not email:
        return

    def _send():
        ctx = {
            "first_name": getattr(instance, "first_name", "") or None,
            "username": getattr(instance, "username", "") or None,
        }
        send_html_email(
            subject="Bem-vindo(a) ao Camaleão",
            to_email=email,
            template_name="emails/welcome",  # templates/emails/welcome.(html|txt)
            context=ctx,
        )

    transaction.on_commit(_send)