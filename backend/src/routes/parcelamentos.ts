import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/parcelamentos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('parcelamentos').select('*')
      .eq('user_id', req.userId!)
      .order('concluido', { ascending: true })
      .order('criado_em', { ascending: false });
    if (error) { res.status(400).json({ error: error.message }); return; }
    // Also fetch cartoes for display
    const { data: cartoes } = await supabase.from('cartoes').select('id, nome, bandeira, cor, ativo')
      .eq('user_id', req.userId!).order('nome');
    res.json({ parcelamentos: data || [], cartoes: cartoes || [] });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/parcelamentos
router.post('/', async (req: Request, res: Response) => {
  try {
    const { descricao, valor_total, parcelas_total, categoria, data_primeira_parcela, dia_vencimento, notas, metodo_pagamento, cartao_id } = req.body;
    if (!descricao || !valor_total || !parcelas_total || !categoria || !data_primeira_parcela || !dia_vencimento) {
      res.status(400).json({ error: 'Campos obrigatórios faltando' }); return;
    }
    const { data, error } = await supabase.from('parcelamentos').insert({
      user_id: req.userId!, descricao, valor_total: Number(valor_total),
      parcelas_total: Number(parcelas_total), parcelas_pagas: 0,
      categoria, data_primeira_parcela, dia_vencimento: Number(dia_vencimento),
      notas: notas || null, concluido: false,
      metodo_pagamento: metodo_pagamento || 'boleto',
      cartao_id: metodo_pagamento === 'cartao' && cartao_id ? cartao_id : null,
    }).select().single();
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /api/parcelamentos/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { descricao, valor_total, parcelas_total, parcelas_pagas, categoria, data_primeira_parcela, dia_vencimento, notas, metodo_pagamento, cartao_id } = req.body;
    const pagas = Math.min(Number(parcelas_pagas) || 0, Number(parcelas_total));
    const { data, error } = await supabase.from('parcelamentos').update({
      user_id: req.userId!, descricao, valor_total: Number(valor_total),
      parcelas_total: Number(parcelas_total), parcelas_pagas: pagas,
      categoria, data_primeira_parcela, dia_vencimento: Number(dia_vencimento),
      notas: notas || null, concluido: pagas >= Number(parcelas_total),
      metodo_pagamento: metodo_pagamento || 'boleto',
      cartao_id: metodo_pagamento === 'cartao' && cartao_id ? cartao_id : null,
    }).eq('id', req.params.id).eq('user_id', req.userId!).select().single();
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/parcelamentos/:id/pagar — Pagar parcela + criar transação
router.post('/:id/pagar', async (req: Request, res: Response) => {
  try {
    const { data: parc } = await supabase.from('parcelamentos')
      .select('*').eq('id', req.params.id).eq('user_id', req.userId!).single();
    if (!parc) { res.status(404).json({ error: 'Parcelamento não encontrado' }); return; }
    if (parc.concluido) { res.status(400).json({ error: 'Parcelamento já quitado' }); return; }

    const novasPagas = parc.parcelas_pagas + 1;
    const concluido = novasPagas >= parc.parcelas_total;
    const valorParcela = Number(parc.valor_total) / parc.parcelas_total;

    // Atualizar parcelamento
    const { error: updErr } = await supabase.from('parcelamentos')
      .update({ parcelas_pagas: novasPagas, concluido })
      .eq('id', req.params.id).eq('user_id', req.userId!);
    if (updErr) { res.status(400).json({ error: updErr.message }); return; }

    // Criar transação de despesa
    const now = new Date();
    const dataHoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await supabase.from('transacoes').insert({
      user_id: req.userId!, tipo: 'despesa', valor: valorParcela,
      descricao: `${parc.descricao} (parcela ${novasPagas}/${parc.parcelas_total})`,
      categoria: parc.categoria, data: dataHoje, tags: ['parcelamento'],
    });

    res.json({ parcelas_pagas: novasPagas, concluido, valor_parcela: valorParcela });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/parcelamentos/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('parcelamentos').delete()
      .eq('id', req.params.id).eq('user_id', req.userId!);
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
