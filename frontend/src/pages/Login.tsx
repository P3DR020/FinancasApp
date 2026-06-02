import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Anchor,
  Stack,
  Center,
  Box,
  Group,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconWallet } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      notifications.show({
        title: 'Erro ao entrar',
        message: error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message,
        color: 'red',
      });
    } else {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <Box className="auth-bg">
      <Center mih="100vh" p="md">
        <Paper
          shadow="xl"
          p="xl"
          w={420}
          radius="lg"
          className="animate-fade-in-up"
        >
          <Stack align="center" mb="lg">
            <Box
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-teal-7))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconWallet size={28} color="white" />
            </Box>
            <Title order={2} className="app-logo" ta="center">
              FinançasApp
            </Title>
            <Text c="dimmed" size="sm" ta="center">
              Controle suas finanças de forma inteligente
            </Text>
          </Stack>

          <form onSubmit={handleLogin}>
            <Stack gap="md">
              <TextInput
                id="login-email"
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                leftSection={<IconMail size={16} />}
                required
                size="md"
              />

              <PasswordInput
                id="login-password"
                label="Senha"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                leftSection={<IconLock size={16} />}
                required
                size="md"
              />

              <Group justify="flex-end">
                <Anchor
                  component={Link}
                  to="/recuperar-senha"
                  size="sm"
                  c="teal"
                >
                  Esqueci minha senha
                </Anchor>
              </Group>

              <Button
                id="login-submit"
                type="submit"
                fullWidth
                loading={loading}
                size="md"
                mt="xs"
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
                }}
              >
                Entrar
              </Button>

              <Text c="dimmed" size="sm" ta="center">
                Não tem uma conta?{' '}
                <Anchor component={Link} to="/cadastro" fw={600} c="teal">
                  Criar conta
                </Anchor>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
