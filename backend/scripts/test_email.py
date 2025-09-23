# backend/scripts/test_email.py
import os
import django

# Se não vier do ambiente, cai no prod (você pode mudar para 'camaleao.settings.dev' se preferir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "camaleao.settings.prod")
django.setup()

from api.utils.email import send_html_email  # usa seu helper
from django.conf import settings

def main():
    email = input("Digite o e-mail do destinatário de teste: ").strip()
    if not email:
        print("E-mail vazio. Abortando.")
        return

    print(f"⚙️  DJANGO_SETTINGS_MODULE = {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print(f"📨 DEFAULT_FROM_EMAIL      = {getattr(settings, 'DEFAULT_FROM_EMAIL', None)}")
    print(f"🛰  USE_SMTP2GO_API         = {getattr(settings, 'USE_SMTP2GO_API', False)}")
    if getattr(settings, 'USE_SMTP2GO_API', False):
        print(f"🔑 SMTP2GO_API_KEY set?     = {bool(getattr(settings, 'SMTP2GO_API_KEY', None))}")

    # Envia um e-mail simples usando o template de boas-vindas
    ctx = {"first_name": "Teste", "username": "teste@example.com"}
    sent = send_html_email(
        subject="(Teste) Camaleão — envio de e-mail",
        to_email=email,
        template_name="emails/welcome",  # usa emails/welcome.html (+ .txt se existir)
        context=ctx,
    )

    if sent:
        print("✅ E-mail disparado! (console em DEV / SMTP2GO em PROD)")
    else:
        print("⚠️  O helper retornou 0 (nenhuma mensagem enviada). Verifique logs/ambiente.")

if __name__ == "__main__":
    main()