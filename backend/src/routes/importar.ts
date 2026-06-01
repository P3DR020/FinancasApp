import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/importar/verificar-duplicatas
 * Recebe uma lista de transações parsadas e verifica duplicatas no banco.
 * Retorna quais transações já existem (potenciais duplicatas).
 */
router.post('/verificar-duplicatas', async (req: Request, res: Response) => {
  try {
    const { transacoes } = req.body as {
      transacoes: Array<{ data: string; valor: number; descricao: string }>;
    };

    if (!transacoes || !Array.isArray(transacoes) || transacoes.length === 0) {
      res.status(400).json({ error: 'Lista de transações é obrigatória' });
      return;
    }

    // Buscar transações do usuário no período do extrato
    const datas = transacoes.map((t) => t.data).filter(Boolean);
    const dataMin = datas.sort()[0];
    const dataMax = datas.sort().reverse()[0];

    const { data: existentes, error } = await supabase
      .from('transacoes')
      .select('data, valor, descricao')
      .eq('user_id', req.userId!)
      .gte('data', dataMin)
      .lte('data', dataMax);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Verificar duplicatas por data + valor + descrição similar
    const duplicatas: number[] = [];

    transacoes.forEach((t, index) => {
      const isDuplicata = (existentes || []).some((e) => {
        const mesmaData = e.data === t.data;
        const mesmoValor = Math.abs(Number(e.valor) - Math.abs(t.valor)) < 0.01;
        const descricaoSimilar =
          e.descricao.toLowerCase().includes(t.descricao.toLowerCase().slice(0, 10)) ||
          t.descricao.toLowerCase().includes(e.descricao.toLowerCase().slice(0, 10));
        return mesmaData && mesmoValor && descricaoSimilar;
      });

      if (isDuplicata) {
        duplicatas.push(index);
      }
    });

    res.json({ duplicatas, totalExistentes: (existentes || []).length });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/importar/confirmar
 * Recebe a lista final de transações confirmadas e insere em lote.
 */
router.post('/confirmar', async (req: Request, res: Response) => {
  try {
    const { transacoes } = req.body as {
      transacoes: Array<{
        tipo: 'receita' | 'despesa';
        valor: number;
        descricao: string;
        categoria: string;
        data: string;
        tags: string[];
        conta_id: string | null;
      }>;
    };

    if (!transacoes || !Array.isArray(transacoes) || transacoes.length === 0) {
      res.status(400).json({ error: 'Lista de transações é obrigatória' });
      return;
    }

    // Limitar a 500 transações por vez
    if (transacoes.length > 500) {
      res.status(400).json({ error: 'Máximo de 500 transações por importação' });
      return;
    }

    // Preparar registros para inserção
    const registros = transacoes.map((t) => ({
      user_id: req.userId!,
      tipo: t.tipo,
      valor: Math.abs(Number(t.valor)),
      descricao: t.descricao,
      categoria: t.categoria,
      data: t.data,
      tags: t.tags || ['importado'],
      conta_id: t.conta_id || null,
    }));

    const { data: result, error } = await supabase
      .from('transacoes')
      .insert(registros)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      importadas: (result || []).length,
      transacoes: result,
    });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
