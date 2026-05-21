import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, Textarea, LoadingOverlay,
  ThemeIcon, Tooltip, Divider, Progress, Table, Card, RingProgress,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconReceipt2, IconCheck,
  IconCalendarDue, IconCoin, IconCoinOff, IconClock,
  IconShoppingBag, IconCircleCheck,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Parcelamento {
  id: string;
  descricao: string;
  valor_total: number;
  parcelas_total: number;
  parcelas_pagas: number;
  valor_parcela: number;
  categoria: string;
  data_primeira_parcela: string;
  dia_vencimento: number;
  notas: string | null;
  concluido: boolean;
}

const categorias = [
  'Eletrônicos', 'Eletrodomésticos', 'Móveis', 'Roupas', 'Saúde',
  'Educação', 'Veículo', 'Viagem', 'Casa', 'Lazer', 'Outro',
];

export default function Parcelamentos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [payOpened, { open: openPay, close: closePay }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingItem, setPayingItem] = useState<Parcelamento | null>(null);

  const form = useForm({
    initialValues: {
      descricao: '',
      valor_total: '' as number | '',
      parcelas_total: '' as number | '',
      categoria: '',
      data_primeira_parcela: new Date(),
      dia_vencimento: '' as number | '',
      notas: '',
      parcelas_pagas: 0 as number,
    },
    validate: {
      descricao: (v) => (!v.trim() ? 'Descrição é obrigatória' : null),
      valor_total: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null),
      parcelas_total: (v) => (!v || Number(v) < 2 ? 'Mínimo 2 parcelas' : null),
      categoria: (v) => (!v ? 'Selecione a categoria' : null),
      dia_vencimento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido (1-31)' : null),
    },
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('parcelamentos')
      .select('*')
      .order('concluido', { ascending: true })
      .order('criado_em', { ascending: false });

    if (error) {
      notifications.show({ title: 'Erro ao carregar', message: error.message, color: 'red' });
    } else {
      setParcelamentos(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleNew = () => {
    setEditingId(null);
    form.reset();
    form.setFieldValue('data_primeira_parcela', new Date());
    openForm();
  };

  const handleEdit = (p: Parcelamento) => {
    setEditingId(p.id);
    form.setValues({
      descricao: p.descricao,
      valor_total: Number(p.valor_total),
      parcelas_total: p.parcelas_total,
      categoria: p.categoria,
      data_primeira_parcela: new Date(p.data_primeira_parcela + 'T12:00:00'),
      dia_vencimento: p.dia_vencimento,
      notas: p.notas || '',
      parcelas_pagas: p.parcelas_pagas,
    });
    openForm();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;
    const parcTotal = Number(values.parcelas_total);
    const parcPagas = editingId ? Math.min(Number(values.parcelas_pagas), parcTotal) : 0;
    const payload = {
      user_id: user.id,
      descricao: values.descricao,
      valor_total: Number(values.valor_total),
      parcelas_total: parcTotal,
      parcelas_pagas: parcPagas,
      categoria: values.categoria,
      data_primeira_parcela: dayjs(values.data_primeira_parcela).format('YYYY-MM-DD'),
      dia_vencimento: Number(values.dia_vencimento),
      notas: values.notas || null,
      concluido: parcPagas >= parcTotal,
    };
    if (editingId) {
      const { error } = await supabase.from('parcelamentos').update(payload).eq('id', editingId);
      if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
      notifications.show({ title: 'Atualizado!', message: 'Parcelamento editado.', color: 'teal' });
    } else {
      const { error } = await supabase.from('parcelamentos').insert(payload);
      if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
      notifications.show({ title: 'Parcelamento criado!', message: `"${values.descricao}" adicionado.`, color: 'teal' });
    }
    closeForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('parcelamentos').delete().eq('id', id);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: 'Excluído', message: 'Parcelamento removido.', color: 'teal' });
    fetchData();
  };

  const handleOpenPay = (p: Parcelamento) => { setPayingItem(p); openPay(); };

  const handlePay = async () => {
    if (!payingItem) return;
    const novasPagas = payingItem.parcelas_pagas + 1;
    const concluido = novasPagas >= payingItem.parcelas_total;
    const { error } = await supabase.from('parcelamentos')
      .update({ parcelas_pagas: novasPagas, concluido })
      .eq('id', payingItem.id);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    if (concluido) {
      notifications.show({ title: '🎉 Parcelamento quitado!', message: `"${payingItem.descricao}" totalmente pago!`, color: 'teal' });
    } else {
      notifications.show({ title: 'Parcela paga!', message: `Parcela ${novasPagas}/${payingItem.parcelas_total} registrada.`, color: 'teal' });
    }
    closePay();
    setPayingItem(null);
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Summary
  const ativos = parcelamentos.filter((p) => !p.concluido);
  const totalComprometido = ativos.reduce((s, p) => s + Number(p.valor_total), 0);
  const totalPago = parcelamentos.reduce((s, p) => s + p.parcelas_pagas * Number(p.valor_parcela), 0);
  const totalRestante = ativos.reduce((s, p) => s + (p.parcelas_total - p.parcelas_pagas) * Number(p.valor_parcela), 0);

  // Future installments (next 3 months)
  const futureInstallments: { mes: string; items: { desc: string; parcela: number; total: number; valor: number; concluido: boolean }[] }[] = [];
  const now = dayjs();
  for (let m = 0; m < 3; m++) {
    const targetMonth = now.add(m, 'month');
    const mesLabel = targetMonth.format('MMMM/YYYY').replace(/^\w/, (c) => c.toUpperCase());
    const items: typeof futureInstallments[0]['items'] = [];

    for (const p of ativos) {
      const inicio = dayjs(p.data_primeira_parcela);
      const diffMonths = targetMonth.startOf('month').diff(inicio.startOf('month'), 'month');
      const parcelaNum = diffMonths + 1;
      if (parcelaNum >= 1 && parcelaNum <= p.parcelas_total) {
        items.push({
          desc: p.descricao,
          parcela: parcelaNum,
          total: p.parcelas_total,
          valor: Number(p.valor_parcela),
          concluido: parcelaNum <= p.parcelas_pagas,
        });
      }
    }
    if (items.length > 0) futureInstallments.push({ mes: mesLabel, items });
  }

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'violet', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Parcelamentos</Title>
          <Text c="dimmed" size="sm">Rastreie suas compras parceladas</Text>
        </div>
        <Button id="btn-novo-parcelamento" leftSection={<IconPlus size={16} />}
          style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-violet-8))' }}
          onClick={handleNew}>
          Novo Parcelamento
        </Button>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md" className="stat-card stat-violet card-hover animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Comprometido</Text>
            <ThemeIcon variant="light" color="violet" size="sm" radius="xl"><IconShoppingBag size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="violet">{fmt(totalComprometido)}</Text>
          <Text size="xs" c="dimmed">{ativos.length} parcelamento{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md" className="stat-card stat-teal card-hover animate-fade-in-up"
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Já Pago</Text>
            <ThemeIcon variant="light" color="teal" size="sm" radius="xl"><IconCoin size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="teal">{fmt(totalPago)}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md" className="stat-card stat-red card-hover animate-fade-in-up"
          style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Falta Pagar</Text>
            <ThemeIcon variant="light" color="red" size="sm" radius="xl"><IconCoinOff size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="red">{fmt(totalRestante)}</Text>
        </Paper>
      </SimpleGrid>

      {/* Parcelamentos Grid */}
      {parcelamentos.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
          {parcelamentos.map((p, i) => {
            const pct = Math.min((p.parcelas_pagas / p.parcelas_total) * 100, 100);
            const restante = (p.parcelas_total - p.parcelas_pagas) * Number(p.valor_parcela);
            const pago = p.parcelas_pagas * Number(p.valor_parcela);
            const proximaParcela = dayjs(p.data_primeira_parcela).add(p.parcelas_pagas, 'month');

            return (
              <Card key={p.id} withBorder radius="md" p="lg" className="card-hover animate-fade-in-up"
                style={{
                  animationDelay: `${0.2 + i * 0.06}s`,
                  borderColor: p.concluido ? 'var(--mantine-color-teal-7)' : 'var(--mantine-color-dark-4)',
                }}>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    {p.concluido && (
                      <ThemeIcon size="sm" color="teal" variant="light" radius="xl">
                        <IconCircleCheck size={12} />
                      </ThemeIcon>
                    )}
                    <Text fw={600} lineClamp={1}>{p.descricao}</Text>
                  </Group>
                  <Badge color={p.concluido ? 'teal' : 'violet'} variant={p.concluido ? 'filled' : 'light'} size="sm">
                    {p.concluido ? 'Quitado' : p.categoria}
                  </Badge>
                </Group>

                <Progress value={pct} color={p.concluido ? 'teal' : 'violet'} size="lg" radius="xl" mb="xs"
                  animated={!p.concluido} className={p.concluido ? '' : 'progress-glow'} />

                <Group justify="space-between" mb={4}>
                  <Text size="sm" c="dimmed">
                    {p.parcelas_pagas}/{p.parcelas_total} parcelas
                  </Text>
                  <Text size="sm" fw={500} c={p.concluido ? 'teal' : 'violet'}>
                    {Math.round(pct)}%
                  </Text>
                </Group>

                <Divider my="xs" color="dark.5" />

                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Parcela:</Text>
                    <Text size="xs" fw={600}>{fmt(Number(p.valor_parcela))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Já pago:</Text>
                    <Text size="xs" fw={600} c="teal">{fmt(pago)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Restante:</Text>
                    <Text size="xs" fw={600} c="red">{fmt(restante)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Total:</Text>
                    <Text size="xs" fw={600}>{fmt(Number(p.valor_total))}</Text>
                  </Group>
                </Stack>

                {!p.concluido && (
                  <Badge variant="light" color="blue" size="sm" mt="xs"
                    leftSection={<IconCalendarDue size={10} />}>
                    Próxima: {proximaParcela.format('DD/MM/YYYY')}
                  </Badge>
                )}

                {p.notas && <Text size="xs" c="dimmed" mt="xs" lineClamp={2} fs="italic">{p.notas}</Text>}

                <Group mt="md" gap="xs">
                  {!p.concluido && (
                    <Button size="xs" variant="light" color="teal" leftSection={<IconCheck size={14} />}
                      onClick={() => handleOpenPay(p)}>
                      Pagar parcela
                    </Button>
                  )}
                  <Tooltip label="Editar">
                    <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleEdit(p)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Excluir">
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(p.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <Paper withBorder p="xl" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Stack align="center" py="lg">
            <ThemeIcon size="xl" color="violet" variant="light" radius="xl">
              <IconReceipt2 size={28} />
            </ThemeIcon>
            <Text c="dimmed" size="sm" ta="center">
              Você ainda não cadastrou nenhum parcelamento.
            </Text>
            <Button variant="light" color="violet" onClick={handleNew}>
              Cadastrar primeiro parcelamento
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Future Installments Timeline */}
      {futureInstallments.length > 0 && (
        <Paper withBorder radius="md" className="animate-fade-in-up"
          style={{ animationDelay: '0.4s', borderColor: 'var(--mantine-color-dark-4)', overflow: 'hidden' }}>
          <Group p="md" pb={0} gap="xs">
            <ThemeIcon variant="light" color="violet" size="md" radius="xl">
              <IconClock size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">Parcelas Futuras</Text>
          </Group>

          {futureInstallments.map((month) => (
            <Box key={month.mes}>
              <Text size="sm" fw={600} c="violet" px="md" pt="md" pb="xs" tt="capitalize">
                📅 {month.mes}
              </Text>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Descrição</Table.Th>
                    <Table.Th>Parcela</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {month.items.map((item, idx) => (
                    <Table.Tr key={`${month.mes}-${idx}`} className="table-row-enter">
                      <Table.Td><Text size="sm" fw={500}>{item.desc}</Text></Table.Td>
                      <Table.Td>
                        <Badge color="violet" variant="light" size="sm">
                          {item.parcela}/{item.total}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600}>{fmt(item.valor)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        {item.concluido ? (
                          <Badge color="teal" variant="filled" size="sm">Paga</Badge>
                        ) : (
                          <Badge color="yellow" variant="light" size="sm">Pendente</Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group justify="flex-end" px="md" pb="xs">
                <Text size="xs" c="dimmed" fw={500}>
                  Total do mês: {fmt(month.items.filter(i => !i.concluido).reduce((s, i) => s + i.valor, 0))}
                </Text>
              </Group>
            </Box>
          ))}
        </Paper>
      )}

      {/* Modal New/Edit */}
      <Modal opened={formOpened} onClose={closeForm}
        title={<Text fw={700} size="lg">{editingId ? 'Editar Parcelamento' : 'Novo Parcelamento'}</Text>}
        size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Descrição" placeholder='Ex: TV Samsung 55"' size="md"
              {...form.getInputProps('descricao')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Valor total" placeholder="R$ 0,00" prefix="R$ " decimalSeparator=","
                thousandSeparator="." min={0.01} decimalScale={2} size="md"
                {...form.getInputProps('valor_total')} />
              <NumberInput label="Nº de parcelas" placeholder="Ex: 12" min={2} max={120} size="md"
                {...form.getInputProps('parcelas_total')} />
            </SimpleGrid>
            {form.values.parcelas_total && form.values.valor_total ? (
              <Text size="sm" c="violet" ta="center" fw={500}>
                {Number(form.values.parcelas_total)}x de {fmt(Number(form.values.valor_total) / Number(form.values.parcelas_total))}
              </Text>
            ) : null}
            {editingId && (
              <NumberInput label="Parcelas já pagas" min={0}
                max={Number(form.values.parcelas_total) || 999} size="md"
                {...form.getInputProps('parcelas_pagas')} />
            )}
            <Select label="Categoria" placeholder="Selecione" data={categorias} size="md"
              {...form.getInputProps('categoria')} />
            <SimpleGrid cols={2}>
              <DateInput label="Data 1ª parcela" size="md" valueFormat="DD/MM/YYYY"
                {...form.getInputProps('data_primeira_parcela')} />
              <NumberInput label="Dia vencimento" placeholder="Ex: 10" min={1} max={31} size="md"
                leftSection={<IconCalendarDue size={16} />}
                {...form.getInputProps('dia_vencimento')} />
            </SimpleGrid>
            <Textarea label="Notas (opcional)" placeholder="Observações..." autosize minRows={2} maxRows={3}
              {...form.getInputProps('notas')} />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeForm}>Cancelar</Button>
              <Button type="submit"
                style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-violet-8))' }}>
                {editingId ? 'Salvar' : 'Criar parcelamento'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Pay */}
      <Modal opened={payOpened} onClose={closePay}
        title={<Text fw={700} size="lg">Pagar Parcela</Text>}
        size="sm" radius="lg" centered overlayProps={{ blur: 3 }}>
        {payingItem && (
          <Stack gap="md">
            <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
              <Text size="sm" fw={600} mb={4}>{payingItem.descricao}</Text>
              <Group justify="center" my="md">
                <RingProgress size={100} thickness={8} roundCaps
                  sections={[{ value: (payingItem.parcelas_pagas / payingItem.parcelas_total) * 100, color: 'violet' }]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {payingItem.parcelas_pagas}/{payingItem.parcelas_total}
                    </Text>
                  } />
              </Group>
              <Divider my="xs" color="dark.5" />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Pagando:</Text>
                <Badge color="violet" variant="light" size="lg">
                  Parcela {payingItem.parcelas_pagas + 1}/{payingItem.parcelas_total}
                </Badge>
              </Group>
              <Group justify="space-between" mt={4}>
                <Text size="sm" c="dimmed">Valor:</Text>
                <Text size="sm" fw={700} c="violet">{fmt(Number(payingItem.valor_parcela))}</Text>
              </Group>
              {payingItem.parcelas_pagas + 1 >= payingItem.parcelas_total && (
                <Badge color="teal" variant="light" size="sm" mt="xs" fullWidth>
                  🎉 Esta é a última parcela!
                </Badge>
              )}
            </Paper>
            <Group justify="flex-end">
              <Button variant="default" onClick={closePay}>Cancelar</Button>
              <Button onClick={handlePay} leftSection={<IconCheck size={16} />}
                style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}>
                Confirmar pagamento
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
