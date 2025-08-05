import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Relatorio from './pages/Relatorios';
import Checklist from './pages/Checklist';
import Encarregado from './pages/Encarregado';
import Monitoramento from './pages/Monitoramento';
import Documentos from './pages/Documentos';
import Inventario from './pages/InventarioDados';
import MatrizRisco from './pages/MatrizRisco';
import Notificacoes from './pages/Notificacao';

import PrivateRoute from './routes/PrivateRoute';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/login" element={<Login />} />

        {/* Páginas privadas */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <PrivateRoute>
              <Relatorio />
            </PrivateRoute>
          }
        />
        <Route
          path="/checklist"
          element={
            <PrivateRoute>
              <Checklist />
            </PrivateRoute>
          }
        />
        <Route
          path="/encarregado"
          element={
            <PrivateRoute>
              <Encarregado />
            </PrivateRoute>
          }
        />
        <Route
          path="/monitoramento"
          element={
            <PrivateRoute>
              <Monitoramento />
            </PrivateRoute>
          }
        />
        <Route
          path="/documentos"
          element={
            <PrivateRoute>
              <Documentos />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventariodados"
          element={
            <PrivateRoute>
              <Inventario />
            </PrivateRoute>
          }
        />
        <Route
          path="/matrizrisco"
          element={
            <PrivateRoute>
              <MatrizRisco />
            </PrivateRoute>
          }
        />
        <Route
          path="/notificacao"
          element={
            <PrivateRoute>
              <Notificacoes />
            </PrivateRoute>
          }
        />

        {/* Rota fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;


