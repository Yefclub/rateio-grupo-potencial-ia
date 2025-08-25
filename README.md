# Conversation Cost Calculator

## Guia rápido

### Desenvolvimento local (dev)

1) Instale dependências
```bash
npm install
```

2) Copie `.env.example` para `.env` e preencha as variáveis do Azure AD
- `SESSION_SECRET`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
- Opcional: `BASE_URL` (padrão: `http://localhost:8080`)

3) Suba frontend e backend juntos
```bash
npm run dev:all
```

4) Acesse: `http://localhost:8080`

Notas rápidas:
- O backend usa `BASE_URL` para o callback do Azure em `server.ts`.
- Garanta que o Redirect URI no Azure AD inclua: `http://localhost:8080/auth/azure/callback`.

## Sobre o projeto

- Aplicação privada para consolidação e análise de custos de conversas com IA.
- Visão por período (hoje, semana, mês e personalizado) com filtragem feita no servidor via SQL completo enviado ao webhook.
- Relatório consolidado de setores com divisão mensal (mês a mês) de conversas, tokens e custos — visão geral e por setor — e exportação para Excel com abas mensais.
- Estatísticas detalhadas por modelo quando múltiplos modelos são usados na mesma seção (custos, tokens de entrada/saída e total).
- Renderização de artefatos em sandbox a partir do padrão `<antArtifact>`, separando visualmente chat, contexto de ferramenta e artefatos executáveis.
- Autenticação via Microsoft Azure AD (MSAL) no backend Node/Express (`server.ts`).

## Arquitetura

- Front-end: Vite + React + TypeScript + Tailwind CSS + shadcn-ui (SPA gerada em `dist/`).
- Backend: Node.js/Express (`server.ts`) — autenticação Azure AD e endpoints `/auth`.
- Deploy produtivo recomendado: pode rodar diretamente em Docker (esta imagem já serve o SPA e o backend Express) ou, opcionalmente, usar Nginx/APIGW externo como proxy reverso para o container.

## Docker (passo a passo simples)

1) Crie um arquivo `.env.runtime` (variáveis do servidor em runtime)
```env
PORT=3001
BASE_URL=http://localhost:8080  # use exatamente a URL que você usa no navegador
SESSION_SECRET=uma_chave_secreta_segura
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
COOKIE_SECURE=false             # true somente atrás de HTTPS
```

2) (Opcional) `.env` para variáveis de build do Vite (se precisar): `VITE_*`

3) Build e subida do container
```bash
docker compose build
docker compose up -d
```

4) Acesse: `http://localhost:8080`

5) No Azure AD, garanta o Redirect URI: `http://localhost:8080/auth/azure/callback`

## Docker (build e execução)

Esta aplicação foi dockerizada sem Nginx interno. O container Node/Express serve os arquivos estáticos do Vite (pasta `dist/`) e expõe as rotas `/auth`.

Pré-requisitos:

- Docker 24+

Variáveis de ambiente:

- Runtime (lidas pelo servidor em `server.ts` via `dotenv`):
  - `PORT` (opcional; padrão 3001 no container)
  - `BASE_URL` (URL pública usada no callback do Azure AD, ex.: `https://app.suaempresa.com`)
  - `SESSION_SECRET`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
- Build-time do Vite (somente no build da imagem; NÃO são lidas em runtime):
  - `VITE_HTTP_REQUEST_NAME`, `VITE_HTTP_REQUEST_VALOR`
  - `VITE_CONVERSATION_WEBHOOK_URL`
  - `VITE_FETCH_PRICING_WEBHOOK_URL`, `VITE_SAVE_PRICING_WEBHOOK_URL`

Importante:

- O arquivo `.env` local não é enviado para o build (está em `.dockerignore`). Para parametrizar o front-end no build use `--build-arg`.
- O backend lê variáveis de ambiente em runtime. Passe via `--env`/`--env-file` no `docker run`.

1) Build da imagem

Exemplo passando os `build-args` do Vite:

```bash
docker build -t conv-cost:latest \
  --build-arg VITE_HTTP_REQUEST_NAME=Authorization \
  --build-arg VITE_HTTP_REQUEST_VALOR="Bearer token" \
  --build-arg VITE_CONVERSATION_WEBHOOK_URL="https://seu-backend-webhook/conversations" \
  --build-arg VITE_FETCH_PRICING_WEBHOOK_URL="https://seu-backend-webhook/pricing/fetch" \
  --build-arg VITE_SAVE_PRICING_WEBHOOK_URL="https://seu-backend-webhook/pricing/save" \
  .
```

2) Execução local (sem Nginx interno)

Crie um `.env.runtime` com as variáveis do servidor:

```env
PORT=3001
BASE_URL=https://app.suaempresa.com
SESSION_SECRET=uma_chave_secreta_segura
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
```

Suba o container expondo a porta do servidor (3001 por padrão dentro do container):

```bash
docker run --name conv-cost -p 8080:3001 --env-file .env.runtime conv-cost:latest
```

Acesse: `http://localhost:8080`. As rotas `/auth/*` são servidas pelo mesmo processo Node.

Notas:

- Se houver um proxy reverso externo (Nginx, API Gateway), aponte-o para `http://<host>:<porta_exposta>` e ajuste `BASE_URL` para o domínio público.
- Cookies de sessão estão como `sameSite=lax` e `secure=false` por padrão; atrás de HTTPS, considere `secure=true` via variável de ambiente e ajuste conforme necessidade.

## Docker Compose

Use o `docker-compose.yml` para simplificar build e execução, incluindo passagem de variáveis de build (`VITE_*`) e de runtime.

1) Defina as variáveis de build do Vite em um arquivo `.env` (na raiz), usado pelo Compose como substituição de variáveis:

```env
VITE_HTTP_REQUEST_NAME=Authorization
VITE_HTTP_REQUEST_VALOR=Bearer token
VITE_CONVERSATION_WEBHOOK_URL=https://seu-backend-webhook/conversations
VITE_FETCH_PRICING_WEBHOOK_URL=https://seu-backend-webhook/pricing/fetch
VITE_SAVE_PRICING_WEBHOOK_URL=https://seu-backend-webhook/pricing/save
```

2) Crie o arquivo `.env.runtime` (variáveis do servidor usadas em runtime):

```env
PORT=3001
BASE_URL=https://app.suaempresa.com
SESSION_SECRET=uma_chave_secreta_segura
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
# Se estiver atrás de HTTPS via proxy reverso, habilite cookie seguro
COOKIE_SECURE=true
```

3) Build da imagem e subida do serviço:

```bash
docker compose build
docker compose up -d
```

4) Proxy reverso externo (Proxy Manager/Nginx/APIGW):

- Direcione o host público para o serviço exposto na porta `8080` do host (container escuta `3001`).
- Garanta que `BASE_URL` use o domínio público HTTPS.
- Com HTTPS no proxy, use `COOKIE_SECURE=true` para marcar o cookie de sessão como seguro.

## Acesso ao código (projeto privado)

Este repositório é privado. Somente membros autorizados podem obter o código. Fluxos comuns:

- Clonar o repositório privado localmente e enviar os arquivos para o servidor via `scp`/`rsync`/pacote interno.
- Ou disponibilizar um pacote (ZIP/TAR) aprovado internamente e transferir diretamente ao servidor produtivo.

## Stack técnica

Este projeto utiliza:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto no servidor. Observação: o front-end Vite só expõe variáveis prefixadas com `VITE_` no momento do build.

Backend (lidas em runtime por `server.ts` via `dotenv`):

- `PORT=3001`
- `BASE_URL=https://seu-dominio.com`  (utilizada nos callbacks do Azure AD)
- `SESSION_SECRET=uma_chave_secreta_segura`
- `AZURE_CLIENT_ID=...`
- `AZURE_CLIENT_SECRET=...`
- `AZURE_TENANT_ID=...`

Frontend (definidas antes do build — Vite):

- `VITE_HTTP_REQUEST_NAME=Authorization`  (ou outro header)
- `VITE_HTTP_REQUEST_VALOR=Bearer xxxxx`
- `VITE_CONVERSATION_WEBHOOK_URL=https://seu-backend-webhook/conversations`
- `VITE_FETCH_PRICING_WEBHOOK_URL=https://seu-backend-webhook/pricing/fetch`
- `VITE_SAVE_PRICING_WEBHOOK_URL=https://seu-backend-webhook/pricing/save`

### Exemplo de `.env` / `.env.runtime`

```env
# Headers de autenticação para webhooks
VITE_HTTP_REQUEST_NAME=
VITE_HTTP_REQUEST_VALOR=

# Webhooks de dados/pricing
VITE_CONVERSATION_WEBHOOK_URL=
VITE_FETCH_PRICING_WEBHOOK_URL=
VITE_SAVE_PRICING_WEBHOOK_URL=

# Webhooks de usuários/ACL
VITE_COLETAR_USUARIOS_WEBHOOK_URL=
VITE_CADASTRAR_USUARIO_WEBHOOK_URL=
VITE_COLETAR_TODOS_USUARIOS_WEBHOOK_URL=
VITE_ATUALIZAR_USUARIO_WEBHOOK_URL=

# Server
PORT=3001

# Configurações do Azure AD
SESSION_SECRET=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=

# Se estiver atrás de HTTPS (proxy reverso), deixe true
COOKIE_SECURE=false
```

Observações importantes:

- O filtro de datas envia a query SQL completa ao webhook via parâmetro `query`, permitindo filtragem server-side e melhor performance.
- Garanta que `BASE_URL` corresponda ao domínio público configurado no Nginx (ex.: `https://custo-ia.suaempresa.com`).
- Não use valores default sensíveis do código em produção; defina todos via `.env`.
