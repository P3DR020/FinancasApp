-- Migration 009: Múltiplas Contas Bancárias
-- Cria a tabela de contas e adiciona conta_id nas transações

-- 1. Tabela contas
CREATE TABLE IF NOT EXISTS contas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  banco      TEXT NOT NULL DEFAULT '',
  tipo       TEXT NOT NULL DEFAULT 'corrente' CHECK (tipo IN ('corrente','poupanca','carteira','investimento','outro')),
  saldo_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  cor        TEXT NOT NULL DEFAULT '#20c997',
  icone      TEXT NOT NULL DEFAULT '🏦',
  ativa      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Row Level Security
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contas"
  ON contas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Adicionar conta_id nas transações (nullable — compatibilidade retroativa)
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES contas(id) ON DELETE SET NULL;

-- 4. Adicionar conta_id nas transferências entre contas
-- (Tabela separada para registrar movimentações entre contas)
CREATE TABLE IF NOT EXISTS transferencias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_origem_id  UUID NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  conta_destino_id UUID NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  valor         NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  descricao     TEXT NOT NULL DEFAULT 'Transferência',
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transferencias"
  ON transferencias FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
