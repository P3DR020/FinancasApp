import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, ColorInput, LoadingOverlay,
  ThemeIcon, Tooltip, Divider, Progress, Drawer, Table, ScrollArea,
  RingProgress, Center, Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { MonthPickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications'
import {
  IconPlus, IconEdit, IconTrash, IconCreditCard, IconPlayerPause, IconPlayerPlay,
  IconReceipt, IconAlertTriangle, IconCalendarDue, IconLock, IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Cartao {
  id: string; nome: string; bandeira: string; limite: number;
  dia_fechamento: number; dia_vencimento: number; cor: string; ativo: boolean;
}

interface CartaoResumo extends Cartao {
  gastoMes: number;
  limiteDisponivel: number;
  pctUsado: number;
  proximoVencimento: string;
  diasParaVencer: number;
  proximoFechamento: string;
  diasParaFechar: number;
  alertaVencimento: boolean;
  alertaFechamento: boolean;
}

interface Transacao {
  id: string; tipo: 'receita' | 'despesa'; valor: number;
  descricao: string; categoria: string; data: string; tags: string[];
}

interface FaturaData {
  cartao: Cartao;
  transacoes: Transacao[];
  totalGastos: number;
  totalCreditos: number;
  valorFatura: number;
  limiteDisponivel: number;
  pctUsado: number;
  porCategoria: Record<string, number>;
  proximoVencimento: string;
  diasParaVencer: number;
  proximoFechamento: string;
  diasParaFechar: number;
  alertaVencimento: boolean;
  alertaFechamento: boolean;
}

const bandeiras = [
  { value: 'mastercard', label: '🔴 Mastercard' },
  { value: 'visa', label: '🔵 Visa' },
  { value: 'elo', label: '🟡 Elo' },
  { value: 'amex', label: '🟢 American Express' },
  { value: 'outro', label: '⚪ Outro' },
];

const bandeiraBadgeColors: Record<string, string> = {
  mastercard: 'red', visa: 'blue', elo: 'yellow',
  amex: 'green', outro: 'gray',
};

const bandeiraLabels: Record<string, string> = {
  mastercard: 'Mastercard', visa: 'Visa', elo: 'Elo', amex: 'American Express', outro: 'Outro'
};

export default function Cartoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<CartaoResumo[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [faturaOpened, { open: openFatura, close: closeFatura }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [faturaCartaoId, setFaturaCartaoId] = useState<string | null>(null);
  const [faturaData, setFaturaData] = useState<FaturaData | null>(null);
  const [faturaLoading, setFaturaLoading] = useState(false);
  const [mesFatura, setMesFatura] = useState<string | null>(dayjs().format('YYYY-MM-DD'));

  const form = useForm({
    initialValues: {
      nome: '', bandeira: '', limite: '' as number | '',
      dia_fechamento: '' as number | '', dia_vencimento: '' as number | '',
      cor: '#228be6',
    },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
      bandeira: (v) => (!v ? 'Bandeira é obrigatória' : null),
      limite: (v) => (!v || Number(v) <= 0 ? 'Limite deve ser maior que zero' : null),
      dia_fechamento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido (1-31)' : null),
      dia_vencimento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido (1-31)' : null),
    },
  });

  const fetchCartoes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/cartoes/resumo');
      setCartoes(data || []);
    } catch {
      // fallback para lista simples se resumo falhar
      try {
        const { data } = await api.get('/api/cartoes');
        setCartoes(data || []);
      } catch (err: any) {
        notifications.show({ title: 'Erro', message: err.response?.data?.error || err.message, color: 'red' });
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchCartoes(); }, [user, fetchCartoes]);

  const fetchFatura = useCallback(async () => {
    if (!faturaCartaoId) return;
    setFaturaLoading(true);
    try {
      const mes = dayjs(mesFatura).format('YYYY-MM');
      const { data } = await api.get(`/api/cartoes/${faturaCartaoId}/fatura`, { params: { mes } });
      setFaturaData(data);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao carregar fatura', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setFaturaLoading(false);
  }, [faturaCartaoId, mesFatura]);

  useEffect(() => { if (faturaOpened && faturaCartaoId) fetchFatura(); }, [faturaOpened, faturaCartaoId, mesFatura, fetchFatura]);

  const handleVerFatura = (cartao: CartaoResumo) => {
    setFaturaCartaoId(cartao.id);
    setMesFatura(dayjs().format('YYYY-MM-DD'));
    openFatura();
  };

  const handleOpenNew = () => { setEditingId(null); form.reset(); open(); };
  const handleOpenEdit = (c: CartaoResumo) => {
    setEditingId(c.id);
    form.setValues({ nome: c.nome, bandeira: c.bandeira, limite: Number(c.limite), dia_fechamento: Number(c.dia_fechamento), dia_vencimento: Number(c.dia_vencimento), cor: c.cor || '#228be6' });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;
    const payload = { nome: values.nome, bandeira: values.bandeira, limite: Number(values.limite), dia_fechamento: Number(values.dia_fechamento), dia_vencimento: Number(values.dia_vencimento), cor: values.cor };
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

  const handleToggleAtivo = async (c: CartaoResumo) => {
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

  const fmt = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const limiteTotal = cartoes.filter(c => c.ativo).reduce((sum, c) => sum + Number(c.limite), 0);
  const gastoTotal = cartoes.filter(c => c.ativo).reduce((sum, c) => sum + (c.gastoMes || 0), 0);
  const disponivelTotal = limiteTotal - gastoTotal;

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'red';
    if (pct >= 70) return 'orange';
    if (pct >= 50) return 'yellow';
    return 'teal';
  };

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'indigo', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Cartões de Crédito</Title>
          <Text c="dimmed" size="sm">Faturas, limites e gastos mensais</Text>
        </div>
        <Button id="btn-novo-cartao" leftSection={<IconPlus size={16} />} onClick={handleOpenNew}
          style={{ background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-blue-7))' }}>
          Novo Cartão
        </Button>
      </Group>

      {/* Resumo consolidado */}
      {cartoes.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
          {[
            { label: 'Limite Total', value: limiteTotal, color: 'indigo', sub: `${cartoes.filter(c => c.ativo).length} cartão(s) ativo(s)` },
            { label: 'Gasto no Mês', value: gastoTotal, color: 'red', sub: `${limiteTotal > 0 ? ((gastoTotal / limiteTotal) * 100).toFixed(0) : 0}% do limite usado` },
            { label: 'Disponível', value: disponivelTotal, color: disponivelTotal >= 0 ? 'teal' : 'red', sub: 'Limite não utilizado' },
          ].map((stat, i) => (
            <Paper key={i} withBorder p="md" radius="md" className="animate-fade-in-up"
              style={{ animationDelay: `${i * 0.06}s`, borderColor: 'var(--mantine-color-dark-4)' }}>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>{stat.label}</Text>
              <Text size="xl" fw={700} c={stat.color}>{fmt(stat.value)}</Text>
              <Text size="xs" c="dimmed" mt={2}>{stat.sub}</Text>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {/* Cards dos cartões */}
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
        {cartoes.map((cartao, i) => {
          const pct = cartao.pctUsado || 0;
          const progressColor = getProgressColor(pct);
          const alertVenc = cartao.alertaVencimento;
          const alertFech = cartao.alertaFechamento;

          return (
            <Paper key={cartao.id} withBorder p="lg" radius="md" className="animate-fade-in-up"
              style={{
                animationDelay: `${i * 0.08}s`,
                borderColor: cartao.ativo ? cartao.cor : 'var(--mantine-color-dark-4)',
                borderWidth: 1.5,
                background: 'var(--mantine-color-dark-8)',
                opacity: cartao.ativo ? 1 : 0.6,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Faixa de cor no topo */}
              {cartao.ativo && (
                <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cartao.cor }} />
              )}

              <Group justify="space-between" mb="sm" mt={4}>
                <Group gap="xs">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: cartao.cor }} />
                  <Text fw={700} size="md">{cartao.nome}</Text>
                  {!cartao.ativo && <Badge color="gray" size="xs" variant="light">Pausado</Badge>}
                </Group>
                <Group gap={6}>
                  <Badge variant="light" color={bandeiraBadgeColors[cartao.bandeira] || 'gray'} size="sm">
                    {bandeiraLabels[cartao.bandeira] || cartao.bandeira}
                  </Badge>
                </Group>
              </Group>

              {/* Alertas */}
              {cartao.ativo && (alertVenc || alertFech) && (
                <Alert
                  icon={<IconAlertTriangle size={14} />}
                  color={cartao.diasParaVencer <= 2 || cartao.diasParaFechar <= 1 ? 'red' : 'yellow'}
                  variant="light" p="xs" mb="sm" radius="md"
                >
                  <Text size="xs" fw={500}>
                    {alertFech && `⚠️ Fecha em ${cartao.diasParaFechar}d`}
                    {alertFech && alertVenc && ' · '}
                    {alertVenc && `📅 Vence em ${cartao.diasParaVencer}d`}
                  </Text>
                </Alert>
              )}

              {/* Limite e uso */}
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">Uso do limite</Text>
                <Text size="xs" fw={600} c={progressColor}>{pct.toFixed(0)}%</Text>
              </Group>
              <Progress value={pct} color={progressColor} size="sm" radius="xl" mb="xs" />
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="xs" c="dimmed">Gasto no mês</Text>
                  <Text size="sm" fw={700} c="red">{fmt(cartao.gastoMes || 0)}</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text size="xs" c="dimmed">Disponível</Text>
                  <Text size="sm" fw={700} c={(cartao.limiteDisponivel || 0) >= 0 ? 'teal' : 'red'}>
                    {fmt(cartao.limiteDisponivel || 0)}
                  </Text>
                </div>
              </Group>

              {/* Fechamento e vencimento */}
              <SimpleGrid cols={2} p="sm" mb="md"
                style={{ background: 'var(--mantine-color-dark-7)', borderRadius: 'var(--mantine-radius-md)' }}>
                <Group gap={4}>
                  <IconLock size={12} color="var(--mantine-color-dimmed)" />
                  <div>
                    <Text size="xs" c="dimmed">Fecha</Text>
                    <Text fw={600} size="sm">Dia {cartao.dia_fechamento}</Text>
                  </div>
                </Group>
                <Group gap={4}>
                  <IconCalendarDue size={12} color="var(--mantine-color-dimmed)" />
                  <div>
                    <Text size="xs" c="dimmed">Vence</Text>
                    <Text fw={600} size="sm">Dia {cartao.dia_vencimento}</Text>
                  </div>
                </Group>
              </SimpleGrid>

              {/* Ações */}
              <Group justify="space-between">
                <Button
                  variant="light" color="indigo" size="xs"
                  leftSection={<IconReceipt size={14} />}
                  onClick={() => handleVerFatura(cartao)}
                >
                  Ver Fatura
                </Button>
                <Group gap={4}>
                  <Tooltip label={cartao.ativo ? 'Pausar' : 'Reativar'}>
                    <ActionIcon variant="subtle" color={cartao.ativo ? 'yellow' : 'teal'} onClick={() => handleToggleAtivo(cartao)}>
                      {cartao.ativo ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                    </ActionIcon>
                  </Tooltip>
                  <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(cartao)}><IconEdit size={16} /></ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(cartao.id)}><IconTrash size={16} /></ActionIcon>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>

      {cartoes.length === 0 && !loading && (
        <Stack align="center" py={60} className="animate-fade-in-up">
          <ThemeIcon size={80} radius="100%" color="indigo" variant="light" mb="md"><IconCreditCard size={40} /></ThemeIcon>
          <Title order={3}>Nenhum cartão cadastrado</Title>
          <Text c="dimmed" size="sm">Adicione seus cartões para controlar faturas e limite disponível.</Text>
          <Button mt="md" onClick={handleOpenNew} leftSection={<IconPlus size={16} />}
            style={{ background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-blue-7))' }}>
            Cadastrar primeiro cartão
          </Button>
        </Stack>
      )}

      {/* === DRAWER DE FATURA === */}
      <Drawer
        opened={faturaOpened} onClose={closeFatura}
        title={
          <Group gap="sm">
            <ThemeIcon color="indigo" variant="light" radius="xl" size="md">
              <IconReceipt size={18} />
            </ThemeIcon>
            <Text fw={700} size="lg">Fatura — {faturaData?.cartao.nome}</Text>
          </Group>
        }
        position="right"
        size="lg"
        overlayProps={{ blur: 3 }}
      >
        <Stack gap="md">
          {/* Seletor de mês */}
          <MonthPickerInput
            label="Mês da fatura"
            value={mesFatura}
            onChange={setMesFatura}
            valueFormat="MMMM [de] YYYY"
            size="sm"
          />

          {faturaLoading ? (
            <Center py="xl"><Text c="dimmed">Carregando fatura...</Text></Center>
          ) : faturaData ? (
            <>
              {/* Alertas de fatura */}
              {(faturaData.alertaVencimento || faturaData.alertaFechamento) && (
                <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light" radius="md">
                  <Stack gap={4}>
                    {faturaData.alertaFechamento && (
                      <Text size="sm">🔒 <strong>Fecha em {faturaData.diasParaFechar} dia(s)</strong> — {dayjs(faturaData.proximoFechamento).format('DD/MM/YYYY')}</Text>
                    )}
                    {faturaData.alertaVencimento && (
                      <Text size="sm">📅 <strong>Vence em {faturaData.diasParaVencer} dia(s)</strong> — {dayjs(faturaData.proximoVencimento).format('DD/MM/YYYY')}</Text>
                    )}
                  </Stack>
                </Alert>
              )}

              {/* Ring de uso do limite */}
              <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Fatura total</Text>
                    <Text size="xl" fw={800} c="red">{fmt(faturaData.valorFatura)}</Text>
                    <Text size="xs" c="dimmed" mt={4}>de {fmt(Number(faturaData.cartao.limite))} de limite</Text>
                    <Divider my="sm" />
                    <Group gap="xl">
                      <div>
                        <Text size="xs" c="dimmed">Disponível</Text>
                        <Text fw={700} c={faturaData.limiteDisponivel >= 0 ? 'teal' : 'red'}>
                          {fmt(faturaData.limiteDisponivel)}
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Vencimento</Text>
                        <Text fw={700}>{dayjs(faturaData.proximoVencimento).format('DD/MM/YYYY')}</Text>
                      </div>
                    </Group>
                  </div>
                  <RingProgress
                    size={100} thickness={10}
                    sections={[{ value: faturaData.pctUsado, color: getProgressColor(faturaData.pctUsado) }]}
                    label={
                      <Center>
                        <Text size="xs" fw={700} ta="center">{faturaData.pctUsado.toFixed(0)}%</Text>
                      </Center>
                    }
                  />
                </Group>
              </Paper>

              {/* Gastos por categoria */}
              {Object.keys(faturaData.porCategoria).length > 0 && (
                <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
                  <Text size="sm" fw={600} mb="sm">Por categoria</Text>
                  <Stack gap={6}>
                    {Object.entries(faturaData.porCategoria)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, val]) => (
                        <Group key={cat} justify="space-between">
                          <Text size="sm" c="dimmed">{cat}</Text>
                          <Text size="sm" fw={600}>{fmt(val)}</Text>
                        </Group>
                      ))}
                  </Stack>
                </Paper>
              )}

              {/* Lista de transações */}
              <Text fw={600} size="sm" mt="xs">Lançamentos ({faturaData.transacoes.length})</Text>
              {faturaData.transacoes.length > 0 ? (
                <ScrollArea h={350}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Data</Table.Th>
                        <Table.Th>Descrição</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {faturaData.transacoes.map((t) => (
                        <Table.Tr key={t.id}>
                          <Table.Td><Text size="xs" c="dimmed">{dayjs(t.data).format('DD/MM')}</Text></Table.Td>
                          <Table.Td>
                            <Stack gap={0}>
                              <Text size="sm" fw={500}>{t.descricao}</Text>
                              <Text size="xs" c="dimmed">{t.categoria}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Group gap={4} justify="flex-end">
                              {t.tipo === 'receita'
                                ? <IconArrowUpRight size={14} color="var(--mantine-color-teal-5)" />
                                : <IconArrowDownRight size={14} color="var(--mantine-color-red-5)" />
                              }
                              <Text size="sm" fw={600} c={t.tipo === 'receita' ? 'teal' : 'red'}>
                                {fmt(Number(t.valor))}
                              </Text>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Paper withBorder p="lg" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
                  <Stack align="center" py="md">
                    <Text c="dimmed" size="sm">Nenhum lançamento neste mês</Text>
                    <Text c="dimmed" size="xs">Associe transações a este cartão para ver a fatura</Text>
                  </Stack>
                </Paper>
              )}
            </>
          ) : null}
        </Stack>
      </Drawer>

      {/* Modal criar/editar cartão */}
      <Modal opened={opened} onClose={close}
        title={<Text fw={700} size="lg">{editingId ? 'Editar Cartão' : 'Novo Cartão'}</Text>}
        size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Nome (Apelido do cartão)" placeholder="Ex: Nubank, Itaú Black..." size="md" {...form.getInputProps('nome')} />
            <Select label="Bandeira" placeholder="Selecione" data={bandeiras} size="md" {...form.getInputProps('bandeira')} />
            <NumberInput label="Limite de Crédito" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="." min={0.01} decimalScale={2} size="md" {...form.getInputProps('limite')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Dia de Fechamento" placeholder="Ex: 5" min={1} max={31} size="md" {...form.getInputProps('dia_fechamento')} />
              <NumberInput label="Dia de Vencimento" placeholder="Ex: 10" min={1} max={31} size="md" {...form.getInputProps('dia_vencimento')} />
            </SimpleGrid>
            <ColorInput label="Cor de identificação" size="md" format="hex" {...form.getInputProps('cor')}
              swatches={['#228be6', '#4c6ef5', '#7950f2', '#be4bdb', '#e64980', '#fa5252', '#fd7e14', '#fab005', '#40c057', '#12b886', '#15aabf', '#868e96']} />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Cancelar</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-blue-7))' }}>
                {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

function getProgressColor(pct: number) {
  if (pct >= 90) return 'red';
  if (pct >= 70) return 'orange';
  if (pct >= 50) return 'yellow';
  return 'teal';
}
