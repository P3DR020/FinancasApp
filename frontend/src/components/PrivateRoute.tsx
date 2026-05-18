import { Navigate } from 'react-router-dom';
import { LoadingOverlay, Box } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box pos="relative" mih="100vh">
        <LoadingOverlay
          visible
          zIndex={1000}
          overlayProps={{ blur: 2 }}
          loaderProps={{ color: 'teal', type: 'bars' }}
        />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
