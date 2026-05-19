import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, Textarea, LoadingOverlay,
  ThemeIcon, Tooltip, Divider, Progress, Table, ColorInput, SegmentedControl,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconCreditCard, IconCalendarDue,
  IconReceipt, IconCoin, IconShoppingCart, IconPlayerPause, IconPlayerPlay,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Cartao {
  id: string; nome: string; bandeira: string; limite: number;
  dia_fechamento: number; dia_vencimento: number; cor: string; ativo: boolean;
}

interface Compra {
  id: string; cartao_id: string; descricao: string; valor_total: number;
  parcelas: number; parcela_atual: number; categoria: string;
  data_compra: string; notas: string | null;
}

const bandeiras = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outro', label: 'Outro' },
];

const bandeiraEmoji: Record<string, string> = {
  visa: '💳', mastercard: '🟠', elo: '🔵', amex: '💎', hipercard: '🔴', outro: '💳',
};

const categorias = [
  'Alimentação', 'Supermercado', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Roupas', 'Eletrônicos', 'Casa', 'Assinaturas', 'Viagem', 'Outro',
];

export default function Cartoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cardOpened, { open: openCard, close: closeCard }] = useDisclosure(false);
  const [compraOpened, { open: openCompra, close: closeCompra }] = useDisclosure(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [selectedCartaoId, setSelectedCartaoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'todos' | string>('todos');

  const cardForm = useForm({
    initialValues: {
      nome: '', bandeira: '', limite: '' as number | '',
      dia_fechamento: '' as number | '', dia_vencimento: '' as number | '',
      cor: '#228be6', ativo: true,
    },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
      bandeira: (v) => (!v ? 'Selecione a bandeira' : null),
      limite: (v) => (!v || Number(v) <= 0 ? 'Limite deve ser maior que zero' : null),
      dia_fechamento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido' : null),
      dia_vencimento: (v) => (!v || Number(v) < 1 || Number(v) > 31 ? 'Dia inválido' : null),
    },
  });

  const compraForm = useForm({
    initialValues: {
      cartao_id: '', descricao: '', valor_total: '' as number | '',
      parcelas: 1 as number, categoria: '', data_compra: new Date(), notas: '',
    },
    validate: {
      cartao_id: (v) => (!v ? 'Selecione o cartão' : null),
      descricao: (v) => (!v.trim() ? 'Descrição é obrigatória' : null),
      valor_total: (v) => (!v || Number(v) <= 0 ? 'Valor deve ser maior que zero' : null),
      categoria: (v) => (!v ? 'Selecione a categoria' : null),
    },
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: c }, { data: cp }] = await Promise.all([
      supabase.from('cartoes').select('*').order('nome'),
      supabase.from('cartao_compras').select('*').order('data_compra', { ascending: false }),
    ]);
    setCartoes(c || []);
    setCompras(cp || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleNewCard = () => { setEditingCardId(null); cardForm.reset(); openCard(); };

  const handleEditCard = (c: Cartao) => {
    setEditingCardId(c.id);
    cardForm.setValues({
      nome: c.nome, bandeira: c.bandeira, limite: Number(c.limite),
      dia_fechamento: c.dia_fechamento, dia_vencimento: c.dia_vencimento,
      cor: c.cor, ativo: c.ativo,
    });
    openCard();
  };

  const handleSubmitCard = async (values: typeof cardForm.values) => {
    if (!user) return;
    const payload = {
      user_id: user.id, nome: values.nome, bandeira: values.bandeira,
      limite: Number(values.limite), dia_fechamento: Number(values.dia_fechamento),
      dia_vencimento: Number(values.dia_vencimento), cor: values.cor, ativo: values.ativo,
    };
    if (editingCardId) {
      const { error } = await supabase.from('cartoes').update(payload).eq('id', editingCardId);
      if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
      notifications.show({ title: 'Cartão atualizado', message: 'Alterações salvas.', color: 'teal' });
    } else {
      const { error } = await supabase.from('cartoes').insert(payload);
      if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
      notifications.show({ title: 'Cartão adicionado!', message: `"${values.nome}" cadastrado.`, color: 'teal' });
    }
    closeCard(); fetchData();
  };

  const handleToggleAtivo = async (c: Cartao) => {
    const { error } = await supabase.from('cartoes').update({ ativo: !c.ativo }).eq('id', c.id);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: c.ativo ? 'Desativado' : 'Reativado', message: `"${c.nome}" ${c.ativo ? 'desativado' : 'reativado'}.`, color: 'teal' });
    fetchData();
  };

  const handleDeleteCard = async (id: string) => {
    const { error } = await supabase.from('cartoes').delete().eq('id', id);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: 'Cartão excluído', message: 'Removido com sucesso.', color: 'teal' });
    if (viewMode === id) setViewMode('todos');
    fetchData();
  };

  const handleNewCompra = (cartaoId?: string) => {
    compraForm.reset();
    compraForm.setFieldValue('data_compra', new Date());
    if (cartaoId) compraForm.setFieldValue('cartao_id', cartaoId);
    openCompra();
  };

  const handleSubmitCompra = async (values: typeof compraForm.values) => {
    if (!user) return;
    const payload = {
      user_id: user.id, cartao_id: values.cartao_id, descricao: values.descricao,
      valor_total: Number(values.valor_total), parcelas: Number(values.parcelas),
      parcela_atual: 1, categoria: values.categoria,
      data_compra: dayjs(values.data_compra).format('YYYY-MM-DD'),
      notas: values.notas || null,
    };
    const { error } = await supabase.from('cartao_compras').insert(payload);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: 'Compra registrada!', message: `"${values.descricao}" adicionada.`, color: 'teal' });
    closeCompra(); fetchData();
  };

  const handleDeleteCompra = async (id: string) => {
    const { error } = await supabase.from('cartao_compras').delete().eq('id', id);
    if (error) { notifications.show({ title: 'Erro', message: error.message, color: 'red' }); return; }
    notifications.show({ title: 'Compra excluída', message: 'Removida.', color: 'teal' });
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getGastoCartao = (cartaoId: string) =>
    compras.filter((c) => c.cartao_id === cartaoId)
      .reduce((s, c) => s + Number(c.valor_total) / c.parcelas, 0);

  const totalFatura = cartoes.filter(c => c.ativo).reduce((s, c) => s + getGastoCartao(c.id), 0);
  const totalLimite = cartoes.filter(c => c.ativo).reduce((s, c) => s + Number(c.limite), 0);
  const totalDisponivel = totalLimite - totalFatura;

  const filteredCompras = viewMode === 'todos'
    ? compras
    : compras.filter((c) => c.cartao_id === viewMode);

  const cartaoMap = Object.fromEntries(cartoes.map((c) => [c.id, c]));

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'blue', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Cartões de Crédito</Title>
          <Text c="dimmed" size="sm">Gerencie seus cartões e compras</Text>
        </div>
        <Group gap="xs">
          <Button id="btn-nova-compra" leftSection={<IconShoppingCart size={16} />} variant="light" color="blue" onClick={() => handleNewCompra()}>
            Nova Compra
          </Button>
          <Button id="btn-novo-cartao" leftSection={<IconPlus size={16} />}
            style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-8))' }}
            onClick={handleNewCard}>
            Novo Cartão
          </Button>
        </Group>
      </Group>

      {/* Summary */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md" className="stat-card stat-red card-hover animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Fatura atual</Text>
            <ThemeIcon variant="light" color="red" size="sm" radius="xl"><IconReceipt size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="red">{fmt(totalFatura)}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md" className="stat-card stat-teal card-hover animate-fade-in-up"
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Limite disponível</Text>
            <ThemeIcon variant="light" color="teal" size="sm" radius="xl"><IconCoin size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="teal">{fmt(totalDisponivel)}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md" className="stat-card stat-blue card-hover animate-fade-in-up"
          style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Limite total</Text>
            <ThemeIcon variant="light" color="blue" size="sm" radius="xl"><IconCreditCard size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="blue">{fmt(totalLimite)}</Text>
          <Text size="xs" c="dimmed">{cartoes.filter(c => c.ativo).length} cartões ativos</Text>
        </Paper>
      </SimpleGrid>

      {/* Cards Grid */}
      {cartoes.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
          {cartoes.map((c, i) => {
            const gasto = getGastoCartao(c.id);
            const pct = Number(c.limite) > 0 ? Math.min((gasto / Number(c.limite)) * 100, 100) : 0;
            const disponivel = Number(c.limite) - gasto;
            return (
              <Paper key={c.id} withBorder p="lg" radius="md"
                className="card-hover animate-fade-in-up"
                style={{
                  animationDelay: `${0.2 + i * 0.06}s`,
                  borderColor: c.ativo ? c.cor : 'var(--mantine-color-dark-5)',
                  borderWidth: 1, opacity: c.ativo ? 1 : 0.5,
                  cursor: 'pointer', background: 'var(--mantine-color-dark-7)',
                }}
                onClick={() => setViewMode(viewMode === c.id ? 'todos' : c.id)}
              >
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <Text size="xl" lh={1}>{bandeiraEmoji[c.bandeira] || '💳'}</Text>
                    <div>
                      <Text size="sm" fw={700}>{c.nome}</Text>
                      <Text size="xs" c="dimmed">{bandeiras.find(b => b.value === c.bandeira)?.label}</Text>
                    </div>
                  </Group>
                  <Group gap={4}>
                    {!c.ativo && <Badge color="gray" size="xs" variant="light">Inativo</Badge>}
                    {viewMode === c.id && <Badge color="blue" size="xs" variant="filled">Filtrado</Badge>}
                    <Tooltip label={c.ativo ? 'Desativar' : 'Reativar'}>
                      <ActionIcon variant="subtle" color={c.ativo ? 'yellow' : 'teal'} size="sm"
                        onClick={(e) => { e.stopPropagation(); handleToggleAtivo(c); }}>
                        {c.ativo ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Editar">
                      <ActionIcon variant="subtle" color="blue" size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEditCard(c); }}>
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Excluir">
                      <ActionIcon variant="subtle" color="red" size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCard(c.id); }}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                <Progress value={pct} color={pct > 90 ? 'red' : pct > 70 ? 'yellow' : 'blue'}
                  size="sm" radius="xl" mb="xs" animated={pct > 0} />

                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">Usado: {fmt(gasto)}</Text>
                  <Text size="xs" c="dimmed">{Math.round(pct)}%</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Disponível: <Text span fw={600} c={disponivel >= 0 ? 'teal' : 'red'}>{fmt(disponivel)}</Text></Text>
                  <Text size="xs" c="dimmed">Limite: {fmt(Number(c.limite))}</Text>
                </Group>
                <Divider my="xs" color="dark.5" />
                <Group gap="xs">
                  <Badge variant="dot" color="blue" size="xs"><IconCalendarDue size={10} /> Fecha dia {c.dia_fechamento}</Badge>
                  <Badge variant="dot" color="red" size="xs"><IconCalendarDue size={10} /> Vence dia {c.dia_vencimento}</Badge>
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {/* Filter indicator */}
      {viewMode !== 'todos' && cartaoMap[viewMode] && (
        <Group mb="md" gap="xs">
          <Badge color="blue" variant="light" size="lg" style={{ cursor: 'pointer' }}
            onClick={() => setViewMode('todos')} rightSection="✕">
            Filtrando: {cartaoMap[viewMode].nome}
          </Badge>
        </Group>
      )}

      {/* Purchases table */}
      <Paper withBorder radius="md" className="animate-fade-in-up"
        style={{ animationDelay: '0.4s', borderColor: 'var(--mantine-color-dark-4)', overflow: 'hidden' }}>
        <Group justify="space-between" p="md" pb={0}>
          <Text fw={600}>Compras no cartão</Text>
          <Button size="xs" variant="light" color="blue" leftSection={<IconShoppingCart size={14} />}
            onClick={() => handleNewCompra(viewMode !== 'todos' ? viewMode : undefined)}>
            Nova compra
          </Button>
        </Group>

        {filteredCompras.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Cartão</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Parcelas</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredCompras.map((cp) => {
                const cartao = cartaoMap[cp.cartao_id];
                const valorParcela = Number(cp.valor_total) / cp.parcelas;
                return (
                  <Table.Tr key={cp.id} className="table-row-enter">
                    <Table.Td><Text size="sm">{dayjs(cp.data_compra).format('DD/MM/YYYY')}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{cp.descricao}</Text>
                      {cp.notas && <Text size="xs" c="dimmed" lineClamp={1}>{cp.notas}</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text size="sm" lh={1}>{cartao ? bandeiraEmoji[cartao.bandeira] || '💳' : '💳'}</Text>
                        <Text size="sm">{cartao?.nome || '—'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{cp.categoria}</Text></Table.Td>
                    <Table.Td>
                      {cp.parcelas > 1 ? (
                        <Badge color="violet" variant="light" size="sm">
                          {cp.parcela_atual}/{cp.parcelas}x de {fmt(valorParcela)}
                        </Badge>
                      ) : (
                        <Badge color="gray" variant="light" size="sm">À vista</Badge>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600} c="red">{fmt(Number(cp.valor_total))}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="center">
                        <Tooltip label="Excluir">
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteCompra(cp.id)}>
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
            <ThemeIcon size="xl" color="blue" variant="light" radius="xl"><IconCreditCard size={28} /></ThemeIcon>
            <Text c="dimmed" size="sm">
              {cartoes.length === 0 ? 'Cadastre um cartão primeiro' : 'Nenhuma compra registrada'}
            </Text>
            {cartoes.length === 0 ? (
              <Button variant="light" color="blue" onClick={handleNewCard}>Cadastrar cartão</Button>
            ) : (
              <Button variant="light" color="blue" onClick={() => handleNewCompra()}>Registrar compra</Button>
            )}
          </Stack>
        )}
      </Paper>

      {/* Modal New/Edit Card */}
      <Modal opened={cardOpened} onClose={closeCard} title={<Text fw={700} size="lg">{editingCardId ? 'Editar Cartão' : 'Novo Cartão'}</Text>}
        size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={cardForm.onSubmit(handleSubmitCard)}>
          <Stack gap="md">
            <TextInput label="Nome do cartão" placeholder="Ex: Nubank Platinum" size="md" {...cardForm.getInputProps('nome')} />
            <Select label="Bandeira" placeholder="Selecione" data={bandeiras} size="md" {...cardForm.getInputProps('bandeira')} />
            <NumberInput label="Limite" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="."
              min={0.01} decimalScale={2} size="md" {...cardForm.getInputProps('limite')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Dia do fechamento" placeholder="Ex: 25" min={1} max={31} size="md"
                leftSection={<IconCalendarDue size={16} />} {...cardForm.getInputProps('dia_fechamento')} />
              <NumberInput label="Dia do vencimento" placeholder="Ex: 5" min={1} max={31} size="md"
                leftSection={<IconCalendarDue size={16} />} {...cardForm.getInputProps('dia_vencimento')} />
            </SimpleGrid>
            <ColorInput label="Cor do cartão" size="md" swatches={['#228be6','#7c3aed','#e64980','#fd7e14','#12b886','#fab005','#868e96','#e03131']}
              {...cardForm.getInputProps('cor')} />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeCard}>Cancelar</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-8))' }}>
                {editingCardId ? 'Salvar' : 'Adicionar'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal New Purchase */}
      <Modal opened={compraOpened} onClose={closeCompra} title={<Text fw={700} size="lg">Nova Compra</Text>}
        size="md" radius="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={compraForm.onSubmit(handleSubmitCompra)}>
          <Stack gap="md">
            <Select label="Cartão" placeholder="Selecione o cartão"
              data={cartoes.filter(c => c.ativo).map(c => ({ value: c.id, label: `${bandeiraEmoji[c.bandeira] || '💳'} ${c.nome}` }))}
              size="md" {...compraForm.getInputProps('cartao_id')} />
            <TextInput label="Descrição" placeholder="Ex: Compra na Amazon" size="md" {...compraForm.getInputProps('descricao')} />
            <SimpleGrid cols={2}>
              <NumberInput label="Valor total" placeholder="R$ 0,00" prefix="R$ " decimalSeparator="," thousandSeparator="."
                min={0.01} decimalScale={2} size="md" {...compraForm.getInputProps('valor_total')} />
              <NumberInput label="Parcelas" placeholder="1" min={1} max={48} size="md" {...compraForm.getInputProps('parcelas')} />
            </SimpleGrid>
            {compraForm.values.parcelas > 1 && compraForm.values.valor_total && (
              <Text size="sm" c="blue" ta="center" fw={500}>
                {compraForm.values.parcelas}x de {fmt(Number(compraForm.values.valor_total) / compraForm.values.parcelas)}
              </Text>
            )}
            <Select label="Categoria" placeholder="Selecione" data={categorias} size="md" {...compraForm.getInputProps('categoria')} />
            <DateInput label="Data da compra" size="md" valueFormat="DD/MM/YYYY" {...compraForm.getInputProps('data_compra')} />
            <Textarea label="Notas (opcional)" placeholder="Observações..." autosize minRows={2} maxRows={3}
              {...compraForm.getInputProps('notas')} />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeCompra}>Cancelar</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-8))' }}>
                Registrar compra
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
