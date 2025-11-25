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
  return (s || '').replace(/\D/g, '');
}

function formatPhoneBR(value) {
  const d = digitsOnly(value);
  if (!d) return '';

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

        const avatar_url = data.avatar_url || '';

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
        <h2 className="mb-4 page-title-ink text-center">
          Encarregado de Proteção de Dados (DPO)
        </h2>

        {message && <Alert variant={variant}>{message}</Alert>}

        {/* bloco no gradiente como nas outras páginas */}
        <Container fluid className="container-gradient" style={{ maxWidth: 960 }}>
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
                      <Image
                        src={safe.avatar_url}
                        roundedCircle
                        width={96}
                        height={96}
                        alt="Avatar do DPO"
                        style={{ objectFit: 'cover', background: '#fff' }}
                      />
                    </Col>
                    <Col>
                      <h5 className="mb-1 text-white">
                        {safe.nome} <span className="badge bg-light text-dark">DPO</span>
                      </h5>
                      {/* <div className="text-light" style={{ fontSize: 14 }}>
                      Válido até <strong>{safe.validade ? fmtBR(safe.validade) : '-'}</strong>
                    </div> */}
                    </Col>
                  </Row>

                  <hr className="my-4" style={{ borderColor: 'rgba(255,255,255,.25)' }} />

                  <Row>
                    <Col md={6}>
                      <div className="mb-2">
                        <small className="text-light d-block">E-mail</small>
                        {safe.email !== '-' ? (
                          <a className="link-light" href={`mailto:${safe.email}`}>
                            {safe.email}
                          </a>
                        ) : (
                          <span className="text-white">-</span>
                        )}
                      </div>
                      <div className="mb-2">
                        <small className="text-light d-block">Telefone</small>
                        {dpo?.telefone ? (
                          (() => {
                            const telDigits = digitsOnly(dpo.telefone);
                            const telMasked = formatPhoneBR(dpo.telefone);
                            return telDigits ? (
                              <a className="link-light" href={`tel:${telDigits}`}>
                                {telMasked}
                              </a>
                            ) : (
                              <span className="text-white">-</span>
                            );
                          })()
                        ) : (
                          <span className="text-white">-</span>
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-2">
                        <small className="text-light d-block">Data da nomeação</small>
                        <span className="text-white">
                          {safe.dataNomeacao ? fmtBR(safe.dataNomeacao) : '-'}
                        </span>
                      </div>
                      <div className="mb-2">
                        <small className="text-light d-block">Validade</small>
                        <span className="text-white">
                          {safe.validade ? fmtBR(safe.validade) : '-'}
                        </span>
                      </div>
                    </Col>
                  </Row>
                </>
              );
            })()
          ) : (
            <div className="py-5 text-center text-white-50">Nenhum DPO encontrado.</div>
          )}
        </Container>
      </div>
    </div>
  );
}
