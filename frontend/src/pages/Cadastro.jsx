import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Table,
  Spinner,
  Card,
  Badge,
  Pagination,
  Dropdown,
  Modal,
} from 'react-bootstrap';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';
import '../estilos/cadastro.css';

const NameMax = 60;

const sanitizeName = (s) =>
  (s || '')
    .replace(/[^\p{L}\s\-'\u2019]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/-{2,}/g, '-')
    .replace(/['\u2019]{2,}/g, "'")
    .replace(/^[\s'\u2019-]+/, '')
    .slice(0, NameMax);

const addYearsToISODate = (yyyy_mm_dd, years = 2) => {
  if (!yyyy_mm_dd) return '';
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  if (!y || !m || !d) return '';

  const base = new Date(Date.UTC(y, m - 1, d));
  const out = new Date(base);
  out.setUTCFullYear(base.getUTCFullYear() + years);

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
  const APP_ENV = String(import.meta.env.VITE_APP_ENV || '').toLowerCase();
  const isProdLike = APP_ENV === 'production';
  console.log('>>> FRONT ENV:', APP_ENV, 'isProdLike:', isProdLike);

  const [formData, setFormData] = useState(INITIAL);
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [selectedId, setSelectedId] = useState(null);

  const [users, setUsers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [query, setQuery] = useState('');

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [originalRole, setOriginalRole] = useState(null);

  const [confirmResendOpen, setConfirmResendOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState(null);
  const [resending, setResending] = useState(false);

  const [showInactive, setShowInactive] = useState(false);

  const [confirmReactivateOpen, setConfirmReactivateOpen] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [reactivating, setReactivating] = useState(false);

  // ====== flash helper 1,5s ======
  const showFlash = (v, t) => {
    setVariant(v);
    setMessage(t);
    setTimeout(() => {
      setMessage('');
      setVariant('');
    }, 1500);
  };

  // ====== modal confirmação exclusão ======
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = useMemo(() => {
    const base = count || users.length || 0;
    return Math.max(1, Math.ceil(base / pageSize));
  }, [count, users.length, pageSize]);

  // ------- Lista de usuários -------
  const fetchUsers = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {};
      if (query) params.q = query;
      params.page = page;
      params.page_size = pageSize;

      if (showInactive) {
        params.show_inactive = 1;
      }

      const resp = await AxiosInstance.get('users/', { params });
      const data = resp?.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];
      setUsers(list);

      if (Array.isArray(data)) {
        setCount(data.length);
        setNext(null);
        setPrevious(null);
      } else {
        setCount(Number.isFinite(data?.count) ? data.count : list.length);
        setNext(data?.next ?? null);
        setPrevious(data?.previous ?? null);
      }
    } catch (e) {
      setUsers([]);
      showFlash(
        'danger',
        'Falha ao carregar usuários. Se o problema persistir, contate o administrador.'
      );
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, query, showInactive]);

  useEffect(() => {
    fetchUsers(); /* eslint-disable-next-line */
  }, [fetchUsers]);

  // ------- Handlers -------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value ?? '' };

      const nextRole = name === 'role' ? value : prev.role;
      const nextAppointmentDate =
        name === 'appointment_date' ? value : prev.appointment_date;

      if (name === 'appointment_date' && nextRole === 'dpo') {
        next.appointment_validity = value ? addYearsToISODate(value, 2) : '';
      }

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
      if (!isProdLike) {
        if (!formData.password) e.password = 'Senha é obrigatória.';
        if (formData.password && formData.password.length < 3)
          e.password = 'A senha deve ter pelo menos 3 caracteres.';
        if (formData.password2 !== formData.password)
          e.password2 = 'As senhas não coincidem.';
      }
    } else {
      if (formData.password || formData.password2) {
        if (!formData.password) e.password = 'Informe a nova senha.';
        if (!formData.password2) e.password2 = 'Confirme a nova senha.';
        const minLen = isProdLike ? 8 : 3;
        if (formData.password && formData.password.length < minLen) {
          e.password = `A senha deve ter pelo menos ${minLen} caracteres.`;
        }
        if (formData.password2 !== formData.password)
          e.password2 = 'As senhas não coincidem.';
      }
    }

    if (formData.first_name && /[^\p{L}\s\-'\u2019]/u.test(formData.first_name)) {
      e.first_name = 'Use apenas letras, espaços, hífen e apóstrofo.';
    }
    if (formData.last_name && /[^\p{L}\s\-'\u2019]/u.test(formData.last_name)) {
      e.last_name = 'Use apenas letras, espaços, hífen e apóstrofo.';
    }

    if (formData.role === 'dpo') {
      const len = digitsOnly(formData.phone_number).length;
      if (!len) e.phone_number = 'Telefone é obrigatório para DPO.';
      else if (!(len === 10 || len === 11))
        e.phone_number = 'Telefone deve ter 10 ou 11 dígitos.';

      if (!formData.appointment_date)
        e.appointment_date = 'Data de nomeação é obrigatória para DPO.';
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
      const validity = date ? addYearsToISODate(date, 2) : null;
      data.appointment_date = date;
      data.appointment_validity = validity;
    } else {
      if (mode === 'edit' && originalRole === 'dpo' && formData.role !== 'dpo') {
        data.appointment_date = null;
        data.appointment_validity = null;
      }
    }

    if (mode === 'create') {
      if (!isProdLike) {
        data.password = formData.password;
      }
    } else if (formData.password) {
      data.password = formData.password;
    }

    return data;
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
      showFlash('danger', 'Corrija os campos destacados.');
      return;
    }

    const dataToSend = buildPayload();
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const response = await AxiosInstance.post('users/', dataToSend);
        if (response.status === 201) {
          showFlash('success', 'Usuário cadastrado com sucesso!');
          await fetchUsers();
          resetForm({ clearFlash: false });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        const response = await AxiosInstance.patch(`users/${selectedId}/`, dataToSend);
        if ([200, 204].includes(response.status)) {
          showFlash('success', 'Dados alterados com sucesso!');
          await fetchUsers();
          resetForm({ clearFlash: false });
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
        showFlash('danger', 'Corrija os campos destacados.');
      } else if (st === 403) {
        showFlash(
          'danger',
          'Você não tem permissão para executar esta ação. Se o problema persistir, contate o administrador.'
        );
      } else {
        showFlash(
          'danger',
          'Erro ao salvar. Verifique os dados e tente novamente. Se o problema persistir, contate o administrador.'
        );
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
        phone_number: digitsOnly(u.phone_number) || '',
        role: u.role || 'gerente',
        appointment_date: u.appointment_date || '',
        appointment_validity:
          u.role === 'dpo' && u.appointment_date
            ? addYearsToISODate(u.appointment_date, 2)
            : '',
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
      showFlash(
        'danger',
        'Falha ao carregar usuário para edição. Se o problema persistir, contate o administrador.'
      );
    }
  };

  const askResend = (id) => {
    setResendTarget(id);
    setConfirmResendOpen(true);
  };

  const confirmResend = async () => {
    if (!resendTarget) return;
    setResending(true);

    try {
      const resp = await AxiosInstance.post(`users/${resendTarget}/resend_welcome/`);
      const detail = resp?.data?.detail || 'E-mail de boas-vindas reenviado com sucesso!';
      showFlash('success', detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      const detail =
        e?.response?.data?.detail || 'Falha ao reenviar o e-mail. Tente novamente.';
      showFlash('danger', detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setResending(false);
      setConfirmResendOpen(false);
      setResendTarget(null);
    }
  };

  // ——— Exclusão com modal (sem alterar visual geral) ———
  const askDelete = async (id) => {
    setConfirmTarget(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await AxiosInstance.delete(`users/${confirmTarget}/`);
      if (selectedId === confirmTarget) resetForm();
      await fetchUsers();
      showFlash('success', 'Usuário excluído com sucesso.');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      showFlash(
        'danger',
        detail ||
          'Falha ao excluir o usuário. Se o problema persistir, contate o administrador.'
      );
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const askReactivate = (id) => {
    setReactivateTarget(id);
    setConfirmReactivateOpen(true);
  };

  const confirmReactivate = async () => {
    if (!reactivateTarget) return;
    setReactivating(true);

    try {
      const resp = await AxiosInstance.post(`users/${reactivateTarget}/reactivate/`);
      const detail = resp?.data?.detail || 'Usuário reativado com sucesso!';
      showFlash('success', detail);

      // rola para o topo para exibir alerta
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // atualiza a lista após reativar
      fetchUsers();
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Falha ao reativar o usuário.';
      showFlash('danger', detail);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setReactivating(false);
      setConfirmReactivateOpen(false);
      setReactivateTarget(null);
    }
  };

  const handlePhoneChange = (e) => {
    const digits = digitsOnly(e.target.value).slice(0, 11);
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

  const onFilter = async (e) => {
    e.preventDefault();
    setPage(1);
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

  // ===== helpers de paginação (UI) =====
  const canPrev = Boolean(previous) || page > 1;
  const canNext = Boolean(next) || page < totalPages;

  const goTo = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const pageItems = useMemo(() => {
    const maxAround = 2;
    const start = Math.max(1, page - maxAround);
    const end = Math.min(totalPages, page + maxAround);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  const editClass = mode === 'edit' ? 'edit-highlight' : '';

  const [dpoExists, setDpoExists] = useState(false);
  const [checkingDPO, setCheckingDPO] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCheckingDPO(true);
        await AxiosInstance.get('users/dpo/'); // 200 => existe DPO
        if (mounted) setDpoExists(true);
      } catch (e) {
        if (mounted) setDpoExists(!(e?.response?.status === 404));
      } finally {
        if (mounted) setCheckingDPO(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#f5f5f5',
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
        <div
          className="d-flex justify-content-center align-items-center gap-3 mb-3"
          style={{ width: '100%', maxWidth: 1100 }}
        >
          <h2 className="mb-0 page-title-ink">
            {mode === 'create' ? 'Cadastro de Usuário' : 'Editar Usuário'}
          </h2>
          {mode === 'edit' && (
            <Badge bg="warning" text="dark">
              Modo edição ativo
            </Badge>
          )}
        </div>

        <Container fluid className="container-gradient" style={{ maxWidth: 1100 }}>
          {message && <Alert variant={variant}>{message}</Alert>}

          {/* aviso DPO já nomeado */}
          {formData.role === 'dpo' && dpoExists && !checkingDPO && (
            <Alert variant="warning" className="mb-3">
              Já existe um DPO nomeado. Edite o DPO atual para alterar.
            </Alert>
          )}

          <Form onSubmit={handleSubmit} noValidate>
            {/* Tipo de usuário movido para o topo */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Tipo Usuário</Form.Label>
                <Form.Select
                  className={editClass}
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  isInvalid={!!errors.role}
                >
                  <option value=""></option>
                  <option value="admin">Administrador</option>
                  <option value="dpo">DPO</option>
                  <option value="gerente">Gerente</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.role}
                </Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>E-mail</Form.Label>
                <Form.Control
                  className={editClass}
                  type="email"
                  name="email"
                  placeholder="Digite o e-mail"
                  value={formData.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                  autoComplete="email"
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  className={editClass}
                  type="text"
                  name="first_name"
                  placeholder="Digite o nome"
                  value={formData.first_name}
                  onChange={handleFirstNameChange}
                  maxLength={NameMax}
                  isInvalid={!!errors.first_name}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.first_name}
                </Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>Sobrenome</Form.Label>
                <Form.Control
                  className={editClass}
                  type="text"
                  name="last_name"
                  placeholder="Digite o sobrenome"
                  value={formData.last_name}
                  onChange={handleLastNameChange}
                  maxLength={NameMax}
                  isInvalid={!!errors.last_name}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.last_name}
                </Form.Control.Feedback>
              </Col>
            </Row>

            {formData.role === 'dpo' && (
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control
                    className={editClass}
                    type="tel"
                    name="phone_number"
                    placeholder="(xx) xxxx-xxxx ou (xx) xxxxx-xxxx"
                    value={formatPhoneBR(formData.phone_number)}
                    onChange={handlePhoneChange}
                    isInvalid={!!errors.phone_number}
                    autoComplete="tel"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.phone_number}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Data da Nomeação</Form.Label>
                  <Form.Control
                    className={editClass}
                    type="date"
                    name="appointment_date"
                    value={formData.appointment_date || ''}
                    onChange={handleChange}
                    isInvalid={!!errors.appointment_date}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.appointment_date}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Validade da Nomeação</Form.Label>
                  {(() => {
                    const validityISO = formData.appointment_date
                      ? addYearsToISODate(formData.appointment_date, 2)
                      : '';
                    const validityBR = validityISO ? formatISOToBR(validityISO) : '';
                    return <Form.Control value={validityBR} readOnly plaintext />;
                  })()}
                </Col>
              </Row>
            )}

            {mode === 'create' && isProdLike ? (
              <Alert variant="info" className="mb-3">
                A senha será definida pelo próprio usuário via e-mail de convite.
              </Alert>
            ) : (
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>
                    {mode === 'create' ? 'Senha' : 'Nova Senha (opcional)'}
                  </Form.Label>
                  <Form.Control
                    className={editClass}
                    type="password"
                    name="password"
                    placeholder={
                      mode === 'create' ? 'Digite a senha' : 'Preencha para alterar'
                    }
                    value={formData.password}
                    onChange={handleChange}
                    isInvalid={!!errors.password}
                    autoComplete="new-password"
                    required={mode === 'create' && !isProdLike}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>
                    Confirmar {mode === 'create' ? 'Senha' : 'Nova Senha'}
                  </Form.Label>
                  <Form.Control
                    className={editClass}
                    type="password"
                    name="password2"
                    placeholder="Repita a senha"
                    value={formData.password2}
                    onChange={handleChange}
                    isInvalid={!!errors.password2}
                    autoComplete="new-password"
                    required={mode === 'create' && !isProdLike}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password2}
                  </Form.Control.Feedback>
                </Col>
              </Row>
            )}

            {/* Ações */}
            <div className="d-flex justify-content-between mt-3">
              {/* vazio à esquerda para manter o layout */}
              <span />

              <div className="d-flex gap-2">
                <Button
                  className="btn-white-custom"
                  variant="secondary"
                  type="button"
                  onClick={() => resetForm()}
                  disabled={submitting}
                >
                  Cancelar
                </Button>

                <Button
                  className="btn-white-custom"
                  variant="primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Salvando...'
                    : mode === 'create'
                      ? 'Cadastrar'
                      : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </Form>
        </Container>

        <Container fluid className="container-gradient mt-4" style={{ maxWidth: 1100 }}>
          <Card className="shadow-sm card-fill labels-reset">
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
                    <Button className="btn-white-custom" type="submit">
                      Filtrar
                    </Button>
                  </Col>
                  <Col md="auto">
                    <Button
                      className="btn-white-custom"
                      variant="outline-secondary"
                      onClick={() => {
                        setQuery('');
                        setPage(1);
                        fetchUsers();
                      }}
                    >
                      Limpar
                    </Button>
                  </Col>
                  <Col md="auto">
                    <Button
                      className="btn-white-custom"
                      variant={showInactive ? 'warning' : 'outline-secondary'}
                      onClick={() => {
                        setShowInactive((prev) => !prev);
                        setPage(1);
                        // fetchUsers();
                      }}
                    >
                      {showInactive ? 'Mostrar ativos' : 'Mostrar desativados'}
                    </Button>
                  </Col>

                  <Col md="auto" className="ms-auto">
                    <Form.Label>Tamanho da página</Form.Label>
                    <Form.Select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      style={{ width: 120 }}
                    >
                      {[5, 10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Form.Select>
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
                <>
                  <div className="table-wrap">
                    <Table bordered hover responsive className="custom-table mt-3">
                      <thead className="thead-gradient">
                        <tr>
                          <th>E-mail</th>
                          <th>Nome</th>
                          <th>Função</th>
                          <th style={{ width: 160 }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(users) ? users : []).map((u, idx) => (
                          <tr key={u.id} className={idx % 2 ? 'row-blue' : 'row-white'}>
                            <td>
                              <div className="cell-clip">{u.email}</div>
                            </td>
                            <td>
                              <div className="cell-clip">
                                {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                              </div>
                            </td>
                            <td>
                              <div className="cell-clip">{u.role}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <Dropdown align="end">
                                <Dropdown.Toggle
                                  size="sm"
                                  variant="outline-secondary"
                                  id={`dropdown-${u.id}`}
                                >
                                  Ações
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  {showInactive ? (
                                    <Dropdown.Item onClick={() => askReactivate(u.id)}>
                                      Reativar usuário
                                    </Dropdown.Item>
                                  ) : (
                                    <>
                                      <Dropdown.Item onClick={() => handleEdit(u.id)}>
                                        Editar
                                      </Dropdown.Item>

                                      <Dropdown.Item onClick={() => askResend(u.id)}>
                                        Reenviar e-mail (Boas Vindas)
                                      </Dropdown.Item>

                                      <Dropdown.Item
                                        className="text-danger"
                                        onClick={() => askDelete(u.id)}
                                      >
                                        Desativar
                                      </Dropdown.Item>
                                    </>
                                  )}
                                </Dropdown.Menu>
                              </Dropdown>
                            </td>
                          </tr>
                        ))}
                        {(!users || users.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              Nenhum usuário encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="text-muted">
                      Total: <strong>{count || users.length}</strong> • Página{' '}
                      <strong>{page}</strong> de <strong>{totalPages}</strong>
                    </div>

                    <Pagination className="mb-0">
                      <Pagination.First disabled={!canPrev} onClick={() => goTo(1)} />
                      <Pagination.Prev
                        disabled={!canPrev}
                        onClick={() => goTo(page - 1)}
                      />
                      {pageItems[0] > 1 && (
                        <>
                          <Pagination.Item onClick={() => goTo(1)}>{1}</Pagination.Item>
                          <Pagination.Ellipsis disabled />
                        </>
                      )}
                      {pageItems.map((p) => (
                        <Pagination.Item
                          key={p}
                          active={p === page}
                          onClick={() => goTo(p)}
                        >
                          {p}
                        </Pagination.Item>
                      ))}
                      {pageItems[pageItems.length - 1] < totalPages && (
                        <>
                          <Pagination.Ellipsis disabled />
                          <Pagination.Item onClick={() => goTo(totalPages)}>
                            {totalPages}
                          </Pagination.Item>
                        </>
                      )}
                      <Pagination.Next
                        disabled={!canNext}
                        onClick={() => goTo(page + 1)}
                      />
                      <Pagination.Last
                        disabled={!canNext}
                        onClick={() => goTo(totalPages)}
                      />
                    </Pagination>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>

      {/*Modal de confirmação de reenvio de e-mail de boas vindas*/}
      <Modal
        show={confirmResendOpen}
        onHide={() => !resending && setConfirmResendOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Reenviar e-mail de boas-vindas</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          Tem certeza de que deseja reenviar o e-mail de boas-vindas para este usuário?
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmResendOpen(false)}
            disabled={resending}
          >
            Cancelar
          </Button>

          <Button variant="primary" onClick={confirmResend} disabled={resending}>
            {resending ? 'Enviando…' : 'Reenviar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        show={confirmOpen}
        onHide={() => !deleting && setConfirmOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirmar exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza de que deseja <strong>desativar</strong> este usuário?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Excluindo…' : 'Excluir'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={confirmReactivateOpen}
        onHide={() => !reactivating && setConfirmReactivateOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Reativar usuário</Modal.Title>
        </Modal.Header>

        <Modal.Body>Tem certeza de que deseja reativar este usuário?</Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            disabled={reactivating}
            onClick={() => setConfirmReactivateOpen(false)}
          >
            Cancelar
          </Button>

          <Button variant="success" disabled={reactivating} onClick={confirmReactivate}>
            {reactivating ? 'Reativando…' : 'Reativar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Cadastro;
