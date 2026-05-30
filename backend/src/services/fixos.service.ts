import { supabase } from '../lib/supabase';

/**
 * Gera transações automáticas a partir dos fixos ativos para um usuário específico.
 * Verifica quais fixos já foram gerados no mês atual para evitar duplicatas.
 * Retorna a quantidade de transações geradas.
 */
export async function gerarTransacoesFixas(userId: string): Promise<{
  geradas: number;
  receitas: number;
  despesas: number;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const inicioMes = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const fimMes = `${year}-${month}-${lastDay}`;

  // Buscar fixos ativos do usuário
  const { data: fixosAtivos } = await supabase
    .from('fixos')
    .select('id, nome, tipo, valor, categoria, dia_vencimento')
    .eq('user_id', userId)
    .eq('ativo', true);

  if (!fixosAtivos || fixosAtivos.length === 0) {
    return { geradas: 0, receitas: 0, despesas: 0 };
  }

  // Buscar transações já geradas de fixos neste mês
  const { data: jaGeradas } = await supabase
    .from('transacoes')
    .select('fixo_id')
    .eq('user_id', userId)
    .not('fixo_id', 'is', null)
    .gte('data', inicioMes)
    .lte('data', fimMes);

  const idsJaGerados = new Set((jaGeradas || []).map(t => t.fixo_id));

  // Filtrar os que ainda não foram gerados
  const pendentes = fixosAtivos.filter(f => !idsJaGerados.has(f.id));

  if (pendentes.length === 0) {
    return { geradas: 0, receitas: 0, despesas: 0 };
  }

  // Criar transações
  const novasTransacoes = pendentes.map(f => {
    const dia = f.dia_vencimento || now.getDate();
    const diaReal = Math.min(dia, lastDay);
    const dataTransacao = `${year}-${month}-${String(diaReal).padStart(2, '0')}`;
    return {
      user_id: userId,
      tipo: f.tipo,
      valor: Number(f.valor),
      descricao: `${f.nome} (fixo)`,
      categoria: f.categoria,
      data: dataTransacao,
      fixo_id: f.id,
    };
  });

  const { error } = await supabase.from('transacoes').insert(novasTransacoes);

  if (error) {
    console.error(`Erro ao gerar transações fixas para user ${userId}:`, error.message);
    return { geradas: 0, receitas: 0, despesas: 0 };
  }

  const receitas = pendentes.filter(f => f.tipo === 'receita').length;
  const despesas = pendentes.filter(f => f.tipo === 'despesa').length;

  console.log(`✅ Geradas ${pendentes.length} transações fixas para user ${userId} (${receitas}R, ${despesas}D)`);

  return { geradas: pendentes.length, receitas, despesas };
}
