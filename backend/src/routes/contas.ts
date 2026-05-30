import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/contas — Lista contas com saldo calculado
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: contas, error } = await supabase
      .from('contas')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: true });

    if (error) { res.status(400).json({ error: error.message }); return; }

    // Para cada conta, calcular saldo real = saldo_inicial + receitas - despesas
    const contasComSaldo = await Promise.all((contas || []).map(async (conta) => {
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('tipo, valor')
        .eq('user_id', req.userId!)
        .eq('conta_id', conta.id);

      const receitas = (transacoes || [])
        .filter(t => t.tipo === 'receita')
        .reduce((s, t) => s + Number(t.valor), 0);
      const despesas = (transacoes || [])
        .filter(t => t.tipo === 'despesa')
        .reduce((s, t) => s + Number(t.valor), 0);

      // Transferências recebidas e enviadas
      const { data: recebidas } = await supabase
        .from('transferencias')
        .select('valor')
        .eq('user_id', req.userId!)
        .eq('conta_destino_id', conta.id);
      const { data: enviadas } = await supabase
        .from('transferencias')
        .select('valor')
        .eq('user_id', req.userId!)
        .eq('conta_origem_id', conta.id);

      const totalRecebido = (recebidas || []).reduce((s, t) => s + Number(t.valor), 0);
      const totalEnviado = (enviadas || []).reduce((s, t) => s + Number(t.valor), 0);

      const saldoAtual = Number(conta.saldo_inicial) + receitas - despesas + totalRecebido - totalEnviado;

      return { ...conta, saldoAtual };
    }));

    res.json(contasComSaldo);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/contas/resumo — Saldo total consolidado
router.get('/resumo', async (req: Request, res: Response) => {
  try {
    const { data: contas } = await supabase
      .from('contas')
      .select('id, saldo_inicial')
      .eq('user_id', req.userId!)
      .eq('ativa', true);

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('tipo, valor, conta_id')
      .eq('user_id', req.userId!);

    const contaIds = new Set((contas || []).map(c => c.id));

    const saldoTotal = (contas || []).reduce((sum, c) => sum + Number(c.saldo_inicial), 0)
      + (transacoes || []).filter(t => t.conta_id && contaIds.has(t.conta_id))
        .reduce((sum, t) => sum + (t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor)), 0);

    res.json({ saldoTotal, totalContas: (contas || []).length });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/contas/:id/extrato — Transações de uma conta específica
router.get('/:id/extrato', async (req: Request, res: Response) => {
  try {
    const { mes } = req.query;

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', req.userId!)
      .eq('conta_id', req.params.id)
      .order('data', { ascending: false });

    if (mes) {
      const [year, month] = (mes as string).split('-');
      const inicio = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fim = `${year}-${month}-${lastDay}`;
      query = query.gte('data', inicio).lte('data', fim);
    }

    const { data, error } = await query;
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data || []);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/contas — Criar conta
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, banco, tipo, saldo_inicial, cor, icone } = req.body;

    if (!nome) { res.status(400).json({ error: 'Nome da conta é obrigatório' }); return; }

    const { data, error } = await supabase.from('contas').insert({
      user_id: req.userId!,
      nome,
      banco: banco || '',
      tipo: tipo || 'corrente',
      saldo_inicial: Number(saldo_inicial) || 0,
      cor: cor || '#20c997',
      icone: icone || '🏦',
    }).select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/contas/:id — Editar conta
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, banco, tipo, saldo_inicial, cor, icone } = req.body;

    const { data, error } = await supabase
      .from('contas')
      .update({ nome, banco, tipo, saldo_inicial: Number(saldo_inicial), cor, icone })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/contas/:id/toggle — Ativar/desativar conta
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { data: current } = await supabase
      .from('contas').select('ativa').eq('id', req.params.id).eq('user_id', req.userId!).single();

    const { data, error } = await supabase
      .from('contas')
      .update({ ativa: !current?.ativa })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/contas/:id — Excluir conta
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Desvincular transações antes de excluir
    await supabase.from('transacoes')
      .update({ conta_id: null })
      .eq('conta_id', req.params.id)
      .eq('user_id', req.userId!);

    const { error } = await supabase
      .from('contas')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/contas/transferir — Transferência entre contas
router.post('/transferir', async (req: Request, res: Response) => {
  try {
    const { conta_origem_id, conta_destino_id, valor, descricao, data } = req.body;

    if (!conta_origem_id || !conta_destino_id || !valor) {
      res.status(400).json({ error: 'conta_origem_id, conta_destino_id e valor são obrigatórios' });
      return;
    }
    if (conta_origem_id === conta_destino_id) {
      res.status(400).json({ error: 'Conta de origem e destino não podem ser iguais' });
      return;
    }

    const dataTransf = data || new Date().toISOString().split('T')[0];
    const descTransf = descricao || 'Transferência entre contas';

    // Registrar na tabela transferencias
    const { data: transf, error: errTransf } = await supabase.from('transferencias').insert({
      user_id: req.userId!,
      conta_origem_id,
      conta_destino_id,
      valor: Number(valor),
      descricao: descTransf,
      data: dataTransf,
    }).select().single();

    if (errTransf) { res.status(400).json({ error: errTransf.message }); return; }

    // Criar transação de SAÍDA na conta de origem
    await supabase.from('transacoes').insert({
      user_id: req.userId!,
      tipo: 'despesa',
      valor: Number(valor),
      descricao: `↗️ ${descTransf}`,
      categoria: 'Transferência',
      data: dataTransf,
      conta_id: conta_origem_id,
      tags: ['transferencia'],
    });

    // Criar transação de ENTRADA na conta de destino
    await supabase.from('transacoes').insert({
      user_id: req.userId!,
      tipo: 'receita',
      valor: Number(valor),
      descricao: `↘️ ${descTransf}`,
      categoria: 'Transferência',
      data: dataTransf,
      conta_id: conta_destino_id,
      tags: ['transferencia'],
    });

    res.status(201).json(transf);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
