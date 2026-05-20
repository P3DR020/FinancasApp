import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Group,
  Paper,
  Table,
  Text,
  Title,
  Badge,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  TagsInput,
  NumberInput,
  Select,
  SegmentedControl,
  LoadingOverlay,
  Tooltip,
} from '@mantine/core';
import { DateInput, MonthPickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconFilter,
  IconTag,
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
  tags: string[];
}

const categorias = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Moradia',
  'Outros',
];

export default function Transacoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [mesFiltro, setMesFiltro] = useState<string | null>(dayjs().format('YYYY-MM-DD'));
  const [tipoFiltro, setTipoFiltro] = useState<string | null>('Todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      tipo: 'despesa' as 'receita' | 'despesa',
      valor: '' as number | '',
      descricao: '',
      categoria: '',
      data: new Date(),
      tags: [] as string[],
    },
    validate: {
      valor: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null),
      descricao: (v) => (!v.trim() ? 'Descrição obrigatória' : null),
      categoria: (v) => (!v ? 'Selecione uma categoria' : null),
    },
  });

  const fetchTransacoes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('transacoes')
      .select('*')
      .order('data', { ascending: false });

    // Month filter
    if (mesFiltro) {
      const inicio = dayjs(mesFiltro).startOf('month').format('YYYY-MM-DD');
      const fim = dayjs(mesFiltro).endOf('month').format('YYYY-MM-DD');
      query = query.gte('data', inicio).lte('data', fim);
    }

    // Type filter
    if (tipoFiltro && tipoFiltro !== 'Todos') {
      const tipo = tipoFiltro === 'Receitas' ? 'receita' : 'despesa';
      query = query.eq('tipo', tipo);
    }

    // Category filter
    if (categoriaFiltro) {
      query = query.eq('categoria', categoriaFiltro);
    }

    // Tag filter
    if (tagFiltro) {
      query = query.contains('tags', [tagFiltro]);
    }

    const { data, error } = await query;

    if (error) {
      notifications.show({
        title: 'Erro ao carregar transações',
        message: error.message,
        color: 'red',
      });
    } else {
      setTransacoes(data || []);
    }

    setLoading(false);
  }, [user, mesFiltro, tipoFiltro, categoriaFiltro, tagFiltro]);

  useEffect(() => {
    fetchTransacoes();
  }, [fetchTransacoes]);

  const handleOpenNew = () => {
    setEditingId(null);
    form.reset();
    form.setFieldValue('data', new Date());
    open();
  };

  const handleOpenEdit = (t: Transacao) => {
    setEditingId(t.id);
    form.setValues({
      tipo: t.tipo,
      valor: Number(t.valor),
      descricao: t.descricao,
      categoria: t.categoria,
      data: new Date(t.data + 'T12:00:00'),
      tags: t.tags || [],
    });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      tipo: values.tipo,
      valor: Number(values.valor),
      descricao: values.descricao,
      categoria: values.categoria,
      data: dayjs(values.data).format('YYYY-MM-DD'),
      tags: values.tags || [],
    };

    if (editingId) {
      const { error } = await supabase
        .from('transacoes')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        notifications.show({
          title: 'Erro ao atualizar',
          message: error.message,
          color: 'red',
        });
        return;
      }

      notifications.show({
        title: 'Transação atualizada',
        message: 'Alterações salvas com sucesso.',
        color: 'teal',
      });
    } else {
      const { error } = await supabase.from('transacoes').insert(payload);

      if (error) {
        notifications.show({
          title: 'Erro ao criar transação',
          message: error.message,
          color: 'red',
        });
        return;
      }

      notifications.show({
        title: 'Transação criada',
        message: `${values.tipo === 'receita' ? 'Receita' : 'Despesa'} registrada com sucesso.`,
        color: 'teal',
      });
    }

    close();
    fetchTransacoes();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transacoes').delete().eq('id', id);

    if (error) {
      notifications.show({
        title: 'Erro ao excluir',
        message: error.message,
        color: 'red',
      });
      return;
    }

    notifications.show({
      title: 'Transação excluída',
      message: 'Registro removido com sucesso.',
      color: 'teal',
    });

    fetchTransacoes();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Summary
  const totalReceitas = transacoes
    .filter((t) => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);

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
            Transações
          </Title>
          <Text c="dimmed" size="sm">
            Gerencie suas receitas e despesas
          </Text>
        </div>
        <Button
          id="btn-nova-transacao"
          leftSection={<IconPlus size={16} />}
          onClick={handleOpenNew}
          style={{
            background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
          }}
        >
          Nova Transação
        </Button>
      </Group>

      {/* Filters */}
      <Paper
        withBorder
        p="md"
        radius="md"
        mb="lg"
        className="animate-fade-in-up"
        style={{ borderColor: 'var(--mantine-color-dark-4)' }}
      >
        <Group align="flex-end" gap="md">
          <IconFilter size={18} color="var(--mantine-color-dimmed)" />
          <MonthPickerInput
            label="Mês"
            placeholder="Selecionar mês"
            value={mesFiltro}
            onChange={setMesFiltro}
            clearable
            w={180}
            size="sm"
          />
          <Select
            label="Tipo"
            data={['Todos', 'Receitas', 'Despesas']}
            value={tipoFiltro}
            onChange={setTipoFiltro}
            w={140}
            size="sm"
          />
          <Select
            label="Categoria"
            data={categorias}
            value={categoriaFiltro}
            onChange={setCategoriaFiltro}
            clearable
            placeholder="Todas"
            w={180}
            size="sm"
          />
          <Select
            label="Tag"
            data={[...new Set(transacoes.flatMap((t) => t.tags || []))]}
            value={tagFiltro}
            onChange={setTagFiltro}
            clearable
            placeholder="Todas"
            w={160}
            size="sm"
            leftSection={<IconTag size={14} />}
          />
        </Group>
      </Paper>

      {/* Summary badges */}
      <Group mb="md" gap="lg">
        <Badge
          color="teal"
          variant="light"
          size="lg"
          style={{ padding: '12px 16px' }}
        >
          Receitas: {formatCurrency(totalReceitas)}
        </Badge>
        <Badge
          color="red"
          variant="light"
          size="lg"
          style={{ padding: '12px 16px' }}
        >
          Despesas: {formatCurrency(totalDespesas)}
        </Badge>
        <Badge
          color={totalReceitas - totalDespesas >= 0 ? 'blue' : 'orange'}
          variant="light"
          size="lg"
          style={{ padding: '12px 16px' }}
        >
          Saldo: {formatCurrency(totalReceitas - totalDespesas)}
        </Badge>
      </Group>

      {/* Table */}
      <Paper
        withBorder
        radius="md"
        className="animate-fade-in-up"
        style={{
          animationDelay: '0.1s',
          borderColor: 'var(--mantine-color-dark-4)',
          overflow: 'hidden',
        }}
      >
        {transacoes.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transacoes.map((t) => (
                <Table.Tr key={t.id}>
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
                  <Table.Td>
                    <Group gap={4}>
                      {(t.tags || []).map((tag) => (
                        <Badge key={tag} variant="dot" color="grape" size="xs">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
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
                  <Table.Td>
                    <Group gap={4} justify="center">
                      <Tooltip label="Editar">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          onClick={() => handleOpenEdit(t)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Excluir">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Stack align="center" py="xl">
            <Text c="dimmed" size="sm">
              Nenhuma transação encontrada para os filtros selecionados
            </Text>
            <Button variant="light" color="teal" size="sm" onClick={handleOpenNew}>
              Criar transação
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
            {editingId ? 'Editar Transação' : 'Nova Transação'}
          </Text>
        }
        size="md"
        radius="lg"
        centered
        overlayProps={{ blur: 3 }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <SegmentedControl
              fullWidth
              data={[
                { label: '💸 Despesa', value: 'despesa' },
                { label: '💰 Receita', value: 'receita' },
              ]}
              color={form.values.tipo === 'receita' ? 'teal' : 'red'}
              {...form.getInputProps('tipo')}
            />

            <NumberInput
              id="modal-valor"
              label="Valor"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              min={0.01}
              decimalScale={2}
              size="md"
              {...form.getInputProps('valor')}
            />

            <TextInput
              id="modal-descricao"
              label="Descrição"
              placeholder="Ex: Supermercado, Aluguel..."
              size="md"
              {...form.getInputProps('descricao')}
            />

            <Select
              id="modal-categoria"
              label="Categoria"
              placeholder="Selecione uma categoria"
              data={categorias}
              size="md"
              {...form.getInputProps('categoria')}
            />

            <DateInput
              id="modal-data"
              label="Data"
              placeholder="Selecione a data"
              size="md"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('data')}
            />

            <TagsInput
              label="Tags / Etiquetas"
              placeholder="Digite e pressione Enter"
              size="md"
              clearable
              {...form.getInputProps('tags')}
            />

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
                }}
              >
                {editingId ? 'Salvar alterações' : 'Criar transação'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
