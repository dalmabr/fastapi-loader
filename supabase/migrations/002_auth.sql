-- =============================================================
-- AxxioLab — Autenticação e perfis de usuário
-- Execute após 001_initial_schema.sql
-- =============================================================

-- Tabela de perfis (role) vinculada a auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: cria perfil automaticamente ao criar usuário em auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuário vê seu próprio perfil; admin vê todos
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Só admin atualiza perfis
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =============================================================
-- Atualizar RLS das tabelas existentes
-- =============================================================

-- TEMPLATES
DROP POLICY IF EXISTS "anon_all_templates" ON templates;
CREATE POLICY "templates_select" ON templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_insert_admin" ON templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "templates_update_admin" ON templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "templates_delete_admin" ON templates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ARQUIVOS
DROP POLICY IF EXISTS "anon_all_arquivos" ON arquivos_gerados;
CREATE POLICY "arquivos_authenticated" ON arquivos_gerados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- REGISTROS
DROP POLICY IF EXISTS "anon_all_registros" ON registros_arquivo;
CREATE POLICY "registros_authenticated" ON registros_arquivo FOR ALL TO authenticated USING (true) WITH CHECK (true);
