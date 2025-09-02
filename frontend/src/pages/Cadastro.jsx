import React, { useEffect, useState } from 'react';
import { Container, Form, Button, Row, Col, Alert, Table, Spinner, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';

const NameMax = 60;

const sanitizeName = (s) =>
  (s || '')
    .replace(/[^\p{L}\s]/gu, '')   // remove tudo que não for letra ou espaço
    .replace(/\s{2,}/g, ' ')       // colapsa espaços repetidos
    .replace(/^\s+/, '')
    .slice(0, NameMax);

const addYearsToISODate = (yyyy_mm_dd, years = 2) => {
  if (!yyyy_mm_dd) return '';
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  if (!y || !m || !d) return '';

  // Trabalha em UTC para evitar deslocamentos por fuso/horário de verão
  const base = new Date(Date.UTC(y, m - 1, d));
  const out = new Date(base);
  out.setUTCFullYear(base.getUTCFullYear() + years);

  // Se mudou o mês, é caso 29/02 -> ajusta para o último dia do mês anterior (28/02)
  if (out.getUTCMonth() !== base.getUTCMonth()) {
    out.setUTCDate(0);
  }
  const yy = out.getUTCFullYear();
  const mm = String(out.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(out.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const formatISOToBR = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return '';
  const [y, m, d] = yyyy_mm_dd.split('-');
  if (!y || !m || !d) return '';
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

const digitsOnly = (s) => (s || '').replace(/\D/g, '');

const formatPhoneBR = (value) => {
  const d = digitsOnly(value).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

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

  const [originalRole, setOriginalRole] = useState(null);

  // ------- Lista de usuários -------
  const fetchUsers = async () => {
    setListLoading(true);
    // setMessage(''); setVariant('');
    try {
      const resp = await AxiosInstance.get('users/', { params: query ? { q: query } : {} });
      setUsers(resp.data || []);
    } catch (e) {
      setVariant('danger'); setMessage('Falha ao carregar usuários.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ------- Handlers -------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value ?? '' };

      // Normalizações do "estado seguinte"
      const nextRole = name === 'role' ? value : prev.role;
      const nextAppointmentDate = name === 'appointment_date' ? value : prev.appointment_date;

      // 1) Recalcula SEMPRE que a data mudar (se for DPO)
      if (name === 'appointment_date' && nextRole === 'dpo') {
        next.appointment_validity = value ? addYearsToISODate(value, 2) : '';
      }

      // 2) Ao trocar papel para DPO: se já existe data, calcula
      if (name === 'role' && value === 'dpo' && nextAppointmentDate) {
        next.appointment_validity = addYearsToISODate(nextAppointmentDate, 2);
      }

      return next;
    });

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const resetForm = (opts = { clearFlash: true }) => {
    setFormData(INITIAL);
    setMode('create');
    setSelectedId(null);
    setErrors({});
    if (opts.clearFlash) {
      setMessage('');
      setVariant('');
    }
    setOriginalRole(null);
  };

  const validateClient = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'E-mail é obrigatório.';
    if (!formData.role) e.role = 'Selecione o tipo de usuário.';

    if (mode === 'create') {
      if (!formData.password) e.password = 'Senha é obrigatória.';
      if (formData.password && formData.password.length < 3) e.password = 'A senha deve ter pelo menos 3 caracteres.';
      if (formData.password2 !== formData.password) e.password2 = 'As senhas não coincidem.';
    } else {
      if (formData.password || formData.password2) {
        if (!formData.password) e.password = 'Informe a nova senha.';
        if (!formData.password2) e.password2 = 'Confirme a nova senha.';
        if (formData.password && formData.password.length < 3) e.password = 'A senha deve ter pelo menos 3 caracteres.';
        if (formData.password2 !== formData.password) e.password2 = 'As senhas não coincidem.';
      }
    }

    if (formData.first_name && /[^\p{L}\s]/u.test(formData.first_name)) {
      e.first_name = 'Use apenas letras e espaços.';
    }
    if (formData.last_name && /[^\p{L}\s]/u.test(formData.last_name)) {
      e.last_name = 'Use apenas letras e espaços.';
    }

    // Campos obrigatórios para DPO
    if (formData.role === 'dpo') {
      const len = digitsOnly(formData.phone_number).length;
      if (!len) e.phone_number = 'Telefone é obrigatório para DPO.';
      else if (!(len === 10 || len === 11)) e.phone_number = 'Telefone deve ter 10 ou 11 dígitos.';

      if (!formData.appointment_date) e.appointment_date = 'Data de nomeação é obrigatória para DPO.';
      // if (!formData.appointment_validity) e.appointment_validity = 'Validade da nomeação é obrigatória para DPO.';
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

    if (formData.phone_number) data.phone_number = digitsOnly(formData.phone_number);

    if (formData.role === 'dpo') {
      const date = formData.appointment_date || null;
      // Se já houver validade, usa a informada; senão, sugere a partir da data
      const validity = date ? addYearsToISODate(date, 2) : null;

      data.appointment_date = date;
      data.appointment_validity = validity;
    } else {
      // só limpa explicitamente se estiver saindo de DPO
      if (mode === 'edit' && originalRole === 'dpo' && formData.role !== 'dpo') {
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
          await fetchUsers();
          resetForm({ clearFlash: false });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => { setMessage(''); setVariant(''); }, 3000);
        }
      } else {
        const response = await AxiosInstance.patch(`users/${selectedId}/`, dataToSend);
        if ([200, 204].includes(response.status)) {
          setVariant('success');
          setMessage('Dados alterados com sucesso!');
          await fetchUsers();
          resetForm({ clearFlash: false }); // mantém a mensagem
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => { setMessage(''); setVariant(''); }, 3000);
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

      const computedValidity =
        u.role === 'dpo' && u.appointment_date && !u.appointment_validity
          ? addYearsToISODate(u.appointment_date, 2)
          : (u.appointment_validity || '');

      setFormData({
        email: u.email || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        phone_number: digitsOnly(u.phone_number) || '',
        role: u.role || 'gerente',
        appointment_date: u.appointment_date || '',
        appointment_validity: (u.role === 'dpo' && u.appointment_date)
          ? addYearsToISODate(u.appointment_date, 2)
          : '', // fora de DPO, não exibimos esse campo
        password: '',
        password2: '',
      });
      setOriginalRole(u.role || null);
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

  const handlePhoneChange = (e) => {
    const digits = digitsOnly(e.target.value).slice(0, 11); // limite 11
    setFormData((prev) => ({ ...prev, phone_number: digits }));
    if (errors.phone_number) setErrors((prev) => ({ ...prev, phone_number: undefined }));
  };

  const handleFirstNameChange = (e) => {
    const v = sanitizeName(e.target.value);
    setFormData((prev) => ({ ...prev, first_name: v }));
    if (errors.first_name) setErrors((prev) => ({ ...prev, first_name: undefined }));
  };

  const handleLastNameChange = (e) => {
    const v = sanitizeName(e.target.value);
    setFormData((prev) => ({ ...prev, last_name: v }));
    if (errors.last_name) setErrors((prev) => ({ ...prev, last_name: undefined }));
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await AxiosInstance.delete(`users/${id}/`);
      if (selectedId === id) resetForm();
      await fetchUsers();
      setVariant('success'); setMessage('Usuário excluído com sucesso.');
      setTimeout(() => { setMessage(''); setVariant(''); }, 3000);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setVariant('danger'); setMessage(detail || 'Falha ao excluir o usuário.');
    }
  };

  const onFilter = async (e) => {
    e.preventDefault();
    await fetchUsers();
  };

  useEffect(() => {
    if (
      formData.role === 'dpo' &&
      formData.appointment_date &&
      !formData.appointment_validity
    ) {
      setFormData((prev) => ({
        ...prev,
        appointment_validity: addYearsToISODate(formData.appointment_date, 2),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.role, formData.appointment_date]);

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
                      onChange={handleFirstNameChange}
                      onKeyDown={(e) => {
                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End', ' '];
                        if (allowedKeys.includes(e.key)) return;
                        // bloqueia números rapidamente; o resto a sanitização tira no onChange
                        if (/^\d$/.test(e.key)) e.preventDefault();
                      }}
                      maxLength={NameMax}
                      autoComplete="given-name"
                      isInvalid={!!errors.first_name}
                    />
                    <Form.Control.Feedback type="invalid">{errors.first_name}</Form.Control.Feedback>
                  </Col>

                  <Col md={3}>
                    <Form.Label>Sobrenome</Form.Label>
                    <Form.Control
                      type="text"
                      name="last_name"
                      placeholder="Digite o sobrenome"
                      value={formData.last_name}
                      onChange={handleLastNameChange}
                      onKeyDown={(e) => {
                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End', ' '];
                        if (allowedKeys.includes(e.key)) return;
                        if (/^\d$/.test(e.key)) e.preventDefault();
                      }}
                      maxLength={NameMax}
                      autoComplete="family-name"
                      isInvalid={!!errors.last_name}
                    />
                    <Form.Control.Feedback type="invalid">{errors.last_name}</Form.Control.Feedback>
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
                        placeholder="(xx) xxxx-xxxx ou (xx) xxxxx-xxxx"
                        value={formatPhoneBR(formData.phone_number)}   // mostra mascarado
                        onChange={handlePhoneChange}                   // salva só dígitos
                        onKeyDown={(e) => {
                          const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                          if (allowed.includes(e.key)) return;
                          if (!/^\d$/.test(e.key)) e.preventDefault(); // bloqueia não-numérico
                        }}
                        inputMode="numeric"                            // teclado numérico no mobile
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
                      {(() => {
                        const validityISO = formData.appointment_date
                          ? addYearsToISODate(formData.appointment_date, 2)
                          : '';
                        const validityBR = validityISO ? formatISOToBR(validityISO) : '';
                        return (
                          <Form.Control
                            value={validityBR}
                            readOnly
                            plaintext
                          />

                          // <Form.Control.Feedback type="invalid">{errors.appointment_validity}</Form.Control.Feedback>
                        );
                      })()}
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
                    <Button variant="outline-secondary" type="button" onClick={() => resetForm()} disabled={submitting}>
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