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
        <Route path="/Login" element={<Login />} />

        {/* Páginas privadas */}
        <Route
          path="/Home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/Dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/Relatorios"
          element={
            <PrivateRoute>
              <Relatorio />
            </PrivateRoute>
          }
        />
        <Route
          path="/Checklist"
          element={
            <PrivateRoute>
              <Checklist />
            </PrivateRoute>
          }
        />
        <Route
          path="/Encarregado"
          element={
            <PrivateRoute>
              <Encarregado />
            </PrivateRoute>
          }
        />
        <Route
          path="/Monitoramento"
          element={
            <PrivateRoute>
              <Monitoramento />
            </PrivateRoute>
          }
        />
        <Route
          path="/Documentos"
          element={
            <PrivateRoute>
              <Documentos />
            </PrivateRoute>
          }
        />
        <Route
          path="/InventarioDados"
          element={
            <PrivateRoute>
              <Inventario />
            </PrivateRoute>
          }
        />
        <Route
          path="/MatrizRisco"
          element={
            <PrivateRoute>
              <MatrizRisco />
            </PrivateRoute>
          }
        />
        <Route
          path="/Notificacao"
          element={
            <PrivateRoute>
              <Notificacoes />
            </PrivateRoute>
          }
        />

        {/* Rota fallback */}
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;


