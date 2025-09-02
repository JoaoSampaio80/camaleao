import React, { useEffect, useState } from 'react';
import { Container, Card, Spinner, Alert, Image, Row, Col } from 'react-bootstrap';
import AxiosInstance from '../components/Axios';
import Sidebar from '../components/Sidebar';

function addYearsSafe(iso, years) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const targetMonth = d.getMonth();
  const res = new Date(d);
  res.setFullYear(d.getFullYear() + years);
  if (res.getMonth() !== targetMonth) res.setDate(0); // 29/02 -> 28/02
  return res.toISOString();
}

function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

function formatPhoneBR(value) {
  const d = digitsOnly(value);
  if (!d) return "";

  const ddd = d.slice(0, 2);
  if (d.length <= 6) {
    // exibe parcialmente enquanto não completo
    return `(${ddd}) ${d.slice(2)}`.trim();
  }
  if (d.length <= 10) {
    // 10 dígitos: (XX) XXXX-XXXX
    return `(${ddd}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  // 11+ dígitos: (XX) XXXXX-XXXX
  return `(${ddd}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

function fmtBR(iso) {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export default function Encarregado() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('');
  const [dpo, setDpo] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Mesmo padrão do Perfil: usa o AxiosInstance e caminho relativo
        const resp = await AxiosInstance.get('users/dpo/');

        const data = resp?.data || {};
        const nome =
          [data.first_name, data.last_name].filter(Boolean).join(' ') ||
          data.email ||
          data.username ||
          '-';

        const email = data.email || '-';
        const telefone = data.phone_number || '-';
        const dataNomeacao = data.appointment_date || null;

        // Preferir a validade vinda da API; se não existir, calcular +2 anos
        const validade =
          data.appointment_validity ||
          (dataNomeacao ? addYearsSafe(dataNomeacao, 2) : null);

        const avatar_url = data.avatar || '';

        if (!mounted) return;
        setDpo({ nome, email, telefone, dataNomeacao, validade, avatar_url });
        setVariant('');
        setMessage('');
      } catch (err) {
        if (!mounted) return;
        const st = err?.response?.status;
        const detail = err?.response?.data?.detail;
        setVariant(st === 404 ? 'warning' : 'danger');
        setMessage(detail || 'Não foi possível carregar os dados do DPO.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
        <h2 className="mb-4" style={{ color: '#071744' }}>
          Encarregado de Proteção de Dados (DPO)
        </h2>

        {message && <Alert variant={variant}>{message}</Alert>}

        <Container fluid style={{ maxWidth: 960 }}>
          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="py-5 text-center">
                  <Spinner animation="border" role="status" />
                </div>
              ) : dpo ? (
                (() => {
                  const safe = {
                    avatar_url: dpo?.avatar_url || '',
                    nome: dpo?.nome || '-',
                    email: dpo?.email || '-',
                    telefone: dpo?.telefone || '-',
                    dataNomeacao: dpo?.dataNomeacao || null,
                    validade: dpo?.validade || null,
                  };
                  return (
                    <>
                      <Row className="mb-4 align-items-center">
                        <Col md="auto">
                          {safe.avatar_url ? (
                            <Image
                              src={safe.avatar_url}
                              roundedCircle
                              width={96}
                              height={96}
                              alt="Avatar do DPO"
                              style={{ objectFit: 'cover' }}
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
                          <h5 className="mb-1" style={{ color: '#071744' }}>
                            {safe.nome} <span className="badge bg-primary">DPO</span>
                          </h5>
                          {/* <div className="text-muted" style={{ fontSize: 14 }}>
                            Válido até <strong>{safe.validade ? fmtBR(safe.validade) : '-'}</strong>
                          </div> */}
                        </Col>
                      </Row>

                      <hr className="my-4" />

                      <Row>
                        <Col md={6}>
                          <div className="mb-2">
                            <small className="text-muted d-block">Email</small>
                            {safe.email !== '-' ? (
                              <a href={`mailto:${safe.email}`}>{safe.email}</a>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                          <div className="mb-2">
                            <small className="text-muted d-block">Telefone</small>
                            {dpo?.telefone ? (
                              (() => {
                                const telDigits = digitsOnly(dpo.telefone);
                                const telMasked = formatPhoneBR(dpo.telefone);
                                return telDigits ? <a href={`tel:${telDigits}`}>{telMasked}</a> : <span>-</span>;
                              })()                            
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="mb-2">
                            <small className="text-muted d-block">Data da nomeação</small>
                            <span>{safe.dataNomeacao ? fmtBR(safe.dataNomeacao) : '-'}</span>
                          </div>
                          <div className="mb-2">
                            <small className="text-muted d-block">Validade</small>
                            <span>{safe.validade ? fmtBR(safe.validade) : '-'}</span>
                          </div>
                        </Col>
                      </Row>
                    </>
                  );
                })()
              ) : (
                <div className="py-5 text-center text-muted">Nenhum DPO encontrado.</div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}