import { useState, useCallback } from 'react';
import {
  Box, Button, Group, Paper, Text, Title, Stepper, Table, Badge,
  Select, Stack, LoadingOverlay, ActionIcon, Tooltip, Checkbox,
  Alert, FileInput, ThemeIcon, rem, SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUpload, IconFileSpreadsheet, IconCheck, IconTrash,
  IconAlertTriangle, IconFileImport, IconArrowRight, IconArrowLeft,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface TransacaoImportada {
  data: string; descricao: string; valor: number;
  tipo: 'receita' | 'despesa'; categoria: string;
  selecionada: boolean; duplicata: boolean;
}

interface Conta { id: string; nome: string; icone: string; }

const categorias = ['Salário','Freelance','Investimentos','Alimentação','Transporte','Saúde','Educação','Lazer','Moradia','Outros'];

const KEYWORD_MAP: Record<string, string[]> = {
  'Alimentação': ['supermercado','mercado','restaurante','ifood','uber eats','padaria','lanchonete','pizza','burger','açougue','hortifruti','café','almoço','jantar','food','rappi'],
  'Transporte': ['uber','99','combustível','gasolina','estacionamento','pedágio','ônibus','metrô','taxi','posto','shell','ipiranga'],
  'Saúde': ['farmácia','drogaria','hospital','clínica','médico','dentista','exame','laboratório','droga','consulta'],
  'Moradia': ['aluguel','condomínio','energia','água','gás','internet','luz','enel','sabesp','copasa','celpe'],
  'Educação': ['escola','faculdade','curso','udemy','livro','livraria','mensalidade'],
  'Lazer': ['cinema','netflix','spotify','disney','hbo','teatro','show','ingresso','game','steam','playstation','xbox'],
  'Salário': ['salário','salario','pagamento','holerite','adiantamento','férias'],
};

function detectarCategoria(descricao: string): string {
  const lower = descricao.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Outros';
}

function parseDate(raw: string): string {
  if (!raw) return dayjs().format('YYYY-MM-DD');
  // DD/MM/YYYY
  const brMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (brMatch) {
    const y = brMatch[3].length === 2 ? '20' + brMatch[3] : brMatch[3];
    return `${y}-${brMatch[2].padStart(2,'0')}-${brMatch[1].padStart(2,'0')}`;
  }
  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // OFX YYYYMMDD
  const ofxMatch = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch) return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  const d = dayjs(raw);
  return d.isValid() ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
}

function parseOFX(content: string): TransacaoImportada[] {
  const results: TransacaoImportada[] = [];
  const trnBlocks = content.split(/<STMTTRN>/i).slice(1);
  for (const block of trnBlocks) {
    const getValue = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const amt = parseFloat(getValue('TRNAMT')) || 0;
    const desc = getValue('NAME') || getValue('MEMO') || 'Sem descrição';
    const date = getValue('DTPOSTED');
    results.push({
      data: parseDate(date), descricao: desc, valor: Math.abs(amt),
      tipo: amt >= 0 ? 'receita' : 'despesa',
      categoria: detectarCategoria(desc), selecionada: true, duplicata: false,
    });
  }
  return results;
}

function detectCSVColumns(headers: string[]): { data: number; descricao: number; valor: number } {
  const lower = headers.map(h => h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const find = (keys: string[]) => lower.findIndex(h => keys.some(k => h.includes(k)));
  return {
    data: Math.max(0, find(['date','data','dt','vencimento'])),
    descricao: Math.max(0, find(['descri','title','titulo','historico','lancamento','name','memo'])),
    valor: Math.max(0, find(['valor','value','amount','quantia','vl'])),
  };
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ImportarExtrato() {
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [transacoes, setTransacoes] = useState<TransacaoImportada[]>([]);
  const [contaId, setContaId] = useState<string | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [importResult, setImportResult] = useState<{ importadas: number } | null>(null);

  const fetchContas = useCallback(async () => {
    try {
      const res = await api.get('/api/contas');
      setContas(res.data || []);
    } catch { /* ignore */ }
  }, []);

  const handleFileSelect = async (f: File | null) => {
    setFile(f);
    if (!f) return;
    await fetchContas();
    setLoading(true);
    try {
      const text = await f.text();
      let parsed: TransacaoImportada[] = [];
      if (f.name.toLowerCase().endsWith('.ofx') || f.name.toLowerCase().endsWith('.qfx')) {
        parsed = parseOFX(text);
      } else {
        const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
        if (!result.data || result.data.length === 0) {
          notifications.show({ title: 'Erro', message: 'Arquivo CSV vazio ou inválido', color: 'red' });
          setLoading(false); return;
        }
        const headers = Object.keys(result.data[0] as Record<string, string>);
        const cols = detectCSVColumns(headers);
        parsed = (result.data as Record<string, string>[]).map(row => {
          const vals = Object.values(row);
          const rawVal = (vals[cols.valor] || '0').toString().replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
          const valor = parseFloat(rawVal) || 0;
          const desc = (vals[cols.descricao] || 'Sem descrição').toString().trim();
          return {
            data: parseDate((vals[cols.data] || '').toString()),
            descricao: desc, valor: Math.abs(valor),
            tipo: (valor < 0 ? 'despesa' : 'receita') as 'receita' | 'despesa',
            categoria: detectarCategoria(desc), selecionada: true, duplicata: false,
          };
        }).filter(t => t.valor > 0 && t.descricao !== 'Sem descrição');
      }
      if (parsed.length === 0) {
        notifications.show({ title: 'Nenhuma transação encontrada', message: 'O arquivo não contém transações válidas.', color: 'orange' });
        setLoading(false); return;
      }
      // Verificar duplicatas
      try {
        const resp = await api.post('/api/importar/verificar-duplicatas', {
          transacoes: parsed.map(t => ({ data: t.data, valor: t.valor, descricao: t.descricao })),
        });
        const dupIndexes: number[] = resp.data.duplicatas || [];
        parsed = parsed.map((t, i) => ({ ...t, duplicata: dupIndexes.includes(i), selecionada: !dupIndexes.includes(i) }));
      } catch { /* prosseguir sem verificação */ }
      setTransacoes(parsed);
      setActive(1);
    } catch (err: any) {
      notifications.show({ title: 'Erro ao ler arquivo', message: err.message, color: 'red' });
    }
    setLoading(false);
  };

  const handleToggle = (idx: number) => {
    setTransacoes(prev => prev.map((t, i) => i === idx ? { ...t, selecionada: !t.selecionada } : t));
  };

  const handleRemove = (idx: number) => {
    setTransacoes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCategoriaChange = (idx: number, cat: string) => {
    setTransacoes(prev => prev.map((t, i) => i === idx ? { ...t, categoria: cat } : t));
  };

  const handleTipoChange = (idx: number, tipo: string) => {
    setTransacoes(prev => prev.map((t, i) => i === idx ? { ...t, tipo: tipo as 'receita' | 'despesa' } : t));
  };

  const handleConfirmar = async () => {
    if (!user) return;
    const selecionadas = transacoes.filter(t => t.selecionada);
    if (selecionadas.length === 0) {
      notifications.show({ title: 'Nada selecionado', message: 'Selecione pelo menos uma transação.', color: 'orange' });
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/api/importar/confirmar', {
        transacoes: selecionadas.map(t => ({
          tipo: t.tipo, valor: t.valor, descricao: t.descricao,
          categoria: t.categoria, data: t.data, tags: ['importado'],
          conta_id: contaId,
        })),
      });
      setImportResult(resp.data);
      setActive(2);
      notifications.show({ title: '✅ Importação concluída!', message: `${resp.data.importadas} transações importadas.`, color: 'teal' });
    } catch (err: any) {
      notifications.show({ title: 'Erro na importação', message: err.response?.data?.error || err.message, color: 'red' });
    }
    setLoading(false);
  };

  const handleReset = () => {
    setFile(null); setTransacoes([]); setActive(0);
    setImportResult(null); setContaId(null);
  };

  const selecionadas = transacoes.filter(t => t.selecionada);
  const totalReceitas = selecionadas.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const totalDespesas = selecionadas.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  const totalDuplicatas = transacoes.filter(t => t.duplicata).length;

  return (
    <Box pos="relative" mih="60vh">
      <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ blur: 2 }} loaderProps={{ color: 'teal', type: 'bars' }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>📥 Importar Extrato</Title>
          <Text c="dimmed" size="sm">Importe transações de arquivos CSV ou OFX do seu banco</Text>
        </div>
      </Group>

      <Paper withBorder p="xl" radius="md" mb="lg" className="animate-fade-in-up" style={{ borderColor: 'var(--mantine-color-dark-4)' }}>
        <Stepper active={active} color="teal" size="sm" mb="xl">
          <Stepper.Step label="Upload" description="Selecionar arquivo" icon={<IconUpload size={18} />} />
          <Stepper.Step label="Revisar" description="Conferir dados" icon={<IconFileSpreadsheet size={18} />} />
          <Stepper.Step label="Concluído" description="Importado!" icon={<IconCheck size={18} />} />
        </Stepper>

        {/* ETAPA 0 - Upload */}
        {active === 0 && (
          <Stack align="center" gap="lg" py="xl">
            <ThemeIcon size={80} radius="xl" variant="light" color="teal" style={{ background: 'linear-gradient(135deg, rgba(18,184,134,0.15), rgba(18,184,134,0.05))' }}>
              <IconFileImport size={40} />
            </ThemeIcon>
            <div style={{ textAlign: 'center' }}>
              <Text size="xl" fw={700} mb={4}>Selecione o extrato bancário</Text>
              <Text c="dimmed" size="sm" maw={400}>
                Formatos suportados: <Badge variant="light" color="blue" size="sm">CSV</Badge>{' '}
                <Badge variant="light" color="grape" size="sm">OFX</Badge>{' '}
                <Badge variant="light" color="grape" size="sm">QFX</Badge>
              </Text>
              <Text c="dimmed" size="xs" mt={8}>
                Compatível com Nubank, Itaú, Bradesco, Inter, C6, e outros bancos
              </Text>
            </div>
            <FileInput
              id="file-upload"
              placeholder="Clique para selecionar arquivo"
              accept=".csv,.ofx,.qfx"
              leftSection={<IconUpload size={16} />}
              size="md"
              w={350}
              value={file}
              onChange={handleFileSelect}
              styles={{ input: { borderColor: 'var(--mantine-color-teal-7)', cursor: 'pointer' } }}
            />
          </Stack>
        )}

        {/* ETAPA 1 - Revisão */}
        {active === 1 && (
          <Box>
            {/* Resumo */}
            <Group mb="md" gap="md" wrap="wrap">
              <Badge size="lg" variant="light" color="blue" style={{ padding: '12px 16px' }}>
                📊 {transacoes.length} transações encontradas
              </Badge>
              <Badge size="lg" variant="light" color="teal" style={{ padding: '12px 16px' }}>
                Receitas: {formatCurrency(totalReceitas)}
              </Badge>
              <Badge size="lg" variant="light" color="red" style={{ padding: '12px 16px' }}>
                Despesas: {formatCurrency(totalDespesas)}
              </Badge>
              {totalDuplicatas > 0 && (
                <Badge size="lg" variant="light" color="orange" style={{ padding: '12px 16px' }}>
                  ⚠️ {totalDuplicatas} possíveis duplicatas
                </Badge>
              )}
              <Badge size="lg" variant="light" color="cyan" style={{ padding: '12px 16px' }}>
                ✅ {selecionadas.length} selecionadas
              </Badge>
            </Group>

            {totalDuplicatas > 0 && (
              <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light" mb="md" radius="md">
                Foram detectadas {totalDuplicatas} possíveis duplicatas (em laranja). Elas foram desmarcadas automaticamente.
              </Alert>
            )}

            {/* Conta destino */}
            {contas.length > 0 && (
              <Select
                label="Conta de destino (opcional)"
                placeholder="Selecionar conta"
                data={contas.map(c => ({ value: c.id, label: `${c.icone} ${c.nome}` }))}
                value={contaId} onChange={setContaId} clearable mb="md" w={300} size="sm"
              />
            )}

            {/* Tabela */}
            <Paper withBorder radius="md" style={{ borderColor: 'var(--mantine-color-dark-4)', overflow: 'auto', maxHeight: 500 }}>
              <Table striped highlightOnHover stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}><Checkbox size="xs" checked={transacoes.every(t => t.selecionada)} onChange={() => {
                      const allSel = transacoes.every(t => t.selecionada);
                      setTransacoes(prev => prev.map(t => ({ ...t, selecionada: !allSel })));
                    }} color="teal" /></Table.Th>
                    <Table.Th>Data</Table.Th>
                    <Table.Th>Descrição</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Categoria</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
                    <Table.Th w={50}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transacoes.map((t, i) => (
                    <Table.Tr key={i} style={{
                      opacity: t.selecionada ? 1 : 0.5,
                      background: t.duplicata ? 'rgba(255, 165, 0, 0.08)' : undefined,
                    }}>
                      <Table.Td><Checkbox size="xs" checked={t.selecionada} onChange={() => handleToggle(i)} color="teal" /></Table.Td>
                      <Table.Td><Text size="sm">{dayjs(t.data).format('DD/MM/YYYY')}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500} lineClamp={1}>{t.descricao}</Text>
                        {t.duplicata && <Badge size="xs" color="orange" variant="light">Possível duplicata</Badge>}
                      </Table.Td>
                      <Table.Td>
                        <SegmentedControl size="xs" data={[
                          { label: 'Despesa', value: 'despesa' },
                          { label: 'Receita', value: 'receita' },
                        ]} value={t.tipo} onChange={(v) => handleTipoChange(i, v)}
                        color={t.tipo === 'receita' ? 'teal' : 'red'} />
                      </Table.Td>
                      <Table.Td>
                        <Select size="xs" data={categorias} value={t.categoria}
                          onChange={(v) => handleCategoriaChange(i, v || 'Outros')} w={140} />
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} c={t.tipo === 'receita' ? 'teal' : 'red'}>
                          {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(t.valor)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="Remover">
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleRemove(i)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {/* Ações */}
            <Group justify="space-between" mt="lg">
              <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={handleReset}>
                Voltar
              </Button>
              <Button
                rightSection={<IconArrowRight size={16} />}
                onClick={handleConfirmar}
                disabled={selecionadas.length === 0}
                style={{ background: selecionadas.length > 0 ? 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' : undefined }}
              >
                Importar {selecionadas.length} transações
              </Button>
            </Group>
          </Box>
        )}

        {/* ETAPA 2 - Concluído */}
        {active === 2 && importResult && (
          <Stack align="center" gap="lg" py="xl">
            <ThemeIcon size={80} radius="xl" color="teal" variant="light"
              style={{ background: 'linear-gradient(135deg, rgba(18,184,134,0.2), rgba(18,184,134,0.05))' }}>
              <IconCheck size={40} />
            </ThemeIcon>
            <div style={{ textAlign: 'center' }}>
              <Text size="xl" fw={700} mb={4}>Importação Concluída! 🎉</Text>
              <Text c="dimmed" size="md">
                {importResult.importadas} transações foram importadas com sucesso.
              </Text>
            </div>
            <Group>
              <Button variant="light" color="teal" onClick={handleReset} leftSection={<IconFileImport size={16} />}>
                Importar outro extrato
              </Button>
              <Button
                component="a" href="/transacoes"
                style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}
              >
                Ver Transações
              </Button>
            </Group>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
