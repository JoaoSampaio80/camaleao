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
# Detecta ambiente Railway (produção real)
# =========================
ENV = os.getenv("NODE_ENV", "").lower()
IS_RAILWAY = ENV == "railway"

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
# E-mail
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
# Proxy/HTTPS (Cloudflare)
# =========================
# Confia no cabeçalho do proxy para considerar a requisição como HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = (
    False  # não redireciona para https internamente (o túnel já é https)
)

if IS_RAILWAY:
    # ===========================================
    # Produção REAL Railway (sem Túnel)
    # ===========================================
    COOKIE_DOMAIN = None  # Railway usa domínio sem cookie domain forçado

    CSRF_TRUSTED_ORIGINS = [
        "https://"
        + os.getenv("RAILWAY_PUBLIC_DOMAIN", "camaleao-production.up.railway.app")
    ]

    print("[prod] Modo Railway → TUNNEL_URL ignorado")
else:
    # ===========================================
    # Produção simulada (Túnel)
    # ===========================================
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

# =========================
# CORS (Netlify -> Railway)
# =========================
CORS_ALLOWED_ORIGINS = [
    "https://quiet-sunshine-2c8d5f.netlify.app",
]

CSRF_TRUSTED_ORIGINS.append("https://quiet-sunshine-2c8d5f.netlify.app")


# Cookies seguros e com domínio do túnel
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SAMESITE = "None"

# Define explicitamente o domínio dos cookies de sessão/CSRF
CSRF_COOKIE_DOMAIN = COOKIE_DOMAIN
SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN

# =========================
# JWT (cookie de refresh)
# =========================
JWT_AUTH_COOKIE = "refresh_token"
JWT_AUTH_REFRESH_COOKIE = "refresh_token"
JWT_AUTH_SECURE = True
JWT_AUTH_SAMESITE = "None"

# Se o seu código que emite o cookie de refresh usa este setting, mantenha-o:
JWT_COOKIE_DOMAIN = COOKIE_DOMAIN  # use isso ao chamar response.set_cookie(..., domain=JWT_COOKIE_DOMAIN)

# Integração com DRF SimpleJWT (quando aplicável)
api_settings.AUTH_COOKIE = JWT_AUTH_COOKIE
api_settings.AUTH_COOKIE_SECURE = JWT_AUTH_SECURE
api_settings.AUTH_COOKIE_SAMESITE = JWT_AUTH_SAMESITE

# ============================================================
# Log simples de domínio ativo (para debug seguro)
# ============================================================
print(
    f"[camaleao.settings.prod] COOKIE_DOMAIN={COOKIE_DOMAIN} | MEDIA_ROOT={MEDIA_ROOT} | ALLOWED_HOSTS={ALLOWED_HOSTS}"
)

# ============================================================
# Reforço de Segurança HTTP (neutro e sem impacto funcional)
# ============================================================

# Cabeçalhos de segurança adicionais (não afetam cookies nem CORS)
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"  # protege dados de navegação
X_FRAME_OPTIONS = (
    "DENY"  # impede que a aplicação seja carregada em iframes (anti-clickjacking)
)

# HSTS: instrui o navegador a sempre usar HTTPS para este domínio
# Seguro mesmo atrás do túnel Cloudflare
SECURE_HSTS_SECONDS = 31536000  # 1 ano
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

print("[camaleao.settings.prod] Segurança HTTP reforçada: HSTS + Headers ativados")
