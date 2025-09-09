from .base import *
import os

# Debug em dev (pode ser sobrescrito via .env.development)
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

# Hosts permitidos em dev
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")

# E-mail: console em dev (pode sobrescrever no .env se quiser)
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@localhost")

# Toggle global de e-mail (mantém compatível com seu helper)
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "True").lower() == "true"

# Integração SMTP2GO (normalmente desabilitada em dev)
USE_SMTP2GO_API = os.getenv("USE_SMTP2GO_API", "False").lower() == "true"
SMTP2GO_API_KEY = os.getenv("SMTP2GO_API_KEY")
SMTP2GO_API_URL = os.getenv("SMTP2GO_API_URL", "https://api.smtp2go.com/v3/email/send")

# Validadores de senha bem permissivos em dev
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 3},
    },
]