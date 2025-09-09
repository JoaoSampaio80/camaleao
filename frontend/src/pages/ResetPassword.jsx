import React, { useMemo, useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import AxiosInstance from '../components/Axios';
import { ROUTES } from '../routes';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Corrige casos em que o link veio com &amp; no lugar de &
  const fixedSearch = useMemo(
    () => (location.search || '').replace(/&amp;/g, '&'),
    [location.search]
  );

  const params = useMemo(() => new URLSearchParams(fixedSearch), [fixedSearch]);

  const uid = useMemo(() => (params.get('uid') || '').trim(), [params]);
  const token = useMemo(() => (params.get('token') || '').trim(), [params]);

  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState('success');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(uid && token && p1 && p2);
  const invalidLink = !uid || !token;

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setVariant('success');

    if (p1 !== p2) {
      setMsg('As senhas não coincidem.');
      setVariant('danger');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await AxiosInstance.post('auth/password-reset/confirm/', {
        uid,
        token,
        new_password: p1,
        new_password2: p2,
      });
      if (resp.status === 200) {
        setMsg('Senha redefinida com sucesso. Você já pode entrar.');
        setVariant('success');
        setTimeout(() => navigate(ROUTES.LOGIN), 1500);
      }
    } catch (err) {
      const data = err?.response?.data;
      if (Array.isArray(data?.new_password) && data.new_password.length) {
        setMsg(data.new_password.join(' ')); // mensagens dos validadores do Django
        setVariant('danger');
      } else {
        setMsg(data?.detail || 'Link inválido ou expirado.');
        setVariant('danger');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      <Card className="shadow border-0" style={{ width: '100%', maxWidth: 1420 }}>
        <Card.Body className="p-4">
          <h4 className="mb-3 text-center">Redefinir senha</h4>

          {invalidLink && (
            <Alert variant="danger">
              Link inválido. Solicite novamente em <strong>Esqueci a senha</strong>.
            </Alert>
          )}

          {!invalidLink && (
            <Form onSubmit={onSubmit}>
              {msg && <Alert variant={variant}>{msg}</Alert>}

              <Form.Group className="mb-3">
                <Form.Label>Nova senha</Form.Label>
                <Form.Control
                  type="password"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  placeholder="Digite a nova senha"
                  autoComplete="new-password"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Confirmar nova senha</Form.Label>
                <Form.Control
                  type="password"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  required
                />
              </Form.Group>

              <Button type="submit" className="w-100" disabled={!canSubmit || submitting}>
                {submitting ? 'Salvando...' : 'Redefinir'}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}