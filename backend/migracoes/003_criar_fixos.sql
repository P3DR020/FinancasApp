-- ============================================
-- Migração: Criar tabela de rendas/despesas fixas
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

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
