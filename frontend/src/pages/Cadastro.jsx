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
    last_name: '',
    phone_number: '',
    job_title: '',
    role: 'gerente',
    appointment_date: '',
    appointment_validity: '',
    password: '',
    password2: '',

  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // limpa erro local do campo ao digitar
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const validateClient = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'E-mail é obrigatório.';
    if (!formData.password) e.password = 'Senha é obrigatória.';
    if (formData.password && formData.password.length < 8) e.password = 'A senha deve ter pelo menos 8 caracteres.';
    if (formData.password2 !== formData.password) e.password2 = 'As senhas não coincidem.';
    if (!formData.role) e.role = 'Selecione o tipo de usuário.';

    if (formData.role === 'dpo') {
      if (!formData.phone_number.trim()) e.phone_number = 'Telefone é obrigatório para DPO.';
      if (!formData.appointment_date) e.appointment_date = 'Data de nomeação é obrigatória para DPO.';
      if (!formData.appointment_validity) e.appointment_validity = 'Validade da nomeação é obrigatória para DPO.';
    }
    return e;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (submitting) return;

    setMessage('');
    setVariant('');
    setErrors({});

    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setErrors(clientErrs);
      setVariant('danger');
      setMessage('Corrija os campos destacados.');
      return;
    }
  
  // Objeto base para todos os usuários
  let dataToSend = {
    email: formData.email.trim().toLowerCase(),
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim(),
    job_title: formData.job_title.trim(),
    role: formData.role,
    password: formData.password,
  };
  
  // Adiciona campos condicionais apenas se a role for DPO
  if (formData.role === 'dpo') {
    dataToSend = {
      ...dataToSend,
      phone_number: formData.phone_number.trim(),
      appointment_date: formData.appointment_date,
      appointment_validity: formData.appointment_validity,
    };
  } else {
      // opcionais como null (se preferir)
      if (formData.phone_number) dataToSend.phone_number = formData.phone_number.trim();
  }

  setSubmitting(true);

  try {
    // Envia o novo objeto de dados para o endpoint de criação de usuário
    const response = await AxiosInstance.post('users/', dataToSend);
      if (response.status === 201) {
        setVariant('success');
        setMessage('Usuário cadastrado com sucesso!');
        
        // Limpa o formulário após o sucesso
        setFormData({
          email: '',
          // username: '',
          first_name: '',
          phone_number: '',
          job_title: '',
          role: 'gerente',
          appointment_date: '',
          appointment_validity: '',
          password: '',
          password2: '',
        });    

        // Opcional: redirecionar após um tempo
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      const st = error?.response?.status;
      const data = error?.response?.data;
      console.error('Erro no cadastro:', data || error.message);
      // Verifica se o erro é de validação do campo 'role'
      if (st === 400 && data && typeof data === 'object') {
        // normaliza erros do DRF em strings
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(normalized);
        setVariant('danger');
        setMessage('Corrija os campos destacados.');
      } else if (st === 403) {
        setVariant('danger');
        setMessage('Você não tem permissão para cadastrar usuários.');
      } else {
        setVariant('danger');
        setMessage('Erro no cadastro. Verifique os dados e tente novamente.');
      }
    } finally {
      setSubmitting(false);
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
              <Col md={6}>
                <Form.Label>E-mail</Form.Label>
                <Form.Control 
                  type="email" 
                  name="email" 
                  placeholder="Digite o e-mail" 
                  value={formData.email} 
                  onChange={handleChange}
                  isInvalid={!!errors.email} 
                  autoComplete='email' 
                  required 
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Col>
            
              <Col md={3}>
                <Form.Label>Nome</Form.Label>
                <Form.Control 
                  type="text" 
                  name="first_name" 
                  placeholder="Digite o nome " 
                  value={formData.first_name} 
                  onChange={handleChange}
                  autoComplete="given-name"
                />
              </Col>

              <Col md={3}>
                <Form.Label>Sobrenome</Form.Label>
                <Form.Control
                  type="text"
                  name="last_name"
                  placeholder="Digite o sobrenome"
                  value={formData.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
              </Col>             
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Cargo</Form.Label>
                <Form.Control 
                  type="text"
                  name="job_title" 
                  placeholder="Digite o cargo" 
                  value={formData.job_title} 
                  onChange={handleChange}
                />
              </Col>

              <Col md={6}>
                <Form.Label>Tipo Usuário</Form.Label>
                <Form.Select 
                  name="role" 
                  required value={formData.role} 
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  <option value="admin">Administrador</option>
                  <option value="dpo">DPO</option>
                  <option value="gerente">Gerente</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.role}</Form.Control.Feedback>
              </Col>
            </Row>
            
            {/* Renderização condicional dos campos de data */}
            {formData.role === 'dpo' && (
              <>
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Telefone</Form.Label>
                    <Form.Control 
                      type="tel" 
                      name="phone_number" 
                      placeholder="(xx) xxxxx-xxxx" 
                      value={formData.phone_number} 
                      onChange={handleChange}
                      isInvalid={!!errors.phone_number}
                      autoComplete="tel"
                  />
                  <Form.Control.Feedback type="invalid">{errors.phone_number}</Form.Control.Feedback>
                  </Col>

                  <Col md={4}>
                    <Form.Label>Data da Nomeação</Form.Label>
                    <Form.Control 
                      type="date" 
                      name="appointment_date" 
                      value={formData.appointment_date} 
                      onChange={handleChange}
                      isInvalid={!!errors.appointment_date}
                    />
                    <Form.Control.Feedback type="invalid">{errors.appointment_date}</Form.Control.Feedback>
                  </Col>

                  <Col md={4}>
                    <Form.Label>Validade da Nomeação</Form.Label>
                    <Form.Control 
                      type="date" 
                      name="appointment_validity" 
                      value={formData.appointment_validity} 
                      onChange={handleChange}
                      isInvalid={!!errors.appointment_validity}
                    />
                    <Form.Control.Feedback type="invalid">{errors.appointment_validity}</Form.Control.Feedback>
                  </Col>
                </Row>
              </>  
            )}

            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>Senha</Form.Label>
                <Form.Control 
                  type="password" 
                  name="password" 
                  placeholder="Digite a senha" 
                  value={formData.password} 
                  onChange={handleChange}
                  isInvalid={!!errors.password}
                  autoComplete="new-password"
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
              </Col>

              <Col md={4}>
                <Form.Label>Confirmar Senha</Form.Label>
                <Form.Control
                  type="password"
                  name="password2"
                  placeholder="Repita a senha"
                  value={formData.password2}
                  onChange={handleChange}
                  isInvalid={!!errors.password2}
                  autoComplete="new-password"
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.password2}</Form.Control.Feedback>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-4">
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </Form>
        </Container>
      </div>
    </div>
  );
}

export default Cadastro;