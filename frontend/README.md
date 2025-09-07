🦎 Camaleão – Sistema de Apoio à LGPD

O Camaleão é um sistema web desenvolvido como parte do Trabalho de Conclusão de Curso (TCC) na AEDB, com foco em auxiliar empresas na adequação à Lei Geral de Proteção de Dados (LGPD).

O projeto oferece módulos para gerenciamento de usuários, checklist de conformidade, inventário de dados, matriz de risco e plano de ação, tudo em uma interface intuitiva.

🚀 Tecnologias utilizadas
Backend

Django
 + Django REST Framework

Autenticação JWT (com refresh automático)

PostgreSQL / SQLite (dependendo do ambiente)

WhiteNoise para servir arquivos estáticos em produção

Separação de ambientes (dev e prod)

Frontend

React
 com Vite

React-Bootstrap
 para componentes de UI

Axios com interceptors (refresh automático de tokens)

Variáveis de ambiente (.env.development e .env.production)

📂 Estrutura principal
camaleao/
├── backend/
│   ├── camaleao/        # Projeto Django (settings base/dev/prod)
│   ├── api/             # Aplicação principal (endpoints da API)
│   └── requirements.txt # Dependências do backend
├── frontend/
│   ├── src/             # Código React
│   ├── public/          # Arquivos públicos
│   └── .env.*           # Variáveis de ambiente
└── COMANDOS.md          # Guia rápido de comandos

⚙️ Como rodar o projeto

👉 Consulte o COMANDOS.md
 para ver todos os passos de instalação, dependências e execução do projeto em desenvolvimento e produção simulada.

📜 Autores

👤 [JOÃO SAMPAIO] – Desenvolvimento Backend
👤 [ANA CRISTINA] - Desenvolvimento Frontend
👤 [ANNA CLARA]- Documentação


🎓 Projeto orientado pela professora Mônica – AEDB

🛡️ Objetivo

Auxiliar pequenas e médias empresas a se adequarem à LGPD, fornecendo um sistema prático para:

Gestão de usuários e papéis (Admin, DPO, Gerente)

Monitoramento de conformidade (checklists e planos de ação)

Inventário de dados pessoais

Análise de riscos e mitigação