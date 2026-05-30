import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

const router = Router();

// GET /api/cartoes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('user_id', req.userId!)
      .order('nome');

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/cartoes/resumo — Totais de todos os cartões no mês atual (para dashboard)
router.get('/resumo', async (req: Request, res: Response) => {
  try {
    const now = dayjs();
    const inicioMes = now.startOf('month').format('YYYY-MM-DD');
    const fimMes = now.endOf('month').format('YYYY-MM-DD');

    const { data: cartoes } = await supabase
      .from('cartoes')
      .select('id, nome, limite, cor, dia_vencimento, dia_fechamento')
      .eq('user_id', req.userId!)
      .eq('ativo', true);

    const resumos = await Promise.all((cartoes || []).map(async (c) => {
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('valor')
        .eq('user_id', req.userId!)
        .eq('cartao_id', c.id)
        .eq('tipo', 'despesa')
        .gte('data', inicioMes)
        .lte('data', fimMes);

      const gastoMes = (transacoes || []).reduce((s, t) => s + Number(t.valor), 0);
      const pctUsado = Number(c.limite) > 0 ? (gastoMes / Number(c.limite)) * 100 : 0;

      const hoje = now.date();
      const diaVenc = Number(c.dia_vencimento);
      const diaFech = Number(c.dia_fechamento);

      const proximoVencimento = hoje <= diaVenc
        ? now.date(diaVenc).format('YYYY-MM-DD')
        : now.add(1, 'month').date(diaVenc).format('YYYY-MM-DD');
      const diasParaVencer = dayjs(proximoVencimento).diff(now, 'day');

      const proximoFechamento = hoje <= diaFech
        ? now.date(diaFech).format('YYYY-MM-DD')
        : now.add(1, 'month').date(diaFech).format('YYYY-MM-DD');
      const diasParaFechar = dayjs(proximoFechamento).diff(now, 'day');

      return {
        ...c,
        gastoMes,
        limiteDisponivel: Number(c.limite) - gastoMes,
        pctUsado: Math.min(pctUsado, 100),
        proximoVencimento,
        diasParaVencer,
        proximoFechamento,
        diasParaFechar,
        alertaVencimento: diasParaVencer <= 5,
        alertaFechamento: diasParaFechar <= 3,
      };
    }));

    res.json(resumos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/cartoes/:id/fatura?mes=YYYY-MM — Fatura detalhada do cartão
router.get('/:id/fatura', async (req: Request, res: Response) => {
  try {
    const mesParam = (req.query.mes as string) || dayjs().format('YYYY-MM');
    const [year, month] = mesParam.split('-');
    const inicio = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const fim = `${year}-${month}-${lastDay}`;

    const { data: cartao, error: errCartao } = await supabase
      .from('cartoes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (errCartao || !cartao) { res.status(404).json({ error: 'Cartão não encontrado' }); return; }

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', req.userId!)
      .eq('cartao_id', cartao.id)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false });

    const gastos = (transacoes || []).filter(t => t.tipo === 'despesa');
    const creditos = (transacoes || []).filter(t => t.tipo === 'receita');
    const totalGastos = gastos.reduce((s, t) => s + Number(t.valor), 0);
    const totalCreditos = creditos.reduce((s, t) => s + Number(t.valor), 0);
    const valorFatura = totalGastos - totalCreditos;

    const porCategoria: Record<string, number> = {};
    gastos.forEach(t => {
      porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + Number(t.valor);
    });

    const hoje = dayjs();
    const nowDate = hoje.date();
    const diaVenc = Number(cartao.dia_vencimento);
    const diaFech = Number(cartao.dia_fechamento);

    const proximoVencimento = nowDate <= diaVenc
      ? hoje.date(diaVenc).format('YYYY-MM-DD')
      : hoje.add(1, 'month').date(diaVenc).format('YYYY-MM-DD');
    const diasParaVencer = dayjs(proximoVencimento).diff(hoje, 'day');

    const proximoFechamento = nowDate <= diaFech
      ? hoje.date(diaFech).format('YYYY-MM-DD')
      : hoje.add(1, 'month').date(diaFech).format('YYYY-MM-DD');
    const diasParaFechar = dayjs(proximoFechamento).diff(hoje, 'day');

    res.json({
      cartao,
      mes: mesParam,
      transacoes: transacoes || [],
      totalGastos,
      totalCreditos,
      valorFatura,
      limiteDisponivel: Number(cartao.limite) - valorFatura,
      pctUsado: Number(cartao.limite) > 0 ? Math.min((valorFatura / Number(cartao.limite)) * 100, 100) : 0,
      porCategoria,
      proximoVencimento,
      diasParaVencer,
      proximoFechamento,
      diasParaFechar,
      alertaVencimento: diasParaVencer <= 5,
      alertaFechamento: diasParaFechar <= 3,
    });
  } catch (err) {
    console.error(err);
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
      user_id: req.userId!, nome, bandeira,
      limite: Number(limite),
      dia_fechamento: Number(dia_fechamento),
      dia_vencimento: Number(dia_vencimento),
      cor: cor || '#228be6',
      ativo: ativo !== undefined ? ativo : true,
    }).select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
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
      .update({ user_id: req.userId!, nome, bandeira, limite: Number(limite), dia_fechamento: Number(dia_fechamento), dia_vencimento: Number(dia_vencimento), cor: cor || '#228be6', ativo })
      .eq('id', req.params.id).eq('user_id', req.userId!)
      .select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/cartoes/:id/toggle
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { data: cartao } = await supabase.from('cartoes').select('ativo').eq('id', req.params.id).eq('user_id', req.userId!).single();
    if (!cartao) { res.status(404).json({ error: 'Cartão não encontrado' }); return; }
    const { data, error } = await supabase.from('cartoes').update({ ativo: !cartao.ativo }).eq('id', req.params.id).eq('user_id', req.userId!).select().single();
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/cartoes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await supabase.from('transacoes').update({ cartao_id: null }).eq('cartao_id', req.params.id).eq('user_id', req.userId!);
    const { error } = await supabase.from('cartoes').delete().eq('id', req.params.id).eq('user_id', req.userId!);
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
