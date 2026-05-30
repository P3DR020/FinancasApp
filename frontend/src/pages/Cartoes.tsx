import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, ColorInput, LoadingOverlay,
  ThemeIcon, Tooltip, Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconCreditCard, IconPlayerPause, IconPlayerPlay,
} from '@tabler/icons-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Cartao {
  id: string; nome: string; bandeira: string; limite: number;
  dia_fechamento: number; dia_vencimento: number; cor: string; ativo: boolean;
}

const bandeiras = [
  { value: 'Mastercard', label: 'Mastercard' },
  { value: 'Visa', label: 'Visa' },
  { value: 'Elo', label: 'Elo' },
  { value: 'American Express', label: 'American Express' },
  { value: 'Outra', label: 'Outra' },
];

export default function Cartoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm({
    initialValues: { nome: '', bandeira: '', limite: '' as number | '', dia_fechamento: '' as number | '', dia_vencimento: '' as number | '', cor: '#228be6', ativo: true },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
      bandeira: (v) => (!v ? 'Bandeira é obrigatória' : null),
      limite: (v) => (!v || Number(v) <= 0 ? 'Limite deve ser maior que zero' : null),
      dia_fechamento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido' : null),
      dia_vencimento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido' : null),
    },
  });

  const fetchCartoes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/cartoes');
      setCartoes(data || []);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchCartoes(); }, [user, fetchCartoes]);

  const handleOpenNew = () => { setEditingId(null); form.reset(); open(); };

  const handleOpenEdit = (c: Cartao) => {
    setEditingId(c.id);
    form.setValues({ nome: c.nome, bandeira: c.bandeira, limite: Number(c.limite), dia_fechamento: Number(c.dia_fechamento), dia_vencimento: Number(c.dia_vencimento), cor: c.cor || '#228be6', ativo: c.ativo });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;
    const payload = { nome: values.nome, bandeira: values.bandeira, limite: Number(values.limite), dia_fechamento: Number(values.dia_fechamento), dia_vencimento: Number(values.dia_vencimento), cor: values.cor, ativo: values.ativo };

    try {
      if (editingId) {
        await api.put(`/api/cartoes/${editingId}`, payload);
        notifications.show({ title: 'Atualizado!', message: 'Cartão atualizado.', color: 'teal' });
      } else {
        await api.post('/api/cartoes', payload);
        notifications.show({ title: 'Adicionado!', message: 'Cartão registrado com sucesso.', color: 'teal' });
      }
      close(); fetchCartoes();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleToggleAtivo = async (c: Cartao) => {
    try {
      await api.patch(`/api/cartoes/${c.id}/toggle`);
      notifications.show({ title: c.ativo ? 'Pausado' : 'Reativado', message: `O cartão "${c.nome}" foi ${c.ativo ? 'pausado' : 'reativado'}.`, color: 'teal' });
      fetchCartoes();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/cartoes/${id}`);
      notifications.show({ title: 'Excluído', message: 'Cartão removido.', color: 'teal' });
      fetchCartoes();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const limiteTotal = cartoes.filter(c => c.ativo).reduce((sum, c) => sum + Number(c.limite), 0);

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'indigo', type: 'bars' }} />
      <Group justify="space-between" mb="lg">
        <div><Title order={2} fw={700}>Cartões de Crédito</Title><Text c="dimmed" size="sm">Gerencie seus limites e faturas</Text></div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew} style={{ background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-blue-7))' }}>Novo Cartão</Button>
      </Group>

      {cartoes.length > 0 && (
        <Paper withBorder p="md" radius="md" mb="xl" className="stat-card stat-blue card-hover animate-fade-in-up" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs"><Text size="xs" c="dimmed" fw={500} tt="uppercase">Limite Total Disponível (Soma dos ativos)</Text><ThemeIcon variant="light" color="indigo" size="sm" radius="xl"><IconCreditCard size={14} /></ThemeIcon></Group>
          <Text size="xl" fw={700} c="indigo">{formatCurrency(limiteTotal)}</Text>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
        {cartoes.map((cartao, i) => (
          <Paper key={cartao.id} withBorder p="lg" radius="md" className="animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s`, borderColor: 'var(--mantine-color-dark-4)', background: 'var(--mantine-color-dark-8)', opacity: cartao.ativo ? 1 : 0.6 }}>
            <Group justify="space-between" mb="md">
              <Group gap="xs"><Box w={16} h={16} style={{ borderRadius: '50%', backgroundColor: cartao.cor || '#228be6' }} /><Text fw={600} size="lg">{cartao.nome}</Text>{!cartao.ativo && <Badge color="gray" size="xs" variant="light">Pausado</Badge>}</Group>
              <Group gap="xs">
                <Tooltip label={cartao.ativo ? 'Pausar cartão' : 'Reativar cartão'}><ActionIcon variant="subtle" color={cartao.ativo ? 'yellow' : 'teal'} onClick={() => handleToggleAtivo(cartao)}>{cartao.ativo ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}</ActionIcon></Tooltip>
                <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(cartao)}><IconEdit size={16} /></ActionIcon>
                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(cartao.id)}><IconTrash size={16} /></ActionIcon>
              </Group>
            </Group>

            <Group justify="space-between" mb="xs"><Text size="sm" c="dimmed">Bandeira</Text><Badge variant="outline" color="gray">{cartao.bandeira}</Badge></Group>
            <Group justify="space-between" mb="xs"><Text size="sm" c="dimmed">Limite Total</Text><Text size="sm" fw={600} c="indigo">{formatCurrency(Number(cartao.limite))}</Text></Group>
            
            <SimpleGrid cols={2} mt="md" p="sm" style={{ background: 'var(--mantine-color-dark-7)', borderRadius: 'var(--mantine-radius-md)' }}>
              <div><Text size="xs" c="dimmed" tt="uppercase">Fechamento</Text><Text fw={600} size="sm">Dia {cartao.dia_fechamento}</Text></div>
              <div><Text size="xs" c="dimmed" tt="uppercase">Vencimento</Text><Text fw={600} size="sm">Dia {cartao.dia_vencimento}</Text></div>
            </SimpleGrid>
          </Paper>
        ))}
      </SimpleGrid>

      {cartoes.length === 0 && !loading && (
        <Stack align="center" py={60} className="animate-fade-in-up">
          <ThemeIcon size={80} radius="100%" color="indigo" variant="light" mb="md"><IconCreditCard size={40} /></ThemeIcon>
          <Title order={3}>Nenhum cartão cadastrado</Title>
          <Button mt="md" onClick={handleOpenNew} leftSection={<IconPlus size={16} />} style={{ background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-blue-7))' }}>Cadastrar primeiro cartão</Button>
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">{editingId ? 'Editar Cartão' : 'Novo Cartão'}</Text>} size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Nome (Apelido do cartão)" placeholder="Ex: Nubank, Itaú Black..." size="md" {...form.getInputProps('nome')} />
            <Select label="Bandeira" placeholder="Selecione" data={bandeiras} size="md" {...form.getInputProps('bandeira')} />
            <NumberInput label="Limite de Crédito" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} decimalScale={2} size="md" {...form.getInputProps('limite')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Dia de Fechamento" placeholder="Ex: 5" min={1} max={31} size="md" {...form.getInputProps('dia_fechamento')} />
              <NumberInput label="Dia de Vencimento" placeholder="Ex: 10" min={1} max={31} size="md" {...form.getInputProps('dia_vencimento')} />
            </SimpleGrid>
            <ColorInput label="Cor de identificação" size="md" format="hex" {...form.getInputProps('cor')} swatches={['#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e', '#fab005', '#fd7e14']} />
            <Divider />
            <Group justify="flex-end"><Button variant="default" onClick={close}>Cancelar</Button><Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-blue-7))' }}>{editingId ? 'Salvar' : 'Adicionar'}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
