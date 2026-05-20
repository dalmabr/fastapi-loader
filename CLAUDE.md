# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**AxxioLab** is a clearing file generator for payment card transactions. It allows users to compose transaction records (PAN, expiry, amount, merchant), save them to Supabase, and export fixed-width `.txt` files in a mainframe/clearinghouse format.

## Frontend commands

All frontend commands run from the `frontend/` directory.

```bash
cd frontend
npm run dev       # Start Vite dev server
npm run build     # TypeScript check + Vite build
npm run preview   # Preview production build
```

## Backend commands

The backend is a FastAPI app. Run from the `backend/` directory:

```bash
cd backend
uvicorn api.lerArquivo:app --reload
```

## Architecture

### Frontend (React + TypeScript + Vite + Tailwind CSS v4)

Routes defined in [frontend/src/App.jsx](frontend/src/App.jsx):

| Route | Component | Auth | Purpose |
|---|---|---|---|
| `/login` | `LoginPage` | Public | Email + password login |
| `/` | `GerarMainframe` | ✓ All | Compose transaction records and save as a clearing file |
| `/configuracoes` | `Configuracoes` | ✓ Admin | CRUD for templates (bandeira + SIAIDCD mapping) |
| `/historico` | `ListarArquivos` | ✓ All | Browse saved files, download TXT, edit/delete records |
| `/usuarios` | `Usuarios` | ✓ Admin | Create users and assign roles |

### Supabase schema (4 tables)

Defined in [frontend/src/types/database.ts](frontend/src/types/database.ts):

- **`profiles`** — user roles (`id` = auth.users.id, `email`, `role` = 'admin' | 'operator', `ativo`, `created_at`)
- **`templates`** — card scheme templates (`nome`, `bandeira`, `siaidcd`)
- **`arquivos_gerados`** — file header record (`nome_arquivo`, `bandeira`, `template_id`, `quantidade_registros`, `valor_total`, `status`)
- **`registros_arquivo`** — individual transaction lines linked to an `arquivo_id` (`siaidcd`, `pan`, `expiry_date`, `tran_amount`, `tran_currency`, `currency`, `merchant_name`, `user_auditoria`, `ordem`)

Deletion of files is soft-delete: `status` is set to `'excluido'`, not a SQL DELETE.

### TXT output format

Each line in the exported file is fixed-width (no delimiter):

```
siaidcd(19) | pan(19) | expiry_date(4) | tran_amount(12, zero-padded cents) | tran_currency(3) | currency(3) | merchant_name(50) | user_auditoria
```

Amount is formatted as integer cents: `tran_amount.toFixed(2).replace('.', '').padStart(12, '0')`.

### Backend (FastAPI — currently minimal)

[backend/api/lerArquivo.py](backend/api/lerArquivo.py) exposes `POST /generate` which accepts a list of records and writes a fixed-width `output.txt`. The field layout is defined in [backend/layout/layout.json](backend/layout/layout.json) and the formatting logic is shared in [backend/services/file_generator.py](backend/services/file_generator.py). The backend is separate from the file download flow used by the frontend (which generates the TXT client-side via `Blob`).

## Authentication & Authorization

**Supabase Auth** with email/password. RLS policies enforce role-based access.

### Roles
- **admin**: Can access `/configuracoes`, `/usuarios`; can create/edit/delete templates and manage users
- **operator**: Can access `/` (compose transactions) and `/historico` (browse files); cannot modify templates

### Auth flow
1. User logs in at `/login` via `supabase.auth.signInWithPassword`
2. `AuthContext` (session provider) subscribes to auth state changes, fetches user's role from `profiles` table
3. `ProtectedRoute` redirects to `/login` if not authenticated, or blocks if role insufficient
4. JWT stored in session; Supabase client auto-attaches to all requests
5. RLS policies on all tables verify `auth.uid()` and check `profiles.role`

### Files & components
- **[frontend/src/auth/AuthContext.tsx](frontend/src/auth/AuthContext.tsx)** — `useAuth()` hook; manages session, user, role
- **[frontend/src/auth/LoginPage.tsx](frontend/src/auth/LoginPage.tsx)** — email + password form
- **[frontend/src/auth/ProtectedRoute.tsx](frontend/src/auth/ProtectedRoute.tsx)** — route guard (redirects to `/login` or blocks by role)
- **[frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts)** — singleton Supabase client (replaces per-component patterns)
- **[frontend/src/gerador/Usuarios.tsx](frontend/src/gerador/Usuarios.tsx)** — admin page to list users and assign roles

### Backend endpoints
- **`POST /auth/users`** — Create new user (requires admin JWT). Takes `email`, `password`, `role`. Calls Supabase admin API using service role key.

### User creation workflow
1. Admin navigates to `/usuarios`
2. Fills email, password, role; clicks "Criar"
3. Frontend sends `POST /auth/users` with admin's JWT in `Authorization` header
4. Backend verifies JWT is valid and user is admin
5. Backend creates user in Supabase (`auth.users` table)
6. Trigger `handle_new_user()` auto-creates `profiles` entry
7. Backend updates `profiles.role` if not `operator`
8. Frontend confirms and refreshes user list

### RLS policies (migration 002)
- `profiles`: user sees own profile; admin sees all
- `templates`: all authenticated can read; only admin can insert/update/delete
- `arquivos_gerados`: all authenticated can read/write (admin + operator have same access)
- `registros_arquivo`: all authenticated can read/write

### Environment variables
Frontend:
```
VITE_SUPABASE_ANON_KEY=<key>
VITE_API_URL=http://localhost:8000
```

Backend:
```
SUPABASE_SERVICE_ROLE_KEY=<key>
SUPABASE_ANON_KEY=<key>
```

## Key frontend patterns

- **Inline table editing**: all CRUD happens directly in table rows, not in separate modals (except the file-save dialog). One row is editable at a time; `Enter` confirms, `Escape` cancels.
- **Supabase singleton**: centralized in [frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts); all components import `supabase` from this module. Session JWT is auto-managed by Supabase JS client.
- **Auth context**: `AuthProvider` wraps the app tree; `useAuth()` hook exposes `session`, `user`, `role`, `loading`, `signOut`.
- **Toast system**: self-contained per component, auto-dismisses after 4 seconds.
- **Search debounce**: 300 ms via a local `useDebounce` hook (duplicated in `Configuracoes` and `ListaArquivos`).
- **Pagination**: 20 items per page, client-side after filtering, no infinite scroll.

## Environment variables & setup

### Frontend setup

```bash
cd frontend
cp .env.example .env
# Edit .env: fill in VITE_SUPABASE_ANON_KEY (from Supabase > Project Settings > API)
npm install
npm run dev
```

Required vars:
```
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase>
VITE_API_URL=http://localhost:8000  # Backend URL for user creation
```

### Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env: fill in SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY
pip install -r requirements.txt
uvicorn api.lerArquivo:app --reload
```

Required vars:
```
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase>
SUPABASE_ANON_KEY=<anon-key-from-supabase>
```

### Supabase setup

1. Run SQL migration `001_initial_schema.sql` (tables, indexes, RLS)
2. Run SQL migration `002_auth.sql` (profiles table, RLS, auth policies)
3. Create first admin user manually:
   - Go to Supabase > Authentication > Users
   - Invite yourself via email (Supabase will send sign-up link)
   - Once signed up, update role via `UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`
4. Additional users are created via `/usuarios` page in the frontend (admin-only)
