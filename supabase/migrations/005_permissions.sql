-- ============================================================
-- 005_permissions.sql
-- RBAC dinâmico + colunas de data de conclusão por etapa
-- ============================================================

-- 1. Colunas de data de conclusão das 12 etapas
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS fase_preparado    date,
  ADD COLUMN IF NOT EXISTS fase_requisitos   date,
  ADD COLUMN IF NOT EXISTS fase_estruturar   date,
  ADD COLUMN IF NOT EXISTS fase_impedimento  date,
  ADD COLUMN IF NOT EXISTS fase_codificar    date,
  ADD COLUMN IF NOT EXISTS fase_executar     date,
  ADD COLUMN IF NOT EXISTS fase_apresentacao date,
  ADD COLUMN IF NOT EXISTS fase_pronto       date,
  ADD COLUMN IF NOT EXISTS fase_aceite       date,
  ADD COLUMN IF NOT EXISTS fase_esteira      date,
  ADD COLUMN IF NOT EXISTS fase_producao     date,
  ADD COLUMN IF NOT EXISTS fase_sprint       date;

-- 2. Tabela de permissões dinâmicas por papel e recurso
CREATE TABLE IF NOT EXISTS permissoes (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  role         text    NOT NULL,
  recurso      text    NOT NULL,
  pode_ver     boolean NOT NULL DEFAULT false,
  pode_criar   boolean NOT NULL DEFAULT false,
  pode_editar  boolean NOT NULL DEFAULT false,
  pode_excluir boolean NOT NULL DEFAULT false,
  UNIQUE (role, recurso)
);

ALTER TABLE permissoes ENABLE ROW LEVEL SECURITY;

-- Admin gerencia todas as permissões
CREATE POLICY "permissoes_admin_all" ON permissoes
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Cada papel lê apenas suas próprias permissões
CREATE POLICY "permissoes_self_read" ON permissoes
  FOR SELECT TO authenticated
  USING (
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- 3. Seed inicial — espelha as regras hardcoded do App.jsx
INSERT INTO permissoes (role, recurso, pode_ver, pode_criar, pode_editar, pode_excluir)
VALUES
  -- operator
  ('operator', 'gerador',         true,  true,  true,  true),
  ('operator', 'historico',       true,  false, true,  true),
  ('operator', 'configuracoes',   true,  true,  true,  true),

  -- dev
  ('dev', 'gerador',              true,  true,  true,  true),
  ('dev', 'historico',            true,  false, true,  true),
  ('dev', 'configuracoes',        true,  true,  true,  true),
  ('dev', 'programas',            true,  false, false, false),
  ('dev', 'tabelas',              true,  false, false, false),
  ('dev', 'decodificadores',      true,  false, false, false),
  ('dev', 'projetos',             true,  true,  true,  true),

  -- negocios
  ('negocios', 'decodificadores', true,  false, false, false),
  ('negocios', 'projetos',        true,  true,  true,  false)

ON CONFLICT (role, recurso) DO NOTHING;