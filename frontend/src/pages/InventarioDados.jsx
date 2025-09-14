import React from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';

const requiredStep1 = [
  'unidade',
  'setor',
  'responsavel_email',
  'processo_negocio',
  'finalidade',
  'dados_pessoais',
  'tipo_dado',
  'origem',
  'formato',
  'impresso',
  'titulares',
  'dados_menores',
  'base_legal',
];

function InventarioDados() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { form, setField, loadInventario, recordId } = useInventario();

  const [warn, setWarn] = React.useState(false);

  // Se vier ?id, carrega para edição (uma vez)
  React.useEffect(() => {
    const id = params.get('id');
    if (id) loadInventario(id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validação da etapa 1
  const missing = requiredStep1.filter((k) => !String(form[k] ?? '').trim());
  const canGoNext = missing.length === 0;

  React.useEffect(() => {
    if (canGoNext && warn) setWarn(false);
  }, [canGoNext, warn]);

  const goNext = () => {
    if (!canGoNext) {
      setWarn(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(ROUTES.INVENTARIO_DADOS2 + (recordId ? `?id=${recordId}` : ''));
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#f5f5f5', // igual à página aceita
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
        <h2 className="mb-4 page-title-ink">Inventário de Dados</h2>

        <Container fluid className="container-gradient">
          {warn && (
            <Alert variant="warning">
              Existem campos obrigatórios pendentes. Preencha os campos destacados.
            </Alert>
          )}

          <Form>
            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>
                  Unidade (Matriz / Filial) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.unidade || ''}
                  onChange={(e) => setField('unidade', e.target.value)}
                  isInvalid={!String(form.unidade || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="matriz">Matriz</option>
                  <option value="filial">Filial</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>
                  Setor <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.setor || ''}
                  onChange={(e) => setField('setor', e.target.value)}
                  isInvalid={!String(form.setor || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>
                  Responsável (E-mail) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  placeholder="email@empresa.com"
                  value={form.responsavel_email || ''}
                  onChange={(e) => setField('responsavel_email', e.target.value)}
                  isInvalid={!String(form.responsavel_email || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>
                  Processo de Negócio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.processo_negocio || ''}
                  onChange={(e) => setField('processo_negocio', e.target.value)}
                  isInvalid={!String(form.processo_negocio || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Finalidade <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.finalidade || ''}
                  onChange={(e) => setField('finalidade', e.target.value)}
                  isInvalid={!String(form.finalidade || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Dados pessoais coletados / tratados{' '}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.dados_pessoais || ''}
                  onChange={(e) => setField('dados_pessoais', e.target.value)}
                  isInvalid={!String(form.dados_pessoais || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>
                  Tipo de dado <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.tipo_dado || ''}
                  onChange={(e) => setField('tipo_dado', e.target.value)}
                  isInvalid={!String(form.tipo_dado || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="sensivel">Sensível</option>
                  <option value="anonimizado">Anonimizado</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>
                  Origem <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.origem || ''}
                  onChange={(e) => setField('origem', e.target.value)}
                  isInvalid={!String(form.origem || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>
                  Formato <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.formato || ''}
                  onChange={(e) => setField('formato', e.target.value)}
                  isInvalid={!String(form.formato || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="digital">Digital</option>
                  <option value="fisico">Físico</option>
                  <option value="hibrido">Físico e Digital</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={3}>
                <Form.Label>
                  Impresso? <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.impresso || ''}
                  onChange={(e) => setField('impresso', e.target.value)}
                  isInvalid={!String(form.impresso || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Titulares dos dados <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.titulares || ''}
                  onChange={(e) => setField('titulares', e.target.value)}
                  isInvalid={!String(form.titulares || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>
                  Dados de menores <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.dados_menores || ''}
                  onChange={(e) => setField('dados_menores', e.target.value)}
                  isInvalid={!String(form.dados_menores || '').trim() && warn}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={9}>
                <Form.Label>
                  Base Legal <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.base_legal || ''}
                  onChange={(e) => setField('base_legal', e.target.value)}
                  isInvalid={!String(form.base_legal || '').trim() && warn}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <div className="d-flex justify-content-end">
              <div className="me-3 align-self-center text-light" style={{ fontSize: 13 }}>
                {!canGoNext ? 'Existem campos obrigatórios pendentes.' : ''}
              </div>
              <Button className="btn-white-custom" variant="primary" onClick={goNext}>
                Próxima Página
              </Button>
            </div>
          </Form>
        </Container>
      </div>
    </div>
  );
}

export default InventarioDados;
