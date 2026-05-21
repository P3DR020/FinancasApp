import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Text, Title, Badge, ActionIcon,
  Modal, Stack, TextInput, NumberInput, Select, LoadingOverlay,
  ThemeIcon, Tooltip, Divider, ColorInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconCreditCard, IconCalendarDue,
  IconCoin, IconPlayerPause, IconPlayerPlay,
} from '@tabler/icons-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Cartao {
  id: string; nome: string; bandeira: string; limite: number;
  dia_fechamento: number; dia_vencimento: number; cor: string; ativo: boolean;
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

export default function Cartoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cardOpened, { open: openCard, close: closeCard }] = useDisclosure(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: c } = await supabase.from('cartoes').select('*').order('nome');
    setCartoes(c || []);
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
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalLimite = cartoes.filter(c => c.ativo).reduce((s, c) => s + Number(c.limite), 0);
  const cartoesAtivos = cartoes.filter(c => c.ativo).length;
  const cartoesInativos = cartoes.filter(c => !c.ativo).length;

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'blue', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Cartões de Crédito</Title>
          <Text c="dimmed" size="sm">Gerencie seus cartões</Text>
        </div>
        <Button id="btn-novo-cartao" leftSection={<IconPlus size={16} />}
          style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-8))' }}
          onClick={handleNewCard}>
          Novo Cartão
        </Button>
      </Group>

      {/* Summary */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md" className="stat-card stat-blue card-hover animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Limite total</Text>
            <ThemeIcon variant="light" color="blue" size="sm" radius="xl"><IconCreditCard size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="blue">{fmt(totalLimite)}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md" className="stat-card stat-teal card-hover animate-fade-in-up"
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Cartões ativos</Text>
            <ThemeIcon variant="light" color="teal" size="sm" radius="xl"><IconCoin size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="teal">{cartoesAtivos}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md" className="stat-card stat-yellow card-hover animate-fade-in-up"
          style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Inativos</Text>
            <ThemeIcon variant="light" color="yellow" size="sm" radius="xl"><IconPlayerPause size={14} /></ThemeIcon>
          </Group>
          <Text size="xl" fw={700} c="yellow">{cartoesInativos}</Text>
        </Paper>
      </SimpleGrid>

      {/* Cards Grid */}
      {cartoes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
          {cartoes.map((c, i) => (
            <Paper key={c.id} withBorder p="lg" radius="md"
              className="card-hover animate-fade-in-up"
              style={{
                animationDelay: `${0.2 + i * 0.06}s`,
                borderColor: c.ativo ? c.cor : 'var(--mantine-color-dark-5)',
                borderWidth: 1, opacity: c.ativo ? 1 : 0.5,
                background: 'var(--mantine-color-dark-7)',
              }}>
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
                  <Tooltip label={c.ativo ? 'Desativar' : 'Reativar'}>
                    <ActionIcon variant="subtle" color={c.ativo ? 'yellow' : 'teal'} size="sm"
                      onClick={() => handleToggleAtivo(c)}>
                      {c.ativo ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Editar">
                    <ActionIcon variant="subtle" color="blue" size="sm"
                      onClick={() => handleEditCard(c)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Excluir">
                    <ActionIcon variant="subtle" color="red" size="sm"
                      onClick={() => handleDeleteCard(c.id)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <Text size="lg" fw={700} c="blue" mb={4}>{fmt(Number(c.limite))}</Text>
              <Text size="xs" c="dimmed" mb="xs">Limite disponível</Text>

              <Divider my="xs" color="dark.5" />
              <Group gap="xs">
                <Badge variant="dot" color="blue" size="xs"><IconCalendarDue size={10} /> Fecha dia {c.dia_fechamento}</Badge>
                <Badge variant="dot" color="red" size="xs"><IconCalendarDue size={10} /> Vence dia {c.dia_vencimento}</Badge>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p="xl" radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
          <Stack align="center" py="lg">
            <ThemeIcon size="xl" color="blue" variant="light" radius="xl"><IconCreditCard size={28} /></ThemeIcon>
            <Text c="dimmed" size="sm">Nenhum cartão cadastrado ainda.</Text>
            <Button variant="light" color="blue" onClick={handleNewCard}>Cadastrar primeiro cartão</Button>
          </Stack>
        </Paper>
      )}

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
    </Box>
  );
}
