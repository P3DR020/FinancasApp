import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { gerarTransacoesFixas } from '../services/fixos.service';

const router = Router();

// GET /api/fixos — Lista todos os fixos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('fixos')
      .select('*')
      .eq('user_id', req.userId!)
      .order('tipo', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/fixos — Criar fixo
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, tipo, valor, categoria, dia_vencimento, ativo, notas } = req.body;

    if (!nome || !tipo || !valor || !categoria) {
      res.status(400).json({ error: 'Campos obrigatórios: nome, tipo, valor, categoria' });
      return;
    }

    const { data, error } = await supabase.from('fixos').insert({
      user_id: req.userId!,
      nome,
      tipo,
      valor: Number(valor),
      categoria,
      dia_vencimento: dia_vencimento ? Number(dia_vencimento) : null,
      ativo: ativo !== undefined ? ativo : true,
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

// PUT /api/fixos/:id — Editar fixo
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, tipo, valor, categoria, dia_vencimento, ativo, notas } = req.body;

    const { data, error } = await supabase
      .from('fixos')
      .update({
        user_id: req.userId!,
        nome,
        tipo,
        valor: Number(valor),
        categoria,
        dia_vencimento: dia_vencimento ? Number(dia_vencimento) : null,
        ativo,
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

// PATCH /api/fixos/:id/toggle — Ativar/desativar fixo
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    // Buscar estado atual
    const { data: fixo } = await supabase
      .from('fixos')
      .select('ativo')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!fixo) {
      res.status(404).json({ error: 'Fixo não encontrado' });
      return;
    }

    const { data, error } = await supabase
      .from('fixos')
      .update({ ativo: !fixo.ativo })
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

// DELETE /api/fixos/:id — Excluir fixo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('fixos')
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

// POST /api/fixos/gerar-transacoes — Gerar transações fixas do mês
router.post('/gerar-transacoes', async (req: Request, res: Response) => {
  try {
    const result = await gerarTransacoesFixas(req.userId!);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erro ao gerar transações fixas' });
  }
});

export default router;
