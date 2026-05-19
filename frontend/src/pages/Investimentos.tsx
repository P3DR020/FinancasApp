import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Table,
  Text,
  Title,
  Badge,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  LoadingOverlay,
  ThemeIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconChartLine,
  IconTrendingUp,
  IconTrendingDown,
  IconBuildingBank,
  IconCoin,
  IconWallet,
} from '@tabler/icons-react';
import { DonutChart } from '@mantine/charts';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Investimento {
  id: string;
  nome: string;
  tipo: string;
  corretora: string;
  valor_investido: number;
  valor_atual: number;
  data_compra: string;
  notas: string | null;
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

const corretoras = [
  'XP Investimentos',
  'Rico',
  'Clear',
  'BTG Pactual',
  'Nubank',
  'Inter',
  'Itaú',
  'Bradesco',
  'Santander',
  'Binance',
  'Mercado Bitcoin',
  'Toro',
  'Modal Mais',
  'Ágora',
  'Guide',
  'Outro',
];

const tipoLabels: Record<string, string> = {
  renda_fixa: 'Renda Fixa',
  tesouro: 'Tesouro Direto',
  acoes: 'Ações',
  fiis: 'FIIs',
  etf: 'ETF',
  crypto: 'Crypto',
  outro: 'Outro',
};

const tipoColors: Record<string, string> = {
  renda_fixa: 'teal',
  tesouro: 'blue',
  acoes: 'violet',
  fiis: 'orange',
  etf: 'cyan',
  crypto: 'yellow',
  outro: 'gray',
};

const corretoraEmoji: Record<string, string> = {
  'XP Investimentos': '🟡',
  'Rico': '🟠',
  'Clear': '⚫',
  'BTG Pactual': '🔵',
  'Nubank': '💜',
  'Inter': '🧡',
  'Itaú': '🟠',
  'Bradesco': '🔴',
  'Santander': '🔴',
  'Binance': '🟡',
  'Mercado Bitcoin': '🟡',
  'Toro': '🟢',
  'Modal Mais': '🔵',
  'Ágora': '🟣',
  'Guide': '🔵',
};

export default function Investimentos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      nome: '',
      tipo: '',
      corretora: '',
      valor_investido: '' as number | '',
      valor_atual: '' as number | '',
      data_compra: new Date(),
      notas: '',
    },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome do investimento é obrigatório' : null),
      tipo: (v) => (!v ? 'Selecione o tipo' : null),
      corretora: (v) => (!v ? 'Selecione a corretora' : null),
      valor_investido: (v) =>
        !v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null,
      valor_atual: (v) =>
        v === '' || v === undefined ? 'Informe o valor atual' : null,
    },
  });

  const fetchInvestimentos = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      notifications.show({
        title: 'Erro ao carregar investimentos',
        message: error.message,
        color: 'red',
      });
    } else {
      setInvestimentos(data || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchInvestimentos();
  }, [user, fetchInvestimentos]);

  const handleOpenNew = () => {
    setEditingId(null);
    form.reset();
    form.setFieldValue('data_compra', new Date());
    open();
  };

  const handleOpenEdit = (inv: Investimento) => {
    setEditingId(inv.id);
    form.setValues({
      nome: inv.nome,
      tipo: inv.tipo,
      corretora: inv.corretora,
      valor_investido: Number(inv.valor_investido),
      valor_atual: Number(inv.valor_atual),
      data_compra: new Date(inv.data_compra + 'T12:00:00'),
      notas: inv.notas || '',
    });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      nome: values.nome,
      tipo: values.tipo,
      corretora: values.corretora,
      valor_investido: Number(values.valor_investido),
      valor_atual: Number(values.valor_atual),
      data_compra: dayjs(values.data_compra).format('YYYY-MM-DD'),
      notas: values.notas || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('investimentos')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        notifications.show({ title: 'Erro ao atualizar', message: error.message, color: 'red' });
        return;
      }
      notifications.show({ title: 'Investimento atualizado', message: 'Alterações salvas.', color: 'teal' });
    } else {
      const { error } = await supabase.from('investimentos').insert(payload);

      if (error) {
        notifications.show({ title: 'Erro ao criar', message: error.message, color: 'red' });
        return;
      }
      notifications.show({ title: 'Investimento adicionado!', message: `"${values.nome}" registrado.`, color: 'teal' });
    }

    close();
    fetchInvestimentos();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('investimentos').delete().eq('id', id);

    if (error) {
      notifications.show({ title: 'Erro ao excluir', message: error.message, color: 'red' });
      return;
    }
    notifications.show({ title: 'Investimento excluído', message: 'Registro removido.', color: 'teal' });
    fetchInvestimentos();
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Summary calculations
  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.valor_investido), 0);
  const totalAtual = investimentos.reduce((s, i) => s + Number(i.valor_atual), 0);
  const rendimentoTotal = totalAtual - totalInvestido;
  const rendimentoPct = totalInvestido > 0 ? ((rendimentoTotal / totalInvestido) * 100) : 0;

  // Donut by type
  const porTipo: Record<string, number> = {};
  investimentos.forEach((inv) => {
    porTipo[inv.tipo] = (porTipo[inv.tipo] || 0) + Number(inv.valor_atual);
  });
  const donutData = Object.entries(porTipo).map(([tipo, valor]) => ({
    name: tipoLabels[tipo] || tipo,
    value: valor,
    color: `${tipoColors[tipo] || 'gray'}.6`,
  }));

  // By broker
  const porCorretora: Record<string, number> = {};
  investimentos.forEach((inv) => {
    porCorretora[inv.corretora] = (porCorretora[inv.corretora] || 0) + Number(inv.valor_atual);
  });
  const brokerList = Object.entries(porCorretora).sort((a, b) => b[1] - a[1]);

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
            Investimentos
          </Title>
          <Text c="dimmed" size="sm">
            Acompanhe sua carteira de investimentos
          </Text>
        </div>
        <Button
          id="btn-novo-investimento"
          leftSection={<IconPlus size={16} />}
          onClick={handleOpenNew}
          style={{
            background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-violet-8))',
          }}
        >
          Novo Investimento
        </Button>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <Paper
          withBorder p="md" radius="md"
          className="stat-card stat-blue card-hover animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Total investido</Text>
            <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
              <IconWallet size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="blue">{formatCurrency(totalInvestido)}</Text>
        </Paper>

        <Paper
          withBorder p="md" radius="md"
          className="stat-card stat-teal card-hover animate-fade-in-up"
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Valor atual</Text>
            <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
              <IconCoin size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="teal">{formatCurrency(totalAtual)}</Text>
        </Paper>

        <Paper
          withBorder p="md" radius="md"
          className={`stat-card ${rendimentoTotal >= 0 ? 'stat-teal' : 'stat-red'} card-hover animate-fade-in-up`}
          style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Rendimento</Text>
            <ThemeIcon variant="light" color={rendimentoTotal >= 0 ? 'teal' : 'red'} size="sm" radius="xl">
              {rendimentoTotal >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c={rendimentoTotal >= 0 ? 'teal' : 'red'}>
            {rendimentoTotal >= 0 ? '+' : ''}{formatCurrency(rendimentoTotal)}
          </Text>
          <Text size="xs" c="dimmed">
            {rendimentoPct >= 0 ? '+' : ''}{rendimentoPct.toFixed(2)}%
          </Text>
        </Paper>

        <Paper
          withBorder p="md" radius="md"
          className="stat-card stat-yellow card-hover animate-fade-in-up"
          style={{ animationDelay: '0.24s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Ativos</Text>
            <ThemeIcon variant="light" color="yellow" size="sm" radius="xl">
              <IconChartLine size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="yellow">{investimentos.length}</Text>
        </Paper>
      </SimpleGrid>

      {/* Charts & Broker Distribution */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        {/* Donut by type */}
        <Paper
          withBorder p="lg" radius="md"
          className="animate-fade-in-up"
          style={{ animationDelay: '0.3s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Text fw={600} mb="md">Distribuição por tipo</Text>
          {donutData.length > 0 ? (
            <DonutChart
              data={donutData}
              tooltipDataSource="segment"
              withLabelsLine
              withLabels
              chartLabel={formatCurrency(totalAtual)}
              h={240}
            />
          ) : (
            <Stack align="center" justify="center" h={240}>
              <Text c="dimmed" size="sm">Nenhum investimento registrado</Text>
            </Stack>
          )}
        </Paper>

        {/* By broker */}
        <Paper
          withBorder p="lg" radius="md"
          className="animate-fade-in-up"
          style={{ animationDelay: '0.35s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group gap="xs" mb="md">
            <ThemeIcon variant="light" color="violet" size="md" radius="xl">
              <IconBuildingBank size={18} />
            </ThemeIcon>
            <Text fw={600}>Por corretora</Text>
          </Group>

          {brokerList.length > 0 ? (
            <Stack gap="sm">
              {brokerList.map(([corretora, valor]) => {
                const pct = totalAtual > 0 ? Math.round((valor / totalAtual) * 100) : 0;
                const emoji = corretoraEmoji[corretora] || '🏦';

                return (
                  <Paper
                    key={corretora}
                    withBorder
                    p="sm"
                    radius="md"
                    style={{
                      borderColor: 'var(--mantine-color-dark-5)',
                      background: 'var(--mantine-color-dark-7)',
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="lg" lh={1}>{emoji}</Text>
                        <div>
                          <Text size="sm" fw={600}>{corretora}</Text>
                          <Text size="xs" c="dimmed">{pct}% da carteira</Text>
                        </div>
                      </Group>
                      <Text fw={700} c="teal">{formatCurrency(valor)}</Text>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Stack align="center" justify="center" h={240}>
              <Text c="dimmed" size="sm">Nenhuma corretora registrada</Text>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      {/* Investment Table */}
      <Paper
        withBorder
        radius="md"
        className="animate-fade-in-up"
        style={{
          animationDelay: '0.4s',
          borderColor: 'var(--mantine-color-dark-4)',
          overflow: 'hidden',
        }}
      >
        <Text fw={600} p="md" pb={0}>Meus investimentos</Text>

        {investimentos.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Corretora</Table.Th>
                <Table.Th>Data</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Investido</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Atual</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Rend.</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {investimentos.map((inv) => {
                const rend = Number(inv.valor_atual) - Number(inv.valor_investido);
                const rendPct = Number(inv.valor_investido) > 0
                  ? ((rend / Number(inv.valor_investido)) * 100)
                  : 0;

                return (
                  <Table.Tr key={inv.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{inv.nome}</Text>
                      {inv.notas && (
                        <Text size="xs" c="dimmed" lineClamp={1}>{inv.notas}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={tipoColors[inv.tipo] || 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {tipoLabels[inv.tipo] || inv.tipo}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text size="sm" lh={1}>{corretoraEmoji[inv.corretora] || '🏦'}</Text>
                        <Text size="sm">{inv.corretora}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dayjs(inv.data_compra).format('DD/MM/YYYY')}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm">{formatCurrency(Number(inv.valor_investido))}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600}>{formatCurrency(Number(inv.valor_atual))}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600} c={rend >= 0 ? 'teal' : 'red'}>
                        {rend >= 0 ? '+' : ''}{formatCurrency(rend)}
                      </Text>
                      <Text size="xs" c={rend >= 0 ? 'teal' : 'red'}>
                        {rend >= 0 ? '+' : ''}{rendPct.toFixed(1)}%
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="center">
                        <Tooltip label="Editar">
                          <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleOpenEdit(inv)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Excluir">
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(inv.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        ) : (
          <Stack align="center" py="xl">
            <ThemeIcon size="xl" color="violet" variant="light" radius="xl">
              <IconChartLine size={28} />
            </ThemeIcon>
            <Text c="dimmed" size="sm">
              Você ainda não registrou nenhum investimento.
            </Text>
            <Button variant="light" color="violet" onClick={handleOpenNew}>
              Registrar primeiro investimento
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Modal Create/Edit */}
      <Modal
        opened={opened}
        onClose={close}
        title={
          <Text fw={700} size="lg">
            {editingId ? 'Editar Investimento' : 'Novo Investimento'}
          </Text>
        }
        size="md"
        radius="lg"
        centered
        overlayProps={{ blur: 3 }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              id="inv-nome"
              label="Nome do investimento"
              placeholder="Ex: CDB Banco Inter 120%"
              size="md"
              {...form.getInputProps('nome')}
            />

            <Select
              id="inv-tipo"
              label="Tipo"
              placeholder="Selecione o tipo"
              data={tiposInvestimento}
              size="md"
              {...form.getInputProps('tipo')}
            />

            <Select
              id="inv-corretora"
              label="Corretora"
              placeholder="Onde está investido?"
              data={corretoras}
              searchable
              size="md"
              leftSection={<IconBuildingBank size={16} />}
              {...form.getInputProps('corretora')}
            />

            <SimpleGrid cols={2}>
              <NumberInput
                id="inv-valor-investido"
                label="Valor investido"
                placeholder="R$ 0,00"
                prefix="R$ "
                decimalSeparator=","
                thousandSeparator="."
                min={0.01}
                decimalScale={2}
                size="md"
                {...form.getInputProps('valor_investido')}
              />

              <NumberInput
                id="inv-valor-atual"
                label="Valor atual"
                placeholder="R$ 0,00"
                prefix="R$ "
                decimalSeparator=","
                thousandSeparator="."
                min={0}
                decimalScale={2}
                size="md"
                {...form.getInputProps('valor_atual')}
              />
            </SimpleGrid>

            <DateInput
              id="inv-data-compra"
              label="Data da compra"
              placeholder="Selecione a data"
              size="md"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('data_compra')}
            />

            <Textarea
              id="inv-notas"
              label="Notas (opcional)"
              placeholder="Observações sobre o investimento..."
              autosize
              minRows={2}
              maxRows={4}
              {...form.getInputProps('notas')}
            />

            <Divider />

            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-violet-8))',
                }}
              >
                {editingId ? 'Salvar alterações' : 'Adicionar investimento'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
