# backend/api/signals.py
from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.db.models.signals import post_save
from django.dispatch import receiver

from .utils.email import send_html_email

# Resolve o modelo concreto do usuário a partir da string settings.AUTH_USER_MODEL
UserModel = apps.get_model(settings.AUTH_USER_MODEL)

@receiver(post_save, sender=UserModel)
def send_welcome_on_user_created(sender, instance: AbstractBaseUser, created: bool, **kwargs):
    # Só dispara no create (não no update)
    if not created:
        return

    # Garante que existe e-mail
    email = getattr(instance, "email", None)
    if not email:
        return

    # Contexto para o template
    ctx = {
        "first_name": getattr(instance, "first_name", "") or None,
        "username": getattr(instance, "username", "") or None,
    }

    # Envia e-mail usando o helper (HTML + fallback texto)
    send_html_email(
        subject="Bem-vindo(a) ao Camaleão",
        to_email=email,
        template_name="emails/welcome",  # procura welcome.html e welcome.txt em backend/templates/emails/
        context=ctx,
    )