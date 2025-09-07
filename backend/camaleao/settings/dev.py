from .base import *

# Garantir debug ligado em desenvolvimento
DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

EMAIL_BACKEND = os.getenv("django.core.mail.backends.console.EmailBackend")

DEFAULT_FROM_EMAIL = os.getenv("no-reply@localhost")

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 3}},
]