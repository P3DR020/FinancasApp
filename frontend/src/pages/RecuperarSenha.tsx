import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TextInput,
  Button,
  Paper,
  Title,
  Text,
  Anchor,
  Stack,
  Center,
  Box,
  Alert,
} from '@mantine/core';
import { IconMail, IconWallet, IconCheck } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    setSent(true);
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
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            background: 'var(--mantine-color-default)',
          }}
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
              Recupere o acesso à sua conta
            </Text>
          </Stack>

          {sent ? (
            <Stack gap="md">
              <Alert
                icon={<IconCheck size={18} />}
                color="teal"
                title="Link enviado!"
                radius="md"
              >
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá
                um link para redefinir sua senha. Verifique sua caixa de entrada e spam.
              </Alert>

              <Anchor component={Link} to="/login" size="sm" c="teal" ta="center">
                ← Voltar para o login
              </Anchor>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  id="recuperar-email"
                  label="E-mail"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  leftSection={<IconMail size={16} />}
                  required
                  size="md"
                />

                <Button
                  id="recuperar-submit"
                  type="submit"
                  fullWidth
                  loading={loading}
                  size="md"
                  style={{
                    background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
                  }}
                >
                  Enviar link de recuperação
                </Button>

                <Text c="dimmed" size="sm" ta="center">
                  Lembrou a senha?{' '}
                  <Anchor component={Link} to="/login" fw={600} c="teal">
                    Entrar
                  </Anchor>
                </Text>
              </Stack>
            </form>
          )}
        </Paper>
      </Center>
    </Box>
  );
}
