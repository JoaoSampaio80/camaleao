import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Card,
  Spinner,
  Image,
  Modal, // <-- adicionado
} from 'react-bootstrap';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MAX_AVATAR_MB = 5;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function Perfil() {
  const navigate = useNavigate();
  const { refreshUser, logout, authTokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    email: '',
    role: '',
    // troca de senha
    current_password: '',
    password: '',
    password2: '',
    // avatar
    avatar: null,
    avatar_url: '',
  });

  // === helper de mensagens (3s) ===
  const showFlash = (v, t) => {
    setVariant(v);
    setMessage(t);
    setTimeout(() => {
      setMessage('');
      setVariant('');
    }, 3000);
  };

  // refs para preview e input file
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  const revokeLocalPreview = () => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch (_) {
        // silencioso
      } finally {
        objectUrlRef.current = null;
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await AxiosInstance.get('users/me/');
        if (!mounted) return;

        setForm((f) => ({
          ...f,
          email: resp.data?.email || '',
          role: resp.data?.role || '',
          current_password: '',
          password: '',
          password2: '',
          avatar: null,
          avatar_url: resp.data?.avatar || '',
        }));
      } catch (e) {
        if (!mounted) return;
        showFlash(
          'danger',
          'Falha ao carregar seu perfil. Se o problema persistir, contate o administrador.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      revokeLocalPreview();
    };
  }, []);

  const onChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'avatar' && files && files[0]) {
      const file = files[0];
      // validação rápida no cliente
      if (!ACCEPTED.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          avatar: 'Formato inválido. Use jpeg/jpg/png/webp',
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          avatar: `Arquivo maior que ${MAX_AVATAR_MB}MB.`,
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // libera preview antigo (se houver)
      revokeLocalPreview();

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      setErrors((prev) => ({ ...prev, avatar: undefined }));
      setForm((prev) => ({ ...prev, avatar: file, avatar_url: url }));

      // permite re-selecionar o mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateClient = () => {
    const e = {};
    const wantsPasswordChange = !!(form.password || form.password2);
    if (wantsPasswordChange) {
      if (!form.current_password) e.current_password = 'Informe sua senha atual.';
      if (!form.password) e.password = 'Informe a nova senha.';
      if (!form.password2) e.password2 = 'Confirme a nova senha.';
      if (form.password && form.password.length < 3)
        e.password = 'A senha deve ter pelo menos 3 caracteres.';
      if (form.password !== form.password2) e.password2 = 'As senhas não coincidem.';
    }
    return e;
  };

  const buildFormData = ({ removeAvatar = false } = {}) => {
    const fd = new FormData();

    // troca de senha (se solicitada)
    const wantsPasswordChange = !!(form.password || form.password2);
    if (wantsPasswordChange) {
      fd.append('current_password', form.current_password);
      fd.append('password', form.password);
      // envia refresh para blacklist (se existir)
      const refresh = authTokens?.refresh;
      if (refresh) {
        fd.append('refresh', refresh);
      }
    }

    // upload/remoção de avatar
    if (form.avatar) {
      fd.append('avatar', form.avatar);
    } else if (removeAvatar) {
      fd.append('remove_avatar', 'true');
    }

    return fd;
  };

  // ====== Confirmação de remoção de foto (modal, padrão 3s) ======
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  const askRemoveAvatar = () => setConfirmOpen(true);

  const handleRemoveAvatar = async () => {
    if (deletingAvatar) return;
    setDeletingAvatar(true);
    setMessage('');
    setVariant('');
    setErrors({});
    try {
      const fd = buildFormData({ removeAvatar: true });
      await AxiosInstance.patch('users/me/', fd);

      showFlash('success', 'Foto removida com sucesso.');

      // Revoga o preview local, se houver
      revokeLocalPreview();

      setForm((prev) => ({ ...prev, avatar: null, avatar_url: '' }));
      await refreshUser();
    } catch (err) {
      const st = err?.response?.status;
      if (st === 413) {
        showFlash('danger', `Arquivo muito grande. Tamanho máximo: ${MAX_AVATAR_MB}MB.`);
      } else {
        showFlash(
          'danger',
          'Falha ao remover a foto. Tente novamente. Se o problema persistir, contate o administrador.'
        );
      }
    } finally {
      setDeletingAvatar(false);
      setConfirmOpen(false);
    }
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
      showFlash('danger', 'Corrija os campos destacados.');
      return;
    }

    const fd = buildFormData();

    // nada para enviar?
    if (![...fd.keys()].length) {
      showFlash('warning', 'Nenhuma alteração para salvar.');
      return;
    }

    setSaving(true);
    try {
      const resp = await AxiosInstance.patch('users/me/', fd);

      if (resp?.data?.reauth_required) {
        // mantém lógica original do redirecionamento rápido
        setVariant('success');
        setMessage('Senha alterada com sucesso. Você será redirecionado para o login.');
        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }

      showFlash('success', 'Perfil atualizado com sucesso.');

      // limpa campos de senha
      setForm((prev) => ({
        ...prev,
        current_password: '',
        password: '',
        password2: '',
        avatar: null,
        avatar_url: resp.data.avatar || prev.avatar_url,
      }));

      // se o upload foi local (blob), podemos revogar
      revokeLocalPreview();

      // sincroniza AuthContext
      await refreshUser();
    } catch (err) {
      console.log('users/me/ error payload:', err?.response?.data);
      const st = err?.response?.status;
      const data = err?.response?.data;

      if (st === 400 && data && typeof data === 'object') {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(normalized);
        showFlash('danger', 'Corrija os campos destacados.');
      } else if (st === 401) {
        setVariant('danger');
        setMessage('Sessão expirada. Faça login novamente.');
        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 1500);
      } else if (st === 413) {
        showFlash('danger', `Arquivo muito grande. Tamanho máximo: ${MAX_AVATAR_MB}MB.`);
      } else {
        showFlash(
          'danger',
          'Falha ao salvar. Tente novamente. Se o problema persistir, contate o administrador.'
        );
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
          background: '#f5f5f5',
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
        <h2 className="mb-4 page-title-ink">Meu Perfil</h2>

        {message && <Alert variant={variant}>{message}</Alert>}

        {/* Form direto no gradiente, padrão aprovado */}
        <Container fluid className="container-gradient" style={{ maxWidth: 960 }}>
          {loading ? (
            <div className="py-5 text-center">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            <Form onSubmit={onSubmit} noValidate>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control value={form.email} disabled />
                  <Form.Text className="text-light">
                    E-mail não pode ser alterado aqui.
                  </Form.Text>
                </Col>
                <Col md={6}>
                  <Form.Label>Função</Form.Label>
                  <Form.Control value={form.role} disabled />
                </Col>
              </Row>

              {/* Troca de senha */}
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
                  <Form.Control.Feedback type="invalid">
                    {errors.current_password}
                  </Form.Control.Feedback>
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
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
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
                  <Form.Control.Feedback type="invalid">
                    {errors.password2}
                  </Form.Control.Feedback>
                </Col>
              </Row>

              <Row className="mb-4 align-items-center">
                <Col md="auto">
                  {form.avatar_url ? (
                    <Image
                      src={form.avatar_url}
                      roundedCircle
                      width={96}
                      height={96}
                      alt="Avatar"
                      style={{ objectFit: 'cover', background: '#fff' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: '50%',
                        background: '#e9ecef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: '#6c757d',
                      }}
                    >
                      sem foto
                    </div>
                  )}
                </Col>
                <Col>
                  <Form.Label>Foto de perfil</Form.Label>
                  <Form.Control
                    type="file"
                    name="avatar"
                    accept={ACCEPTED.join(',')}
                    onChange={onChange}
                    isInvalid={!!errors.avatar}
                    disabled={saving}
                    ref={fileInputRef}
                  />
                  <Form.Text className="text-light">
                    JPG/PNG/WEBP, até {MAX_AVATAR_MB}MB.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    {errors.avatar}
                  </Form.Control.Feedback>
                </Col>
                <Col md="auto" className="mt-3 mt-md-0">
                  <Button
                    className="btn-white-custom"
                    variant="outline-secondary"
                    type="button"
                    onClick={askRemoveAvatar} // <-- abre o modal de confirmação
                    disabled={saving || !form.avatar_url}
                  >
                    Remover foto
                  </Button>
                </Col>
              </Row>

              <div className="d-flex justify-content-end mt-3">
                <Button className="btn-white-custom" type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </Form>
          )}
        </Container>
      </div>

      {/* Modal de confirmação para remover a foto (padrão usado nas outras telas) */}
      <Modal
        show={confirmOpen}
        onHide={() => !deletingAvatar && setConfirmOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Remover foto de perfil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza de que deseja <strong>remover</strong> sua foto de perfil?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={deletingAvatar}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleRemoveAvatar} disabled={deletingAvatar}>
            {deletingAvatar ? 'Removendo…' : 'Remover'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Perfil;
