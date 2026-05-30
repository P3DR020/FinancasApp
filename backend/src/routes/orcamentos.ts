import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/orcamentos?mes=YYYY-MM
router.get('/', async (req: Request, res: Response) => {
  try {
    const mesAno = (req.query.mes as string) || (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    })();
    const inicio = `${mesAno}-01`;
    const [y, m] = mesAno.split('-');
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const fim = `${mesAno}-${lastDay}`;

    const [orcRes, transRes] = await Promise.all([
      supabase.from('orcamentos').select('*').eq('user_id', req.userId!).eq('mes_ano', mesAno),
      supabase.from('transacoes').select('categoria, valor').eq('user_id', req.userId!).eq('tipo', 'despesa').gte('data', inicio).lte('data', fim),
    ]);

    const gastos: Record<string, number> = {};
    (transRes.data || []).forEach(t => { gastos[t.categoria] = (gastos[t.categoria] || 0) + Number(t.valor); });

    res.json({ orcamentos: orcRes.data || [], gastos });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/orcamentos
router.post('/', async (req: Request, res: Response) => {
  try {
    const { categoria, limite, mes_ano } = req.body;
    if (!categoria || !limite || !mes_ano) { res.status(400).json({ error: 'Campos obrigatórios: categoria, limite, mes_ano' }); return; }

    const { data: existe } = await supabase.from('orcamentos').select('id').eq('user_id', req.userId!).eq('mes_ano', mes_ano).eq('categoria', categoria).single();
    if (existe) { res.status(409).json({ error: `Orçamento para "${categoria}" já existe neste mês` }); return; }

    const { data, error } = await supabase.from('orcamentos').insert({ user_id: req.userId!, categoria, limite: Number(limite), mes_ano }).select().single();
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/orcamentos/copiar-anterior
router.post('/copiar-anterior', async (req: Request, res: Response) => {
  try {
    const { mes_ano } = req.body;
    if (!mes_ano) { res.status(400).json({ error: 'Campo obrigatório: mes_ano' }); return; }

    const [yr, mo] = mes_ano.split('-').map(Number);
    const prev = new Date(yr, mo - 2, 1);
    const mesAnt = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const { data: anteriores } = await supabase.from('orcamentos').select('categoria, limite').eq('user_id', req.userId!).eq('mes_ano', mesAnt);
    if (!anteriores || anteriores.length === 0) { res.status(404).json({ error: 'Nenhum orçamento no mês anterior' }); return; }

    const { data: existentes } = await supabase.from('orcamentos').select('categoria').eq('user_id', req.userId!).eq('mes_ano', mes_ano);
    const catExist = new Set((existentes || []).map(o => o.categoria));

    const novos = anteriores.filter(a => !catExist.has(a.categoria)).map(a => ({ user_id: req.userId!, categoria: a.categoria, limite: Number(a.limite), mes_ano }));
    if (novos.length === 0) { res.status(409).json({ error: 'Todas as categorias já existem' }); return; }

    const { error } = await supabase.from('orcamentos').insert(novos);
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ copiados: novos.length });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/orcamentos/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('orcamentos').delete().eq('id', req.params.id).eq('user_id', req.userId!);
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
