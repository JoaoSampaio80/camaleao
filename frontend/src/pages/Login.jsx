import React, { useEffect, useState } from 'react';
import AxiosInstance from '../components/Axios';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../routes';

const Login = () => {  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user){
    navigate(ROUTES.HOME, { replace: true });
  }
  }, [loading, user, navigate]);  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Envia os dados de email e senha para o endpoint de token da API
      const response = await AxiosInstance.post('auth/token/', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (response.status === 200) {        
        // Chame a função login do contexto para salvar os tokens e o usuário
        await login(response.data);           
      }
    } catch (error) {
      const st = error?.response?.status;
      console.error('Falha no login:', error.response ? error.response.data : error.message);
      // Exibe uma mensagem de erro mais amigável
      setError( st === 400 || st === 401? 'Credenciais inválidas. Por favor, verifique seu email e senha.': 'Tente novamente');
    }
  };  

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'row',
        background: 'linear-gradient(135deg, #003366, #005b96)',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* LADO ESQUERDO */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          padding: '40px',
        }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          style={{ width: '450px', marginBottom: '5px' }}
        />
        <h5 style={{ fontWeight: '600', marginBottom: '5px' }}>Bem-vindo (a)!</h5>
        <p style={{ maxWidth: '500px', fontSize: '1rem', fontWeight: '500' }}>
          Preencha as informações ao lado para acessar a sua conta.
        </p>
      </div>

      {/* LADO DIREITO */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
        }}
      >
        <Card style={{ width: '100%', maxWidth: '400px' }} className="p-4 shadow border-0 rounded-4 bg-white text-dark">
          <Card.Body>
            <h3 className="mb-4 text-center fw-bold">Login</h3>
            {/* Adicionado um alerta para exibir a mensagem de erro */}
            {error && <div className="text-center mb-3"><Alert variant="danger">{error}</Alert></div>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Digite seu email"
                  required
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-4" controlId="formPassword">
                <Form.Label>Senha</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Digite sua senha"
                  required
                  size="lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100" size="lg">
                Entrar
              </Button>
            </Form>
            <div className="mt-3 text-center">
              <span className="text-muted">Esqueceu a senha? </span>
              <Link to="">Recupere-a</Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Login;