import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  Box,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconArrowsExchange,
  IconTargetArrow,
  IconChartLine,
  IconRepeat,
  IconCreditCard,
  IconChartPie,
  IconLogout,
  IconUser,
  IconWallet,
  IconChevronRight,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: IconLayoutDashboard, path: '/dashboard' },
  { label: 'Transações', icon: IconArrowsExchange, path: '/transacoes' },
  { label: 'Investimentos', icon: IconChartLine, path: '/investimentos' },
  { label: 'Fixos', icon: IconRepeat, path: '/fixos' },
  { label: 'Metas', icon: IconTargetArrow, path: '/metas' },
  { label: 'Cartões', icon: IconCreditCard, path: '/cartoes' },
  { label: 'Orçamento', icon: IconChartPie, path: '/orcamento' },
];

export default function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [menuOpened, setMenuOpened] = useState(false);

  const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          background: 'var(--mantine-color-dark-9)',
        },
      }}
    >
      {/* Header */}
      <AppShell.Header
        style={{
          borderBottom: '1px solid var(--mantine-color-dark-5)',
          background: 'var(--mantine-color-dark-8)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={8} style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-teal-7))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconWallet size={20} color="white" />
              </Box>
              <Text fw={700} size="lg" className="app-logo" visibleFrom="xs">
                FinançasApp
              </Text>
            </Group>
          </Group>

          <Menu
            opened={menuOpened}
            onChange={setMenuOpened}
            shadow="lg"
            width={200}
            position="bottom-end"
          >
            <Menu.Target>
              <UnstyledButton
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  padding: '4px 8px',
                  transition: 'background 0.15s ease',
                }}
              >
                <Group gap="xs">
                  <Avatar
                    radius="xl"
                    size="sm"
                    color="teal"
                    style={{
                      background: 'linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-teal-7))',
                    }}
                  >
                    {userInitial}
                  </Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={500} lh={1.2}>
                      {userName}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.2}>
                      {user?.email}
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Conta</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/perfil')}>
                Perfil
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={handleSignOut}
              >
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar
        p="md"
        style={{
          borderRight: '1px solid var(--mantine-color-dark-5)',
          background: 'var(--mantine-color-dark-8)',
        }}
      >
        <Box style={{ flex: 1 }}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm" px="sm">
            Menu
          </Text>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={20} stroke={1.5} />}
              rightSection={<IconChevronRight size={14} stroke={1.5} />}
              active={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                close();
              }}
              variant="light"
              color="teal"
              style={{ borderRadius: 'var(--mantine-radius-md)', marginBottom: 4 }}
            />
          ))}
        </Box>

        <Divider mb="sm" color="dark.5" />
        <Box px="sm" pb="xs">
          <Text size="xs" c="dimmed">
            © 2026 FinançasApp
          </Text>
        </Box>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
