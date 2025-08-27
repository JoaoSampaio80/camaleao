import React, { useEffect, useState } from 'react';
import { Container, Form, Button, Row, Col, Alert, Card, Spinner } from 'react-bootstrap';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

function Perfil() {
  const {refreshUser} = useAuth();  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    email: '',
    role: '',
    first_name: '',
    last_name: '',
    // telefone só aparece se DPO
    phone_number: '',
    // campos DPO:    
    appointment_date: '',
    appointment_validity: '',
    // troca de senha
    current_password: '',
    password: '',
    password2: '',
  });

  const isDPO = form.role === 'dpo';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await AxiosInstance.get('users/me/');
        if (!mounted) return;
        setForm(f => ({
          ...f,
          email: resp.data.email || '',
          role: resp.data.role || '',
          first_name: resp.data.first_name || '',
          last_name: resp.data.last_name || '',
          phone_number: resp.data.phone_number || '',          
          appointment_date: resp.data.appointment_date || '',
          appointment_validity: resp.data.appointment_validity || '',
          current_password: '',
          password: '',
          password2: '',
        }));
      } catch (e) {
        setVariant('danger');
        setMessage('Falha ao carregar seu perfil.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateClient = () => {
    const e = {};
    const wantsPasswordChange = !!(form.password || form.password2);
    if (wantsPasswordChange) {
      if (!form.current_password) e.current_password = 'Informe sua senha atual.';
      if (!form.password) e.password = 'Informe a nova senha.';
      if (!form.password2) e.password2 = 'Confirme a nova senha.';
      if (form.password && form.password.length < 3) e.password = 'A senha deve ter pelo menos 3 caracteres.';
      if (form.password !== form.password2) e.password2 = 'As senhas não coincidem.';
    }
    if (isDPO) {
      if (!form.appointment_date) e.appointment_date = 'Obrigatório para DPO.';
      if (!form.appointment_validity) e.appointment_validity = 'Obrigatório para DPO.';
      if (!form.phone_number) e.phone_number = 'Obrigatório para DPO.';
    }
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
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

    // Monta payload apenas com campos permitidos
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,      
    };
    if (isDPO) {
      payload.phone_number = form.phone_number;
      payload.appointment_date = form.appointment_date;
      payload.appointment_validity = form.appointment_validity;
    }
    if (form.password) {
      payload.current_password = form.current_password; // usado só para verificação no backend
      payload.password = form.password;
    }

    // Remove chaves com string vazia/whitespace (evita erro de data ou campos vazios)
    Object.keys(payload).forEach((k) => {
       const v = payload[k];
       if (typeof v === 'string' && v.trim() === '') {
         delete payload[k];
       }
    });
    // Se NÃO for DPO, garanta que não envia datas
    if (!isDPO) {
       delete payload.phone_number;
       delete payload.appointment_date;
       delete payload.appointment_validity;
    }

    setSaving(true);
    try {
      const resp = await AxiosInstance.patch('users/me/', payload);
      setVariant('success');
      setMessage('Perfil atualizado com sucesso.');
      // limpa campos de senha
      setForm(prev => ({ ...prev, current_password: '', password: '', password2: '' }));

      // sincroniza AuthContext (Sidebar / topo da página)
      await refreshUser();
      // opcional: re-hidratar dados salvos (já vem no resp)
      setForm(prev => ({
        ...prev,
        first_name: resp.data.first_name || '',
        last_name: resp.data.last_name || '',
        phone_number: resp.data.phone_number || '',        
        appointment_date: resp.data.appointment_date || '',
        appointment_validity: resp.data.appointment_validity || '',
      }));
    } catch (err) {
      const st = err?.response?.status;
      const data = err?.response?.data;
      if (st === 400 && data && typeof data === 'object') {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(normalized);
        setVariant('danger');
        setMessage('Corrija os campos destacados.');
      } else if (st === 401) {
        setVariant('danger');
        setMessage('Sessão expirada. Faça login novamente.');  
      } else {
        setVariant('danger');
        setMessage('Falha ao salvar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: '100dvh' }}>
      <Sidebar />
      <div
        style={{
          background: '#d6f3f9',
          minHeight: '100dvh',
          width: '100vw',
          marginTop: '56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        <h2 className="mb-4" style={{ color: '#071744' }}>Meu Perfil</h2>

        {message && <Alert variant={variant}>{message}</Alert>}

        <Container fluid style={{ maxWidth: 960 }}>
          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="py-5 text-center">
                  <Spinner animation="border" role="status" />
                </div>
              ) : (
                <Form onSubmit={onSubmit} noValidate>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>E-mail</Form.Label>
                      <Form.Control value={form.email} disabled readOnly />
                      <Form.Text className="text-muted">E-mail não pode ser alterado aqui.</Form.Text>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Função</Form.Label>
                      <Form.Control value={form.role} disabled readOnly />
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={4}>
                      <Form.Label>Nome</Form.Label>
                      <Form.Control
                        name="first_name"
                        value={form.first_name}
                        onChange={onChange}
                        disabled={saving}
                        autoComplete="given-name"
                        isInvalid={!!errors.first_name}
                      />
                      <Form.Control.Feedback type="invalid">{errors.first_name}</Form.Control.Feedback>
                    </Col>
                    <Col md={4}>
                      <Form.Label>Sobrenome</Form.Label>
                      <Form.Control
                        name="last_name"
                        value={form.last_name}
                        onChange={onChange}
                        autoComplete="family-name"
                        isInvalid={!!errors.last_name}
                      />
                      <Form.Control.Feedback type="invalid">{errors.last_name}</Form.Control.Feedback>                  
                    </Col>

                    {isDPO && (
                      <Col md={4}>
                        <Form.Label>Telefone (DPO)</Form.Label>
                        <Form.Control
                          name="phone_number"
                          value={form.phone_number}
                          onChange={onChange}
                          isInvalid={!!errors.phone_number}
                          autoComplete="tel"
                          disabled={saving}
                        />
                        <Form.Control.Feedback type="invalid">{errors.phone_number}</Form.Control.Feedback>
                      </Col>
                    )}
                  </Row>

                    {isDPO && (
                    <Row className="mb-3">
                      <Col md={3}>
                        <Form.Label>Data de Nomeação (DPO)</Form.Label>
                        <Form.Control
                          type="date"
                          name="appointment_date"
                          value={form.appointment_date || ''}
                          onChange={onChange}
                          isInvalid={!!errors.appointment_date}
                          disabled={saving}
                        />
                        <Form.Control.Feedback type="invalid">{errors.appointment_date}</Form.Control.Feedback>
                      </Col>
                      <Col md={4}>
                        <Form.Label>Validade da Nomeação (DPO)</Form.Label>
                        <Form.Control
                          type="date"
                          name="appointment_validity"
                          value={form.appointment_validity || ''}
                          onChange={onChange}
                          isInvalid={!!errors.appointment_validity}
                          disabled={saving}
                        />
                        <Form.Control.Feedback type="invalid">{errors.appointment_validity}</Form.Control.Feedback>
                      </Col>
                    </Row>
                  )}

                  {/* Seção de troca de senha */}
                  <Row className="mb-3">
                    <Col md={4}>
                      <Form.Label>Senha atual</Form.Label>
                      <Form.Control
                        type="password"
                        name="current_password"
                        value={form.current_password}
                        onChange={onChange}
                        autoComplete="current-password"
                        isInvalid={!!errors.current_password}
                        placeholder="Obrigatória ao trocar a senha"
                        disabled={saving}
                      />
                      <Form.Control.Feedback type="invalid">{errors.current_password}</Form.Control.Feedback>
                    </Col>
                    <Col md={4}>
                      <Form.Label>Nova senha</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={onChange}
                        autoComplete="new-password"
                        placeholder="Deixe em branco para não alterar"
                        isInvalid={!!errors.password}
                        disabled={saving}
                      />
                      <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                    </Col>
                    <Col md={4}>
                      <Form.Label>Confirmar nova senha</Form.Label>
                      <Form.Control
                        type="password"
                        name="password2"
                        value={form.password2}
                        onChange={onChange}
                        autoComplete="new-password"
                        isInvalid={!!errors.password2}
                        disabled={saving}
                      />
                      <Form.Control.Feedback type="invalid">{errors.password2}</Form.Control.Feedback>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end mt-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}

export default Perfil;