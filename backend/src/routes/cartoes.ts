import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/cartoes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('user_id', req.userId!)
      .order('nome');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/cartoes
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, bandeira, limite, dia_fechamento, dia_vencimento, cor, ativo } = req.body;

    if (!nome || !bandeira || !limite || !dia_fechamento || !dia_vencimento) {
      res.status(400).json({ error: 'Campos obrigatórios: nome, bandeira, limite, dia_fechamento, dia_vencimento' });
      return;
    }

    const { data, error } = await supabase.from('cartoes').insert({
      user_id: req.userId!,
      nome,
      bandeira,
      limite: Number(limite),
      dia_fechamento: Number(dia_fechamento),
      dia_vencimento: Number(dia_vencimento),
      cor: cor || '#228be6',
      ativo: ativo !== undefined ? ativo : true,
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

// PUT /api/cartoes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, bandeira, limite, dia_fechamento, dia_vencimento, cor, ativo } = req.body;

    const { data, error } = await supabase
      .from('cartoes')
      .update({
        user_id: req.userId!,
        nome,
        bandeira,
        limite: Number(limite),
        dia_fechamento: Number(dia_fechamento),
        dia_vencimento: Number(dia_vencimento),
        cor: cor || '#228be6',
        ativo,
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

// PATCH /api/cartoes/:id/toggle
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { data: cartao } = await supabase
      .from('cartoes')
      .select('ativo')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!cartao) {
      res.status(404).json({ error: 'Cartão não encontrado' });
      return;
    }

    const { data, error } = await supabase
      .from('cartoes')
      .update({ ativo: !cartao.ativo })
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

// DELETE /api/cartoes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('cartoes')
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
