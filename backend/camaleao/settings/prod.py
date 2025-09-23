from .base import *
import os

# Produção: debug desligado por padrão (pode sobrescrever no .env.prod)
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Hosts vindos do .env.prod
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(",")

# Validadores de senha fortes em produção
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "api.validators.ComplexityValidator"},
]

# Assunto padrão de e-mails e remetente
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@seusite.com.br")
SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
EMAIL_SUBJECT_PREFIX = os.getenv("EMAIL_SUBJECT_PREFIX", "[Camaleão] ")

# Toggle global de e-mail (mantém compatível com seu helper)
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "True").lower() == "true"

# ===== Integração SMTP2GO via API HTTP (preferencial em PROD) =====
USE_SMTP2GO_API = os.getenv("USE_SMTP2GO_API", "True").lower() == "true"
SMTP2GO_API_KEY = os.getenv("SMTP2GO_API_KEY")
SMTP2GO_API_URL = os.getenv("SMTP2GO_API_URL", "https://api.smtp2go.com/v3/email/send")

# ===== Fallback SMTP tradicional (só se NÃO usar API) =====
if not USE_SMTP2GO_API:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST")  # ex: mail.smtp2go.com
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
    EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() == "true"
    EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "5"))
else:
    # Quando enviando pela API HTTP, mantenha um backend inofensivo para qualquer envio interno do Django
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")