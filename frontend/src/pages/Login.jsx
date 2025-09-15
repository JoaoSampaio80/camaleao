import React, { useEffect, useState } from 'react';
import AxiosInstance from '../components/Axios';
import { Card, Form, Button, Alert, Collapse, InputGroup } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../routes';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  // --- estados para "esqueci a senha" ---
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetVariant, setResetVariant] = useState('success');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
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
      console.error(
        'Falha no login:',
        error.response ? error.response.data : error.message
      );
      // Exibe uma mensagem de erro mais amigável
      setError(
        st === 400 || st === 401
          ? 'Credenciais inválidas. Por favor, verifique seu email e senha.'
          : 'Tente novamente'
      );
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetMsg('');
    setResetVariant('success');

    const eMail = (resetEmail || '').trim().toLowerCase();
    if (!eMail) {
      setResetMsg('Informe um e-mail.');
      setResetVariant('danger');
      return;
    }

    setResetSubmitting(true);
    try {
      // Sempre retorna 200 (não revela se o e-mail existe)
      await AxiosInstance.post('auth/password-reset/', { email: eMail });
      setResetMsg('Se o e-mail existir, enviaremos instruções de redefinição.');
      setResetVariant('success');
    } catch (err) {
      console.error('Falha no reset:', err?.response?.data || err?.message);
      // Mesmo em erro, não expomos nada sensível
      setResetMsg('Se o e-mail existir, enviaremos instruções de redefinição.');
      setResetVariant('success');
    } finally {
      setResetSubmitting(false);
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
          src="/logoCamaleao.png"
          alt="Logo"
          style={{ width: '450px', marginBottom: '5px', marginTop: '-30px' }}
        />
        <h5 style={{ fontWeight: '600', marginBottom: '5px', marginTop: '-60px' }}>
          Bem-vindo (a)!
        </h5>
        <p style={{ maxWidth: '450px', fontSize: '1rem', fontWeight: '600' }}>
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
        <Card
          style={{ width: '100%', maxWidth: '400px' }}
          className="p-4 shadow border-0 rounded-4 bg-white text-dark"
        >
          <Card.Body>
            <h3 className="mb-4 text-center fw-bold">Login</h3>
            {/* Adicionado um alerta para exibir a mensagem de erro */}
            {error && (
              <div className="text-center mb-3">
                <Alert variant="danger">{error}</Alert>
              </div>
            )}
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
            {/* Link / Toggle Esqueci a senha */}
            <div className="mt-3 text-center">
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => {
                  setResetOpen((v) => !v);
                  setResetMsg('');
                }}
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Área recolhível para solicitar o reset */}
            <Collapse in={resetOpen}>
              <div>
                <hr className="my-3" />
                <h6 className="mb-2 text-center">Recuperar senha</h6>
                {resetMsg && (
                  <Alert variant={resetVariant} className="py-2">
                    {resetMsg}
                  </Alert>
                )}
                <Form onSubmit={handleResetSubmit}>
                  <InputGroup className="mb-2">
                    <Form.Control
                      type="email"
                      placeholder="Informe seu e-mail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                    />
                    <Button
                      type="submit"
                      variant="outline-primary"
                      disabled={resetSubmitting}
                    >
                      {resetSubmitting ? 'Enviando...' : 'Enviar link'}
                    </Button>
                  </InputGroup>
                  <div className="text-end">
                    {/* opcional: link direto para a tela de redefinição, caso o usuário já tenha um link */}
                    <small className="text-muted">
                      Já tem um link?{' '}
                      <Link to={ROUTES.RESET_PASSWORD}>Abrir tela de redefinição</Link>
                    </small>
                  </div>
                </Form>
              </div>
            </Collapse>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Login;
