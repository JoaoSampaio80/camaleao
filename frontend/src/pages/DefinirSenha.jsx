import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  ProgressBar,
  InputGroup,
  Spinner,
} from 'react-bootstrap';
import { AxiosPublic } from '../components/Axios';

const REQ = {
  min8: (s) => s.length >= 8,
  upper: (s) => /[A-Z]/.test(s),
  lower: (s) => /[a-z]/.test(s),
  digit: (s) => /\d/.test(s),
  symbol: (s) => /[^A-Za-z0-9]/.test(s),
};

function strengthInfo(pw) {
  const checks = {
    min8: REQ.min8(pw),
    upper: REQ.upper(pw),
    lower: REQ.lower(pw),
    digit: REQ.digit(pw),
    symbol: REQ.symbol(pw),
  };

  // score 0..6 (bônus por 12+)
  let score =
    (checks.min8 ? 1 : 0) +
    (checks.upper ? 1 : 0) +
    (checks.lower ? 1 : 0) +
    (checks.digit ? 1 : 0) +
    (checks.symbol ? 1 : 0) +
    (pw.length >= 12 ? 1 : 0);

  const percent = Math.min(100, Math.round((score / 6) * 100));
  let variant = 'danger';
  let label = 'Fraca';
  if (score >= 3 && score <= 4) {
    variant = 'warning';
    label = 'Média';
  }
  if (score >= 5) {
    variant = 'success';
    label = 'Forte';
  }

  return { checks, score, percent, variant, label };
}

export default function DefinirSenha() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const uid = sp.get('uid') || '';
  const token = sp.get('token') || '';

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState('success');

  // helper de mensagens (3s)
  const showFlash = (v, t, ms = 3000) => {
    setVariant(v);
    setMsg(t);
    if (ms) {
      setTimeout(() => {
        setMsg('');
      }, ms);
    }
  };

  const info = useMemo(() => strengthInfo(pw), [pw]);
  const allGood =
    info.checks.min8 &&
    info.checks.upper &&
    info.checks.lower &&
    info.checks.digit &&
    info.checks.symbol &&
    pw2.length > 0 &&
    pw === pw2 &&
    uid &&
    token;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!allGood || submitting) return;
    setSubmitting(true);
    setMsg('');
    try {
      const resp = await AxiosPublic.post('auth/password-reset/confirm/', {
        uid,
        token,
        new_password: pw,
        new_password2: pw2,
      });
      if (resp.status === 200) {
        showFlash(
          'success',
          'Senha definida com sucesso! Você já pode fazer login.',
          3000
        );
        // volta para o login em 2s (mantido)
        setTimeout(() => navigate('/login'), 2000);
      } else {
        showFlash(
          'warning',
          'Não foi possível concluir. Tente novamente. Se o problema persistir, contate o administrador.'
        );
      }
    } catch (err) {
      const st = err?.response?.status;
      const data = err?.response?.data;

      // Normaliza detalhes do backend quando vierem como objeto
      const normalized =
        data && typeof data === 'object'
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
              .join(' | ')
          : err?.message || '';

      if (st === 400) {
        // token/uid inválidos ou payload rejeitado
        showFlash(
          'danger',
          normalized ||
            'Requisição inválida. Verifique o link e tente novamente. Se o problema persistir, contate o administrador.'
        );
      } else if (st === 401 || st === 403) {
        showFlash(
          'danger',
          'Link inválido ou não autorizado. Solicite um novo e-mail de definição de senha.'
        );
      } else if (st === 410) {
        // expiração de link (quando o backend usar 410 Gone)
        showFlash(
          'danger',
          'Este link expirou. Solicite um novo e-mail de definição de senha.'
        );
      } else if (st === 429) {
        showFlash(
          'warning',
          'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
        );
      } else {
        showFlash(
          'danger',
          normalized ||
            'Falha ao salvar a senha. Se o problema persistir, contate o administrador.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const Requirement = ({ ok, children }) => (
    <div
      className={`d-flex align-items-start mb-1 ${ok ? 'text-success' : 'text-muted'}`}
    >
      <span
        aria-hidden
        className="me-2"
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 999,
          marginTop: 6,
          background: ok ? '#198754' : '#d0d7de',
        }}
      />
      <small>{children}</small>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, rgba(230,246,255,1) 0%, rgba(212,244,250,1) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <Container style={{ maxWidth: 460 }}>
        <Card className="shadow-sm" style={{ borderRadius: 14 }}>
          <Card.Body className="p-4 p-sm-5">
            <h2 style={{ fontWeight: 800, lineHeight: 1.1 }} className="mb-3">
              Definir senha
            </h2>

            {!uid || !token ? (
              <Alert variant="danger" className="mt-3">
                Link inválido ou incompleto. Solicite um novo e-mail de definição de
                senha.
              </Alert>
            ) : (
              <Form onSubmit={onSubmit} noValidate>
                <Form.Label className="mt-2">Nova senha</Form.Label>
                <InputGroup className="mb-2">
                  <Form.Control
                    type={showPw ? 'text' : 'password'}
                    // placeholder="Mínimo 8, com maiúscula, minúscula, número e símbolo"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    title={showPw ? 'Ocultar' : 'Mostrar'}
                    tabIndex={-1}
                  >
                    {showPw ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </InputGroup>

                <ProgressBar
                  now={info.percent}
                  variant={info.variant}
                  className="mb-2"
                  style={{ height: 8, borderRadius: 8 }}
                />
                <small className="d-block mb-3">
                  Força: <strong>{info.label}</strong>
                </small>

                <div className="mb-3">
                  <Requirement ok={info.checks.min8}>8+ caracteres</Requirement>
                  <Requirement ok={info.checks.upper}>
                    Pelo menos 1 letra maiúscula (A-Z)
                  </Requirement>
                  <Requirement ok={info.checks.lower}>
                    Pelo menos 1 letra minúscula (a-z)
                  </Requirement>
                  <Requirement ok={info.checks.digit}>
                    Pelo menos 1 número (0-9)
                  </Requirement>
                  <Requirement ok={info.checks.symbol}>
                    Pelo menos 1 símbolo (! @ # …)
                  </Requirement>
                </div>

                <Form.Label>Confirmar nova senha</Form.Label>
                <InputGroup className="mb-3">
                  <Form.Control
                    type={showPw2 ? 'text' : 'password'}
                    // placeholder="Repita a nova senha"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    title={showPw2 ? 'Ocultar' : 'Mostrar'}
                    tabIndex={-1}
                  >
                    {showPw2 ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </InputGroup>

                {pw2 && pw !== pw2 && (
                  <div className="mb-2">
                    <small className="text-danger">As senhas não coincidem.</small>
                  </div>
                )}

                {msg && (
                  <Alert variant={variant} className="mt-2">
                    {msg}
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={!allGood || submitting}
                  className="w-100 mt-2"
                  style={{ padding: '10px 14px', fontWeight: 600 }}
                >
                  {submitting ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                        className="me-2"
                        role="status"
                        aria-hidden
                      />
                      Salvando…
                    </>
                  ) : (
                    'Salvar senha'
                  )}
                </Button>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    Dica: use uma frase com números/símbolos. Ex.: <em>MeuCafé#2025!</em>
                  </small>
                </div>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
