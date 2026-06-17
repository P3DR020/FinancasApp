import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  TextInput,
  Text,
  Group,
  Box,
  Stack,
  Badge,
  Kbd,
  UnstyledButton,
  Loader,
  Center,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { useDebouncedValue, useHotkeys } from '@mantine/hooks';
import {
  IconSearch,
  IconArrowsExchange,
  IconTargetArrow,
  IconChartLine,
  IconRepeat,
  IconCreditCard,
  IconReceipt2,
  IconBuildingBank,
} from '@tabler/icons-react';
import api from '../lib/api';

interface SearchResult {
  id: string;
  tipo: 'transacao' | 'meta' | 'investimento' | 'fixo' | 'cartao' | 'parcelamento' | 'conta';
  titulo: string;
  subtitulo: string;
  valor?: number;
  rota: string;
}

const tipoConfig: Record<string, { label: string; color: string; icon: typeof IconSearch }> = {
  transacao: { label: 'Transação', color: 'blue', icon: IconArrowsExchange },
  meta: { label: 'Meta', color: 'teal', icon: IconTargetArrow },
  investimento: { label: 'Investimento', color: 'violet', icon: IconChartLine },
  fixo: { label: 'Fixo', color: 'orange', icon: IconRepeat },
  cartao: { label: 'Cartão', color: 'pink', icon: IconCreditCard },
  parcelamento: { label: 'Parcelamento', color: 'yellow', icon: IconReceipt2 },
  conta: { label: 'Conta', color: 'cyan', icon: IconBuildingBank },
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface GlobalSearchProps {
  opened: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ opened, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Buscar resultados
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get('/api/busca', { params: { q: debouncedQuery } })
      .then((res) => {
        if (!cancelled) {
          setResults(res.data);
          setActiveIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Reset ao abrir
  useEffect(() => {
    if (opened) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      // Focus no input quando abrir
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [opened]);

  // Navegação com teclado
  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.rota);
    },
    [navigate, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  };

  // Scroll automático para o item ativo
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector(`[data-search-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Agrupar resultados por tipo
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.tipo]) acc[item.tipo] = [];
    acc[item.tipo].push(item);
    return acc;
  }, {});

  // Flatten para navegação por index
  let flatIndex = 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="lg"
      padding={0}
      radius="lg"
      overlayProps={{
        backgroundOpacity: 0.4,
        blur: 8,
      }}
      transitionProps={{ transition: 'pop', duration: 200 }}
      styles={{
        content: {
          overflow: 'hidden',
        },
        body: {
          padding: 0,
        },
      }}
    >
      {/* Input de busca */}
      <Box
        p="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <TextInput
          ref={inputRef}
          id="global-search-input"
          placeholder="Buscar transações, metas, investimentos..."
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          leftSection={
            loading ? (
              <Loader size={18} color="teal" />
            ) : (
              <IconSearch size={18} style={{ opacity: 0.5 }} />
            )
          }
          rightSection={
            <Kbd size="xs" style={{ opacity: 0.5 }}>
              ESC
            </Kbd>
          }
          size="lg"
          variant="unstyled"
          styles={{
            input: {
              fontSize: 16,
              border: 'none',
            },
          }}
        />
      </Box>

      {/* Resultados */}
      <ScrollArea.Autosize mah={420} ref={resultsRef}>
        <Box p="xs">
          {/* Estado inicial - dicas */}
          {!query && (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <IconSearch size={40} style={{ opacity: 0.15 }} />
                <Text size="sm" c="dimmed">
                  Digite para buscar em todo o sistema
                </Text>
                <Group gap="xs" mt="xs">
                  <Badge variant="light" color="gray" size="sm">
                    descrição
                  </Badge>
                  <Badge variant="light" color="gray" size="sm">
                    categoria
                  </Badge>
                  <Badge variant="light" color="gray" size="sm">
                    tag
                  </Badge>
                  <Badge variant="light" color="gray" size="sm">
                    valor
                  </Badge>
                </Group>
              </Stack>
            </Center>
          )}

          {/* Sem resultados */}
          {query.length >= 2 && !loading && results.length === 0 && (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Text size="sm" c="dimmed">
                  Nenhum resultado para{' '}
                  <Text span fw={600}>
                    "{query}"
                  </Text>
                </Text>
                <Text size="xs" c="dimmed">
                  Tente outros termos de busca
                </Text>
              </Stack>
            </Center>
          )}

          {/* Query muito curta */}
          {query.length === 1 && (
            <Center py="lg">
              <Text size="sm" c="dimmed">
                Digite pelo menos 2 caracteres...
              </Text>
            </Center>
          )}

          {/* Resultados agrupados */}
          {Object.entries(grouped).map(([tipo, items], groupIdx) => {
            const config = tipoConfig[tipo] || {
              label: tipo,
              color: 'gray',
              icon: IconSearch,
            };

            return (
              <Box key={tipo}>
                {groupIdx > 0 && <Divider my={4} />}
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="sm" py={6}>
                  {config.label}s ({items.length})
                </Text>
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  const isActive = currentIndex === activeIndex;
                  const Icon = config.icon;

                  return (
                    <UnstyledButton
                      key={item.id}
                      data-search-index={currentIndex}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      w="100%"
                      px="sm"
                      py={8}
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        backgroundColor: isActive
                          ? 'var(--mantine-color-teal-light)'
                          : 'transparent',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Box
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: `var(--mantine-color-${config.color}-light)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={18} color={`var(--mantine-color-${config.color}-6)`} />
                        </Box>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate="end">
                            {item.titulo}
                          </Text>
                          <Text size="xs" c="dimmed" truncate="end">
                            {item.subtitulo}
                          </Text>
                        </Box>
                        {item.valor !== undefined && (
                          <Text
                            size="sm"
                            fw={600}
                            c={
                              item.tipo === 'transacao' && item.subtitulo.includes('Receita')
                                ? 'teal'
                                : undefined
                            }
                            style={{ flexShrink: 0 }}
                          >
                            {formatCurrency(item.valor)}
                          </Text>
                        )}
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </ScrollArea.Autosize>

      {/* Footer com atalhos */}
      {results.length > 0 && (
        <Box
          px="md"
          py="xs"
          style={{
            borderTop: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Group gap="lg">
            <Group gap={4}>
              <Kbd size="xs">↑</Kbd>
              <Kbd size="xs">↓</Kbd>
              <Text size="xs" c="dimmed">
                navegar
              </Text>
            </Group>
            <Group gap={4}>
              <Kbd size="xs">↵</Kbd>
              <Text size="xs" c="dimmed">
                abrir
              </Text>
            </Group>
            <Group gap={4}>
              <Kbd size="xs">esc</Kbd>
              <Text size="xs" c="dimmed">
                fechar
              </Text>
            </Group>
          </Group>
        </Box>
      )}
    </Modal>
  );
}

// Hook para abrir a busca com Ctrl+K
export function useGlobalSearch() {
  const [opened, setOpened] = useState(false);

  useHotkeys([['mod+k', () => setOpened((o) => !o)]]);

  return {
    opened,
    open: () => setOpened(true),
    close: () => setOpened(false),
    toggle: () => setOpened((o) => !o),
  };
}
