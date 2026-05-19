-- ============================================
-- Migração: Criar tabelas de cartões de crédito
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

-- Cartões de crédito
CREATE TABLE cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  bandeira TEXT CHECK (bandeira IN ('visa','mastercard','elo','amex','hipercard','outro')) NOT NULL,
  limite NUMERIC(12,2) NOT NULL CHECK (limite > 0),
  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  cor TEXT DEFAULT '#228be6',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Compras no cartão
CREATE TABLE cartao_compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total > 0),
  parcelas INTEGER NOT NULL DEFAULT 1 CHECK (parcelas >= 1),
  parcela_atual INTEGER NOT NULL DEFAULT 1 CHECK (parcela_atual >= 1),
  categoria TEXT NOT NULL,
  data_compra DATE NOT NULL,
  notas TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartao_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprios_cartoes" ON cartoes
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "usuario_ve_proprias_compras_cartao" ON cartao_compras
  FOR ALL
  USING (user_id = auth.uid());
