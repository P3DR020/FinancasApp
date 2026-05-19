-- ============================================
-- Migração: Criar tabela de investimentos
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

CREATE TABLE investimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('renda_fixa', 'acoes', 'fiis', 'crypto', 'tesouro', 'etf', 'outro')) NOT NULL,
  corretora TEXT NOT NULL,
  valor_investido NUMERIC(10,2) NOT NULL CHECK (valor_investido > 0),
  valor_atual NUMERIC(10,2) NOT NULL CHECK (valor_atual >= 0),
  data_compra DATE NOT NULL,
  notas TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Segurança
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprios_investimentos" ON investimentos
  FOR ALL
  USING (user_id = auth.uid());
