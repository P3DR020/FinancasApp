import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, Textarea, LoadingOverlay,
  ThemeIcon, Tooltip, Divider, RingProgress, Center,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconChartLine, IconArrowUpRight,
  IconArrowDownRight, IconBuildingBank,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, DonutChart } from '@mantine/charts';

interface Investimento {
  id: string; nome: string; tipo: string; corretora: string;
  valor_investido: number; valor_atual: number; data_compra: string; notas: string | null;
}

const tiposInvestimento = [
  { value: 'renda_fixa', label: 'Renda Fixa (CDB, LCI, LCA)' },
  { value: 'tesouro', label: 'Tesouro Direto' },
  { value: 'acoes', label: 'Ações' },
  { value: 'fiis', label: 'Fundos Imobiliários (FIIs)' },
  { value: 'etf', label: 'ETFs' },
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'outro', label: 'Outro' },
];

const tipoColors: Record<string, string> = {
  renda_fixa: 'teal', tesouro: 'blue', acoes: 'violet',
  fiis: 'orange', etf: 'cyan', crypto: 'yellow', outro: 'gray',
};

export default function Investimentos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm({
    initialValues: { nome: '', tipo: '', corretora: '', valor_investido: '' as number | '', valor_atual: '' as number | '', data_compra: new Date(), notas: '' },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome obrigatório' : null),
      tipo: (v) => (!v ? 'Tipo obrigatório' : null),
      corretora: (v) => (!v.trim() ? 'Corretora obrigatória' : null),
      valor_investido: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser > 0' : null),
      valor_atual: (v) => (v === '' || Number(v) < 0 ? 'Valor atual não pode ser negativo' : null),
    },
  });

  const fetchInvestimentos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/investimentos');
      setInvestimentos(data || []);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchInvestimentos(); }, [user, fetchInvestimentos]);

  const handleOpenNew = () => { setEditingId(null); form.reset(); form.setFieldValue('data_compra', new Date()); open(); };

  const handleOpenEdit = (i: Investimento) => {
    setEditingId(i.id);
    form.setValues({ nome: i.nome, tipo: i.tipo, corretora: i.corretora, valor_investido: Number(i.valor_investido), valor_atual: Number(i.valor_atual), data_compra: new Date(i.data_compra + 'T12:00:00'), notas: i.notas || '' });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;
    const payload = { nome: values.nome, tipo: values.tipo, corretora: values.corretora, valor_investido: Number(values.valor_investido), valor_atual: Number(values.valor_atual), data_compra: dayjs(values.data_compra).format('YYYY-MM-DD'), notas: values.notas || null };

    try {
      if (editingId) {
        await api.put(`/api/investimentos/${editingId}`, payload);
        notifications.show({ title: 'Atualizado!', message: 'Investimento atualizado.', color: 'teal' });
      } else {
        await api.post('/api/investimentos', payload);
        notifications.show({ title: 'Adicionado!', message: 'Investimento registrado.', color: 'teal' });
      }
      close(); fetchInvestimentos();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/investimentos/${id}`);
      notifications.show({ title: 'Excluído', message: 'Registro removido.', color: 'teal' });
      fetchInvestimentos();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.valor_investido), 0);
  const totalAtual = investimentos.reduce((s, i) => s + Number(i.valor_atual), 0);
  const rendimentoGeral = totalAtual - totalInvestido;
  const rentabilidadePercentual = totalInvestido > 0 ? (rendimentoGeral / totalInvestido) * 100 : 0;

  const getTipoLabel = (val: string) => tiposInvestimento.find((t) => t.value === val)?.label || val;

  const dataPorTipo = Object.entries(
    investimentos.reduce((acc, curr) => { acc[curr.tipo] = (acc[curr.tipo] || 0) + Number(curr.valor_atual); return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: getTipoLabel(name), value, color: `${tipoColors[name] || 'gray'}.6` }));

  const dataPorCorretora = Object.entries(
    investimentos.reduce((acc, curr) => { acc[curr.corretora] = (acc[curr.corretora] || 0) + Number(curr.valor_atual); return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ corretora: name, 'Valor Atual': value }));

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'violet', type: 'bars' }} />
      <Group justify="space-between" mb="lg">
        <div><Title order={2} fw={700}>Investimentos</Title><Text c="dimmed" size="sm">Controle seu portfólio e rentabilidade</Text></div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew} style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-grape-6))' }}>Novo Ativo</Button>
      </Group>

      {investimentos.length > 0 && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
            <Paper withBorder p="md" radius="md" className="stat-card card-hover animate-fade-in-up" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
              <Group justify="space-between" mb="xs"><Text size="xs" c="dimmed" fw={500} tt="uppercase">Total Investido</Text><ThemeIcon variant="light" color="blue" size="sm" radius="xl"><IconChartLine size={14} /></ThemeIcon></Group>
              <Text size="xl" fw={700} c="blue">{formatCurrency(totalInvestido)}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md" className="stat-card stat-teal card-hover animate-fade-in-up" style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}>
              <Group justify="space-between" mb="xs"><Text size="xs" c="dimmed" fw={500} tt="uppercase">Saldo Atual</Text><ThemeIcon variant="light" color="teal" size="sm" radius="xl"><IconBuildingBank size={14} /></ThemeIcon></Group>
              <Text size="xl" fw={700} c="teal">{formatCurrency(totalAtual)}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md" className={`stat-card ${rendimentoGeral >= 0 ? 'stat-teal' : 'stat-red'} card-hover animate-fade-in-up`} style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}>
              <Group justify="space-between" mb="xs"><Text size="xs" c="dimmed" fw={500} tt="uppercase">Rentabilidade</Text><ThemeIcon variant="light" color={rendimentoGeral >= 0 ? 'teal' : 'red'} size="sm" radius="xl">{rendimentoGeral >= 0 ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}</ThemeIcon></Group>
              <Group gap="xs" align="flex-end">
                <Text size="xl" fw={700} c={rendimentoGeral >= 0 ? 'teal' : 'red'}>{rendimentoGeral >= 0 ? '+' : ''}{formatCurrency(rendimentoGeral)}</Text>
                <Badge color={rendimentoGeral >= 0 ? 'teal' : 'red'} variant="light" mb={4}>{rendimentoGeral >= 0 ? '+' : ''}{rentabilidadePercentual.toFixed(2)}%</Badge>
              </Group>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
            <Paper withBorder p="md" radius="md" className="animate-fade-in-up" style={{ animationDelay: '0.24s', borderColor: 'var(--mantine-color-dark-4)' }}>
              <Text fw={600} mb="md">Composição da Carteira</Text>
              <Center h={260}><DonutChart data={dataPorTipo} tooltipDataSource="segment" withLabelsLine withLabels chartLabel="Alocação" /></Center>
            </Paper>
            <Paper withBorder p="md" radius="md" className="animate-fade-in-up" style={{ animationDelay: '0.32s', borderColor: 'var(--mantine-color-dark-4)' }}>
              <Text fw={600} mb="md">Valor por Corretora</Text>
              <BarChart h={260} data={dataPorCorretora} dataKey="corretora" series={[{ name: 'Valor Atual', color: 'violet.6' }]} tickLine="y" gridAxis="y" />
            </Paper>
          </SimpleGrid>
        </>
      )}

      <Title order={3} mb="md" fw={600}>Meus Ativos</Title>
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {investimentos.map((inv, i) => {
          const rend = Number(inv.valor_atual) - Number(inv.valor_investido);
          const rendPct = Number(inv.valor_investido) > 0 ? (rend / Number(inv.valor_investido)) * 100 : 0;
          const pos = rend >= 0;
          return (
            <Paper key={inv.id} withBorder p="lg" radius="md" className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, borderColor: 'var(--mantine-color-dark-4)', background: 'var(--mantine-color-dark-8)' }}>
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Badge color={tipoColors[inv.tipo] || 'gray'} variant="light">{getTipoLabel(inv.tipo)}</Badge>
                  <Text fw={600} size="lg">{inv.nome}</Text>
                </Group>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(inv)}><IconEdit size={16} /></ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(inv.id)}><IconTrash size={16} /></ActionIcon>
                </Group>
              </Group>

              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">Corretora: <Text span fw={500} c="white">{inv.corretora}</Text></Text>
                <Text size="xs" c="dimmed">Compra: {dayjs(inv.data_compra).format('DD/MM/YYYY')}</Text>
              </Group>

              <SimpleGrid cols={3} mt="md" p="sm" style={{ background: 'var(--mantine-color-dark-7)', borderRadius: 'var(--mantine-radius-md)' }}>
                <div><Text size="xs" c="dimmed" tt="uppercase">Investido</Text><Text fw={600} size="sm">{formatCurrency(Number(inv.valor_investido))}</Text></div>
                <div><Text size="xs" c="dimmed" tt="uppercase">Atual</Text><Text fw={600} size="sm" c={pos ? 'teal' : 'red'}>{formatCurrency(Number(inv.valor_atual))}</Text></div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase">Rendimento</Text>
                  <Group gap={4}><Text fw={600} size="sm" c={pos ? 'teal' : 'red'}>{pos ? '+' : ''}{rendPct.toFixed(2)}%</Text>{pos ? <IconArrowUpRight size={14} color="var(--mantine-color-teal-6)" /> : <IconArrowDownRight size={14} color="var(--mantine-color-red-6)" />}</Group>
                </div>
              </SimpleGrid>
              {inv.notas && <Text size="xs" c="dimmed" mt="sm">Notas: {inv.notas}</Text>}
            </Paper>
          );
        })}
      </SimpleGrid>

      {investimentos.length === 0 && !loading && (
        <Stack align="center" py={60} className="animate-fade-in-up">
          <ThemeIcon size={80} radius="100%" color="violet" variant="light" mb="md"><IconChartLine size={40} /></ThemeIcon>
          <Title order={3}>Nenhum investimento registrado</Title>
          <Button mt="md" onClick={handleOpenNew} leftSection={<IconPlus size={16} />} style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-grape-6))' }}>Registrar primeiro ativo</Button>
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">{editingId ? 'Editar Investimento' : 'Novo Investimento'}</Text>} size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Nome do Ativo" placeholder="Ex: CDB Banco Inter, AAPL34..." size="md" {...form.getInputProps('nome')} />
            <Select label="Tipo" placeholder="Selecione o tipo" data={tiposInvestimento} size="md" {...form.getInputProps('tipo')} />
            <TextInput label="Corretora / Banco" placeholder="Ex: NuInvest, XP, Rico..." size="md" {...form.getInputProps('corretora')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Valor Investido" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} decimalScale={2} size="md" {...form.getInputProps('valor_investido')} />
              <NumberInput label="Valor Atual" description="Pode ser atualizado depois" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0} decimalScale={2} size="md" {...form.getInputProps('valor_atual')} />
            </SimpleGrid>
            <DateInput label="Data da Compra" placeholder="Selecione a data" size="md" valueFormat="DD/MM/YYYY" {...form.getInputProps('data_compra')} />
            <Textarea label="Notas (opcional)" placeholder="Objetivo deste investimento, vencimento..." autosize minRows={2} maxRows={3} {...form.getInputProps('notas')} />
            <Divider />
            <Group justify="flex-end"><Button variant="default" onClick={close}>Cancelar</Button><Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-grape-6))' }}>{editingId ? 'Salvar' : 'Adicionar'}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
