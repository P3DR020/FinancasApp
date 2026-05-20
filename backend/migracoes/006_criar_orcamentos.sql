-- ============================================
-- Migração: Criar tabela de orçamentos mensais
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

CREATE TABLE orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria TEXT NOT NULL,
  limite NUMERIC(12,2) NOT NULL CHECK (limite > 0),
  mes_ano TEXT NOT NULL, -- formato 'YYYY-MM'
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, categoria, mes_ano)
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprios_orcamentos" ON orcamentos
  FOR ALL
  USING (user_id = auth.uid());
