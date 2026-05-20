# AxxioLab — Gerador de Arquivos de Clearing

Ferramenta interna para composição e exportação de transações de cartão no formato fixo de mainframe/clearinghouse. Permite criar registros por template (bandeira + SIAIDCD), salvar no banco e baixar o `.txt` final.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + Supabase JS
- **Backend**: FastAPI (Python) — geração server-side de arquivo fixo (uso independente)
- **Banco**: Supabase (PostgreSQL)

## Pré-requisitos

- Node.js 20+
- Python 3.10+ (apenas se for usar o backend FastAPI)
- Conta no [Supabase](https://supabase.com)

## Setup

### 1. Banco de dados (Supabase)

No painel do Supabase, abra o **SQL Editor** e execute o arquivo:

```
supabase/migrations/001_initial_schema.sql
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edite .env e preencha VITE_SUPABASE_ANON_KEY com sua chave anon do Supabase
npm run dev
```

O app abre em `http://localhost:5173`.

### 3. Backend (opcional)

```bash
cd backend
pip install fastapi uvicorn
uvicorn api.lerArquivo:app --reload
```

API disponível em `http://localhost:8000`. Endpoint principal: `POST /generate`.

> O frontend gera os arquivos `.txt` diretamente no browser (via `Blob`). O backend FastAPI é um módulo independente para geração server-side com layout configurável via `backend/layout/layout.json`.

## Scripts do frontend

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento Vite |
| `npm run build` | Checagem TypeScript + build de produção |
| `npm run preview` | Preview do build de produção |

## Variáveis de ambiente

Ver `frontend/.env.example`.

A URL do Supabase (`kfxumwkoxqcwbziolluj.supabase.co`) está hardcoded nos componentes. Para trocar de projeto Supabase, busque por `supabaseUrl` em `frontend/src/gerador/`.

## Arquitetura detalhada

Ver [CLAUDE.md](CLAUDE.md).
