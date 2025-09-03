import React from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';

const requiredStep2 = [
  'pessoas_acesso',
  'atualizacoes',
  'transmissao_interna',
  'transmissao_externa',
  'local_armazenamento_digital',
  'controlador_operador',
  'motivo_retencao',
  'periodo_retencao',
  'exclusao',
  'forma_exclusao',
  'transferencia_terceiros',
  'quais_dados_transferidos',
  'transferencia_internacional',
  'empresa_terceira',
];

function InventarioDados2() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { form, setField, loadInventario, recordId } = useInventario();

  const [warn, setWarn] = React.useState(false);

  React.useEffect(() => {
    const id = params.get('id');
    if (id) loadInventario(id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missing = requiredStep2.filter((k) => !String(form[k] ?? '').trim());
  const canGoNext = missing.length === 0;

  React.useEffect(() => {
    if (canGoNext && warn) setWarn(false);
  }, [canGoNext, warn]);

  const goBack = () => {
    navigate(ROUTES.INVENTARIO_DADOS + (recordId ? `?id=${recordId}` : ''));
  };

  const goNext = () => {
    if (!canGoNext) {
      setWarn(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(ROUTES.INVENTARIO_DADOS3 + (recordId ? `?id=${recordId}` : ''));
  };

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
        <h2 className="mb-4" style={{ color: '#071744' }}>Inventário de dados</h2>

        <Container fluid style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
          {warn && (
            <Alert variant="warning">
              Existem campos obrigatórios pendentes. Preencha os campos destacados.
            </Alert>
          )}

          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Pessoas com acesso <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.pessoas_acesso || ''}
                  onChange={(e) => setField('pessoas_acesso', e.target.value)}
                  isInvalid={!String(form.pessoas_acesso || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Atualizações (Quando ocorrem?) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.atualizacoes || ''}
                  onChange={(e) => setField('atualizacoes', e.target.value)}
                  isInvalid={!String(form.atualizacoes || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Transmissão Interna <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.transmissao_interna || ''}
                  onChange={(e) => setField('transmissao_interna', e.target.value)}
                  isInvalid={!String(form.transmissao_interna || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Transmissão Externa <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.transmissao_externa || ''}
                  onChange={(e) => setField('transmissao_externa', e.target.value)}
                  isInvalid={!String(form.transmissao_externa || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>Local de Armazenamento (Digital) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.local_armazenamento_digital || ''}
                  onChange={(e) => setField('local_armazenamento_digital', e.target.value)}
                  isInvalid={!String(form.local_armazenamento_digital || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={4}>
                <Form.Label>Controlador / Operador <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={form.controlador_operador || ''}
                  onChange={(e) => setField('controlador_operador', e.target.value)}
                  isInvalid={!String(form.controlador_operador || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="controlador">Controlador</option>
                  <option value="operador">Operador</option>
                  <option value="ambos">Ambos</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={4}>
                <Form.Label>Motivo de Retenção <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.motivo_retencao || ''}
                  onChange={(e) => setField('motivo_retencao', e.target.value)}
                  isInvalid={!String(form.motivo_retencao || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>Período de Retenção <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.periodo_retencao || ''}
                  onChange={(e) => setField('periodo_retencao', e.target.value)}
                  isInvalid={!String(form.periodo_retencao || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={3}>
                <Form.Label>Exclusão <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.exclusao || ''}
                  onChange={(e) => setField('exclusao', e.target.value)}
                  isInvalid={!String(form.exclusao || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={3}>
                <Form.Label>Forma de exclusão <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.forma_exclusao || ''}
                  onChange={(e) => setField('forma_exclusao', e.target.value)}
                  isInvalid={!String(form.forma_exclusao || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={3}>
                <Form.Label>Ocorre transferência para terceiros? <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={form.transferencia_terceiros || ''}
                  onChange={(e) => setField('transferencia_terceiros', e.target.value)}
                  isInvalid={!String(form.transferencia_terceiros || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Quais dados são transferidos? <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.quais_dados_transferidos || ''}
                  onChange={(e) => setField('quais_dados_transferidos', e.target.value)}
                  isInvalid={!String(form.quais_dados_transferidos || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Ocorre Transferência Internacional? <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={form.transferencia_internacional || ''}
                  onChange={(e) => setField('transferencia_internacional', e.target.value)}
                  isInvalid={!String(form.transferencia_internacional || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col>
                <Form.Label>Empresa terceira <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.empresa_terceira || ''}
                  onChange={(e) => setField('empresa_terceira', e.target.value)}
                  isInvalid={!String(form.empresa_terceira || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button variant="primary" onClick={goBack}>
                Voltar
              </Button>

              <div className="d-flex align-items-center gap-3">
                <div className="text-muted" style={{ fontSize: 13 }}>
                  {!canGoNext ? 'Existem campos obrigatórios pendentes.' : ''}
                </div>
                <Button variant="primary" onClick={goNext}>
                  Próxima Página
                </Button>
              </div>
            </div>

          </Form>
        </Container>
      </div>
    </div>
  );
}

export default InventarioDados2;