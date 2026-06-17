import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import BackendWarmup from './components/BackendWarmup';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import RecuperarSenha from './pages/RecuperarSenha';
import Dashboard from './pages/Dashboard';
import Transacoes from './pages/Transacoes';
import Metas from './pages/Metas';
import Investimentos from './pages/Investimentos';
import Fixos from './pages/Fixos';
import Cartoes from './pages/Cartoes';
import Orcamento from './pages/Orcamento';
import Parcelamentos from './pages/Parcelamentos';
import Perfil from './pages/Perfil';
import Contas from './pages/Contas';
import ImportarExtrato from './pages/ImportarExtrato';

export default function App() {
  return (
    <BackendWarmup>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />

          {/* Protected routes */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transacoes" element={<Transacoes />} />
            <Route path="/metas" element={<Metas />} />
            <Route path="/investimentos" element={<Investimentos />} />
            <Route path="/fixos" element={<Fixos />} />
            <Route path="/cartoes" element={<Cartoes />} />
            <Route path="/orcamento" element={<Orcamento />} />
            <Route path="/parcelamentos" element={<Parcelamentos />} />
            <Route path="/contas" element={<Contas />} />
            <Route path="/importar" element={<ImportarExtrato />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BackendWarmup>
  );
}

