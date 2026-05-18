import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Text,
  Title,
  Badge,
  Progress,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  LoadingOverlay,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconTargetArrow,
  IconCoin,
  IconTrophy,
  IconCoinOff,
  IconBuildingBank,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Meta {
  id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  local_guardado: string | null;
  data_limite: string | null;
  concluida: boolean;
}

const locaisGuardado = [
  'Cofrinho',
  'Nubank',
  'Mercado Pago',
  'Santander',
  'Itaú',
  'Bradesco',
  'Banco do Brasil',
  'Caixa',
  'Inter',
  'C6 Bank',
  'PicPay',
  'PagBank',
  'Carteira',
  'Poupança',
  'Investimento',
  'Outro',
];

export default function Metas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [newOpened, { open: openNew, close: closeNew }] = useDisclosure(false);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [selectedMeta, setSelectedMeta] = useState<Meta | null>(null);
  const [addValue, setAddValue] = useState<number | ''>('');

  const form = useForm({
    initialValues: {
      nome: '',
      valor_alvo: '' as number | '',
      valor_atual: '' as number | '',
      local_guardado: '' as string,
      data_limite: null as Date | null,
    },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome da meta é obrigatório' : null),
      valor_alvo: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null),
    },
  });

  const fetchMetas = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('metas')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      notifications.show({
        title: 'Erro ao carregar metas',
        message: error.message,
        color: 'red',
      });
    } else {
      setMetas(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchMetas();
  }, [user]);

  const handleCreateMeta = async (values: typeof form.values) => {
    if (!user) return;

    const valorAtual = Number(values.valor_atual) || 0;
    const valorAlvo = Number(values.valor_alvo);

    const { error } = await supabase.from('metas').insert({
      user_id: user.id,
      nome: values.nome,
      valor_alvo: valorAlvo,
      valor_atual: valorAtual,
      local_guardado: values.local_guardado || null,
      data_limite: values.data_limite
        ? dayjs(values.data_limite).format('YYYY-MM-DD')
        : null,
      concluida: valorAtual >= valorAlvo,
    });

    if (error) {
      notifications.show({
        title: 'Erro ao criar meta',
        message: error.message,
        color: 'red',
      });
      return;
    }

    notifications.show({
      title: 'Meta criada!',
      message: `"${values.nome}" adicionada com sucesso.`,
      color: 'teal',
    });

    closeNew();
    form.reset();
    fetchMetas();
  };

  const handleAddValue = async () => {
    if (!selectedMeta || !addValue || Number(addValue) <= 0) return;

    const novoValor = Number(selectedMeta.valor_atual) + Number(addValue);
    const concluida = novoValor >= Number(selectedMeta.valor_alvo);

    const { error } = await supabase
      .from('metas')
      .update({
        valor_atual: novoValor,
        concluida,
      })
      .eq('id', selectedMeta.id);

    if (error) {
      notifications.show({
        title: 'Erro ao atualizar meta',
        message: error.message,
        color: 'red',
      });
      return;
    }

    if (concluida) {
      notifications.show({
        title: '🎉 Meta concluída!',
        message: `Parabéns! Você atingiu a meta "${selectedMeta.nome}"!`,
        color: 'teal',
      });
    } else {
      notifications.show({
        title: 'Valor adicionado',
        message: `R$ ${Number(addValue).toFixed(2)} adicionado à meta "${selectedMeta.nome}".`,
        color: 'teal',
      });
    }

    closeAdd();
    setAddValue('');
    setSelectedMeta(null);
    fetchMetas();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('metas').delete().eq('id', id);

    if (error) {
      notifications.show({
        title: 'Erro ao excluir',
        message: error.message,
        color: 'red',
      });
      return;
    }

    notifications.show({
      title: 'Meta excluída',
      message: 'Meta removida com sucesso.',
      color: 'teal',
    });

    fetchMetas();
  };

  const openAddModal = (meta: Meta) => {
    setSelectedMeta(meta);
    setAddValue('');
    openAdd();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Summary calculations
  const metasAtivas = metas.filter((m) => !m.concluida).length;
  const totalAlvo = metas
    .filter((m) => !m.concluida)
    .reduce((sum, m) => sum + Number(m.valor_alvo), 0);
  const totalGuardado = metas.reduce((sum, m) => sum + Number(m.valor_atual), 0);

  const summaryCards = [
    {
      title: 'Metas ativas',
      value: metasAtivas.toString(),
      icon: IconTargetArrow,
      color: 'blue',
      cssClass: 'stat-blue',
    },
    {
      title: 'Total a poupar',
      value: formatCurrency(totalAlvo),
      icon: IconCoinOff,
      color: 'yellow',
      cssClass: 'stat-yellow',
    },
    {
      title: 'Já guardado',
      value: formatCurrency(totalGuardado),
      icon: IconCoin,
      color: 'teal',
      cssClass: 'stat-teal',
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
            Metas
          </Title>
          <Text c="dimmed" size="sm">
            Acompanhe suas metas de economia
          </Text>
        </div>
        <Button
          id="btn-nova-meta"
          leftSection={<IconPlus size={16} />}
          onClick={openNew}
          style={{
            background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
          }}
        >
          Nova Meta
        </Button>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        {summaryCards.map((card, i) => (
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
              {card.value}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Goals Grid */}
      {metas.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {metas.map((meta, i) => {
            const progress = Math.min(
              (Number(meta.valor_atual) / Number(meta.valor_alvo)) * 100,
              100
            );

            return (
              <Card
                key={meta.id}
                withBorder
                radius="md"
                p="lg"
                className="card-hover animate-fade-in-up"
                style={{
                  animationDelay: `${(i + 3) * 0.06}s`,
                  borderColor: meta.concluida
                    ? 'var(--mantine-color-teal-7)'
                    : 'var(--mantine-color-dark-4)',
                }}
              >
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    {meta.concluida && (
                      <ThemeIcon size="sm" color="teal" variant="light" radius="xl">
                        <IconTrophy size={12} />
                      </ThemeIcon>
                    )}
                    <Text fw={600} lineClamp={1}>
                      {meta.nome}
                    </Text>
                  </Group>
                  <Badge
                    color={meta.concluida ? 'teal' : 'gray'}
                    variant={meta.concluida ? 'filled' : 'light'}
                    size="sm"
                  >
                    {meta.concluida ? 'Concluída' : 'Em andamento'}
                  </Badge>
                </Group>

                <Progress
                  value={progress}
                  color={meta.concluida ? 'teal' : 'blue'}
                  size="lg"
                  radius="xl"
                  mb="xs"
                  animated={!meta.concluida}
                  className={meta.concluida ? '' : 'progress-glow'}
                />

                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    {formatCurrency(Number(meta.valor_atual))} de{' '}
                    {formatCurrency(Number(meta.valor_alvo))}
                  </Text>
                  <Text size="sm" fw={500} c={meta.concluida ? 'teal' : 'blue'}>
                    {Math.round(progress)}%
                  </Text>
                </Group>

                {meta.local_guardado && (
                  <Badge
                    variant="light"
                    color="violet"
                    size="sm"
                    mb="xs"
                    leftSection={<IconBuildingBank size={12} />}
                  >
                    {meta.local_guardado}
                  </Badge>
                )}

                {meta.data_limite && (
                  <Text size="xs" c="dimmed" mb="xs">
                    Prazo: {dayjs(meta.data_limite).format('DD/MM/YYYY')}
                  </Text>
                )}

                <Group mt="md" gap="xs">
                  {!meta.concluida && (
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      onClick={() => openAddModal(meta)}
                    >
                      + Adicionar valor
                    </Button>
                  )}
                  <Tooltip label="Excluir meta">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(meta.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <Paper
          withBorder
          p="xl"
          radius="md"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}
        >
          <Stack align="center" py="lg">
            <ThemeIcon size="xl" color="teal" variant="light" radius="xl">
              <IconTargetArrow size={28} />
            </ThemeIcon>
            <Text c="dimmed" size="sm" ta="center">
              Você ainda não criou nenhuma meta de economia.
            </Text>
            <Button variant="light" color="teal" onClick={openNew}>
              Criar primeira meta
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Modal New Goal */}
      <Modal
        opened={newOpened}
        onClose={closeNew}
        title={
          <Text fw={700} size="lg">
            Nova Meta
          </Text>
        }
        size="md"
        radius="lg"
        centered
        overlayProps={{ blur: 3 }}
      >
        <form onSubmit={form.onSubmit(handleCreateMeta)}>
          <Stack gap="md">
            <TextInput
              id="meta-nome"
              label="Nome da meta"
              placeholder="Ex: Viagem para Europa"
              size="md"
              {...form.getInputProps('nome')}
            />

            <NumberInput
              id="meta-valor-alvo"
              label="Valor alvo"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              min={0.01}
              decimalScale={2}
              size="md"
              {...form.getInputProps('valor_alvo')}
            />

            <NumberInput
              id="meta-valor-atual"
              label="Já tenho guardado"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              min={0}
              decimalScale={2}
              size="md"
              {...form.getInputProps('valor_atual')}
            />

            <Select
              id="meta-local-guardado"
              label="Onde está guardado?"
              placeholder="Ex: Nubank, Cofrinho..."
              data={locaisGuardado}
              searchable
              clearable
              size="md"
              leftSection={<IconBuildingBank size={16} />}
              {...form.getInputProps('local_guardado')}
            />

            <DateInput
              id="meta-data-limite"
              label="Data limite (opcional)"
              placeholder="Selecione a data"
              clearable
              size="md"
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps('data_limite')}
            />

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={closeNew}>
                Cancelar
              </Button>
              <Button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
                }}
              >
                Criar meta
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Add Value */}
      <Modal
        opened={addOpened}
        onClose={closeAdd}
        title={
          <Text fw={700} size="lg">
            Adicionar valor
          </Text>
        }
        size="sm"
        radius="lg"
        centered
        overlayProps={{ blur: 3 }}
      >
        {selectedMeta && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Meta: <strong>{selectedMeta.nome}</strong>
            </Text>
            <Text size="sm" c="dimmed">
              Atual: {formatCurrency(Number(selectedMeta.valor_atual))} de{' '}
              {formatCurrency(Number(selectedMeta.valor_alvo))}
            </Text>

            <NumberInput
              id="add-valor"
              label="Quanto deseja adicionar?"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              min={0.01}
              decimalScale={2}
              size="md"
              value={addValue}
              onChange={(v) => setAddValue(v as number | '')}
            />

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={closeAdd}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddValue}
                disabled={!addValue || Number(addValue) <= 0}
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
                }}
              >
                Adicionar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
