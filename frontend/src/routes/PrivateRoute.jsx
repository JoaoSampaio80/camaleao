// PrivateRoute.jsx
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../routes';

function PrivateRoute() {
  const { user, authTokens, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando...</div>; // ou um componente de loading
  }

  if (user || authTokens) {
    return <Outlet />; // ou render children
  }

  return <Navigate to="/login" replace />;
};

export default PrivateRoute;