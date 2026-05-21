-- ============================================
-- Migração: Adicionar campos ao parcelamentos
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

-- Coluna computada: valor de cada parcela
ALTER TABLE parcelamentos
  ADD COLUMN valor_parcela NUMERIC(12,2) GENERATED ALWAYS AS (valor_total / parcelas_total) STORED;

-- Dia do mês em que a parcela vence
ALTER TABLE parcelamentos
  ADD COLUMN dia_vencimento INTEGER NOT NULL DEFAULT 1 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31);

-- Método de pagamento (cartao, pix, dinheiro, boleto, transferencia)
ALTER TABLE parcelamentos
  ADD COLUMN metodo_pagamento TEXT NOT NULL DEFAULT 'boleto';

-- Cartão vinculado (opcional, só quando metodo_pagamento = 'cartao')
ALTER TABLE parcelamentos
  ADD COLUMN cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL;
