import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import DefinirSenha from './pages/DefinirSenha';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Relatorio from './pages/Relatorios';
import Checklist from './pages/Checklist';
import Encarregado from './pages/Encarregado';
import Monitoramento from './pages/Monitoramento';
import Documentos from './pages/Documentos';
import InventarioDados from './pages/InventarioDados';
import InventarioDados2 from './pages/InventarioDados2';
import InventarioDados3 from './pages/InventarioDados3';
import MatrizRisco from './pages/MatrizRisco';
import MatrizRiscoLista from './pages/MatrizRiscoLista';
import Notificacoes from './pages/Notificacao';
import Cadastro from './pages/Cadastro';
import Perfil from './pages/Perfil';
import InventarioLista from './pages/InventarioLista';
import { useAuth, AuthProvider } from './context/AuthContext';
import { InventarioProvider } from './context/InventarioContext';
import ReauthListener from './components/ReauthListener'; // <-- novo

// Objeto de tipagem de rotas para evitar erros de digitação
export const ROUTES = {
  LOGIN: '/login',
  DEFINIR_SENHA: '/definir-senha',
  RESET_PASSWORD: '/reset-password',
  HOME: '/',
  DASHBOARD: '/dashboard',
  CADASTRO: '/cadastro',
  RELATORIOS: '/relatorios',
  CHECKLIST: '/checklist',
  ENCARREGADO: '/encarregado',
  MONITORAMENTO: '/monitoramento',
  DOCUMENTOS: '/documentos',
  INVENTARIO_DADOS: '/dados',
  INVENTARIO_DADOS2: '/dados2',
  INVENTARIO_DADOS3: '/dados3',
  MATRIZ_RISCO: '/matrizrisco',
  MATRIZ_RISCO_LISTA: '/matrizriscolista',
  NOTIFICACOES: '/notificacao',
  PERFIL: '/perfil',
  INVENTARIO_LISTA: '/dados/lista',
  NOT_FOUND: '*',
};

function AppRouter() {
  const { user, loading } = useAuth();
  console.log(
    `AppRouter: Renderizando. User: ${user ? user.email : 'null'}, Loading: ${loading}, URL: ${window.location.pathname}`
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (user) {
    console.log('AppRouter: Usuário autenticado, renderizando rotas protegidas.');
    return (
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Navigate to={ROUTES.HOME} replace />} />
        <Route path={ROUTES.DEFINIR_SENHA} element={<DefinirSenha />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.RELATORIOS} element={<Relatorio />} />
        <Route path={ROUTES.CHECKLIST} element={<Checklist />} />
        <Route path={ROUTES.ENCARREGADO} element={<Encarregado />} />
        <Route path={ROUTES.MONITORAMENTO} element={<Monitoramento />} />
        <Route path={ROUTES.DOCUMENTOS} element={<Documentos />} />
        <Route path={ROUTES.MATRIZ_RISCO} element={<MatrizRisco />} />
        <Route path={ROUTES.MATRIZ_RISCO_LISTA} element={<MatrizRiscoLista />} />
        <Route path={ROUTES.NOTIFICACOES} element={<Notificacoes />} />
        {/* Rotas de Inventário encapsuladas com o provider */}
        <Route
          element={
            <InventarioProvider>
              <Outlet />
            </InventarioProvider>
          }
        >
          <Route path={ROUTES.INVENTARIO_DADOS} element={<InventarioDados />} />
          <Route path={ROUTES.INVENTARIO_DADOS2} element={<InventarioDados2 />} />
          <Route path={ROUTES.INVENTARIO_DADOS3} element={<InventarioDados3 />} />
          <Route path={ROUTES.INVENTARIO_LISTA} element={<InventarioLista />} />
        </Route>

        <Route
          path={ROUTES.CADASTRO}
          element={
            user?.role === 'admin' ? <Cadastro /> : <Navigate to={ROUTES.HOME} replace />
          }
        />
        <Route path={ROUTES.PERFIL} element={<Perfil />} />
        <Route path={ROUTES.NOT_FOUND} element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    );
  }

  // Usuário não autenticado
  console.log('AppRouter: Usuário não autenticado, renderizando rota de login.');
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.DEFINIR_SENHA} element={<DefinirSenha />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      <Route path={ROUTES.NOT_FOUND} element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Escuta 'auth:reauth' e usa navigate + setUser(null) dentro do contexto certo */}
        <ReauthListener />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;
