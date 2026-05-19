import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Text,
  Title,
  Badge,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  SegmentedControl,
  Switch,
  Textarea,
  LoadingOverlay,
  ThemeIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRepeat,
  IconArrowUpRight,
  IconArrowDownRight,
  IconCalendarDue,
  IconPlayerPause,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Fixo {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  dia_vencimento: number | null;
  ativo: boolean;
  notas: string | null;
}

const categoriasReceita = [
  'Salário',
  'Freelance fixo',
  'Aluguel recebido',
  'Pensão',
  'Aposentadoria',
  'Mesada',
  'Outro',
];

const categoriasDespesa = [
  'Moradia (Aluguel/Financiamento)',
  'Condomínio',
  'Internet',
  'Celular',
  'Energia elétrica',
  'Água',
  'Gás',
  'Academia',
  'Streaming (Netflix, Spotify...)',
  'Plano de saúde',
  'Seguro',
  'Transporte (ônibus/metrô)',
  'Escola/Faculdade',
  'Assinatura',
  'Outro',
];

export default function Fixos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fixos, setFixos] = useState<Fixo[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      nome: '',
      tipo: 'despesa' as 'receita' | 'despesa',
      valor: '' as number | '',
      categoria: '',
      dia_vencimento: '' as number | '',
      ativo: true,
      notas: '',
    },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
      valor: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null),
      categoria: (v) => (!v ? 'Selecione uma categoria' : null),
    },
  });

  const fetchFixos = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('fixos')
      .select('*')
      .order('tipo', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      notifications.show({ title: 'Erro ao carregar', message: error.message, color: 'red' });
    } else {
      setFixos(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchFixos();
  }, [user, fetchFixos]);

  const handleOpenNew = () => {
    setEditingId(null);
    form.reset();
    open();
  };

  const handleOpenEdit = (f: Fixo) => {
    setEditingId(f.id);
    form.setValues({
      nome: f.nome,
      tipo: f.tipo,
      valor: Number(f.valor),
      categoria: f.categoria,
      dia_vencimento: f.dia_vencimento || ('' as number | ''),
      ativo: f.ativo,
      notas: f.notas || '',
    });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      nome: values.nome,
      tipo: values.tipo,
      valor: Number(values.valor),
      categoria: values.categoria,
      dia_vencimento: values.dia_vencimento ? Number(values.dia_vencimento) : null,
      ativo: values.ativo,
      notas: values.notas || null,
    };

    if (editingId) {
      const { error } = await supabase.from('fixos').update(payload).eq('id', editingId);
      if (error) {
        notifications.show({ title: 'Erro', message: error.message, color: 'red' });
        return;
      }
      notifications.show({ title: 'Atualizado!', message: 'Alterações salvas.', color: 'teal' });
    } else {
      const { error } = await supabase.from('fixos').insert(payload);
      if (error) {
        notifications.show({ title: 'Erro', message: error.message, color: 'red' });
        return;
      }
      notifications.show({ title: 'Adicionado!', message: `"${values.nome}" registrado.`, color: 'teal' });
    }

    close();
    fetchFixos();
  };

  const handleToggleAtivo = async (f: Fixo) => {
    const { error } = await supabase
      .from('fixos')
      .update({ ativo: !f.ativo })
      .eq('id', f.id);

    if (error) {
      notifications.show({ title: 'Erro', message: error.message, color: 'red' });
      return;
    }
    notifications.show({
      title: f.ativo ? 'Pausado' : 'Reativado',
      message: `"${f.nome}" ${f.ativo ? 'pausado' : 'reativado'}.`,
      color: 'teal',
    });
    fetchFixos();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('fixos').delete().eq('id', id);
    if (error) {
      notifications.show({ title: 'Erro', message: error.message, color: 'red' });
      return;
    }
    notifications.show({ title: 'Excluído', message: 'Registro removido.', color: 'teal' });
    fetchFixos();
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Calculations
  const receitasFixas = fixos.filter((f) => f.tipo === 'receita' && f.ativo);
  const despesasFixas = fixos.filter((f) => f.tipo === 'despesa' && f.ativo);
  const totalReceitas = receitasFixas.reduce((s, f) => s + Number(f.valor), 0);
  const totalDespesas = despesasFixas.reduce((s, f) => s + Number(f.valor), 0);
  const sobra = totalReceitas - totalDespesas;

  const currentCategorias = form.values.tipo === 'receita' ? categoriasReceita : categoriasDespesa;

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
          <Title order={2} fw={700}>Fixos</Title>
          <Text c="dimmed" size="sm">Rendas e despesas que se repetem todo mês</Text>
        </div>
        <Button
          id="btn-novo-fixo"
          leftSection={<IconPlus size={16} />}
          onClick={handleOpenNew}
          style={{
            background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
          }}
        >
          Novo fixo
        </Button>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper
          withBorder p="md" radius="md"
          className="stat-card stat-teal card-hover animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Receitas fixas/mês</Text>
            <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
              <IconArrowUpRight size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="teal">{formatCurrency(totalReceitas)}</Text>
          <Text size="xs" c="dimmed">{receitasFixas.length} ativas</Text>
        </Paper>

        <Paper
          withBorder p="md" radius="md"
          className="stat-card stat-red card-hover animate-fade-in-up"
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Despesas fixas/mês</Text>
            <ThemeIcon variant="light" color="red" size="sm" radius="xl">
              <IconArrowDownRight size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="red">{formatCurrency(totalDespesas)}</Text>
          <Text size="xs" c="dimmed">{despesasFixas.length} ativas</Text>
        </Paper>

        <Paper
          withBorder p="md" radius="md"
          className={`stat-card ${sobra >= 0 ? 'stat-blue' : 'stat-red'} card-hover animate-fade-in-up`}
          style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Sobra mensal</Text>
            <ThemeIcon variant="light" color={sobra >= 0 ? 'blue' : 'red'} size="sm" radius="xl">
              <IconRepeat size={14} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c={sobra >= 0 ? 'blue' : 'red'}>{formatCurrency(sobra)}</Text>
          <Text size="xs" c="dimmed">Receitas - Despesas</Text>
        </Paper>
      </SimpleGrid>

      {/* Fixed Income */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        {/* Receitas */}
        <Paper
          withBorder p="lg" radius="md"
          className="animate-fade-in-up"
          style={{ animationDelay: '0.2s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group gap="xs" mb="md">
            <ThemeIcon variant="light" color="teal" size="md" radius="xl">
              <IconArrowUpRight size={18} />
            </ThemeIcon>
            <Text fw={600}>Receitas fixas</Text>
            <Badge color="teal" variant="light" size="sm" ml="auto">
              {formatCurrency(totalReceitas)}/mês
            </Badge>
          </Group>

          {receitasFixas.length > 0 || fixos.filter(f => f.tipo === 'receita' && !f.ativo).length > 0 ? (
            <Stack gap="xs">
              {fixos.filter(f => f.tipo === 'receita').map((f) => (
                <Paper
                  key={f.id}
                  withBorder p="sm" radius="md"
                  style={{
                    borderColor: 'var(--mantine-color-dark-5)',
                    background: 'var(--mantine-color-dark-7)',
                    opacity: f.ativo ? 1 : 0.5,
                  }}
                >
                  <Group justify="space-between">
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={600} td={f.ativo ? undefined : 'line-through'}>
                          {f.nome}
                        </Text>
                        {!f.ativo && <Badge color="gray" size="xs" variant="light">Pausado</Badge>}
                      </Group>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">{f.categoria}</Text>
                        {f.dia_vencimento && (
                          <Badge color="teal" size="xs" variant="dot">
                            Dia {f.dia_vencimento}
                          </Badge>
                        )}
                      </Group>
                    </div>
                    <Group gap={4}>
                      <Text fw={700} c="teal" size="sm">{formatCurrency(Number(f.valor))}</Text>
                      <Tooltip label={f.ativo ? 'Pausar' : 'Reativar'}>
                        <ActionIcon variant="subtle" color={f.ativo ? 'yellow' : 'teal'} size="sm" onClick={() => handleToggleAtivo(f)}>
                          {f.ativo ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleOpenEdit(f)}>
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Excluir">
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(f.id)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" size="sm" ta="center" py="md">Nenhuma receita fixa cadastrada</Text>
          )}
        </Paper>

        {/* Despesas */}
        <Paper
          withBorder p="lg" radius="md"
          className="animate-fade-in-up"
          style={{ animationDelay: '0.25s', borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Group gap="xs" mb="md">
            <ThemeIcon variant="light" color="red" size="md" radius="xl">
              <IconArrowDownRight size={18} />
            </ThemeIcon>
            <Text fw={600}>Despesas fixas</Text>
            <Badge color="red" variant="light" size="sm" ml="auto">
              {formatCurrency(totalDespesas)}/mês
            </Badge>
          </Group>

          {despesasFixas.length > 0 || fixos.filter(f => f.tipo === 'despesa' && !f.ativo).length > 0 ? (
            <Stack gap="xs">
              {fixos.filter(f => f.tipo === 'despesa').map((f) => (
                <Paper
                  key={f.id}
                  withBorder p="sm" radius="md"
                  style={{
                    borderColor: 'var(--mantine-color-dark-5)',
                    background: 'var(--mantine-color-dark-7)',
                    opacity: f.ativo ? 1 : 0.5,
                  }}
                >
                  <Group justify="space-between">
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={600} td={f.ativo ? undefined : 'line-through'}>
                          {f.nome}
                        </Text>
                        {!f.ativo && <Badge color="gray" size="xs" variant="light">Pausado</Badge>}
                      </Group>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">{f.categoria}</Text>
                        {f.dia_vencimento && (
                          <Badge color="red" size="xs" variant="dot">
                            Dia {f.dia_vencimento}
                          </Badge>
                        )}
                      </Group>
                    </div>
                    <Group gap={4}>
                      <Text fw={700} c="red" size="sm">{formatCurrency(Number(f.valor))}</Text>
                      <Tooltip label={f.ativo ? 'Pausar' : 'Reativar'}>
                        <ActionIcon variant="subtle" color={f.ativo ? 'yellow' : 'teal'} size="sm" onClick={() => handleToggleAtivo(f)}>
                          {f.ativo ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleOpenEdit(f)}>
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Excluir">
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(f.id)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" size="sm" ta="center" py="md">Nenhuma despesa fixa cadastrada</Text>
          )}
        </Paper>
      </SimpleGrid>

      {/* Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700} size="lg">{editingId ? 'Editar fixo' : 'Novo fixo'}</Text>}
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
                { label: '📉 Despesa fixa', value: 'despesa' },
                { label: '📈 Receita fixa', value: 'receita' },
              ]}
              color={form.values.tipo === 'receita' ? 'teal' : 'red'}
              {...form.getInputProps('tipo')}
              onChange={(v) => {
                form.setFieldValue('tipo', v as 'receita' | 'despesa');
                form.setFieldValue('categoria', '');
              }}
            />

            <TextInput
              label="Nome"
              placeholder="Ex: Salário, Internet Vivo, Academia..."
              size="md"
              {...form.getInputProps('nome')}
            />

            <NumberInput
              label="Valor mensal"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              min={0.01}
              decimalScale={2}
              size="md"
              {...form.getInputProps('valor')}
            />

            <Select
              label="Categoria"
              placeholder="Selecione"
              data={currentCategorias}
              size="md"
              {...form.getInputProps('categoria')}
            />

            <NumberInput
              label="Dia do vencimento (opcional)"
              placeholder="Ex: 5, 10, 15..."
              min={1}
              max={31}
              size="md"
              leftSection={<IconCalendarDue size={16} />}
              {...form.getInputProps('dia_vencimento')}
            />

            {editingId && (
              <Switch
                label="Ativo"
                description="Desative para pausar temporariamente"
                color="teal"
                {...form.getInputProps('ativo', { type: 'checkbox' })}
              />
            )}

            <Textarea
              label="Notas (opcional)"
              placeholder="Observações..."
              autosize
              minRows={2}
              maxRows={3}
              {...form.getInputProps('notas')}
            />

            <Divider />

            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Cancelar</Button>
              <Button
                type="submit"
                style={{
                  background: form.values.tipo === 'receita'
                    ? 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))'
                    : 'linear-gradient(135deg, var(--mantine-color-red-6), var(--mantine-color-red-8))',
                }}
              >
                {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
