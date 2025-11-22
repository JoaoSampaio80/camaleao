# ============================================================
# CAMALÉAO – DOCKERFILE DE PRODUÇÃO (RAILWAY)
# ============================================================

FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  build-essential \
  libpq-dev \
  gcc \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Arquivos necessários para instalação
COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Copiar resto do backend
COPY . /app

ENV DJANGO_SETTINGS_MODULE=camaleao.settings.prod

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "camaleao.wsgi:application", "--bind", "0.0.0.0:8000", "--timeout", "90"]
