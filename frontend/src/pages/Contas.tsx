import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, LoadingOverlay,
  SimpleGrid, ThemeIcon, Tooltip, ColorInput, Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconArrowsTransferDown,
  IconBuildingBank, IconWallet, IconCash,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Conta {
  id: string;
  nome: string;
  banco: string;
  tipo: string;
  saldo_inicial: number;
  cor: string;
  icone: string;
  ativa: boolean;
  saldoAtual?: number;
}

const tipoOptions = [
  { value: 'corrente', label: '🏦 Conta Corrente' },
  { value: 'poupanca', label: '🐷 Poupança' },
  { value: 'carteira', label: '👛 Carteira / Dinheiro' },
  { value: 'investimento', label: '📈 Conta Investimento' },
  { value: 'outro', label: '💼 Outro' },
];

const iconeOptions = ['🏦', '🏧', '💳', '💰', '👛', '🐷', '📈', '💼', '💵', '🏛️', '🌍', '⭐'];

const corPresets = ['#20c997', '#228be6', '#7950f2', '#f03e3e', '#f59f00', '#ae3ec9', '#1098ad', '#0ca678', '#e64980', '#fd7e14'];

export default function Contas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<Conta[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIcone, setSelectedIcone] = useState('🏦');

  const form = useForm({
    initialValues: {
      nome: '',
      banco: '',
      tipo: 'corrente',
      saldo_inicial: 0 as number,
      cor: '#20c997',
      icone: '🏦',
    },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome da conta é obrigatório' : null),
      saldo_inicial: (v) => (v === undefined || v === null ? 'Saldo inicial é obrigatório' : null),
    },
  });

  const transferForm = useForm({
    initialValues: {
      conta_origem_id: '',
      conta_destino_id: '',
      valor: 0 as number,
      descricao: 'Transferência entre contas',
      data: new Date(),
    },
    validate: {
      conta_origem_id: (v) => (!v ? 'Selecione a conta de origem' : null),
      conta_destino_id: (v, values) => {
        if (!v) return 'Selecione a conta de destino';
        if (v === values.conta_origem_id) return 'Contas não podem ser iguais';
        return null;
      },
      valor: (v) => (!v || v <= 0 ? 'Valor deve ser maior que zero' : null),
    },
  });

  const fetchContas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/contas');
      setContas(data || []);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar contas', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContas(); }, [fetchContas]);

  const handleOpenNew = () => {
    setEditingId(null);
    setSelectedIcone('🏦');
    form.reset();
    form.setValues({ nome: '', banco: '', tipo: 'corrente', saldo_inicial: 0, cor: '#20c997', icone: '🏦' });
    open();
  };

  const handleOpenEdit = (c: Conta) => {
    setEditingId(c.id);
    setSelectedIcone(c.icone);
    form.setValues({
      nome: c.nome, banco: c.banco, tipo: c.tipo,
      saldo_inicial: Number(c.saldo_inicial), cor: c.cor, icone: c.icone,
    });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    const payload = { ...values, icone: selectedIcone };
    try {
      if (editingId) {
        await api.put(`/api/contas/${editingId}`, payload);
        notifications.show({ title: 'Conta atualizada', message: 'Alterações salvas.', color: 'teal' });
      } else {
        await api.post('/api/contas', payload);
        notifications.show({ title: 'Conta criada!', message: `"${values.nome}" adicionada com sucesso.`, color: 'teal' });
      }
      close();
      fetchContas();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/contas/${id}`);
      notifications.show({ title: 'Conta excluída', message: 'As transações vinculadas foram desvinculadas.', color: 'orange' });
      fetchContas();
    } catch (err: any) {
      notifications.show({ title: 'Erro ao excluir', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleTransfer = async (values: typeof transferForm.values) => {
    try {
      await api.post('/api/contas/transferir', {
        ...values,
        data: dayjs(values.data).format('YYYY-MM-DD'),
      });
      notifications.show({ title: '↔️ Transferência realizada!', message: `R$ ${Number(values.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} transferido com sucesso.`, color: 'teal' });
      closeTransfer();
      fetchContas();
    } catch (err: any) {
      notifications.show({ title: 'Erro na transferência', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const saldoTotalAtual = contas.reduce((s, c) => s + (c.saldoAtual ?? 0), 0);
  const contaOptions = contas.map(c => ({ value: c.id, label: `${c.icone} ${c.nome}` }));

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'carteira') return IconCash;
    if (tipo === 'investimento') return IconWallet;
    return IconBuildingBank;
  };

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'teal', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Contas Bancárias</Title>
          <Text c="dimmed" size="sm">Gerencie seu dinheiro em múltiplas contas</Text>
        </div>
        <Group gap="sm">
          {contas.length >= 2 && (
            <Button
              variant="light" color="blue" leftSection={<IconArrowsTransferDown size={16} />}
              onClick={() => { transferForm.reset(); transferForm.setFieldValue('data', new Date()); openTransfer(); }}
            >
              Transferir
            </Button>
          )}
          <Button
            id="btn-nova-conta"
            leftSection={<IconPlus size={16} />}
            onClick={handleOpenNew}
            style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}
          >
            Nova Conta
          </Button>
        </Group>
      </Group>

      {/* Saldo total consolidado */}
      {contas.length > 0 && (
        <Paper withBorder p="lg" radius="md" mb="xl" className="animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)', background: 'var(--mantine-color-dark-8)' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Saldo total consolidado</Text>
              <Text size="xl" fw={800} c={saldoTotalAtual >= 0 ? 'teal' : 'red'} mt={4}>
                {formatCurrency(saldoTotalAtual)}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>{contas.length} conta{contas.length !== 1 ? 's' : ''} ativa{contas.length !== 1 ? 's' : ''}</Text>
            </div>
            <ThemeIcon size={56} radius="xl" variant="light" color="teal">
              <IconBuildingBank size={28} />
            </ThemeIcon>
          </Group>
        </Paper>
      )}

      {/* Grid de contas */}
      {contas.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
          {contas.map((conta, i) => {
            const TipoIcon = getTipoIcon(conta.tipo);
            const tipoLabel = tipoOptions.find(t => t.value === conta.tipo)?.label || conta.tipo;
            const saldo = conta.saldoAtual ?? 0;
            return (
              <Paper
                key={conta.id}
                withBorder p="lg" radius="md"
                className="card-hover animate-fade-in-up"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  borderColor: conta.cor,
                  borderWidth: 1.5,
                  background: 'var(--mantine-color-dark-8)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Faixa de cor no topo */}
                <Box style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                  background: conta.cor,
                }} />

                <Group justify="space-between" mb="sm" mt={4}>
                  <Group gap="sm">
                    <Text size="xl">{conta.icone}</Text>
                    <div>
                      <Text fw={700} size="md" lh={1.2}>{conta.nome}</Text>
                      {conta.banco && <Text size="xs" c="dimmed">{conta.banco}</Text>}
                    </div>
                  </Group>
                  <Badge variant="light" color="gray" size="xs" leftSection={<TipoIcon size={10} />}>
                    {tipoLabel.split(' ').slice(1).join(' ')}
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={4}>Saldo atual</Text>
                <Text size="xl" fw={800} c={saldo >= 0 ? 'teal' : 'red'} mb="sm">
                  {formatCurrency(saldo)}
                </Text>

                {conta.saldo_inicial !== 0 && (
                  <Text size="xs" c="dimmed">
                    Saldo inicial: {formatCurrency(Number(conta.saldo_inicial))}
                  </Text>
                )}

                <Group justify="flex-end" mt="md" gap={4}>
                  <Tooltip label="Editar">
                    <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleOpenEdit(conta)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Excluir">
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(conta.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      ) : (
        <Paper withBorder p="xl" radius="md" className="animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Stack align="center" py="xl">
            <ThemeIcon size={64} radius="xl" variant="light" color="teal">
              <IconBuildingBank size={32} />
            </ThemeIcon>
            <Title order={4} c="dimmed">Nenhuma conta cadastrada</Title>
            <Text c="dimmed" size="sm" ta="center">
              Adicione suas contas bancárias para controlar o saldo de cada uma separadamente.
            </Text>
            <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew}>
              Adicionar primeira conta
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Modal Criar/Editar Conta */}
      <Modal
        opened={opened} onClose={close}
        title={<Text fw={700} size="lg">{editingId ? 'Editar Conta' : 'Nova Conta'}</Text>}
        size="md" radius="lg" centered overlayProps={{ blur: 3 }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Seletor de ícone */}
            <div>
              <Text size="sm" fw={500} mb={6}>Ícone</Text>
              <Group gap={8} wrap="wrap">
                {iconeOptions.map((ic) => (
                  <UnstyledButton key={ic} onClick={() => setSelectedIcone(ic)}>
                    <Box
                      style={{
                        width: 40, height: 40, borderRadius: 8, fontSize: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: selectedIcone === ic ? `2px solid ${form.values.cor}` : '2px solid transparent',
                        background: selectedIcone === ic ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-7)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {ic}
                    </Box>
                  </UnstyledButton>
                ))}
              </Group>
            </div>

            <TextInput id="modal-conta-nome" label="Nome da Conta" placeholder="Ex: Nubank, Itaú, Carteira" size="md" {...form.getInputProps('nome')} />
            <TextInput id="modal-conta-banco" label="Banco / Instituição" placeholder="Ex: Nubank, Itaú, Caixa" size="md" {...form.getInputProps('banco')} />
            <Select label="Tipo" data={tipoOptions} size="md" {...form.getInputProps('tipo')} />
            <NumberInput
              id="modal-conta-saldo"
              label="Saldo inicial"
              description="Quanto você já tem nessa conta hoje"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              decimalScale={2}
              size="md"
              {...form.getInputProps('saldo_inicial')}
            />
            <ColorInput
              label="Cor do card"
              placeholder="#20c997"
              swatches={corPresets}
              size="md"
              {...form.getInputProps('cor')}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={close}>Cancelar</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}>
                {editingId ? 'Salvar alterações' : 'Criar conta'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Transferência */}
      <Modal
        opened={transferOpened} onClose={closeTransfer}
        title={<Text fw={700} size="lg">↔️ Transferência entre Contas</Text>}
        size="md" radius="lg" centered overlayProps={{ blur: 3 }}
      >
        <form onSubmit={transferForm.onSubmit(handleTransfer)}>
          <Stack gap="md">
            <Select
              label="Conta de Origem (saída)"
              placeholder="Selecione a conta de origem"
              data={contaOptions}
              size="md"
              {...transferForm.getInputProps('conta_origem_id')}
            />
            <Center>
              <ThemeIcon variant="light" color="blue" size="lg" radius="xl">
                <IconArrowsTransferDown size={20} />
              </ThemeIcon>
            </Center>
            <Select
              label="Conta de Destino (entrada)"
              placeholder="Selecione a conta de destino"
              data={contaOptions}
              size="md"
              {...transferForm.getInputProps('conta_destino_id')}
            />
            <NumberInput
              label="Valor"
              placeholder="R$ 0,00"
              prefix="R$ "
              decimalSeparator=","
              thousandSeparator="."
              decimalScale={2}
              min={0.01}
              size="md"
              {...transferForm.getInputProps('valor')}
            />
            <TextInput label="Descrição" placeholder="Transferência entre contas" size="md" {...transferForm.getInputProps('descricao')} />
            <DateInput label="Data" valueFormat="DD/MM/YYYY" size="md" {...transferForm.getInputProps('data')} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={closeTransfer}>Cancelar</Button>
              <Button type="submit" color="blue">Confirmar Transferência</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

// Componente auxiliar inline (evita import desnecessário)
function UnstyledButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      {children}
    </button>
  );
}
