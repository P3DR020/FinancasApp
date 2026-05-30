import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/transacoes — Lista transações com filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mes, tipo, categoria, tag } = req.query;

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', req.userId!)
      .order('data', { ascending: false });

    if (mes) {
      const [year, month] = (mes as string).split('-');
      const inicio = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fim = `${year}-${month}-${lastDay}`;
      query = query.gte('data', inicio).lte('data', fim);
    }

    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo);
    }

    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    if (tag) {
      query = query.contains('tags', [tag as string]);
    }

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/transacoes/resumo — Resumo do mês atual
router.get('/resumo', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const inicio = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const fim = `${year}-${month}-${lastDay}`;

    // Transações do mês
    const { data: transacoesMes } = await supabase
      .from('transacoes')
      .select('tipo, valor')
      .eq('user_id', req.userId!)
      .gte('data', inicio)
      .lte('data', fim);

    const receitas = (transacoesMes || [])
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const despesas = (transacoesMes || [])
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    // Saldo total (todas as transações)
    const { data: todasTransacoes } = await supabase
      .from('transacoes')
      .select('tipo, valor')
      .eq('user_id', req.userId!);

    const totalReceitas = (todasTransacoes || [])
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const totalDespesas = (todasTransacoes || [])
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    res.json({
      receitasMes: receitas,
      despesasMes: despesas,
      economiaMes: receitas - despesas,
      saldoTotal: totalReceitas - totalDespesas,
    });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/transacoes/historico — Últimos 6 meses para gráfico
router.get('/historico', async (req: Request, res: Response) => {
  try {
    const meses = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const inicio = `${year}-${month}-01`;
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      const fim = `${year}-${month}-${lastDay}`;

      const { data } = await supabase
        .from('transacoes')
        .select('tipo, valor')
        .eq('user_id', req.userId!)
        .gte('data', inicio)
        .lte('data', fim);

      const receitas = (data || [])
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const despesas = (data || [])
        .filter(t => t.tipo === 'despesa')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const shortYear = String(year).slice(2);

      meses.push({
        mes: `${monthNames[d.getMonth()]}/${shortYear}`,
        Receitas: receitas,
        Despesas: despesas,
      });
    }

    res.json(meses);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/transacoes — Criar transação
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tipo, valor, descricao, categoria, data, tags } = req.body;

    if (!tipo || !valor || !descricao || !categoria || !data) {
      res.status(400).json({ error: 'Campos obrigatórios: tipo, valor, descricao, categoria, data' });
      return;
    }

    const { data: result, error } = await supabase.from('transacoes').insert({
      user_id: req.userId!,
      tipo,
      valor: Number(valor),
      descricao,
      categoria,
      data,
      tags: tags || [],
    }).select().single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transacoes/:id — Editar transação
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { tipo, valor, descricao, categoria, data, tags } = req.body;

    const { data: result, error } = await supabase
      .from('transacoes')
      .update({
        user_id: req.userId!,
        tipo,
        valor: Number(valor),
        descricao,
        categoria,
        data,
        tags: tags || [],
      })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/transacoes/:id — Excluir transação
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('transacoes')
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
