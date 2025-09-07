📘 Guia rápido de comandos do projeto Camaleão

Este documento reúne os comandos mais usados no desenvolvimento e execução do projeto, tanto para backend (Django) quanto para frontend (Vite/React).

⚙️ Ambiente virtual (backend)

Ativar o ambiente virtual (Windows / PowerShell):

.\backend\venv\Scripts\Activate.ps1

📦 Dependências (backend)

Instalar dependências listadas:

pip install -r backend/requirements.txt

Instalar nova dependência:

pip install nome-da-lib

Atualizar requirements.txt após instalar/atualizar pacotes:

pip freeze > backend/requirements.txt

🖥️ Backend
Rodar em desenvolvimento

$env:DJANGO_SETTINGS_MODULE="camaleao.settings.dev"
python backend\manage.py runserver

Rodar em produção simulada local

$env:DJANGO_SETTINGS_MODULE="camaleao.settings.prod"
$env:ALLOWED_HOSTS="localhost,127.0.0.1"
$env:SECURE_SSL_REDIRECT="False"
python backend\manage.py collectstatic --noinput
python backend\manage.py runserver 127.0.0.1:8000

Observação: em ambiente real de produção, defina as variáveis de e-mail, CORS/CSRF e banco no servidor.

🖥️ Frontend
Rodar em desenvolvimento

cd frontend
npm run dev

Gerar build de produção e servir localmente

cd frontend
npm run build
python -m http.server 5500 -d dist