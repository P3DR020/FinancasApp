import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/investimentos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .eq('user_id', req.userId!)
      .order('criado_em', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/investimentos
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, tipo, corretora, valor_investido, valor_atual, data_compra, notas } = req.body;

    if (!nome || !tipo || !corretora || !valor_investido || valor_atual === undefined || !data_compra) {
      res.status(400).json({ error: 'Campos obrigatórios: nome, tipo, corretora, valor_investido, valor_atual, data_compra' });
      return;
    }

    const { data, error } = await supabase.from('investimentos').insert({
      user_id: req.userId!,
      nome,
      tipo,
      corretora,
      valor_investido: Number(valor_investido),
      valor_atual: Number(valor_atual),
      data_compra,
      notas: notas || null,
    }).select().single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/investimentos/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, tipo, corretora, valor_investido, valor_atual, data_compra, notas } = req.body;

    const { data, error } = await supabase
      .from('investimentos')
      .update({
        user_id: req.userId!,
        nome,
        tipo,
        corretora,
        valor_investido: Number(valor_investido),
        valor_atual: Number(valor_atual),
        data_compra,
        notas: notas || null,
      })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/investimentos/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('investimentos')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
