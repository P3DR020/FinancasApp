import { useEffect, useState, useRef } from 'react';
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
  Progress,
} from '@mantine/core';
import { DonutChart, BarChart } from '@mantine/charts';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconWallet,
  IconPigMoney,
  IconArrowRight,
  IconRepeat,
  IconTargetArrow,
  IconChartLine,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import api from '../lib/api';
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

interface Fixo {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  ativo: boolean;
}

interface Meta {
  id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  concluida: boolean;
  data_limite: string | null;
}

interface Investimento {
  id: string;
  nome: string;
  tipo: string;
  valor_investido: number;
  valor_atual: number;
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

const tipoLabels: Record<string, string> = {
  renda_fixa: 'Renda Fixa', tesouro: 'Tesouro', acoes: 'Ações',
  fiis: 'FIIs', etf: 'ETF', crypto: 'Crypto', outro: 'Outro',
};

const tipoColors: Record<string, string> = {
  renda_fixa: 'teal', tesouro: 'blue', acoes: 'violet',
  fiis: 'orange', etf: 'cyan', crypto: 'yellow', outro: 'gray',
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
  const [fixos, setFixos] = useState<Fixo[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const autoGenRan = useRef(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const { data } = await api.get('/api/dashboard');

      setReceitasMes(data.receitasMes);
      setDespesasMes(data.despesasMes);
      setEconomiaMes(data.economiaMes);
      setSaldoTotal(data.saldoTotal);
      setUltimasTransacoes(data.ultimasTransacoes);
      setFixos(data.fixos);
      setMetas(data.metas);
      setInvestimentos(data.investimentos);
      setBarData(data.historico);

      // Donut chart data
      setDonutData(
        Object.entries(data.despesasPorCategoria as Record<string, number>).map(([name, value]) => ({
          name,
          value,
          color: categoryColors[name] || 'gray.6',
        }))
      );

      // Notificação de fixos gerados
      if (!autoGenRan.current && data.fixosGerados && data.fixosGerados.geradas > 0) {
        autoGenRan.current = true;
        const partes = [];
        if (data.fixosGerados.receitas > 0) partes.push(`${data.fixosGerados.receitas} receita(s)`);
        if (data.fixosGerados.despesas > 0) partes.push(`${data.fixosGerados.despesas} despesa(s)`);

        notifications.show({
          title: '🔄 Transações fixas geradas!',
          message: `${partes.join(' e ')} geradas automaticamente para ${dayjs().format('MMMM/YYYY')}.`,
          color: 'teal',
          autoClose: 6000,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Fixos calculations
  const receitasFixas = fixos.filter((f) => f.tipo === 'receita' && f.ativo);
  const despesasFixas = fixos.filter((f) => f.tipo === 'despesa' && f.ativo);
  const totalReceitasFixas = receitasFixas.reduce((s, f) => s + Number(f.valor), 0);
  const totalDespesasFixas = despesasFixas.reduce((s, f) => s + Number(f.valor), 0);
  const sobraFixa = totalReceitasFixas - totalDespesasFixas;

  // Metas calculations
  const metasAtivas = metas.filter((m) => !m.concluida);

  // Investimentos calculations
  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.valor_investido), 0);
  const totalAtualInv = investimentos.reduce((s, i) => s + Number(i.valor_atual), 0);
  const rendimentoTotal = totalAtualInv - totalInvestido;

  const statCards = [
    { title: 'Receitas do mês', value: receitasMes, sub: `Inclui ${receitasFixas.length} fixo(s) gerado(s)`, color: 'teal', cssClass: 'stat-teal', icon: IconArrowUpRight },
    { title: 'Despesas do mês', value: despesasMes, sub: `Inclui ${despesasFixas.length} fixo(s) gerado(s)`, color: 'red', cssClass: 'stat-red', icon: IconArrowDownRight },
    { title: 'Saldo total', value: saldoTotal, sub: 'Todas as transações', color: 'blue', cssClass: 'stat-blue', icon: IconWallet },
    { title: 'Economia do mês', value: economiaMes, sub: 'Receitas - Despesas', color: 'yellow', cssClass: 'stat-yellow', icon: IconPigMoney },
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
              borderColor: 'var(--mantine-color-default-border)',
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
            {card.sub && (
              <Text size="xs" c="dimmed" mt={2}>{card.sub}</Text>
            )}
          </Paper>
        ))}
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        <Paper
          withBorder p="lg" radius="md" className="animate-fade-in-up"
          style={{ animationDelay: '0.32s', borderColor: 'var(--mantine-color-default-border)' }}
        >
          <Text fw={600} mb="md">Despesas por categoria</Text>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} tooltipDataSource="segment" withLabelsLine withLabels chartLabel={formatCurrency(despesasMes)} h={260} />
          ) : (
            <Stack align="center" justify="center" h={260}>
              <Text c="dimmed" size="sm">Nenhuma despesa registrada este mês</Text>
            </Stack>
          )}
        </Paper>

        <Paper
          withBorder p="lg" radius="md" className="animate-fade-in-up"
          style={{ animationDelay: '0.4s', borderColor: 'var(--mantine-color-default-border)' }}
        >
          <Text fw={600} mb="md">Receitas vs Despesas (últimos 6 meses)</Text>
          {barData.length > 0 ? (
            <BarChart h={260} data={barData} dataKey="mes" series={[{ name: 'Receitas', color: 'teal.6' }, { name: 'Despesas', color: 'red.6' }]} tickLine="y" gridAxis="y" />
          ) : (
            <Stack align="center" justify="center" h={260}>
              <Text c="dimmed" size="sm">Nenhum dado disponível</Text>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      {/* Fixos + Investimentos side by side */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        {/* Fixos Summary */}
        <Paper
          withBorder p="lg" radius="md" className="animate-fade-in-up"
          style={{ animationDelay: '0.48s', borderColor: 'var(--mantine-color-default-border)' }}
        >
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="indigo" size="md" radius="xl">
                <IconRepeat size={18} />
              </ThemeIcon>
              <Text fw={600}>Fixos do mês</Text>
            </Group>
            <Button variant="subtle" color="indigo" size="xs" rightSection={<IconArrowRight size={14} />} onClick={() => navigate('/fixos')}>
              Ver todos
            </Button>
          </Group>

          {fixos.length > 0 ? (
            <Stack gap="md">
              {/* Resumo mensal */}
              <SimpleGrid cols={3}>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Receitas/mês</Text>
                  <Text size="lg" fw={700} c="teal">{formatCurrency(totalReceitasFixas)}</Text>
                  <Text size="xs" c="dimmed">{receitasFixas.length} ativas</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Despesas/mês</Text>
                  <Text size="lg" fw={700} c="red">{formatCurrency(totalDespesasFixas)}</Text>
                  <Text size="xs" c="dimmed">{despesasFixas.length} ativas</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Sobra mensal</Text>
                  <Text size="lg" fw={700} c={sobraFixa >= 0 ? 'blue' : 'red'}>{formatCurrency(sobraFixa)}</Text>
                  <Text size="xs" c="dimmed">{dayjs().format('MMMM/YYYY')}</Text>
                </div>
              </SimpleGrid>

              {/* Receitas fixas */}
              {receitasFixas.length > 0 && (
                <>
                  <Group gap={6}>
                    <ThemeIcon variant="light" color="teal" size="xs" radius="xl">
                      <IconArrowUpRight size={10} />
                    </ThemeIcon>
                    <Text size="xs" fw={600} c="teal" tt="uppercase">Receitas fixas</Text>
                    <Badge color="teal" variant="light" size="xs" ml="auto">{formatCurrency(totalReceitasFixas)}/mês</Badge>
                  </Group>
                  <Stack gap={4}>
                    {receitasFixas.map((f) => (
                      <Group key={f.id} justify="space-between" py={3} px={6}
                        style={{ borderRadius: 6, background: 'var(--mantine-color-default-hover)' }}>
                        <Group gap="xs">
                          <Text size="sm">{f.nome}</Text>
                          <Text size="xs" c="dimmed">({f.categoria})</Text>
                        </Group>
                        <Text size="sm" fw={600} c="teal">+{formatCurrency(Number(f.valor))}</Text>
                      </Group>
                    ))}
                  </Stack>
                </>
              )}

              {/* Despesas fixas */}
              {despesasFixas.length > 0 && (
                <>
                  <Group gap={6}>
                    <ThemeIcon variant="light" color="red" size="xs" radius="xl">
                      <IconArrowDownRight size={10} />
                    </ThemeIcon>
                    <Text size="xs" fw={600} c="red" tt="uppercase">Despesas fixas</Text>
                    <Badge color="red" variant="light" size="xs" ml="auto">{formatCurrency(totalDespesasFixas)}/mês</Badge>
                  </Group>
                  <Stack gap={4}>
                    {despesasFixas.map((f) => (
                      <Group key={f.id} justify="space-between" py={3} px={6}
                        style={{ borderRadius: 6, background: 'var(--mantine-color-default-hover)' }}>
                        <Group gap="xs">
                          <Text size="sm">{f.nome}</Text>
                          <Text size="xs" c="dimmed">({f.categoria})</Text>
                        </Group>
                        <Text size="sm" fw={600} c="red">-{formatCurrency(Number(f.valor))}</Text>
                      </Group>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          ) : (
            <Stack align="center" py="lg">
              <Text c="dimmed" size="sm">Nenhum fixo cadastrado</Text>
              <Button variant="light" color="indigo" size="xs" onClick={() => navigate('/fixos')}>Cadastrar fixos</Button>
            </Stack>
          )}
        </Paper>

        {/* Investimentos Summary */}
        <Paper
          withBorder p="lg" radius="md" className="animate-fade-in-up"
          style={{ animationDelay: '0.56s', borderColor: 'var(--mantine-color-default-border)' }}
        >
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="violet" size="md" radius="xl">
                <IconChartLine size={18} />
              </ThemeIcon>
              <Text fw={600}>Investimentos</Text>
            </Group>
            <Button variant="subtle" color="violet" size="xs" rightSection={<IconArrowRight size={14} />} onClick={() => navigate('/investimentos')}>
              Ver todos
            </Button>
          </Group>

          {investimentos.length > 0 ? (
            <Stack gap="md">
              <SimpleGrid cols={3}>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Investido</Text>
                  <Text size="lg" fw={700} c="blue">{formatCurrency(totalInvestido)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Atual</Text>
                  <Text size="lg" fw={700} c="teal">{formatCurrency(totalAtualInv)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Rendimento</Text>
                  <Text size="lg" fw={700} c={rendimentoTotal >= 0 ? 'teal' : 'red'}>
                    {rendimentoTotal >= 0 ? '+' : ''}{formatCurrency(rendimentoTotal)}
                  </Text>
                </div>
              </SimpleGrid>

              <Stack gap={6}>
                {investimentos.slice(0, 4).map((inv) => {
                  const rend = Number(inv.valor_atual) - Number(inv.valor_investido);
                  const rendPct = Number(inv.valor_investido) > 0 ? ((rend / Number(inv.valor_investido)) * 100) : 0;
                  return (
                    <Group key={inv.id} justify="space-between" py={4} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                      <Group gap="xs">
                        <Badge color={tipoColors[inv.tipo] || 'gray'} variant="light" size="xs">
                          {tipoLabels[inv.tipo] || inv.tipo}
                        </Badge>
                        <Text size="sm">{inv.nome}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>{formatCurrency(Number(inv.valor_atual))}</Text>
                        <Text size="xs" c={rend >= 0 ? 'teal' : 'red'} fw={500}>
                          {rend >= 0 ? '+' : ''}{rendPct.toFixed(1)}%
                        </Text>
                      </Group>
                    </Group>
                  );
                })}
                {investimentos.length > 4 && (
                  <Text size="xs" c="dimmed" ta="center">+{investimentos.length - 4} mais...</Text>
                )}
              </Stack>
            </Stack>
          ) : (
            <Stack align="center" py="lg">
              <Text c="dimmed" size="sm">Nenhum investimento registrado</Text>
              <Button variant="light" color="violet" size="xs" onClick={() => navigate('/investimentos')}>Registrar investimento</Button>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      {/* Metas Summary */}
      <Paper
        withBorder p="lg" radius="md" mb="xl" className="animate-fade-in-up"
        style={{ animationDelay: '0.64s', borderColor: 'var(--mantine-color-default-border)' }}
      >
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="cyan" size="md" radius="xl">
              <IconTargetArrow size={18} />
            </ThemeIcon>
            <Text fw={600}>Metas</Text>
            {metasAtivas.length > 0 && (
              <Badge color="cyan" variant="light" size="sm">{metasAtivas.length} ativas</Badge>
            )}
          </Group>
          <Button variant="subtle" color="cyan" size="xs" rightSection={<IconArrowRight size={14} />} onClick={() => navigate('/metas')}>
            Ver todas
          </Button>
        </Group>

        {metas.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {metas.slice(0, 3).map((meta) => {
              const progress = Math.min((Number(meta.valor_atual) / Number(meta.valor_alvo)) * 100, 100);
              return (
                <Paper
                  key={meta.id}
                  withBorder p="md" radius="md"
                  className="card-hover"
                  style={{
                    borderColor: meta.concluida ? 'var(--mantine-color-teal-7)' : 'var(--mantine-color-default-border)',
                    background: 'var(--mantine-color-default-hover)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/metas')}
                >
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={600} lineClamp={1}>{meta.nome}</Text>
                    <Badge color={meta.concluida ? 'teal' : 'cyan'} variant={meta.concluida ? 'filled' : 'light'} size="xs">
                      {meta.concluida ? '✓ Concluída' : `${Math.round(progress)}%`}
                    </Badge>
                  </Group>
                  <Progress value={progress} color={meta.concluida ? 'teal' : 'cyan'} size="sm" radius="xl" mb="xs" animated={!meta.concluida} />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{formatCurrency(Number(meta.valor_atual))}</Text>
                    <Text size="xs" c="dimmed">{formatCurrency(Number(meta.valor_alvo))}</Text>
                  </Group>
                </Paper>
              );
            })}
          </SimpleGrid>
        ) : (
          <Stack align="center" py="lg">
            <Text c="dimmed" size="sm">Nenhuma meta cadastrada</Text>
            <Button variant="light" color="cyan" size="xs" onClick={() => navigate('/metas')}>Criar primeira meta</Button>
          </Stack>
        )}
      </Paper>

      {/* Recent Transactions */}
      <Paper
        withBorder p="lg" radius="md" className="animate-fade-in-up"
        style={{ animationDelay: '0.72s', borderColor: 'var(--mantine-color-default-border)' }}
      >
        <Group justify="space-between" mb="md">
          <Text fw={600}>Últimas transações</Text>
          <Button variant="subtle" color="teal" size="xs" rightSection={<IconArrowRight size={14} />} onClick={() => navigate('/transacoes')}>
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
                    <Text size="sm" fw={500}>{t.descricao}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{t.categoria}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={t.tipo === 'receita' ? 'teal' : 'red'} variant="light" size="sm">
                      {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={600} c={t.tipo === 'receita' ? 'teal' : 'red'}>
                      {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(Number(t.valor))}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Stack align="center" py="xl">
            <Text c="dimmed" size="sm">Nenhuma transação registrada ainda</Text>
            <Button variant="light" color="teal" size="sm" onClick={() => navigate('/transacoes')}>
              Criar primeira transação
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
