import React from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const fakeUser = {
      nome: 'Ana Souza',
      email: 'ana@email.com'
    };
    localStorage.setItem('user', JSON.stringify(fakeUser));
    navigate('/Home');
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
        <h5 style={{ fontWeight: '600', marginBottom: '5px' }}>Bem Vindo (a) de volta!</h5>
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
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Digite seu email"
                  required
                  size="lg"
                />
              </Form.Group>
              <Form.Group className="mb-4" controlId="formPassword">
                <Form.Label>Senha</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Digite sua senha"
                  required
                  size="lg"
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


