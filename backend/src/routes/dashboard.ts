import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { gerarTransacoesFixas } from '../services/fixos.service';

const router = Router();

// GET /api/dashboard — Retorna todos os dados em uma chamada
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Gerar transações fixas pendentes (fallback)
    const fixosResult = await gerarTransacoesFixas(userId);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const inicioMes = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const fimMes = `${year}-${month}-${lastDay}`;

    // Buscar tudo em paralelo
    const [transacoesMesRes, todasTransacoesRes, ultimasRes, fixosRes, metasRes, investimentosRes, contasRes] = await Promise.all([
      supabase.from('transacoes').select('*').eq('user_id', userId).gte('data', inicioMes).lte('data', fimMes).order('data', { ascending: false }),
      supabase.from('transacoes').select('tipo, valor').eq('user_id', userId),
      supabase.from('transacoes').select('*').eq('user_id', userId).order('data', { ascending: false }).limit(5),
      supabase.from('fixos').select('id, nome, tipo, valor, categoria, ativo').eq('user_id', userId),
      supabase.from('metas').select('id, nome, valor_alvo, valor_atual, concluida, data_limite').eq('user_id', userId).order('concluida', { ascending: true }).limit(5),
      supabase.from('investimentos').select('id, nome, tipo, valor_investido, valor_atual').eq('user_id', userId),
      supabase.from('contas').select('id, nome, banco, tipo, saldo_inicial, cor, icone, ativa').eq('user_id', userId).eq('ativa', true).order('created_at', { ascending: true }),
    ]);

    const transacoesMes = transacoesMesRes.data || [];

    // Receitas e despesas do mês
    const receitasMes = transacoesMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const despesasMes = transacoesMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);

    // Saldo total
    const todas = todasTransacoesRes.data || [];
    const totalR = todas.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const totalD = todas.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);

    // Despesas por categoria
    const despesasPorCategoria: Record<string, number> = {};
    transacoesMes.filter(t => t.tipo === 'despesa').forEach(t => {
      despesasPorCategoria[t.categoria] = (despesasPorCategoria[t.categoria] || 0) + Number(t.valor);
    });

    // Histórico 6 meses
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const historico = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0');
      const ini = `${y}-${mo}-01`, ld = new Date(y, d.getMonth() + 1, 0).getDate(), fi = `${y}-${mo}-${ld}`;
      const { data } = await supabase.from('transacoes').select('tipo, valor').eq('user_id', userId).gte('data', ini).lte('data', fi);
      const r = (data || []).filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
      const dp = (data || []).filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);
      historico.push({ mes: `${monthNames[d.getMonth()]}/${String(y).slice(2)}`, Receitas: r, Despesas: dp });
    }

    res.json({
      receitasMes, despesasMes,
      economiaMes: receitasMes - despesasMes,
      saldoTotal: totalR - totalD,
      ultimasTransacoes: ultimasRes.data || [],
      despesasPorCategoria,
      historico,
      fixos: fixosRes.data || [],
      metas: metasRes.data || [],
      investimentos: investimentosRes.data || [],
      contas: contasRes.data || [],
      fixosGerados: fixosResult,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
