# ============================================================
#  CAMALÉAO – BASE SETTINGS (com suporte a env dinâmico)
# ============================================================
# Este arquivo define as configurações comuns a todos os ambientes
# (dev, prod, mobile, etc.). Ajustes específicos devem ir em:
#   - camaleao/settings/dev.py
#   - camaleao/settings/prod.py
# ============================================================

from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta

# ============================================================
# 1️⃣ Carregamento dinâmico de variáveis de ambiente
# ============================================================
BASE_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = os.environ.get("ENV_FILE")
if not ENV_FILE:
    dsm = os.environ.get("DJANGO_SETTINGS_MODULE", "")
    if ".prod" in dsm:
        ENV_FILE = ".env.prod"
    elif ".dev" in dsm:
        ENV_FILE = ".env.development"
    else:
        ENV_FILE = ".env"

env_path = BASE_DIR / ENV_FILE
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=False)
else:
    generic_env = BASE_DIR / ".env"
    if generic_env.exists():
        load_dotenv(dotenv_path=generic_env, override=False)
    else:
        load_dotenv(override=False)

# ============================================================
# 2️⃣ Configurações básicas e de segurança
# ============================================================
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("A SECRET_KEY não está definida no ambiente (.env).")

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
DEFAULT_CHARSET = "utf-8"

# ============================================================
# 3️⃣ E-mail (mantido conforme comportamento original)
# ============================================================
# - Em dev → usa console backend (simula envio no terminal)
# - Em prod → sobreposto por SMTP2GO ou outro backend real
# - Timeout do link de redefinição = 3 dias (padrão)
# ============================================================
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@localhost")
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "True").lower() == "true"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173/")
PASSWORD_RESET_TIMEOUT = int(os.getenv("PASSWORD_RESET_TIMEOUT", 60 * 60 * 24 * 3))

# ============================================================
# 4️⃣ Aplicações principais
# ============================================================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "api",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
]

# ============================================================
# 5️⃣ Middleware
# ============================================================
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ============================================================
# 6️⃣ URLs / Templates
# ============================================================
ROOT_URLCONF = "camaleao.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "camaleao.wsgi.application"

# ============================================================
# 7️⃣ Banco de dados (SQLite local por padrão)
# ============================================================
DATABASES = {}

# ============================================================
# 8️⃣ Internacionalização
# ============================================================
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# ============================================================
# 9️⃣ Arquivos estáticos e de mídia
# ============================================================
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# ============================================================
# 🔟 CORS / CSRF (ajustado dinamicamente em prod.py)
# ============================================================
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Valores locais (serão sobrescritos por domínio do túnel no prod.py)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
]

# ============================================================
# 11️⃣ Autenticação e usuários
# ============================================================
AUTH_USER_MODEL = "api.User"
AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend"]

# ============================================================
# 12️⃣ REST Framework e JWT (idêntico ao original)
# ============================================================
SIGNING_KEY_JWT = os.environ.get("DJANGO_JWT_SIGNING_KEY")
if not SIGNING_KEY_JWT:
    raise ValueError(
        "A chave JWT (DJANGO_JWT_SIGNING_KEY) não está definida no ambiente."
    )

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "api.pagination.DefaultPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=15),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SIGNING_KEY_JWT,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# ============================================================
# 13️⃣ Segurança adicional (mantido do original)
# ============================================================
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_EMBEDDER_POLICY = "require-corp"

print(
    f"[Camaleão] Ambiente ativo: {os.getenv('DJANGO_SETTINGS_MODULE')} | PASSWORD_RESET_TIMEOUT = {os.getenv('PASSWORD_RESET_TIMEOUT')} segundos"
)
