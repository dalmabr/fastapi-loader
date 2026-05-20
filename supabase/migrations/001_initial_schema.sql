-- =============================================================
-- AxxioLab — Schema inicial
-- Execute no SQL Editor do Supabase (Project > SQL Editor)
-- =============================================================

-- -------------------------------------------------------------
-- TEMPLATES
-- Mapeamento bandeira → SIAIDCD usado na geração das transações
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT    NOT NULL UNIQUE,
  bandeira  TEXT    NOT NULL CHECK (bandeira IN ('Visa', 'Mastercard', 'Elo')),
  siaidcd   TEXT    NOT NULL UNIQUE CHECK (length(siaidcd) = 19)
);

-- -------------------------------------------------------------
-- ARQUIVOS GERADOS
-- Cabeçalho de cada arquivo de clearing salvo
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS arquivos_gerados (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo          TEXT          NOT NULL,
  data_geracao          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  data_atualizacao      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  bandeira              TEXT          NOT NULL,
  template_id           UUID          NOT NULL REFERENCES templates(id),
  quantidade_registros  INTEGER       NOT NULL DEFAULT 0,
  usuario               TEXT          NOT NULL DEFAULT 'CLRGUSR',
  status                TEXT          NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'excluido')),
  valor_total           NUMERIC(15,2) NOT NULL DEFAULT 0,

  CONSTRAINT uq_nome_arquivo_ativo UNIQUE (nome_arquivo, status)
);

CREATE INDEX IF NOT EXISTS idx_arquivos_status ON arquivos_gerados (status);
CREATE INDEX IF NOT EXISTS idx_arquivos_data   ON arquivos_gerados (data_geracao DESC);

-- Atualiza data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION set_data_atualizacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_arquivos_atualizacao
  BEFORE UPDATE ON arquivos_gerados
  FOR EACH ROW EXECUTE FUNCTION set_data_atualizacao();

-- -------------------------------------------------------------
-- REGISTROS ARQUIVO
-- Linhas individuais de transação vinculadas a um arquivo
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_arquivo (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id      UUID          NOT NULL REFERENCES arquivos_gerados(id) ON DELETE CASCADE,
  siaidcd         TEXT          NOT NULL CHECK (length(siaidcd) = 19),
  bandeira        TEXT          NOT NULL,
  pan             TEXT          NOT NULL CHECK (length(pan) = 19),
  expiry_date     TEXT          NOT NULL CHECK (expiry_date ~ '^\d{4}$'),
  tran_amount     NUMERIC(15,2) NOT NULL CHECK (tran_amount > 0),
  tran_currency   TEXT          NOT NULL CHECK (length(tran_currency) = 3),
  currency        TEXT          NOT NULL CHECK (length(currency) = 3),
  merchant_name   TEXT          NOT NULL,
  user_auditoria  TEXT          NOT NULL DEFAULT 'CLRGUSR',
  ordem           INTEGER       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registros_arquivo_id ON registros_arquivo (arquivo_id);
CREATE INDEX IF NOT EXISTS idx_registros_ordem       ON registros_arquivo (arquivo_id, ordem);

-- -------------------------------------------------------------
-- TRIGGER: mantém quantidade_registros e valor_total atualizados
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_arquivo_totais()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE arquivos_gerados
  SET
    quantidade_registros = (SELECT count(*) FROM registros_arquivo WHERE arquivo_id = COALESCE(NEW.arquivo_id, OLD.arquivo_id)),
    valor_total          = (SELECT COALESCE(sum(tran_amount), 0) FROM registros_arquivo WHERE arquivo_id = COALESCE(NEW.arquivo_id, OLD.arquivo_id))
  WHERE id = COALESCE(NEW.arquivo_id, OLD.arquivo_id);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sync_totais
  AFTER INSERT OR UPDATE OR DELETE ON registros_arquivo
  FOR EACH ROW EXECUTE FUNCTION sync_arquivo_totais();

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY
-- O app usa a chave anon; habilite RLS e libere acesso público
-- ou configure políticas de autenticação conforme necessário.
-- -------------------------------------------------------------
ALTER TABLE templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos_gerados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_arquivo  ENABLE ROW LEVEL SECURITY;

-- Acesso total para anon (ajuste se implementar autenticação)
CREATE POLICY "anon_all_templates"         ON templates         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_arquivos"          ON arquivos_gerados  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_registros"         ON registros_arquivo FOR ALL TO anon USING (true) WITH CHECK (true);
