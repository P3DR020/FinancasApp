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
  local_guardado TEXT,
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

-- Investimentos
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

ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprios_investimentos" ON investimentos
  FOR ALL
  USING (user_id = auth.uid());

-- Rendas e despesas fixas
CREATE TABLE fixos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('receita', 'despesa')) NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  categoria TEXT NOT NULL,
  dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  ativo BOOLEAN DEFAULT true,
  notas TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fixos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprios_fixos" ON fixos
  FOR ALL
  USING (user_id = auth.uid());
