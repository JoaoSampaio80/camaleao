# ============================================================
# CAMALÉAO – DOCKERFILE DE PRODUÇÃO (RAILWAY)
# ============================================================

FROM python:3.13.5-slim

# Otimizações básicas
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DEBIAN_FRONTEND=noninteractive

# Dependências do sistema
RUN apt-get update && apt-get install -y \
  build-essential \
  libpq-dev \
  gcc \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements primeiro (melhor cache)
COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Copiar todo o backend
COPY backend/ /app/

# Criar diretório de estáticos (evita warnings)
RUN mkdir -p /app/staticfiles

# Settings para produção no Railway
ENV DJANGO_SETTINGS_MODULE=camaleao.settings.prod

# Railway usa variável $PORT automaticamente
EXPOSE 8000

# Usar PORT dinamicamente se existir, fallback 8000
CMD ["sh", "-c", "gunicorn camaleao.wsgi:application --bind 0.0.0.0:${PORT:-8000} --timeout 90"]
