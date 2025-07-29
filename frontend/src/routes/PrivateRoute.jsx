import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');

  // Se não há usuário logado, redireciona para login
  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  return children;
}

export default PrivateRoute;
