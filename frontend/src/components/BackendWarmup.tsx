import { useEffect, useState } from 'react';
import { Box, Text, Stack, Progress, Transition } from '@mantine/core';
import { IconWallet, IconServer } from '@tabler/icons-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Tempo máximo de espera antes de liberar o app mesmo sem resposta (45s)
const MAX_WAIT_MS = 45_000;
// Intervalo de retry do ping (3s)
const RETRY_INTERVAL_MS = 3_000;

interface BackendWarmupProps {
  children: React.ReactNode;
}

export default function BackendWarmup({ children }: BackendWarmupProps) {
  const [backendReady, setBackendReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Conectando ao servidor...');

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    // Incrementa a barra de progresso gradualmente
    const progressInterval = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      // Progresso vai até 90% durante o loading (os 10% finais são na conexão)
      const pct = Math.min(90, (elapsed / MAX_WAIT_MS) * 100);
      setProgress(pct);

      // Atualiza texto de status baseado no tempo
      if (elapsed > 20_000) {
        setStatusText('Quase lá, o servidor está inicializando...');
      } else if (elapsed > 10_000) {
        setStatusText('Aguarde, o servidor está acordando...');
      } else if (elapsed > 5_000) {
        setStatusText('Preparando o servidor...');
      }
    }, 200);

    // Tenta pingar o backend repetidamente
    async function pingBackend() {
      while (!cancelled) {
        try {
          const res = await fetch(`${API_URL}/api/health`, {
            signal: AbortSignal.timeout(5_000),
          });
          if (res.ok) {
            if (!cancelled) {
              setProgress(100);
              setStatusText('Servidor conectado!');
              setBackendReady(true);
              // Delay curto para mostrar 100% antes de esconder
              setTimeout(() => {
                if (!cancelled) setShowSplash(false);
              }, 600);
            }
            return;
          }
        } catch {
          // Servidor ainda não respondeu, tenta novamente
        }

        // Timeout: libera o app mesmo sem resposta
        if (Date.now() - startTime >= MAX_WAIT_MS) {
          if (!cancelled) {
            setProgress(100);
            setBackendReady(true);
            setTimeout(() => {
              if (!cancelled) setShowSplash(false);
            }, 300);
          }
          return;
        }

        // Espera antes de tentar novamente
        await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      }
    }

    pingBackend();

    return () => {
      cancelled = true;
      clearInterval(progressInterval);
    };
  }, []);

  // Se o backend já respondeu rapidamente (< 1s), nem mostra splash
  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Splash screen overlay */}
      <Transition mounted={showSplash && !backendReady} transition="fade" duration={400}>
        {(styles) => (
          <Box
            style={{
              ...styles,
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(145deg, #0a0f1a 0%, #0d1926 40%, #0a1a1f 100%)',
            }}
          >
            <Stack align="center" gap="xl" style={{ maxWidth: 380 }}>
              {/* Logo animado */}
              <Box
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #12b886 0%, #0ca678 50%, #099268 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(18, 184, 134, 0.3), 0 0 80px rgba(18, 184, 134, 0.1)',
                  animation: 'warmup-pulse 2s ease-in-out infinite',
                }}
              >
                <IconWallet size={36} color="white" />
              </Box>

              {/* Título */}
              <Text
                size="xl"
                fw={700}
                style={{
                  color: '#fff',
                  letterSpacing: '-0.5px',
                }}
              >
                FinançasApp
              </Text>

              {/* Barra de progresso */}
              <Box w="100%">
                <Progress
                  value={progress}
                  size="sm"
                  radius="xl"
                  color="teal"
                  animated
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                />
              </Box>

              {/* Status */}
              <Stack gap={4} align="center">
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <IconServer
                    size={16}
                    style={{
                      color: backendReady ? '#12b886' : 'rgba(255,255,255,0.5)',
                      animation: backendReady ? 'none' : 'warmup-spin 1.5s linear infinite',
                    }}
                  />
                  <Text
                    size="sm"
                    style={{
                      color: backendReady ? '#12b886' : 'rgba(255, 255, 255, 0.6)',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {statusText}
                  </Text>
                </Box>
                <Text
                  size="xs"
                  style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                >
                  Servidor gratuito pode levar alguns segundos
                </Text>
              </Stack>
            </Stack>
          </Box>
        )}
      </Transition>

      {/* Renderiza os children por trás quando pronto */}
      {backendReady && <>{children}</>}

      {/* Estilos de animação inline */}
      <style>{`
        @keyframes warmup-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes warmup-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
