# backend/api/signals.py
import logging
from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

from .utils.email import send_html_email
from .models import LoginActivity

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def send_welcome_on_user_created(sender, instance, created: bool, **kwargs):
    # Só em criação
    if not created:
        return

    # Evita spam em DEV (em DEV você já define a senha no cadastro)
    if settings.DEBUG:
        logger.info(
            "DEBUG=True: não enviar welcome para %s", getattr(instance, "email", None)
        )
        return

    email = getattr(instance, "email", None)
    if not email:
        logger.info("Usuário criado sem e-mail; welcome não enviado.")
        return

    def _send():
        try:
            uid = urlsafe_base64_encode(force_bytes(instance.pk))
            token = default_token_generator.make_token(instance)

            frontend = (
                getattr(settings, "FRONTEND_URL", None)
                or getattr(settings, "FRONTEND_BASE_URL", None)
                or "http://127.0.0.1:5173"
            ).rstrip("/")

            reset_url = f"{frontend}/definir-senha?uid={uid}&token={token}"

            expires_seconds = int(
                getattr(settings, "PASSWORD_RESET_TIMEOUT", 60 * 60 * 24 * 3)
            )
            expires_hours = expires_seconds // 3600

            sent = send_html_email(
                subject="Bem-vindo(a) ao Camaleão — defina sua senha",
                to_email=email,
                template_name="emails/welcome",  # usa welcome.(html|txt)
                context={
                    "first_name": getattr(instance, "first_name", "") or "",
                    "reset_url": reset_url,
                    "expires_hours": expires_hours,
                },
            )
            logger.info("Welcome enviado para %s (sent=%s)", email, sent)
        except Exception as exc:
            logger.exception("Falha ao enviar welcome para %s: %s", email, exc)

    # Garante que o email só vá após a transação confirmar
    transaction.on_commit(_send)


@receiver(user_logged_in)
def registrar_login(sender, request, user, **kwargs):
    """Registra cada login feito no sistema."""
    try:
        from .models import LoginActivity

        LoginActivity.objects.create(usuario=user, data_login=timezone.now())
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(f"Falha ao registrar login de {user}: {e}")
