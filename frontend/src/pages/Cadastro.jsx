import React, { useEffect, useState } from 'react';
import { Container, Form, Button, Row, Col, Alert, Table, Spinner, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const INITIAL = {
  email: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  role: 'gerente',
  appointment_date: '',
  appointment_validity: '',
  password: '',
  password2: '',
};

function Cadastro() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState(INITIAL);
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [selectedId, setSelectedId] = useState(null);

  const [users, setUsers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ------- Lista de usuários -------
  const fetchUsers = async () => {
    setListLoading(true);
    setMessage(''); setVariant('');
    try {
      // se o backend tiver ?q=, ótimo; se não, ele ignora
      const resp = await AxiosInstance.get('users/', { params: query ? { q: query } : {} });
      setUsers(resp.data || []);
    } catch (e) {
      setVariant('danger'); setMessage('Falha ao carregar usuários.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []); // primeira carga

  // ------- Handlers -------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value ?? '' }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const resetForm = () => {
    setFormData(INITIAL);
    setMode('create');
    setSelectedId(null);
    setErrors({});
    setMessage('');
    setVariant('');
  };

  const validateClient = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'E-mail é obrigatório.';
    if (!formData.role) e.role = 'Selecione o tipo de usuário.';

    // Senha: obrigatória só no modo create
    if (mode === 'create') {
      if (!formData.password) e.password = 'Senha é obrigatória.';
      if (formData.password && formData.password.length < 3) e.password = 'A senha deve ter pelo menos 3 caracteres.';
      if (formData.password2 !== formData.password) e.password2 = 'As senhas não coincidem.';
    } else {
      // no modo edit, se preencher, precisa confirmar e respeitar min length
      if (formData.password || formData.password2) {
        if (!formData.password) e.password = 'Informe a nova senha.';
        if (!formData.password2) e.password2 = 'Confirme a nova senha.';
        if (formData.password && formData.password.length < 3) e.password = 'A senha deve ter pelo menos 3 caracteres.';
        if (formData.password2 !== formData.password) e.password2 = 'As senhas não coincidem.';
      }
    }

    // Campos obrigatórios para DPO
    if (formData.role === 'dpo') {
      if (!formData.phone_number.trim()) e.phone_number = 'Telefone é obrigatório para DPO.';
      if (!formData.appointment_date) e.appointment_date = 'Data de nomeação é obrigatória para DPO.';
      if (!formData.appointment_validity) e.appointment_validity = 'Validade da nomeação é obrigatória para DPO.';
    }
    return e;
  };

  const buildPayload = () => {
    const data = {
      email: formData.email.trim().toLowerCase(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      role: formData.role,
    };
    if (formData.phone_number) data.phone_number = formData.phone_number.trim();

    if (formData.role === 'dpo') {
      data.appointment_date = formData.appointment_date || null;
      data.appointment_validity = formData.appointment_validity || null;
    } else {
      // se quiser limpar datas quando deixa de ser DPO:
      if (mode === 'edit') {
        data.appointment_date = null;
        data.appointment_validity = null;
      }
    }

    if (mode === 'create') {
      data.password = formData.password;
    } else if (formData.password) {
      data.password = formData.password;
    }
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setMessage(''); setVariant(''); setErrors({});
    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setErrors(clientErrs);
      setVariant('danger');
      setMessage('Corrija os campos destacados.');
      return;
    }

    const dataToSend = buildPayload();
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const response = await AxiosInstance.post('users/', dataToSend);
        if (response.status === 201) {
          setVariant('success'); setMessage('Usuário cadastrado com sucesso!');
          resetForm();
          await fetchUsers();
        }
      } else {
        const response = await AxiosInstance.patch(`users/${selectedId}/`, dataToSend);
        if (response.status === 200) {
          setVariant('success'); setMessage('Usuário atualizado com sucesso!');
          resetForm();
          await fetchUsers();
        }
      }
    } catch (error) {
      const st = error?.response?.status;
      const data = error?.response?.data;
      console.error('Erro no cadastro:', data || error.message);
      if (st === 400 && data && typeof data === 'object') {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(normalized);
        setVariant('danger'); setMessage('Corrija os campos destacados.');
      } else if (st === 403) {
        setVariant('danger'); setMessage('Você não tem permissão para executar esta ação.');
      } else {
        setVariant('danger'); setMessage('Erro ao salvar. Verifique os dados e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      const resp = await AxiosInstance.get(`users/${id}/`);
      const u = resp.data || {};
      setFormData({
        email: u.email || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        phone_number: u.phone_number || '',
        role: u.role || 'gerente',
        appointment_date: u.appointment_date || '',
        appointment_validity: u.appointment_validity || '',
        password: '',
        password2: '',
      });
      setSelectedId(id);
      setMode('edit');
      setErrors({});
      setMessage('');
      setVariant('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setVariant('danger'); setMessage('Falha ao carregar usuário para edição.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await AxiosInstance.delete(`users/${id}/`);
      if (selectedId === id) resetForm();
      await fetchUsers();
      setVariant('success'); setMessage('Usuário excluído com sucesso.');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setVariant('danger'); setMessage(detail || 'Falha ao excluir o usuário.');
    }
  };

  const onFilter = async (e) => {
    e.preventDefault();
    await fetchUsers();
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#d6f3f9',
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
        <h2 className="mb-4" style={{ color: '#071744' }}>
          {mode === 'create' ? 'Cadastro de Usuário' : 'Editar Usuário'}
        </h2>

        {message && <Alert variant={variant}>{message}</Alert>}

        <Container fluid style={{ maxWidth: 1100 }}>
          {/* ========= CARD: FORMULÁRIO ========= */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSubmit} noValidate>
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
                      autoComplete="email"
                      required
                    />
                    <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                  </Col>

                  <Col md={3}>
                    <Form.Label>Nome</Form.Label>
                    <Form.Control
                      type="text"
                      name="first_name"
                      placeholder="Digite o nome"
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
                    <Form.Label>Tipo Usuário</Form.Label>
                    <Form.Select
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleChange}
                      isInvalid={!!errors.role}
                    >
                      <option value="">Selecione...</option>
                      <option value="admin">Administrador</option>
                      <option value="dpo">DPO</option>
                      <option value="gerente">Gerente</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.role}</Form.Control.Feedback>
                  </Col>
                </Row>

                {formData.role === 'dpo' && (
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
                        value={formData.appointment_date || ''}
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
                        value={formData.appointment_validity || ''}
                        onChange={handleChange}
                        isInvalid={!!errors.appointment_validity}
                      />
                      <Form.Control.Feedback type="invalid">{errors.appointment_validity}</Form.Control.Feedback>
                    </Col>
                  </Row>
                )}

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>{mode === 'create' ? 'Senha' : 'Nova Senha (opcional)'}</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder={mode === 'create' ? 'Digite a senha' : 'Preencha para alterar'}
                      value={formData.password}
                      onChange={handleChange}
                      isInvalid={!!errors.password}
                      autoComplete="new-password"
                      required={mode === 'create'}
                    />
                    <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                  </Col>

                  <Col md={4}>
                    <Form.Label>Confirmar {mode === 'create' ? 'Senha' : 'Nova Senha'}</Form.Label>
                    <Form.Control
                      type="password"
                      name="password2"
                      placeholder="Repita a senha"
                      value={formData.password2}
                      onChange={handleChange}
                      isInvalid={!!errors.password2}
                      autoComplete="new-password"
                      required={mode === 'create'}
                    />
                    <Form.Control.Feedback type="invalid">{errors.password2}</Form.Control.Feedback>
                  </Col>
                </Row>
                <div className="d-flex justify-content-between mt-3">
                  {mode === 'edit' ? (
                    <Button variant="outline-secondary" type="button" onClick={resetForm} disabled={submitting}>
                      Cancelar edição
                    </Button>
                  ) : <span />}

                  <div className="d-flex gap-2">
                    <Button variant="secondary" type="button" onClick={() => navigate('/')} disabled={submitting}>
                      Voltar
                    </Button>
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {submitting ? 'Salvando...' : (mode === 'create' ? 'Cadastrar' : 'Salvar alterações')}
                    </Button>
                  </div>
                </div>
              </Form>
            </Card.Body>
          </Card>

            <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <Form onSubmit={onFilter}>
                <Row className="g-2 align-items-end">
                  <Col md={6}>
                    <Form.Label>Buscar usuários</Form.Label>
                    <Form.Control
                      placeholder="E-mail, nome ou sobrenome"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Col>
                  <Col md="auto">
                    <Button type="submit">Filtrar</Button>
                  </Col>
                  <Col md="auto">
                    <Button variant="outline-secondary" onClick={() => { setQuery(''); fetchUsers(); }}>
                      Limpar
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Header>
            <Card.Body className="pt-0">
              {listLoading ? (
                <div className="py-5 text-center">
                  <Spinner animation="border" role="status" />
                </div>
              ) : (
                <Table striped hover responsive className="mt-3">
                  <thead>
                    <tr>
                      <th>E-mail</th>
                      <th>Nome</th>
                      <th>Função</th>
                      <th style={{ width: 160 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>{[u.first_name, u.last_name].filter(Boolean).join(' ')}</td>
                        <td>{u.role}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => handleEdit(u.id)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(u.id)}
                          >
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}

export default Cadastro;