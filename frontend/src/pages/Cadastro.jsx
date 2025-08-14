import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';

function Cadastro() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    // username: '',
    first_name: '',
    phone_number: '',
    job_title: '',
    role: '',
    appointment_date: '',
    appointment_validity: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Objeto base para todos os usuários
  let dataToSend = {
    email: formData.email,
    first_name: formData.first_name,
    job_title: formData.job_title,
    role: formData.role,
    password: formData.password,
  };
  
  // Adiciona campos condicionais apenas se a role for DPO
  if (formData.role === 'dpo') {
    dataToSend = {
      ...dataToSend,
      phone_number: formData.phone_number,
      appointment_date: formData.appointment_date,
      appointment_validity: formData.appointment_validity,
    };
  }

  try {
    // Envia o novo objeto de dados para o endpoint de criação de usuário
    const response = await AxiosInstance.post('users/', dataToSend);
      if (response.status === 201) {
        setMessage('Usuário cadastrado com sucesso!');
        setVariant('success');
        // Limpa o formulário após o sucesso
        setFormData({
          email: '',
          // username: '',
          first_name: '',
          phone_number: '',
          job_title: '',
          role: '',
          appointment_date: '',
          appointment_validity: '',
          password: '',
        });    

        // Opcional: redirecionar após um tempo
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Erro no cadastro:', error.response ? error.response.data : error.message);
      // Verifica se o erro é de validação do campo 'role'
      if (error.response && error.response.data && error.response.data.role) {
        // Exibe a mensagem de erro específica do campo 'role'
        setMessage(error.response.data.role[0]);
      } else {
        // Exibe uma mensagem de erro genérica ou a mensagem de erro padrão
        setMessage('Erro no cadastro. Verifique os dados e tente novamente.');
      }
      setVariant('danger');
    }
  };
 
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#d6f3f9', // fundo azul claro da imagem
          minHeight: '100vh',
          width: '100vw',
          marginTop: '56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
      <h2 className="mb-4" style={{ color: '#071744',}}>
        Cadastro de Usuário
      </h2>
      {message && <Alert variant={variant}>{message}</Alert>}        
      <Container fluid style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            {/* <Col md={6}>
              <Form.Label>Usuário</Form.Label>
              <Form.Control type="text"name="username" placeholder="Digite nome de usuário" />
            </Col> */}
            <Col md={6}>
              <Form.Label>E-mail</Form.Label>
              <Form.Control type="email" name="email" placeholder="Digite o e-mail" value={formData.email} onChange={handleChange}/>
            </Col>
          
            <Col md={6}>
              <Form.Label>Nome</Form.Label>
              <Form.Control type="text" name="first_name" placeholder="Digite o nome " value={formData.first_name} onChange={handleChange}/>
            </Col>             
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Cargo</Form.Label>
              <Form.Control type="text"name="job_title" placeholder="Digite o cargo" value={formData.job_title} onChange={handleChange}/>
            </Col>
             <Col md={6}>
              <Form.Label>Tipo Usuário</Form.Label>
              <Form.Select name="role" required value={formData.role} onChange={handleChange}>
                <option value="">Selecione...</option>
                <option value="admin">Administrador</option>
                <option value="dpo">DPO</option>
                 <option value="gerente">Gerente</option>
              </Form.Select>
            </Col>
          </Row>
          
          {/* Renderização condicional dos campos de data */}
          {formData.role === 'dpo' && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control type="tel" name="phone_number" placeholder="(xx) xxxxx-xxxx" value={formData.phone_number} onChange={handleChange}/>
                </Col>
                <Col md={6}>
                  <Form.Label>Data da Nomeação</Form.Label>
                  <Form.Control type="date" name="appointment_date" value={formData.appointment_date} onChange={handleChange}/>
                </Col>
                <Col md={6}>
                  <Form.Label>Validade da Nomeação</Form.Label>
                  <Form.Control type="date" name="appointment_validity" value={formData.appointment_validity} onChange={handleChange}/>
                </Col>
              </Row>
            </>  
          )}

           <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Senha</Form.Label>
              <Form.Control type="password" name="password" placeholder="Digite a senha" value={formData.password} onChange={handleChange}/>
            </Col>
          </Row>

          <div className="d-flex justify-content-end mt-4">
            <Button variant="primary" type="submit">
              Salvar
            </Button>
          </div>
        </Form>
        </Container>
      </div>
    </div>
  );
}

export default Cadastro;