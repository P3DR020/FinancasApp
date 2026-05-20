import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, NumberInput, Select, LoadingOverlay, ThemeIcon, Tooltip,
  Divider, Progress, RingProgress,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconTrash, IconChartPie, IconAlertTriangle,
  IconCheck, IconArrowLeft, IconArrowRight, IconCopy,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Orcamento {
  id: string;
  categoria: string;
  limite: number;
  mes_ano: string;
}

interface GastoCategoria {
  categoria: string;
  gasto: number;
  limite: number;
  percentual: number;
}

const categorias = [
  'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer',
  'Moradia', 'Supermercado', 'Roupas', 'Eletrônicos', 'Assinaturas',
  'Streaming (Netflix, Spotify...)', 'Academia', 'Viagem', 'Outros',
];

const categoryEmoji: Record<string, string> = {
  'Alimentação': '🍔', 'Transporte': '🚗', 'Saúde': '🏥', 'Educação': '📚',
  'Lazer': '🎮', 'Moradia': '🏠', 'Supermercado': '🛒', 'Roupas': '👕',
  'Eletrônicos': '📱', 'Assinaturas': '📰', 'Streaming (Netflix, Spotify...)': '📺',
  'Academia': '💪', 'Viagem': '✈️', 'Outros': '📦',
};

export default function Orcamento() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [gastos, setGastos] = useState<Record<string, number>>({});
  const [opened, { open, close }] = useDisclosure(false);
  const [mesAtual, setMesAtual] = useState(dayjs().format('YYYY-MM'));

  const form = useForm({
    initialValues: { categoria: '', limite: '' as number | '' },
    validate: {
      categoria: (v) => (!v ? 'Selecione a categoria' : null),
      limite: (v) => (!v || Number(v) <= 0 ? 'Limite deve ser maior que zero' : null),
    },
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const inicio = dayjs(mesAtual + '-01').startOf('month').format('YYYY-MM-DD');
    const fim = dayjs(mesAtual + '-01').endOf('month').format('YYYY-MM-DD');

    const [{ data: orcData }, { data: transData }] = await Promise.all([
      supabase.from('orcamentos').select('*').eq('mes_ano', mesAtual),
      supabase.from('transacoes').select('categoria, valor')
        .eq('tipo', 'despesa').gte('data', inicio).lte('data', fim),
    ]);

    setOrcamentos(orcData || []);

    const gastosMap: Record<string, number> = {};
    (transData || []).forEach((t) => {
      gastosMap[t.categoria] = (gastosMap[t.categoria] || 0) + Number(t.valor);
    });
    setGastos(gastosMap);

    setLoading(false);
  }, [user, mesAtual]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;

    const existe = orcamentos.find((o) => o.categoria === values.categoria);
    if (existe) {
      notifications.show({ title: 'Já existe', message: `Orçamento para "${values.categoria}" já definido neste mês.`, color: 'yellow' });
      return;
    }

    const { error } = await supabase.from('orcamentos').insert({
      user_id: user.id, categoria: values.categoria,
      limite: Number(values.limite), mes_ano: mesAtual,
    });

    if (error) {
      notifications.show({ title: 'Erro', message: error.message, color: 'red' });
      return;
    }
    notifications.show({ title: 'Orçamento definido!', message: `Limite de ${fmt(Number(values.limite))} para "${values.categoria}".`, color: 'teal' });
    close(); form.reset(); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('orcamentos').delete().eq('id', id);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: 'Removido', message: 'Orçamento excluído.', color: 'teal' });
    fetchData();
  };

  const handleCopiarMesAnterior = async () => {
    if (!user) return;
    const mesAnterior = dayjs(mesAtual + '-01').subtract(1, 'month').format('YYYY-MM');
    const { data: anteriores } = await supabase
      .from('orcamentos').select('categoria, limite').eq('mes_ano', mesAnterior);

    if (!anteriores || anteriores.length === 0) {
      notifications.show({ title: 'Nada para copiar', message: 'Nenhum orçamento no mês anterior.', color: 'yellow' });
      return;
    }

    const existentes = new Set(orcamentos.map((o) => o.categoria));
    const novos = anteriores
      .filter((a) => !existentes.has(a.categoria))
      .map((a) => ({ user_id: user.id, categoria: a.categoria, limite: Number(a.limite), mes_ano: mesAtual }));

    if (novos.length === 0) {
      notifications.show({ title: 'Já copiado', message: 'Todas as categorias já existem neste mês.', color: 'yellow' });
      return;
    }

    const { error } = await supabase.from('orcamentos').insert(novos);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: 'Copiado!', message: `${novos.length} orçamento(s) copiados do mês anterior.`, color: 'teal' });
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const mesLabel = dayjs(mesAtual + '-01').format('MMMM [de] YYYY');
  const isCurrentMonth = mesAtual === dayjs().format('YYYY-MM');

  // Build progress data
  const progressData: GastoCategoria[] = orcamentos.map((o) => {
    const gasto = gastos[o.categoria] || 0;
    return {
      categoria: o.categoria,
      gasto,
      limite: Number(o.limite),
      percentual: Number(o.limite) > 0 ? Math.min((gasto / Number(o.limite)) * 100, 100) : 0,
    };
  }).sort((a, b) => b.percentual - a.percentual);

  const totalLimite = orcamentos.reduce((s, o) => s + Number(o.limite), 0);
  const totalGasto = progressData.reduce((s, p) => s + p.gasto, 0);
  const totalPct = totalLimite > 0 ? Math.min((totalGasto / totalLimite) * 100, 100) : 0;
  const categoriasEstouradas = progressData.filter((p) => p.percentual >= 100).length;
  const categoriasAlerta = progressData.filter((p) => p.percentual >= 75 && p.percentual < 100).length;

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'red';
    if (pct >= 75) return 'yellow';
    if (pct >= 50) return 'orange';
    return 'teal';
  };

  const categoriasDisponiveis = categorias.filter(
    (c) => !orcamentos.find((o) => o.categoria === c)
  );

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'teal', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Orçamento Mensal</Title>
          <Text c="dimmed" size="sm">Defina limites por categoria e controle seus gastos</Text>
        </div>
        <Group gap="xs">
          <Button variant="light" color="gray" size="xs" leftSection={<IconCopy size={14} />}
            onClick={handleCopiarMesAnterior}>
            Copiar mês anterior
          </Button>
          <Button id="btn-novo-orcamento" leftSection={<IconPlus size={16} />}
            style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}
            onClick={() => { form.reset(); open(); }}
            disabled={categoriasDisponiveis.length === 0}>
            Novo Limite
          </Button>
        </Group>
      </Group>

      {/* Month selector */}
      <Paper withBorder p="sm" radius="md" mb="xl" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
        <Group justify="center" gap="lg">
          <ActionIcon variant="subtle" color="gray" onClick={() => setMesAtual(dayjs(mesAtual + '-01').subtract(1, 'month').format('YYYY-MM'))}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Group gap="xs">
            <Text fw={600} size="lg" tt="capitalize">{mesLabel}</Text>
            {isCurrentMonth && <Badge color="teal" variant="light" size="xs">Mês atual</Badge>}
          </Group>
          <ActionIcon variant="subtle" color="gray" onClick={() => setMesAtual(dayjs(mesAtual + '-01').add(1, 'month').format('YYYY-MM'))}>
            <IconArrowRight size={18} />
          </ActionIcon>
        </Group>
      </Paper>

      {/* Summary */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <Paper withBorder p="md" radius="md" className="stat-card stat-blue card-hover animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Orçamento total</Text>
            <ThemeIcon variant="light" color="blue" size="sm" radius="xl"><IconChartPie size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="blue">{fmt(totalLimite)}</Text>
          <Text size="xs" c="dimmed">{orcamentos.length} categorias</Text>
        </Paper>

        <Paper withBorder p="md" radius="md" className={`stat-card ${totalPct >= 90 ? 'stat-red' : 'stat-yellow'} card-hover animate-fade-in-up`}
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Gasto até agora</Text>
            <ThemeIcon variant="light" color={totalPct >= 90 ? 'red' : 'yellow'} size="sm" radius="xl">
              <IconAlertTriangle size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c={totalPct >= 90 ? 'red' : 'yellow'}>{fmt(totalGasto)}</Text>
          <Text size="xs" c="dimmed">{Math.round(totalPct)}% do orçamento</Text>
        </Paper>

        <Paper withBorder p="md" radius="md" className="stat-card stat-teal card-hover animate-fade-in-up"
          style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Disponível</Text>
            <ThemeIcon variant="light" color="teal" size="sm" radius="xl"><IconCheck size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="teal">{fmt(Math.max(totalLimite - totalGasto, 0))}</Text>
          <Text size="xs" c="dimmed">para gastar</Text>
        </Paper>

        <Paper withBorder p="md" radius="md" className={`stat-card ${categoriasEstouradas > 0 ? 'stat-red' : 'stat-teal'} card-hover animate-fade-in-up`}
          style={{ animationDelay: '0.24s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Alertas</Text>
            <ThemeIcon variant="light" color={categoriasEstouradas > 0 ? 'red' : 'teal'} size="sm" radius="xl">
              <IconAlertTriangle size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c={categoriasEstouradas > 0 ? 'red' : 'teal'}>{categoriasEstouradas + categoriasAlerta}</Text>
          <Text size="xs" c="dimmed">
            {categoriasEstouradas > 0 ? `${categoriasEstouradas} estourada(s)` : 'Tudo dentro do limite'}
            {categoriasAlerta > 0 ? `, ${categoriasAlerta} perto do limite` : ''}
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Overall progress */}
      {orcamentos.length > 0 && (
        <Paper withBorder p="lg" radius="md" mb="xl" className="animate-fade-in-up"
          style={{ animationDelay: '0.3s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Progresso geral</Text>
            <Badge color={getProgressColor(totalPct)} variant="light" size="lg">{Math.round(totalPct)}% usado</Badge>
          </Group>
          <Progress value={totalPct} color={getProgressColor(totalPct)} size="xl" radius="xl" animated={totalPct < 100} />
          <Group justify="space-between" mt="xs">
            <Text size="xs" c="dimmed">Gasto: {fmt(totalGasto)}</Text>
            <Text size="xs" c="dimmed">Orçamento: {fmt(totalLimite)}</Text>
          </Group>
        </Paper>
      )}

      {/* Categories */}
      {progressData.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {progressData.map((p, i) => {
            const color = getProgressColor(p.percentual);
            const emoji = categoryEmoji[p.categoria] || '📦';
            const restante = Math.max(p.limite - p.gasto, 0);

            return (
              <Paper key={p.categoria} withBorder p="lg" radius="md"
                className="card-hover animate-fade-in-up"
                style={{
                  animationDelay: `${0.35 + i * 0.05}s`,
                  borderColor: p.percentual >= 100 ? 'var(--mantine-color-red-7)' : 'var(--mantine-color-dark-4)',
                  borderWidth: p.percentual >= 100 ? 2 : 1,
                }}>
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <Text size="xl" lh={1}>{emoji}</Text>
                    <div>
                      <Text size="sm" fw={700}>{p.categoria}</Text>
                      <Text size="xs" c="dimmed">Limite: {fmt(p.limite)}</Text>
                    </div>
                  </Group>
                  <Group gap={4}>
                    <Badge color={color} variant={p.percentual >= 100 ? 'filled' : 'light'} size="sm">
                      {p.percentual >= 100 ? '⚠️ Estourado' : `${Math.round(p.percentual)}%`}
                    </Badge>
                    <Tooltip label="Remover limite">
                      <ActionIcon variant="subtle" color="red" size="xs"
                        onClick={() => handleDelete(orcamentos.find(o => o.categoria === p.categoria)!.id)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                <Progress value={p.percentual} color={color} size="lg" radius="xl" mb="xs"
                  animated={p.percentual > 0 && p.percentual < 100}
                  className={p.percentual >= 90 ? 'progress-glow' : ''} />

                <Group justify="space-between">
                  <Text size="sm" fw={600} c={color}>{fmt(p.gasto)}</Text>
                  <Text size="xs" c="dimmed">
                    {p.percentual >= 100
                      ? <Text span c="red" fw={600}>Excedeu {fmt(p.gasto - p.limite)}</Text>
                      : <>Restam <Text span fw={600} c="teal">{fmt(restante)}</Text></>
                    }
                  </Text>
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      ) : (
        <Paper withBorder p="xl" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Stack align="center" py="lg">
            <ThemeIcon size="xl" color="teal" variant="light" radius="xl">
              <IconChartPie size={28} />
            </ThemeIcon>
            <Text c="dimmed" size="sm" ta="center">
              Nenhum orçamento definido para {mesLabel}.
            </Text>
            <Group gap="xs">
              <Button variant="light" color="teal" onClick={() => { form.reset(); open(); }}>
                Definir primeiro limite
              </Button>
              <Button variant="light" color="gray" leftSection={<IconCopy size={14} />}
                onClick={handleCopiarMesAnterior}>
                Copiar do mês anterior
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Modal */}
      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">Novo Limite de Orçamento</Text>}
        size="sm" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Defina um limite mensal para {dayjs(mesAtual + '-01').format('MMMM/YYYY')}
            </Text>
            <Select label="Categoria" placeholder="Selecione a categoria"
              data={categoriasDisponiveis} searchable size="md" {...form.getInputProps('categoria')} />
            <NumberInput label="Limite mensal" placeholder="R$ 0,00" prefix="R$ "
              decimalSeparator="," thousandSeparator="." min={0.01}
              decimalScale={2} size="md" {...form.getInputProps('limite')} />

            {form.values.categoria && gastos[form.values.categoria] && (
              <Paper withBorder p="sm" radius="md" style={{ borderColor: 'var(--mantine-color-dark-5)', background: 'var(--mantine-color-dark-7)' }}>
                <Text size="xs" c="dimmed">Gasto atual nesta categoria:</Text>
                <Text size="sm" fw={700} c="yellow">{fmt(gastos[form.values.categoria])}</Text>
              </Paper>
            )}

            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Cancelar</Button>
              <Button type="submit"
                style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}>
                Definir limite
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
