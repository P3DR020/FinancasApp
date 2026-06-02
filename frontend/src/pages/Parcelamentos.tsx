import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, LoadingOverlay, ThemeIcon,
  Tooltip, Textarea, Divider, RingProgress, SegmentedControl,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconReceipt2, IconCheck, IconCalendarEvent,
  IconCoin, IconCreditCard,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';

interface Parcelamento {
  id: string; descricao: string; valor_total: number; parcelas_total: number; parcelas_pagas: number;
  categoria: string; data_primeira_parcela: string; dia_vencimento: number; notas: string | null;
  concluido: boolean; criado_em: string; metodo_pagamento: string; cartao_id: string | null;
}

interface Cartao { id: string; nome: string; bandeira: string; cor: string; ativo: boolean; }

const categorias = ['Eletrônicos', 'Eletrodomésticos', 'Móveis', 'Vestuário', 'Viagem', 'Veículo', 'Saúde', 'Educação', 'Outros'];

export default function Parcelamentos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm({
    initialValues: { descricao: '', valor_total: '' as number | '', parcelas_total: '' as number | '', categoria: '', data_primeira_parcela: new Date(), dia_vencimento: '' as number | '', metodo_pagamento: 'boleto', cartao_id: '', notas: '' },
    validate: {
      descricao: (v) => (!v.trim() ? 'Descrição obrigatória' : null),
      valor_total: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser > 0' : null),
      parcelas_total: (v) => (!v || Number(v) <= 1 ? 'Deve ter mais de 1 parcela' : null),
      categoria: (v) => (!v ? 'Selecione uma categoria' : null),
      dia_vencimento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido' : null),
      cartao_id: (v, values) => (values.metodo_pagamento === 'cartao' && !v ? 'Selecione o cartão' : null),
    },
  });

  const fetchDados = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/parcelamentos');
      setParcelamentos(data.parcelamentos || []);
      setCartoes(data.cartoes || []);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  const handleOpenNew = () => { setEditingId(null); form.reset(); form.setFieldValue('data_primeira_parcela', new Date()); open(); };

  const handleOpenEdit = (p: Parcelamento) => {
    setEditingId(p.id);
    form.setValues({ descricao: p.descricao, valor_total: Number(p.valor_total), parcelas_total: p.parcelas_total, categoria: p.categoria, data_primeira_parcela: new Date(p.data_primeira_parcela + 'T12:00:00'), dia_vencimento: p.dia_vencimento, metodo_pagamento: p.metodo_pagamento || 'boleto', cartao_id: p.cartao_id || '', notas: p.notas || '' });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;
    const payload = { descricao: values.descricao, valor_total: Number(values.valor_total), parcelas_total: Number(values.parcelas_total), categoria: values.categoria, data_primeira_parcela: dayjs(values.data_primeira_parcela).format('YYYY-MM-DD'), dia_vencimento: Number(values.dia_vencimento), metodo_pagamento: values.metodo_pagamento, cartao_id: values.metodo_pagamento === 'cartao' ? values.cartao_id : null, notas: values.notas || null };

    try {
      if (editingId) {
        // Find existing to preserve parcelas_pagas in UI form but API uses it differently, or we send what's needed. Wait, PUT needs parcelas_pagas.
        const current = parcelamentos.find(p => p.id === editingId);
        await api.put(`/api/parcelamentos/${editingId}`, { ...payload, parcelas_pagas: current?.parcelas_pagas || 0 });
        notifications.show({ title: 'Atualizado!', message: 'Parcelamento alterado.', color: 'teal' });
      } else {
        await api.post('/api/parcelamentos', payload);
        notifications.show({ title: 'Adicionado!', message: 'Parcelamento registrado.', color: 'teal' });
      }
      close(); fetchDados();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handlePay = async (p: Parcelamento) => {
    try {
      const { data } = await api.post(`/api/parcelamentos/${p.id}/pagar`);
      notifications.show({ title: 'Parcela paga!', message: `Transação de despesa criada automaticamente no valor de ${formatCurrency(data.valor_parcela)}.`, color: 'teal' });
      if (data.concluido) triggerConfetti();
      fetchDados();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/parcelamentos/${id}`);
      notifications.show({ title: 'Excluído', message: 'Parcelamento removido.', color: 'teal' });
      fetchDados();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const triggerConfetti = () => {
    const duration = 2000; const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#20c997', '#339af0'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#20c997', '#339af0'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalDevido = parcelamentos.filter(p => !p.concluido).reduce((acc, p) => acc + (Number(p.valor_total) - (Number(p.valor_total) / p.parcelas_total) * p.parcelas_pagas), 0);
  const totalMensal = parcelamentos.filter(p => !p.concluido).reduce((acc, p) => acc + (Number(p.valor_total) / p.parcelas_total), 0);

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'blue', type: 'bars' }} />
      <Group justify="space-between" mb="lg">
        <div><Title order={2} fw={700}>Parcelamentos</Title><Text c="dimmed" size="sm">Controle compras divididas e faturas futuras</Text></div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew} style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))' }}>Novo Parcelamento</Button>
      </Group>

      {parcelamentos.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
          <Paper withBorder p="md" radius="md" className="stat-card stat-blue card-hover animate-fade-in-up" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
            <Group justify="space-between" mb="xs"><Text size="xs" c="dimmed" fw={500} tt="uppercase">Impacto Mensal</Text><ThemeIcon variant="light" color="blue" size="sm" radius="xl"><IconCalendarEvent size={14} /></ThemeIcon></Group>
            <Text size="xl" fw={700} c="blue">{formatCurrency(totalMensal)}</Text><Text size="xs" c="dimmed">Soma das parcelas ativas por mês</Text>
          </Paper>
          <Paper withBorder p="md" radius="md" className="stat-card stat-red card-hover animate-fade-in-up" style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-default-border)' }}>
            <Group justify="space-between" mb="xs"><Text size="xs" c="dimmed" fw={500} tt="uppercase">Total Restante (Dívida)</Text><ThemeIcon variant="light" color="red" size="sm" radius="xl"><IconCoin size={14} /></ThemeIcon></Group>
            <Text size="xl" fw={700} c="red">{formatCurrency(totalDevido)}</Text><Text size="xs" c="dimmed">Soma das parcelas a vencer</Text>
          </Paper>
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {parcelamentos.map((p, i) => {
          const valorParcela = Number(p.valor_total) / p.parcelas_total;
          const progresso = (p.parcelas_pagas / p.parcelas_total) * 100;
          const cartao = p.cartao_id ? cartoes.find(c => c.id === p.cartao_id) : null;
          return (
            <Paper key={p.id} withBorder p="lg" radius="md" className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, borderColor: p.concluido ? 'var(--mantine-color-teal-7)' : 'var(--mantine-color-default-border)', background: 'var(--mantine-color-default)', position: 'relative', overflow: 'hidden' }}>
              {p.concluido && <Box style={{ position: 'absolute', top: 12, right: -30, background: 'var(--mantine-color-teal-6)', color: 'white', padding: '4px 30px', transform: 'rotate(45deg)', fontSize: 10, fontWeight: 700, zIndex: 1 }}>QUITADO</Box>}
              <Group justify="space-between" mb="xs" pr={p.concluido ? 30 : 0}>
                <Group gap="xs"><ThemeIcon variant="light" color={p.concluido ? 'teal' : 'blue'} size="md" radius="xl"><IconReceipt2 size={16} /></ThemeIcon><Text fw={600} size="lg">{p.descricao}</Text></Group>
                <Group gap="xs"><Tooltip label="Editar"><ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(p)}><IconEdit size={16} /></ActionIcon></Tooltip><Tooltip label="Excluir"><ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p.id)}><IconTrash size={16} /></ActionIcon></Tooltip></Group>
              </Group>

              <Group justify="space-between" mb="lg">
                <Badge variant="outline" color="gray">{p.categoria}</Badge>
                {p.metodo_pagamento === 'cartao' && cartao ? (
                  <Badge color="indigo" variant="dot" leftSection={<IconCreditCard size={12} style={{ marginTop: 2 }} />}>{cartao.nome}</Badge>
                ) : (
                  <Badge color="orange" variant="light">Boleto/Pix</Badge>
                )}
              </Group>

              <Group wrap="nowrap" gap="xl" mb="lg">
                <RingProgress size={90} thickness={8} roundCaps sections={[{ value: progresso, color: p.concluido ? 'teal' : 'blue' }]} label={<Text ta="center" size="xs" fw={700}>{p.parcelas_pagas}/{p.parcelas_total}</Text>} />
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group justify="space-between"><Text size="xs" c="dimmed">Valor Total</Text><Text size="sm" fw={600}>{formatCurrency(Number(p.valor_total))}</Text></Group>
                  <Group justify="space-between"><Text size="xs" c="dimmed">Valor da Parcela</Text><Text size="sm" fw={600} c="blue">{formatCurrency(valorParcela)}</Text></Group>
                  <Group justify="space-between"><Text size="xs" c="dimmed">Vencimento</Text><Text size="sm" fw={600}>Dia {p.dia_vencimento}</Text></Group>
                </Stack>
              </Group>
              {!p.concluido && <Button fullWidth variant="light" color="teal" leftSection={<IconCheck size={16} />} onClick={() => handlePay(p)}>Pagar Parcela Atual</Button>}
            </Paper>
          );
        })}
      </SimpleGrid>

      {parcelamentos.length === 0 && !loading && (
        <Stack align="center" py={60} className="animate-fade-in-up">
          <ThemeIcon size={80} radius="100%" color="blue" variant="light" mb="md"><IconReceipt2 size={40} /></ThemeIcon>
          <Title order={3}>Nenhum parcelamento</Title>
          <Text c="dimmed" ta="center">Adicione compras divididas para acompanhar o andamento.</Text>
          <Button mt="md" onClick={handleOpenNew} leftSection={<IconPlus size={16} />} style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))' }}>Criar parcelamento</Button>
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">{editingId ? 'Editar Parcelamento' : 'Novo Parcelamento'}</Text>} size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Descrição" placeholder="Ex: TV Samsung, Geladeira..." size="md" {...form.getInputProps('descricao')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Valor Total" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} decimalScale={2} size="md" {...form.getInputProps('valor_total')} />
              <NumberInput label="Qtd de Parcelas" placeholder="Ex: 12" min={2} size="md" {...form.getInputProps('parcelas_total')} />
            </SimpleGrid>
            {Number(form.values.valor_total) > 0 && Number(form.values.parcelas_total) > 1 && (
              <Text size="xs" c="blue" ta="right" mt={-10}>Aprox. {formatCurrency(Number(form.values.valor_total) / Number(form.values.parcelas_total))} / parcela</Text>
            )}
            <Select label="Categoria" placeholder="Selecione" data={categorias} size="md" {...form.getInputProps('categoria')} />
            <SimpleGrid cols={2}>
              <DateInput label="Data da Compra" placeholder="Selecione" size="md" valueFormat="DD/MM/YYYY" {...form.getInputProps('data_primeira_parcela')} />
              <NumberInput label="Dia de Vencimento" placeholder="Ex: 10" min={1} max={31} size="md" {...form.getInputProps('dia_vencimento')} />
            </SimpleGrid>
            <SegmentedControl fullWidth data={[{ label: 'Boleto / Pix', value: 'boleto' }, { label: 'Cartão de Crédito', value: 'cartao' }]} {...form.getInputProps('metodo_pagamento')} color="blue" />
            {form.values.metodo_pagamento === 'cartao' && (
              <Select label="Cartão Utilizado" placeholder="Selecione o cartão" data={cartoes.map(c => ({ value: c.id, label: c.nome }))} size="md" {...form.getInputProps('cartao_id')} />
            )}
            <Textarea label="Notas (opcional)" placeholder="Observações extras..." autosize minRows={2} maxRows={3} {...form.getInputProps('notas')} />
            <Divider />
            <Group justify="flex-end"><Button variant="default" onClick={close}>Cancelar</Button><Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))' }}>{editingId ? 'Salvar' : 'Criar Parcelamento'}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
