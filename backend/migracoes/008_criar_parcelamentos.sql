-- ============================================
-- Migração: Criar tabela de parcelamentos
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

CREATE TABLE parcelamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total > 0),
  parcelas_total INTEGER NOT NULL CHECK (parcelas_total >= 2),
  parcelas_pagas INTEGER NOT NULL DEFAULT 0 CHECK (parcelas_pagas >= 0),
  valor_parcela NUMERIC(12,2) GENERATED ALWAYS AS (valor_total / parcelas_total) STORED,
  categoria TEXT NOT NULL,
  data_primeira_parcela DATE NOT NULL,
  dia_vencimento INTEGER NOT NULL DEFAULT 1 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  notas TEXT,
  concluido BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parcelamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprios_parcelamentos" ON parcelamentos
  FOR ALL
  USING (user_id = auth.uid());
