# backend/api/utils/email.py
from __future__ import annotations

import requests
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def _send_via_smtp2go_api(
    *,
    subject: str,
    html: str,
    to: List[str],
    text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Envia e-mail pela API HTTP do SMTP2GO.
    Retorna o JSON de resposta (ou levanta requests.HTTPError em falha).
    """
    api_key = getattr(settings, "SMTP2GO_API_KEY", None)
    api_url = getattr(settings, "SMTP2GO_API_URL", "https://api.smtp2go.com/v3/email/send")
    sender = getattr(settings, "DEFAULT_FROM_EMAIL", None)

    if not api_key:
        raise RuntimeError("SMTP2GO_API_KEY não configurada.")
    if not sender:
        raise RuntimeError("DEFAULT_FROM_EMAIL não configurado.")
    if not to:
        raise ValueError("Lista de destinatários vazia.")

    payload: Dict[str, Any] = {
        "api_key": api_key,
        "to": to,
        "sender": sender,
        "subject": subject,
        "html_body": html,
    }
    if text:
        payload["text_body"] = text

    resp = requests.post(api_url, json=payload, timeout=15)
    if resp.status_code != 200:
        try:
            data = resp.json()
        except Exception:
            data = {"error": resp.text}
        resp.raise_for_status()
    return resp.json()


def send_html_email(
    *,
    subject: str,
    to_email: str,
    template_name: str,
    context: Optional[Dict[str, Any]] = None,
    text_fallback: Optional[str] = None,
) -> int:
    """
    Envia e-mail HTML com fallback texto usando um template Django.

    - template_name: caminho base sem extensão (ex.: "emails/welcome")
      -> procura emails/welcome.html e opcionalmente emails/welcome.txt
    - Em PROD, se settings.USE_SMTP2GO_API=True, usa API HTTP do SMTP2GO.
      Caso contrário, usa o backend padrão do Django (EmailMultiAlternatives).

    Retorna:
      - int (backend Django): número de mensagens enviadas (0 ou 1)
      - int (API): retorna 1 em sucesso (para manter semântica), 0 em erro com fail_silently
    """
    if getattr(settings, "EMAIL_ENABLED", True) is False:
        return 0

    context = context or {}

    html_body = render_to_string(f"{template_name}.html", context)

    if text_fallback is None:
        try:
            text_fallback = render_to_string(f"{template_name}.txt", context)
        except Exception:
            text_fallback = strip_tags(html_body) or "Visualize este e-mail em um cliente compatível com HTML."

    fail_silently = bool(getattr(settings, "DEBUG", False))

    # Produção: via API SMTP2GO
    if getattr(settings, "USE_SMTP2GO_API", False):
        try:
            _send_via_smtp2go_api(
                subject=subject,
                html=html_body,
                text=text_fallback,
                to=[to_email],
            )
            return 1
        except Exception:
            if fail_silently:
                return 0
            raise

    # Fallback: backend Django (SMTP/console/etc.)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_fallback,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[to_email],
    )
    msg.attach_alternative(html_body, "text/html")

    # 🔑 Usa get_connection para respeitar EMAIL_TIMEOUT definido em settings
    with get_connection() as connection:
        return connection.send_messages([msg])