// PrivateRoute.jsx
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
  // Agora está procurando por 'access_token'
  const accessToken = localStorage.getItem('access_token');

  // Se o token de acesso não existir, redireciona para a página de login
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Se o token existir, renderiza os componentes filhos (a rota protegida)
  return children;
}

export default PrivateRoute;