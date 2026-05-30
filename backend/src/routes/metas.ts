import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/metas — Lista metas
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('metas')
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

// POST /api/metas — Criar meta
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, valor_alvo, valor_atual, local_guardado, data_limite } = req.body;

    if (!nome || !valor_alvo) {
      res.status(400).json({ error: 'Campos obrigatórios: nome, valor_alvo' });
      return;
    }

    const valorAtual = Number(valor_atual) || 0;
    const valorAlvo = Number(valor_alvo);

    const { data, error } = await supabase.from('metas').insert({
      user_id: req.userId!,
      nome,
      valor_alvo: valorAlvo,
      valor_atual: valorAtual,
      local_guardado: local_guardado || null,
      data_limite: data_limite || null,
      concluida: valorAtual >= valorAlvo,
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

// PATCH /api/metas/:id/depositar — Adicionar valor à meta
router.patch('/:id/depositar', async (req: Request, res: Response) => {
  try {
    const { valor } = req.body;

    if (!valor || Number(valor) <= 0) {
      res.status(400).json({ error: 'Valor deve ser maior que zero' });
      return;
    }

    // Buscar meta atual
    const { data: meta } = await supabase
      .from('metas')
      .select('valor_atual, valor_alvo')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!meta) {
      res.status(404).json({ error: 'Meta não encontrada' });
      return;
    }

    const novoValor = Number(meta.valor_atual) + Number(valor);
    const concluida = novoValor >= Number(meta.valor_alvo);

    const { data, error } = await supabase
      .from('metas')
      .update({ valor_atual: novoValor, concluida })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ ...data, recemConcluida: concluida && !meta.valor_atual });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/metas/:id — Excluir meta
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('metas')
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
