import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

interface SearchResult {
  id: string;
  tipo: 'transacao' | 'meta' | 'investimento' | 'fixo' | 'cartao' | 'parcelamento' | 'conta';
  titulo: string;
  subtitulo: string;
  valor?: number;
  rota: string;
}

// GET /api/busca?q=termo — Busca global em todas as tabelas
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      res.json([]);
      return;
    }

    const userId = req.userId!;
    const resultados: SearchResult[] = [];
    const searchPattern = `%${query}%`;

    // Buscar em paralelo em todas as tabelas
    const [
      transacoesRes,
      metasRes,
      investimentosRes,
      fixosRes,
      cartoesRes,
      parcelamentosRes,
      contasRes,
    ] = await Promise.all([
      // Transações: busca por descrição, categoria e tags
      supabase
        .from('transacoes')
        .select('id, descricao, categoria, tipo, valor, data, tags')
        .eq('user_id', userId)
        .or(`descricao.ilike.${searchPattern},categoria.ilike.${searchPattern}`)
        .order('data', { ascending: false })
        .limit(8),

      // Metas: busca por nome
      supabase
        .from('metas')
        .select('id, nome, valor_alvo, valor_atual, concluida')
        .eq('user_id', userId)
        .ilike('nome', searchPattern)
        .limit(5),

      // Investimentos: busca por nome, tipo, corretora
      supabase
        .from('investimentos')
        .select('id, nome, tipo, corretora, valor_atual')
        .eq('user_id', userId)
        .or(`nome.ilike.${searchPattern},tipo.ilike.${searchPattern},corretora.ilike.${searchPattern}`)
        .limit(5),

      // Fixos: busca por nome, categoria
      supabase
        .from('fixos')
        .select('id, nome, tipo, valor, categoria, ativo')
        .eq('user_id', userId)
        .or(`nome.ilike.${searchPattern},categoria.ilike.${searchPattern}`)
        .limit(5),

      // Cartões: busca por nome, bandeira
      supabase
        .from('cartoes')
        .select('id, nome, bandeira, limite')
        .eq('user_id', userId)
        .or(`nome.ilike.${searchPattern},bandeira.ilike.${searchPattern}`)
        .limit(5),

      // Parcelamentos: busca por descrição, categoria
      supabase
        .from('parcelamentos')
        .select('id, descricao, categoria, valor_total, parcelas_pagas, parcelas_total, concluido')
        .eq('user_id', userId)
        .or(`descricao.ilike.${searchPattern},categoria.ilike.${searchPattern}`)
        .limit(5),

      // Contas: busca por nome, banco
      supabase
        .from('contas')
        .select('id, nome, banco, tipo')
        .eq('user_id', userId)
        .or(`nome.ilike.${searchPattern},banco.ilike.${searchPattern}`)
        .limit(5),
    ]);

    // Mapear transações
    (transacoesRes.data || []).forEach((t) => {
      resultados.push({
        id: t.id,
        tipo: 'transacao',
        titulo: t.descricao,
        subtitulo: `${t.tipo === 'receita' ? '📈 Receita' : '📉 Despesa'} • ${t.categoria} • ${t.data}`,
        valor: Number(t.valor),
        rota: '/transacoes',
      });
    });

    // Mapear metas
    (metasRes.data || []).forEach((m) => {
      const pct = Number(m.valor_alvo) > 0 ? Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100) : 0;
      resultados.push({
        id: m.id,
        tipo: 'meta',
        titulo: m.nome,
        subtitulo: `🎯 Meta • ${pct}% concluída${m.concluida ? ' ✅' : ''}`,
        valor: Number(m.valor_alvo),
        rota: '/metas',
      });
    });

    // Mapear investimentos
    (investimentosRes.data || []).forEach((i) => {
      resultados.push({
        id: i.id,
        tipo: 'investimento',
        titulo: i.nome,
        subtitulo: `📊 ${i.tipo} • ${i.corretora}`,
        valor: Number(i.valor_atual),
        rota: '/investimentos',
      });
    });

    // Mapear fixos
    (fixosRes.data || []).forEach((f) => {
      resultados.push({
        id: f.id,
        tipo: 'fixo',
        titulo: f.nome,
        subtitulo: `🔄 ${f.tipo === 'receita' ? 'Receita fixa' : 'Despesa fixa'} • ${f.categoria}${!f.ativo ? ' (inativo)' : ''}`,
        valor: Number(f.valor),
        rota: '/fixos',
      });
    });

    // Mapear cartões
    (cartoesRes.data || []).forEach((c) => {
      resultados.push({
        id: c.id,
        tipo: 'cartao',
        titulo: c.nome,
        subtitulo: `💳 ${c.bandeira}`,
        valor: Number(c.limite),
        rota: '/cartoes',
      });
    });

    // Mapear parcelamentos
    (parcelamentosRes.data || []).forEach((p) => {
      resultados.push({
        id: p.id,
        tipo: 'parcelamento',
        titulo: p.descricao,
        subtitulo: `📋 ${p.parcelas_pagas}/${p.parcelas_total} parcelas • ${p.categoria}${p.concluido ? ' ✅' : ''}`,
        valor: Number(p.valor_total),
        rota: '/parcelamentos',
      });
    });

    // Mapear contas
    (contasRes.data || []).forEach((ct) => {
      resultados.push({
        id: ct.id,
        tipo: 'conta',
        titulo: ct.nome,
        subtitulo: `🏦 ${ct.banco || 'Conta'} • ${ct.tipo}`,
        rota: '/contas',
      });
    });

    // Busca adicional por tags (transações com tag match)
    const { data: tagResults } = await supabase
      .from('transacoes')
      .select('id, descricao, categoria, tipo, valor, data, tags')
      .eq('user_id', userId)
      .contains('tags', [query])
      .limit(5);

    (tagResults || []).forEach((t) => {
      // Evitar duplicatas
      if (!resultados.find((r) => r.id === t.id)) {
        resultados.push({
          id: t.id,
          tipo: 'transacao',
          titulo: t.descricao,
          subtitulo: `🏷️ Tag: "${query}" • ${t.categoria} • ${t.data}`,
          valor: Number(t.valor),
          rota: '/transacoes',
        });
      }
    });

    res.json(resultados);
  } catch (err) {
    console.error('Erro na busca global:', err);
    res.status(500).json({ error: 'Erro ao realizar busca' });
  }
});

export default router;
