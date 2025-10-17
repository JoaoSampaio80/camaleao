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

🖥️ Scripts
Rodar em modo desenvolvimento com túnel cloudflare (web)

.\scripts\start-dev.ps1 -Env dev -StartFrontend:$true -StartMobile:$false

Rodar em modo produção simulada com túnel cloudflare (web)

.\scripts\start-prod.ps1 -StartFrontend:$true -StartMobile:$false

Rodar em modo desenvolvimento com túnel cloudflare (mobile)

.\scripts\start-mobile-dev.ps1

Rodar em modo produção com túnel cloudflare (mobile)

.\scripts\start-mobile-prod.ps1
