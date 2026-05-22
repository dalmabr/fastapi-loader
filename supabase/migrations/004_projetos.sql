-- ============================================================
-- 004_projetos.sql
-- Gestão de projetos com cronograma baseado em DAG + dias úteis
-- ============================================================

CREATE TABLE IF NOT EXISTS projetos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto          text NOT NULL,
  nome             text NOT NULL,
  status           text NOT NULL DEFAULT 'planejado'
                     CHECK (status IN ('planejado','em_andamento','concluido','cancelado','com_impedimento')),
  responsavel      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  data_apresentacao date,
  sprint           text,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cronograma_itens (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id           uuid NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome                 text NOT NULL,
  duracao_dias_uteis   int NOT NULL DEFAULT 1 CHECK (duracao_dias_uteis >= 1),
  data_inicio_manual   date,
  responsavel          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  percentual           int DEFAULT 0 CHECK (percentual BETWEEN 0 AND 100),
  ordem                int DEFAULT 0,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cronograma_dependencias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES cronograma_itens(id) ON DELETE CASCADE,
  depende_de  uuid NOT NULL REFERENCES cronograma_itens(id) ON DELETE CASCADE,
  UNIQUE(item_id, depende_de),
  CHECK (item_id <> depende_de)
);

CREATE INDEX IF NOT EXISTS idx_cronograma_itens_projeto ON cronograma_itens(projeto_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_dep_item     ON cronograma_dependencias(item_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_dep_depende  ON cronograma_dependencias(depende_de);

ALTER TABLE projetos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_projetos"              ON projetos              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cronograma_itens"      ON cronograma_itens      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cronograma_dependencias" ON cronograma_dependencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
