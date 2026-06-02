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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconUser, IconWallet } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      nome: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      nome: (v) => (v.trim().length < 2 ? 'Nome deve ter pelo menos 2 caracteres' : null),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'E-mail inválido'),
      password: (v) => (v.length < 6 ? 'Senha deve ter pelo menos 6 caracteres' : null),
      confirmPassword: (v, values) =>
        v !== values.password ? 'As senhas não coincidem' : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          nome: values.nome,
        },
      },
    });

    if (error) {
      notifications.show({
        title: 'Erro ao criar conta',
        message: error.message,
        color: 'red',
      });
    } else {
      notifications.show({
        title: 'Conta criada com sucesso!',
        message: 'Bem-vindo ao FinançasApp. Redirecionando...',
        color: 'teal',
      });
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
              Crie sua conta e comece a controlar suas finanças
            </Text>
          </Stack>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                id="cadastro-nome"
                label="Nome completo"
                placeholder="Seu nome"
                leftSection={<IconUser size={16} />}
                size="md"
                {...form.getInputProps('nome')}
              />

              <TextInput
                id="cadastro-email"
                label="E-mail"
                placeholder="seu@email.com"
                leftSection={<IconMail size={16} />}
                size="md"
                {...form.getInputProps('email')}
              />

              <PasswordInput
                id="cadastro-password"
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                leftSection={<IconLock size={16} />}
                size="md"
                {...form.getInputProps('password')}
              />

              <PasswordInput
                id="cadastro-confirm-password"
                label="Confirmar senha"
                placeholder="Repita sua senha"
                leftSection={<IconLock size={16} />}
                size="md"
                {...form.getInputProps('confirmPassword')}
              />

              <Button
                id="cadastro-submit"
                type="submit"
                fullWidth
                loading={loading}
                size="md"
                mt="xs"
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))',
                }}
              >
                Criar conta
              </Button>

              <Text c="dimmed" size="sm" ta="center">
                Já tem uma conta?{' '}
                <Anchor component={Link} to="/login" fw={600} c="teal">
                  Entrar
                </Anchor>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
