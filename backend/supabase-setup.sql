-- ============================================
-- Sistema de Controle Financeiro Pessoal
-- Script de criação do banco de dados Supabase
-- ============================================

-- Transações financeiras
CREATE TABLE transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT CHECK (tipo IN ('receita', 'despesa')) NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  data DATE NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Metas de economia
CREATE TABLE metas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  valor_alvo NUMERIC(10,2) NOT NULL CHECK (valor_alvo > 0),
  valor_atual NUMERIC(10,2) DEFAULT 0,
  data_limite DATE,
  concluida BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- Cada usuário só acessa seus próprios dados
-- ============================================

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Policies para transações
CREATE POLICY "usuario_ve_proprias_transacoes" ON transacoes
  FOR ALL
  USING (user_id = auth.uid());

-- Policies para metas
CREATE POLICY "usuario_ve_proprias_metas" ON metas
  FOR ALL
  USING (user_id = auth.uid());
