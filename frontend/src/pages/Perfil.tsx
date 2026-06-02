import { useState } from 'react';
import {
  Box, Button, Group, Paper, Text, Title, TextInput, PasswordInput,
  Stack, Avatar, LoadingOverlay, ThemeIcon, Divider, SimpleGrid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUser, IconMail, IconLock, IconCheck, IconCalendar, IconShield,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Perfil() {
  const { user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const nome = user?.user_metadata?.nome || '';
  const email = user?.email || '';
  const criadoEm = user?.created_at ? dayjs(user.created_at).format('DD/MM/YYYY') : '—';
  const initial = (nome || email).charAt(0).toUpperCase();

  const profileForm = useForm({
    initialValues: { nome },
    validate: {
      nome: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
    },
  });

  const passwordForm = useForm({
    initialValues: { senha: '', confirmar: '' },
    validate: {
      senha: (v) => (v.length < 6 ? 'Mínimo 6 caracteres' : null),
      confirmar: (v, values) => (v !== values.senha ? 'Senhas não conferem' : null),
    },
  });

  const handleUpdateProfile = async (values: typeof profileForm.values) => {
    setLoadingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { nome: values.nome },
    });

    if (error) {
      notifications.show({ title: 'Erro', message: error.message, color: 'red' });
    } else {
      notifications.show({ title: 'Perfil atualizado!', message: 'Nome alterado com sucesso.', color: 'teal' });
    }
    setLoadingProfile(false);
  };

  const handleUpdatePassword = async (values: typeof passwordForm.values) => {
    setLoadingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: values.senha,
    });

    if (error) {
      notifications.show({ title: 'Erro', message: error.message, color: 'red' });
    } else {
      notifications.show({ title: 'Senha alterada!', message: 'Sua senha foi atualizada com sucesso.', color: 'teal' });
      passwordForm.reset();
    }
    setLoadingPassword(false);
  };

  return (
    <Box pos="relative" mih="60vh">
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={700}>Perfil & Configurações</Title>
          <Text c="dimmed" size="sm">Gerencie sua conta e preferências</Text>
        </div>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        {/* Profile Card */}
        <Paper withBorder p="xl" radius="md" className="animate-fade-in-up"
          style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack align="center" mb="lg">
            <Avatar size={80} radius="xl"
              style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-teal-7))', fontSize: 32 }}>
              {initial}
            </Avatar>
            <div style={{ textAlign: 'center' }}>
              <Text size="lg" fw={700}>{nome || email.split('@')[0]}</Text>
              <Text size="sm" c="dimmed">{email}</Text>
            </div>
          </Stack>

          <Divider mb="md" color="dark.5" />

          <Stack gap="sm">
            <Group gap="xs">
              <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
                <IconMail size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Email:</Text>
              <Text size="sm" fw={500}>{email}</Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
                <IconCalendar size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Conta criada em:</Text>
              <Text size="sm" fw={500}>{criadoEm}</Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon variant="light" color="green" size="sm" radius="xl">
                <IconShield size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Autenticação:</Text>
              <Text size="sm" fw={500}>{user?.app_metadata?.provider || 'Email'}</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Edit Name */}
        <Paper withBorder p="xl" radius="md" pos="relative" className="animate-fade-in-up"
          style={{ animationDelay: '0.08s', borderColor: 'var(--mantine-color-default-border)' }}>
          <LoadingOverlay visible={loadingProfile} overlayProps={{ blur: 2 }} loaderProps={{ color: 'teal', type: 'bars' }} />

          <Group gap="xs" mb="lg">
            <ThemeIcon variant="light" color="blue" size="md" radius="xl">
              <IconUser size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">Editar Perfil</Text>
          </Group>

          <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
            <Stack gap="md">
              <TextInput
                label="Nome"
                placeholder="Seu nome completo"
                size="md"
                leftSection={<IconUser size={16} />}
                {...profileForm.getInputProps('nome')}
              />

              <TextInput
                label="Email"
                value={email}
                disabled
                size="md"
                leftSection={<IconMail size={16} />}
                description="O email não pode ser alterado"
              />

              <Button type="submit" mt="sm"
                leftSection={<IconCheck size={16} />}
                style={{ background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-teal-8))' }}>
                Salvar alterações
              </Button>
            </Stack>
          </form>
        </Paper>
      </SimpleGrid>

      {/* Change Password */}
      <Paper withBorder p="xl" radius="md" pos="relative" className="animate-fade-in-up"
        style={{ animationDelay: '0.16s', borderColor: 'var(--mantine-color-default-border)' }}>
        <LoadingOverlay visible={loadingPassword} overlayProps={{ blur: 2 }} loaderProps={{ color: 'teal', type: 'bars' }} />

        <Group gap="xs" mb="lg">
          <ThemeIcon variant="light" color="yellow" size="md" radius="xl">
            <IconLock size={18} />
          </ThemeIcon>
          <Text fw={600} size="lg">Alterar Senha</Text>
        </Group>

        <form onSubmit={passwordForm.onSubmit(handleUpdatePassword)}>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <PasswordInput
              label="Nova senha"
              placeholder="Mínimo 6 caracteres"
              size="md"
              leftSection={<IconLock size={16} />}
              {...passwordForm.getInputProps('senha')}
            />
            <PasswordInput
              label="Confirmar nova senha"
              placeholder="Repita a senha"
              size="md"
              leftSection={<IconLock size={16} />}
              {...passwordForm.getInputProps('confirmar')}
            />
          </SimpleGrid>

          <Button type="submit" mt="md"
            leftSection={<IconLock size={16} />}
            style={{ background: 'linear-gradient(135deg, var(--mantine-color-yellow-6), var(--mantine-color-orange-6))' }}>
            Alterar senha
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
