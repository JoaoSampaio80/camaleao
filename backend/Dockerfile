# ============================================================
# CAMALÉAO – DOCKERFILE DE PRODUÇÃO (RAILWAY)
# Django + Gunicorn + Whitenoise + PostgreSQL
# ============================================================

# 1) Imagem base oficial do Python
FROM python:3.11-slim

# 2) Evitar prompts interativos
ENV DEBIAN_FRONTEND=noninteractive

# 3) Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 4) Diretório padrão da aplicação
WORKDIR /app

# 5) Copiar arquivos de dependências
COPY requirements.txt .

# 6) Instalar dependências do Python
RUN pip install --no-cache-dir -r requirements.txt

# 7) Copiar o restante da aplicação
COPY . .

# 8) Configurar Django em modo produção
ENV DJANGO_SETTINGS_MODULE=camaleao.settings.prod

# 9) Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput

# 10) Expor porta do Gunicorn
EXPOSE 8000

# 11) Comando final de execução
CMD ["gunicorn", "camaleao.wsgi:application", "--bind", "0.0.0.0:8000", "--timeout", "90"]
