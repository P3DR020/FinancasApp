import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SimpleGrid,
  Paper,
  Text,
  Group,
  Stack,
  Table,
  Badge,
  Button,
  Title,
  Box,
  LoadingOverlay,
  ThemeIcon,
} from '@mantine/core';
import { DonutChart, BarChart } from '@mantine/charts';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconWallet,
  IconPigMoney,
  IconArrowRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Transacao {
  id: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  descricao: string;
  categoria: string;
  data: string;
}

interface ResumoMensal {
  mes: string;
  Receitas: number;
  Despesas: number;
}

const categoryColors: Record<string, string> = {
  'Salário': 'teal.6',
  'Freelance': 'cyan.6',
  'Investimentos': 'indigo.6',
  'Alimentação': 'orange.6',
  'Transporte': 'blue.6',
  'Saúde': 'red.6',
  'Educação': 'violet.6',
  'Lazer': 'grape.6',
  'Moradia': 'yellow.6',
  'Outros': 'gray.6',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [receitasMes, setReceitasMes] = useState(0);
  const [despesasMes, setDespesasMes] = useState(0);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [economiaMes, setEconomiaMes] = useState(0);
  const [ultimasTransacoes, setUltimasTransacoes] = useState<Transacao[]>([]);
  const [donutData, setDonutData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [barData, setBarData] = useState<ResumoMensal[]>([]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    const inicioMes = dayjs().startOf('month').format('YYYY-MM-DD');
    const fimMes = dayjs().endOf('month').format('YYYY-MM-DD');

    // Fetch all transactions for current month
    const { data: transacoesMes } = await supabase
      .from('transacoes')
      .select('*')
      .gte('data', inicioMes)
      .lte('data', fimMes)
      .order('data', { ascending: false });

    const receitas = (transacoesMes || [])
      .filter((t) => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const despesas = (transacoesMes || [])
      .filter((t) => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    setReceitasMes(receitas);
    setDespesasMes(despesas);
    setEconomiaMes(receitas - despesas);

    // Fetch all transactions for total balance
    const { data: todasTransacoes } = await supabase
      .from('transacoes')
      .select('tipo, valor');

    const totalReceitas = (todasTransacoes || [])
      .filter((t) => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const totalDespesas = (todasTransacoes || [])
      .filter((t) => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    setSaldoTotal(totalReceitas - totalDespesas);

    // Last 5 transactions
    const { data: ultimas } = await supabase
      .from('transacoes')
      .select('*')
      .order('data', { ascending: false })
      .limit(5);

    setUltimasTransacoes(ultimas || []);

    // Donut chart: expenses by category this month
    const despesasPorCategoria: Record<string, number> = {};
    (transacoesMes || [])
      .filter((t) => t.tipo === 'despesa')
      .forEach((t) => {
        despesasPorCategoria[t.categoria] =
          (despesasPorCategoria[t.categoria] || 0) + Number(t.valor);
      });

    setDonutData(
      Object.entries(despesasPorCategoria).map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name] || 'gray.6',
      }))
    );

    // Bar chart: last 6 months
    const meses: ResumoMensal[] = [];
    for (let i = 5; i >= 0; i--) {
      const mesRef = dayjs().subtract(i, 'month');
      const inicio = mesRef.startOf('month').format('YYYY-MM-DD');
      const fim = mesRef.endOf('month').format('YYYY-MM-DD');

      const { data: mesData } = await supabase
        .from('transacoes')
        .select('tipo, valor')
        .gte('data', inicio)
        .lte('data', fim);

      const r = (mesData || [])
        .filter((t) => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const d = (mesData || [])
        .filter((t) => t.tipo === 'despesa')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      meses.push({
        mes: mesRef.format('MMM/YY'),
        Receitas: r,
        Despesas: d,
      });
    }
    setBarData(meses);

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const statCards = [
    {
      title: 'Receitas do mês',
      value: receitasMes,
      color: 'teal',
      cssClass: 'stat-teal',
      icon: IconArrowUpRight,
    },
    {
      title: 'Despesas do mês',
      value: despesasMes,
      color: 'red',
      cssClass: 'stat-red',
      icon: IconArrowDownRight,
    },
    {
      title: 'Saldo total',
      value: saldoTotal,
      color: 'blue',
      cssClass: 'stat-blue',
      icon: IconWallet,
    },
    {
      title: 'Economia do mês',
      value: economiaMes,
      color: 'yellow',
      cssClass: 'stat-yellow',
      icon: IconPigMoney,
    },
  ];

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay
        visible={loading}
        zIndex={100}
        overlayProps={{ blur: 2 }}
        loaderProps={{ color: 'teal', type: 'bars' }}
      />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>
            Dashboard
          </Title>
          <Text c="dimmed" size="sm">
            Resumo financeiro de {dayjs().format('MMMM [de] YYYY')}
          </Text>
        </div>
      </Group>

      {/* Stat Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        {statCards.map((card, i) => (
          <Paper
            key={card.title}
            withBorder
            p="md"
            radius="md"
            className={`stat-card ${card.cssClass} card-hover animate-fade-in-up`}
            style={{
              animationDelay: `${i * 0.08}s`,
              borderColor: 'var(--mantine-color-dark-4)',
            }}
          >
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                {card.title}
              </Text>
              <ThemeIcon variant="light" color={card.color} size="sm" radius="xl">
                <card.icon size={14} />
              </ThemeIcon>
            </Group>
            <Text size="xl" fw={700} c={card.color}>
              {formatCurrency(card.value)}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        {/* Donut chart - Expenses by category */}
        <Paper
          withBorder
          p="lg"
          radius="md"
          className="animate-fade-in-up"
          style={{
            animationDelay: '0.32s',
            borderColor: 'var(--mantine-color-dark-4)',
          }}
        >
          <Text fw={600} mb="md">
            Despesas por categoria
          </Text>
          {donutData.length > 0 ? (
            <DonutChart
              data={donutData}
              tooltipDataSource="segment"
              withLabelsLine
              withLabels
              chartLabel={formatCurrency(despesasMes)}
              h={260}
            />
          ) : (
            <Stack align="center" justify="center" h={260}>
              <Text c="dimmed" size="sm">
                Nenhuma despesa registrada este mês
              </Text>
            </Stack>
          )}
        </Paper>

        {/* Bar chart - Income vs Expenses */}
        <Paper
          withBorder
          p="lg"
          radius="md"
          className="animate-fade-in-up"
          style={{
            animationDelay: '0.4s',
            borderColor: 'var(--mantine-color-dark-4)',
          }}
        >
          <Text fw={600} mb="md">
            Receitas vs Despesas (últimos 6 meses)
          </Text>
          {barData.length > 0 ? (
            <BarChart
              h={260}
              data={barData}
              dataKey="mes"
              series={[
                { name: 'Receitas', color: 'teal.6' },
                { name: 'Despesas', color: 'red.6' },
              ]}
              tickLine="y"
              gridAxis="y"
            />
          ) : (
            <Stack align="center" justify="center" h={260}>
              <Text c="dimmed" size="sm">
                Nenhum dado disponível
              </Text>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      {/* Recent Transactions */}
      <Paper
        withBorder
        p="lg"
        radius="md"
        className="animate-fade-in-up"
        style={{
          animationDelay: '0.48s',
          borderColor: 'var(--mantine-color-dark-4)',
        }}
      >
        <Group justify="space-between" mb="md">
          <Text fw={600}>Últimas transações</Text>
          <Button
            variant="subtle"
            color="teal"
            size="xs"
            rightSection={<IconArrowRight size={14} />}
            onClick={() => navigate('/transacoes')}
          >
            Ver todas
          </Button>
        </Group>

        {ultimasTransacoes.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ultimasTransacoes.map((t) => (
                <Table.Tr key={t.id} className="table-row-enter">
                  <Table.Td>
                    <Text size="sm">{dayjs(t.data).format('DD/MM/YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {t.descricao}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {t.categoria}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={t.tipo === 'receita' ? 'teal' : 'red'}
                      variant="light"
                      size="sm"
                    >
                      {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text
                      size="sm"
                      fw={600}
                      c={t.tipo === 'receita' ? 'teal' : 'red'}
                    >
                      {t.tipo === 'receita' ? '+' : '-'}{' '}
                      {formatCurrency(Number(t.valor))}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Stack align="center" py="xl">
            <Text c="dimmed" size="sm">
              Nenhuma transação registrada ainda
            </Text>
            <Button
              variant="light"
              color="teal"
              size="sm"
              onClick={() => navigate('/transacoes')}
            >
              Criar primeira transação
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
