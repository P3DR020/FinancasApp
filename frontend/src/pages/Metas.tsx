import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Progress, LoadingOverlay, ThemeIcon,
  Tooltip, RingProgress, Center,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconTrash, IconTargetArrow, IconCoin, IconTrophy,
  IconCalendarEvent, IconMapPin, IconTrendingUp,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';

interface Meta {
  id: string; nome: string; valor_alvo: number; valor_atual: number;
  local_guardado: string | null; data_limite: string | null; concluida: boolean; criado_em: string;
}

export default function Metas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [openedNew, { open: openNew, close: closeNew }] = useDisclosure(false);
  const [openedDeposit, { open: openDeposit, close: closeDeposit }] = useDisclosure(false);
  const [selectedMeta, setSelectedMeta] = useState<Meta | null>(null);

  const formNew = useForm({
    initialValues: { nome: '', valor_alvo: '' as number | '', valor_atual: '' as number | '', local_guardado: '', data_limite: null as Date | null },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
      valor_alvo: (v) => (!v || Number(v) <= 0 ? 'Valor alvo deve ser maior que zero' : null),
    },
  });

  const formDeposit = useForm({
    initialValues: { valor: '' as number | '' },
    validate: { valor: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null) },
  });

  const fetchMetas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/metas');
      setMetas(data || []);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchMetas(); }, [user, fetchMetas]);

  const handleSubmitNew = async (values: typeof formNew.values) => {
    if (!user) return;
    const payload = { nome: values.nome, valor_alvo: Number(values.valor_alvo), valor_atual: Number(values.valor_atual) || 0, local_guardado: values.local_guardado || null, data_limite: values.data_limite ? dayjs(values.data_limite).format('YYYY-MM-DD') : null };
    try {
      await api.post('/api/metas', payload);
      notifications.show({ title: 'Meta criada!', message: `Meta "${values.nome}" registrada.`, color: 'teal' });
      closeNew(); formNew.reset(); fetchMetas();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleOpenDeposit = (meta: Meta) => { setSelectedMeta(meta); formDeposit.reset(); openDeposit(); };

  const handleSubmitDeposit = async (values: typeof formDeposit.values) => {
    if (!selectedMeta) return;
    try {
      const { data } = await api.patch(`/api/metas/${selectedMeta.id}/depositar`, { valor: Number(values.valor) });
      notifications.show({ title: 'Depósito realizado!', message: `Você adicionou dinheiro à meta "${selectedMeta.nome}".`, color: 'teal' });
      if (data.recemConcluida) triggerConfetti();
      closeDeposit(); fetchMetas();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/metas/${id}`);
      notifications.show({ title: 'Excluído', message: 'Meta removida.', color: 'teal' });
      fetchMetas();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
    }
  };

  const triggerConfetti = () => {
    const duration = 3000; const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#20c997', '#fab005', '#228be6'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#20c997', '#fab005', '#228be6'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalAlvo = metas.reduce((sum, m) => sum + Number(m.valor_alvo), 0);
  const totalAtual = metas.reduce((sum, m) => sum + Number(m.valor_atual), 0);
  const progressGeral = totalAlvo > 0 ? (totalAtual / totalAlvo) * 100 : 0;
  const concluidas = metas.filter(m => m.concluida).length;

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'cyan', type: 'bars' }} />
      <Group justify="space-between" mb="lg">
        <div><Title order={2} fw={700}>Metas Financeiras</Title><Text c="dimmed" size="sm">Defina objetivos e acompanhe seu progresso</Text></div>
        <Button id="btn-nova-meta" leftSection={<IconPlus size={16} />} onClick={openNew} style={{ background: 'linear-gradient(135deg, var(--mantine-color-cyan-6), var(--mantine-color-blue-7))' }}>Nova meta</Button>
      </Group>

      {metas.length > 0 && (
        <Paper withBorder p="xl" radius="md" mb="xl" className="animate-fade-in-up" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group align="center" gap="xl" wrap="nowrap">
            <RingProgress size={120} thickness={12} roundCaps sections={[{ value: progressGeral, color: progressGeral >= 100 ? 'teal' : 'cyan' }]} label={<Center><ThemeIcon color={progressGeral >= 100 ? 'teal' : 'cyan'} variant="light" radius="xl" size="xl"><IconTrophy size={22} /></ThemeIcon></Center>} />
            <Box style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" tt="uppercase" fw={600} mb={4}>Progresso Global</Text>
              <Group justify="space-between" align="flex-end" mb="xs">
                <Text size="xl" fw={700}>{formatCurrency(totalAtual)} <Text span size="sm" c="dimmed" fw={500}>de {formatCurrency(totalAlvo)}</Text></Text>
                <Badge color={progressGeral >= 100 ? 'teal' : 'cyan'} variant="light" size="lg">{Math.round(progressGeral)}%</Badge>
              </Group>
              <Progress value={progressGeral} color={progressGeral >= 100 ? 'teal' : 'cyan'} size="sm" radius="xl" striped={progressGeral < 100} animated={progressGeral < 100} />
              <Group mt="md" gap="lg">
                <Group gap={6}><IconTargetArrow size={16} color="var(--mantine-color-dimmed)" /><Text size="sm" c="dimmed">{metas.length} Metas</Text></Group>
                <Group gap={6}><IconTrophy size={16} color="var(--mantine-color-dimmed)" /><Text size="sm" c="dimmed">{concluidas} Concluídas</Text></Group>
              </Group>
            </Box>
          </Group>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {metas.map((meta, i) => {
          const progress = Math.min((Number(meta.valor_atual) / Number(meta.valor_alvo)) * 100, 100);
          const isLate = meta.data_limite && !meta.concluida && dayjs(meta.data_limite).isBefore(dayjs());
          return (
            <Paper key={meta.id} withBorder p="lg" radius="md" className="animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s`, borderColor: meta.concluida ? 'var(--mantine-color-teal-7)' : 'var(--mantine-color-dark-4)', background: 'var(--mantine-color-dark-8)', position: 'relative', overflow: 'hidden' }}>
              {meta.concluida && (<Box style={{ position: 'absolute', top: 12, right: -30, background: 'var(--mantine-color-teal-6)', color: 'white', padding: '4px 30px', transform: 'rotate(45deg)', fontSize: 10, fontWeight: 700, zIndex: 1 }}>CONCLUÍDA</Box>)}
              <Group justify="space-between" mb="xs" pr={meta.concluida ? 30 : 0} wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon variant="light" color={meta.concluida ? 'teal' : 'cyan'} size="lg" radius="md"><IconTargetArrow size={20} /></ThemeIcon>
                  <Text fw={600} size="lg" lineClamp={1} title={meta.nome}>{meta.nome}</Text>
                </Group>
                <Tooltip label="Excluir meta"><ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(meta.id)}><IconTrash size={16} /></ActionIcon></Tooltip>
              </Group>

              <Group justify="space-between" mb={4} mt="md">
                <Text size="sm" c="dimmed">Acumulado</Text>
                <Text size="sm" fw={700} c={meta.concluida ? 'teal' : undefined}>{formatCurrency(Number(meta.valor_atual))}</Text>
              </Group>
              <Progress value={progress} color={meta.concluida ? 'teal' : 'cyan'} size="lg" radius="xl" mb={4} striped={!meta.concluida} animated={!meta.concluida && meta.valor_atual > 0} />
              <Group justify="space-between" mb="lg">
                <Text size="xs" fw={600} c={meta.concluida ? 'teal' : 'cyan'}>{Math.round(progress)}%</Text>
                <Text size="xs" c="dimmed">Alvo: {formatCurrency(Number(meta.valor_alvo))}</Text>
              </Group>

              {(meta.data_limite || meta.local_guardado) && (
                <Stack gap="xs" mb="lg" p="sm" style={{ background: 'var(--mantine-color-dark-7)', borderRadius: 'var(--mantine-radius-md)' }}>
                  {meta.local_guardado && (
                    <Group gap="xs"><IconMapPin size={14} color="var(--mantine-color-dimmed)" /><Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>Guardado em: <Text span fw={500}>{meta.local_guardado}</Text></Text></Group>
                  )}
                  {meta.data_limite && (
                    <Group gap="xs"><IconCalendarEvent size={14} color={isLate ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)'} /><Text size="xs" c={isLate ? 'red' : 'dimmed'}>Prazo: <Text span fw={500}>{dayjs(meta.data_limite).format('DD/MM/YYYY')}</Text></Text></Group>
                  )}
                </Stack>
              )}

              {!meta.concluida && (
                <Button fullWidth variant="light" color="cyan" leftSection={<IconTrendingUp size={16} />} onClick={() => handleOpenDeposit(meta)} mt="auto">Guardar Dinheiro</Button>
              )}
            </Paper>
          );
        })}
      </SimpleGrid>

      {metas.length === 0 && !loading && (
        <Stack align="center" py={60} className="animate-fade-in-up">
          <ThemeIcon size={80} radius="100%" color="cyan" variant="light" mb="md"><IconTargetArrow size={40} /></ThemeIcon>
          <Title order={3}>Nenhuma meta definida</Title>
          <Text c="dimmed" ta="center" maw={400}>Comece a planejar seu futuro! Crie uma meta para uma viagem, reserva de emergência ou compra de um bem.</Text>
          <Button mt="md" onClick={openNew} leftSection={<IconPlus size={16} />} style={{ background: 'linear-gradient(135deg, var(--mantine-color-cyan-6), var(--mantine-color-blue-7))' }}>Criar minha primeira meta</Button>
        </Stack>
      )}

      {/* Modal Nova Meta */}
      <Modal opened={openedNew} onClose={closeNew} title={<Text fw={700} size="lg">Criar Nova Meta</Text>} size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={formNew.onSubmit(handleSubmitNew)}>
          <Stack gap="md">
            <TextInput label="Nome da Meta" placeholder="Ex: Viagem para o Japão, Reserva de Emergência..." size="md" leftSection={<IconTargetArrow size={16} />} {...formNew.getInputProps('nome')} />
            <NumberInput label="Valor Alvo" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} decimalScale={2} size="md" {...formNew.getInputProps('valor_alvo')} />
            <NumberInput label="Valor Já Guardado (opcional)" description="Se você já tem algum valor guardado para esta meta" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0} decimalScale={2} size="md" {...formNew.getInputProps('valor_atual')} />
            <TextInput label="Local (opcional)" description="Onde esse dinheiro está guardado?" placeholder="Ex: Caixinha do Nubank, Poupança, Tesouro Direto..." size="md" leftSection={<IconMapPin size={16} />} {...formNew.getInputProps('local_guardado')} />
            <DateInput label="Data Limite (opcional)" placeholder="Quando você quer atingir?" size="md" valueFormat="DD/MM/YYYY" clearable leftSection={<IconCalendarEvent size={16} />} {...formNew.getInputProps('data_limite')} />
            <Group justify="flex-end" mt="sm"><Button variant="default" onClick={closeNew}>Cancelar</Button><Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-cyan-6), var(--mantine-color-blue-7))' }}>Criar Meta</Button></Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Guardar Dinheiro */}
      <Modal opened={openedDeposit} onClose={closeDeposit} title={<Text fw={700} size="lg">Guardar Dinheiro</Text>} size="sm" radius="lg" centered overlayProps={{ blur: 3 }}>
        {selectedMeta && (
          <form onSubmit={formDeposit.onSubmit(handleSubmitDeposit)}>
            <Stack gap="md">
              <Paper withBorder p="md" radius="md" style={{ background: 'var(--mantine-color-dark-7)', borderColor: 'var(--mantine-color-dark-5)' }}>
                <Text size="sm" c="dimmed" mb={4}>Meta selecionada:</Text>
                <Text fw={600} size="md" lineClamp={1}>{selectedMeta.nome}</Text>
                <Group justify="space-between" mt="sm">
                  <Text size="xs" c="dimmed">Falta:</Text>
                  <Text size="sm" fw={600} c="cyan">{formatCurrency(Number(selectedMeta.valor_alvo) - Number(selectedMeta.valor_atual))}</Text>
                </Group>
              </Paper>
              <NumberInput label="Valor a depositar" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} max={Number(selectedMeta.valor_alvo) - Number(selectedMeta.valor_atual)} decimalScale={2} size="md" leftSection={<IconCoin size={16} />} {...formDeposit.getInputProps('valor')} autoFocus />
              <Button type="submit" fullWidth size="md" style={{ background: 'linear-gradient(135deg, var(--mantine-color-cyan-6), var(--mantine-color-teal-6))' }}>Confirmar Depósito</Button>
            </Stack>
          </form>
        )}
      </Modal>
    </Box>
  );
}
