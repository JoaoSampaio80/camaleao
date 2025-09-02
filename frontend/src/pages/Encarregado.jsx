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
                <>
                  <Row className="mb-4 align-items-center">
                    <Col md="auto">
                      {dpo.avatar_url ? (
                        <Image
                          src={dpo.avatar_url}
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
                      <div className="mb-2">
                        <strong>Nome:</strong>
                        <div>{dpo.nome}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Email:</strong>
                        <div>{dpo.email}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Telefone:</strong>
                        <div>{dpo.telefone}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Data da nomeação:</strong>
                        <div>{fmtBR(dpo.dataNomeacao)}</div>
                      </div>
                      <div className="mb-0">
                        <strong>Validade da nomeação:</strong>
                        <div>{fmtBR(dpo.validade)}</div>
                      </div>
                    </Col>
                  </Row>
                </>
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