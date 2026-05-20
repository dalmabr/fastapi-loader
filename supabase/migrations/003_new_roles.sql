-- =============================================================
-- AxxioLab — Novos perfis: dev e negocios
-- =============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'operator', 'dev', 'negocios'));
