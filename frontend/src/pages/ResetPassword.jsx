import React, { useMemo, useState } from 'react';
import { Card, Form, Button, Alert, InputGroup, ProgressBar } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosPublic } from '../components/Axios';
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

  // helper de mensagens (1,5s)
  const showFlash = (v, t, ms = 1500) => {
    setVariant(v);
    setMsg(t);
    if (ms) {
      setTimeout(() => setMsg(''), ms);
    }
  };

  const canSubmit = Boolean(uid && token && p1 && p2);
  const invalidLink = !uid || !token;

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setVariant('success');

    if (p1 !== p2) {
      showFlash('danger', 'As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await AxiosPublic.post('auth/password-reset/confirm/', {
        uid,
        token,
        new_password: p1,
        new_password2: p2,
      });
      if (resp.status === 200) {
        showFlash('success', 'Senha redefinida com sucesso. Você já pode entrar.');
        setTimeout(() => navigate(ROUTES.LOGIN), 1500); // mantido
      } else {
        showFlash(
          'warning',
          'Não foi possível concluir. Tente novamente. Se o problema persistir, contate o administrador.'
        );
      }
    } catch (err) {
      const st = err?.response?.status;
      const data = err?.response?.data;

      // Normaliza mensagens vindas do backend
      const normalizedObj =
        data && typeof data === 'object'
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
              .join(' | ')
          : '';

      if (Array.isArray(data?.new_password) && data.new_password.length) {
        showFlash('danger', data.new_password.join(' '));
      } else if (st === 400) {
        showFlash(
          'danger',
          normalizedObj ||
            'Requisição inválida. Verifique o link e tente novamente. Se o problema persistir, contate o administrador.'
        );
      } else if (st === 401 || st === 403) {
        showFlash(
          'danger',
          'Link inválido ou não autorizado. Solicite um novo e-mail de redefinição.'
        );
      } else if (st === 410) {
        showFlash('danger', 'Este link expirou. Solicite um novo e-mail de redefinição.');
      } else if (st === 429) {
        showFlash(
          'warning',
          'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
        );
      } else {
        showFlash(
          'danger',
          data?.detail ||
            'Link inválido ou expirado. Se o problema persistir, contate o administrador.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Estados para mostrar/ocultar os campos
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  // Critérios de senha + medidor
  const criteria = {
    len: p1.length >= 8,
    upper: /[A-Z]/.test(p1),
    lower: /[a-z]/.test(p1),
    digit: /\d/.test(p1),
    special: /[^A-Za-z0-9]/.test(p1),
  };
  const score = Object.values(criteria).filter(Boolean).length;
  const meterNow = (score / 5) * 100;
  const meterVariant = ['danger', 'danger', 'warning', 'info', 'success'][
    Math.max(0, score - 1)
  ];
  const meterLabel = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'][
    Math.max(0, score - 1)
  ];

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 600px at 20% -10%, #d6f3f9 30%, transparent 60%), radial-gradient(900px 500px at 120% 110%, #e8eefc 20%, #f5f7fb 60%)',
        padding: '24px',
      }}
    >
      <Card
        className="shadow-lg border-0"
        style={{ width: '100%', maxWidth: 1100, borderRadius: 18 }}
      >
        <div className="row g-0">
          {/* Painel ilustrativo */}
          <div
            className="col-lg-6 d-none d-lg-flex flex-column justify-content-between"
            style={{
              background:
                'linear-gradient(135deg, #071744 0%, #0b2c7a 55%, #2b7de9 120%)',
              color: 'white',
              borderTopLeftRadius: 18,
              borderBottomLeftRadius: 18,
              padding: '32px 28px',
            }}
          >
            <div>
              <div className="mb-3" style={{ opacity: 0.9 }}>
                <span
                  className="badge rounded-pill"
                  style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 600 }}
                >
                  Segurança de Acesso
                </span>
              </div>
              <h3 className="fw-semibold mb-2">Redefinir senha</h3>
              <p className="mb-0" style={{ opacity: 0.9 }}>
                Crie uma senha forte para proteger sua conta no <strong>Camaleão</strong>.
                Você verá dicas em tempo real enquanto digita.
              </p>
            </div>

            <div className="d-flex align-items-center mt-4" style={{ opacity: 0.9 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)',
                }}
                className="me-3 d-flex align-items-center justify-content-center"
              >
                🔒
              </div>
              <div>
                <div className="fw-semibold">Dica</div>
                <div>Use uma mistura de letras, números e símbolos.</div>
              </div>
            </div>
          </div>

          {/* Painel do formulário */}
          <div className="col-lg-6">
            <Card.Body className="p-4 p-lg-5">
              <div className="mb-3 text-center text-lg-start">
                <h4 className="mb-1">Redefinir senha</h4>
                <div className="text-muted">Escolha uma nova senha para continuar.</div>
              </div>

              {invalidLink ? (
                <Alert variant="danger" className="mb-4">
                  Link inválido ou expirado. Solicite novamente em{' '}
                  <strong>Esqueci a senha</strong>.
                </Alert>
              ) : (
                <Form onSubmit={onSubmit} noValidate>
                  {msg && <Alert variant={variant}>{msg}</Alert>}

                  {/* Campo: Nova senha */}
                  <Form.Group className="mb-3">
                    <Form.Label>Nova senha</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={show1 ? 'text' : 'password'}
                        value={p1}
                        onChange={(e) => setP1(e.target.value)}
                        placeholder="Digite a nova senha"
                        autoComplete="new-password"
                        required
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShow1((v) => !v)}
                        tabIndex={-1}
                      >
                        {show1 ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  {/* Medidor de força */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Força da senha</span>
                      <span className="text-capitalize">{p1 ? meterLabel : '—'}</span>
                    </div>
                    <ProgressBar
                      now={meterNow}
                      variant={p1 ? meterVariant : 'secondary'}
                    />
                  </div>

                  {/* Checklist de critérios */}
                  <div className="mb-3 small">
                    <div className="text-muted mb-1">A senha deve conter:</div>
                    <ul className="mb-0 ps-3">
                      <li className={criteria.len ? 'text-success' : 'text-muted'}>
                        {criteria.len ? '✔' : '•'} pelo menos 8 caracteres
                      </li>
                      <li className={criteria.upper ? 'text-success' : 'text-muted'}>
                        {criteria.upper ? '✔' : '•'} letra maiúscula (A–Z)
                      </li>
                      <li className={criteria.lower ? 'text-success' : 'text-muted'}>
                        {criteria.lower ? '✔' : '•'} letra minúscula (a–z)
                      </li>
                      <li className={criteria.digit ? 'text-success' : 'text-muted'}>
                        {criteria.digit ? '✔' : '•'} número (0–9)
                      </li>
                      <li className={criteria.special ? 'text-success' : 'text-muted'}>
                        {criteria.special ? '✔' : '•'} símbolo (ex.: ! @ # $ %)
                      </li>
                    </ul>
                  </div>

                  {/* Campo: Confirmar */}
                  <Form.Group className="mb-4">
                    <Form.Label>Confirmar nova senha</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={show2 ? 'text' : 'password'}
                        value={p2}
                        onChange={(e) => setP2(e.target.value)}
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        required
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShow2((v) => !v)}
                        tabIndex={-1}
                      >
                        {show2 ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100"
                    disabled={!canSubmit || submitting}
                  >
                    {submitting ? 'Salvando…' : 'Redefinir senha'}
                  </Button>

                  <div className="text-center mt-3">
                    <a href="/login" className="small text-decoration-none">
                      Voltar ao login
                    </a>
                  </div>
                </Form>
              )}
            </Card.Body>
          </div>
        </div>
      </Card>
    </div>
  );
}
