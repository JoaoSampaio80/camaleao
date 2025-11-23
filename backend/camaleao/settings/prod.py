from .base import *
import os
from urllib.parse import urlparse
from rest_framework_simplejwt.settings import api_settings


# =========================
# Básico
# =========================
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Carregaremos ALLOWED_HOSTS e completaremos com o hostname do túnel adiante
ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# =========================
# Detecta ambiente
# =========================
ENV = os.getenv("NODE_ENV", "").lower()
IS_RAILWAY = ENV == "railway"
IS_RENDER = os.getenv("RENDER", "").lower() == "true"

# =========================
# Validação de senha
# =========================
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "api.validators.ComplexityValidator"},
]

# =========================
# Email
# =========================
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@seusite.com.br")
SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
EMAIL_SUBJECT_PREFIX = os.getenv("EMAIL_SUBJECT_PREFIX", "[Camaleão] ")
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "True").lower() == "true"

USE_SMTP2GO_API = os.getenv("USE_SMTP2GO_API", "True").lower() == "true"
SMTP2GO_API_KEY = os.getenv("SMTP2GO_API_KEY")
SMTP2GO_API_URL = os.getenv("SMTP2GO_API_URL", "https://api.smtp2go.com/v3/email/send")

if not USE_SMTP2GO_API:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
    EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() == "true"
    EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "5"))
else:
    EMAIL_BACKEND = os.getenv(
        "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
    )

# =========================
# Proxy/HTTPS
# =========================
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = False

# =========================
# PRODUÇÃO REAL (RENDER)
# =========================
if IS_RENDER:
    render_url = os.getenv("RENDER_EXTERNAL_URL", "").strip()
    parsed = urlparse(render_url) if render_url else None

    # ESSENCIAL: não forçar domínio, senão cookies quebram
    COOKIE_DOMAIN = None

    frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
    CSRF_TRUSTED_ORIGINS = []
    CORS_ALLOWED_ORIGINS = []

    if frontend_url:
        CORS_ALLOWED_ORIGINS.append(frontend_url)
        CSRF_TRUSTED_ORIGINS.append(frontend_url)

    if parsed and parsed.hostname:
        backend_origin = f"https://{parsed.hostname}"
        CSRF_TRUSTED_ORIGINS.append(backend_origin)
        ALLOWED_HOSTS.append(parsed.hostname)

    # Cookies host-only (obrigatório no Render)
    CSRF_COOKIE_DOMAIN = None
    SESSION_COOKIE_DOMAIN = None
    JWT_COOKIE_DOMAIN = None

    print("[prod] Modo Render → configurado com FRONTEND_URL e RENDER_EXTERNAL_URL")

# =========================
# PRODUÇÃO LOCAL VIA TÚNEL (NÃO ALTERAR)
# =========================
else:
    TUNNEL_URL = os.getenv("TUNNEL_URL")
    if not TUNNEL_URL:
        raise RuntimeError(
            "TUNNEL_URL ausente. Rode o script que sobe o túnel e atualiza o .env.prod."
        )

    parsed = urlparse(TUNNEL_URL)
    COOKIE_DOMAIN = parsed.hostname  # ex: xxxxx.trycloudflare.com

    if COOKIE_DOMAIN and COOKIE_DOMAIN not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(COOKIE_DOMAIN)

    CSRF_TRUSTED_ORIGINS = [f"https://{COOKIE_DOMAIN}"]

    # !!! Mantido exatamente como sua versão que funciona !!!
    print("[prod] Modo Túnel Cloudflare → funcionando como antes")

# =========================
# Cookies
# =========================
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SAMESITE = "None"

CSRF_COOKIE_DOMAIN = COOKIE_DOMAIN
SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN

# =========================
# JWT
# =========================
JWT_AUTH_COOKIE = "refresh_token"
JWT_AUTH_REFRESH_COOKIE = "refresh_token"
JWT_AUTH_SECURE = True
JWT_AUTH_SAMESITE = "None"
JWT_COOKIE_DOMAIN = COOKIE_DOMAIN

api_settings.AUTH_COOKIE = JWT_AUTH_COOKIE
api_settings.AUTH_COOKIE_SECURE = True
api_settings.AUTH_COOKIE_SAMESITE = "None"

# =========================
# Logs
# =========================
print(
    f"[camaleao.settings.prod] COOKIE_DOMAIN={COOKIE_DOMAIN} | ALLOWED_HOSTS={ALLOWED_HOSTS}"
)

# Segurança
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

print("[camaleao.settings.prod] Segurança HTTP reforçada")


# ============================================================
# LOGGING – força traceback de erro 500 a aparecer no Render
# ============================================================
import logging
import sys

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        # Erros de requisição (inclui todos os 500)
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        # Se quiser ver prints/infos suas também
        "api": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
