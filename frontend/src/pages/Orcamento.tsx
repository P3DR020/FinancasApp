import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, ActionIcon,
  Modal, Stack, NumberInput, Select, LoadingOverlay, ThemeIcon,
  Progress, Badge, Tooltip,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconTrash, IconChartPie, IconAlertCircle, IconCheck, IconCopy,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Orcamento {
  id: string; categoria: string; limite: number; mes_ano: string;
}

const categoriasDespesa = ['Moradia (Aluguel/Financiamento)', 'Condomínio', 'Internet', 'Celular', 'Energia elétrica', 'Água', 'Gás', 'Academia', 'Streaming (Netflix, Spotify...)', 'Plano de saúde', 'Seguro', 'Transporte (ônibus/metrô)', 'Escola/Faculdade', 'Assinatura', 'Alimentação', 'Lazer', 'Outros'];

export default function Orcamento() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState<Date | null>(new Date());
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<Record<string, number>>({});
  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: { categoria: '', limite: '' as number | '' },
    validate: {
      categoria: (v) => (!v ? 'Categoria é obrigatória' : null),
      limite: (v) => (!v || Number(v) <= 0 ? 'Limite deve ser > 0' : null),
    },
  });

  const fetchOrcamentos = useCallback(async () => {
    if (!user || !mesSelecionado) return;
    setLoading(true);
    const mesAnoStr = dayjs(mesSelecionado).format('YYYY-MM');

    try {
      const { data } = await api.get('/api/orcamentos', { params: { mes: mesAnoStr } });
      setOrcamentos(data.orcamentos || []);
      setGastosPorCategoria(data.gastos || {});
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  }, [user, mesSelecionado]);

  useEffect(() => { fetchOrcamentos(); }, [fetchOrcamentos]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!user || !mesSelecionado) return;
    const mesAnoStr = dayjs(mesSelecionado).format('YYYY-MM');
    const payload = { categoria: values.categoria, limite: Number(values.limite), mes_ano: mesAnoStr };

    try {
      await api.post('/api/orcamentos', payload);
      notifications.show({ title: 'Adicionado!', message: `Limite para ${values.categoria} definido.`, color: 'teal' });
      close(); form.reset(); fetchOrcamentos();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleCopiarMesAnterior = async () => {
    if (!mesSelecionado) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/orcamentos/copiar-anterior', { mes_ano: dayjs(mesSelecionado).format('YYYY-MM') });
      notifications.show({ title: 'Sucesso', message: `${data.copiados} limites copiados.`, color: 'teal' });
      fetchOrcamentos();
    } catch (err: any) {
      notifications.show({ title: 'Aviso', message: err.response?.data?.error || err.message, color: 'yellow' });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/orcamentos/${id}`);
      notifications.show({ title: 'Excluído', message: 'Limite removido.', color: 'teal' });
      fetchOrcamentos();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalLimite = orcamentos.reduce((acc, o) => acc + Number(o.limite), 0);
  const totalGastoNasCategoriasOrcadas = orcamentos.reduce((acc, o) => acc + (gastosPorCategoria[o.categoria] || 0), 0);
  const progressoTotal = totalLimite > 0 ? (totalGastoNasCategoriasOrcadas / totalLimite) * 100 : 0;
  const isEstouradoGeral = progressoTotal > 100;

  const categoriasNaoUtilizadas = categoriasDespesa.filter(c => !orcamentos.find(o => o.categoria === c));

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'orange', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div><Title order={2} fw={700}>Orçamento Mensal</Title><Text c="dimmed" size="sm">Defina limites de gastos por categoria</Text></div>
        <Group>
          <MonthPickerInput value={mesSelecionado} onChange={(val) => setMesSelecionado(val as Date | null)} maxDate={dayjs().add(1, 'year').toDate()} placeholder="Selecionar mês" w={160} />
          <Button leftSection={<IconPlus size={16} />} onClick={open} style={{ background: 'linear-gradient(135deg, var(--mantine-color-orange-6), var(--mantine-color-red-6))' }}>Novo Limite</Button>
        </Group>
      </Group>

      {orcamentos.length > 0 ? (
        <>
          <Paper withBorder p="xl" radius="md" mb="xl" className="animate-fade-in-up" style={{ borderColor: isEstouradoGeral ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dark-4)' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" tt="uppercase" fw={600} c="dimmed">Progresso do Mês (Categorias Orçadas)</Text>
              {isEstouradoGeral ? <Badge color="red" leftSection={<IconAlertCircle size={12} />}>Orçamento Estourado</Badge> : <Badge color="teal" leftSection={<IconCheck size={12} />}>Dentro do limite</Badge>}
            </Group>
            <Progress size="xl" radius="xl" value={Math.min(progressoTotal, 100)} color={isEstouradoGeral ? 'red' : progressoTotal > 80 ? 'yellow' : 'teal'} striped={progressoTotal > 80} animated={progressoTotal > 80 && !isEstouradoGeral} mb="sm" />
            <Group justify="space-between">
              <Text fw={700} size="xl">{formatCurrency(totalGastoNasCategoriasOrcadas)} <Text span size="sm" c="dimmed" fw={500}>gastos</Text></Text>
              <Text fw={700} size="xl"><Text span size="sm" c="dimmed" fw={500}>de</Text> {formatCurrency(totalLimite)}</Text>
            </Group>
          </Paper>

          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
            {orcamentos.map((orc, i) => {
              const gasto = gastosPorCategoria[orc.categoria] || 0;
              const limite = Number(orc.limite);
              const pct = (gasto / limite) * 100;
              const isDanger = pct > 90;
              const isOver = pct > 100;
              let color = 'teal'; if (pct > 75) color = 'yellow'; if (isDanger) color = 'orange'; if (isOver) color = 'red';

              return (
                <Paper key={orc.id} withBorder p="md" radius="md" className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, borderColor: isOver ? 'var(--mantine-color-red-9)' : 'var(--mantine-color-dark-4)' }}>
                  <Group justify="space-between" mb="sm" wrap="nowrap">
                    <Text fw={600} size="md" lineClamp={1}>{orc.categoria}</Text>
                    <Tooltip label="Excluir"><ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(orc.id)}><IconTrash size={16} /></ActionIcon></Tooltip>
                  </Group>
                  <Progress value={Math.min(pct, 100)} color={color} size="md" radius="xl" mb="xs" />
                  <Group justify="space-between" align="flex-end">
                    <div><Text size="xs" c="dimmed">Gasto</Text><Text size="sm" fw={600} c={isOver ? 'red' : undefined}>{formatCurrency(gasto)}</Text></div>
                    <div style={{ textAlign: 'right' }}><Text size="xs" c="dimmed">Limite</Text><Text size="sm" fw={600}>{formatCurrency(limite)}</Text></div>
                  </Group>
                  {isOver && <Text size="xs" c="red" mt="xs" ta="center" fw={500}>Estourou em {formatCurrency(gasto - limite)}</Text>}
                </Paper>
              );
            })}
          </SimpleGrid>
        </>
      ) : (
        <Stack align="center" py={60} className="animate-fade-in-up">
          <ThemeIcon size={80} radius="100%" color="orange" variant="light" mb="md"><IconChartPie size={40} /></ThemeIcon>
          <Title order={3}>Nenhum limite para {dayjs(mesSelecionado).format('MMMM')}</Title>
          <Text c="dimmed" ta="center" maw={400}>Defina limites de gastos por categoria para manter suas finanças sob controle.</Text>
          <Group mt="md">
            <Button onClick={open} leftSection={<IconPlus size={16} />} style={{ background: 'linear-gradient(135deg, var(--mantine-color-orange-6), var(--mantine-color-red-6))' }}>Criar Limite</Button>
            <Button variant="light" color="orange" onClick={handleCopiarMesAnterior} leftSection={<IconCopy size={16} />}>Copiar do mês anterior</Button>
          </Group>
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">Novo Limite de Gasto</Text>} size="sm" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select label="Categoria" placeholder="Selecione" data={categoriasNaoUtilizadas.length > 0 ? categoriasNaoUtilizadas : categoriasDespesa} searchable nothingFoundMessage="Todas as categorias em uso" size="md" {...form.getInputProps('categoria')} />
            <NumberInput label="Valor do Limite" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} decimalScale={2} size="md" {...form.getInputProps('limite')} />
            <Group justify="flex-end" mt="sm"><Button variant="default" onClick={close}>Cancelar</Button><Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-orange-6), var(--mantine-color-red-6))' }}>Salvar Limite</Button></Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
