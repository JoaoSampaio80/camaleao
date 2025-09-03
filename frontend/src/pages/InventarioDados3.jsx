import React from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';

function InventarioDados3() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const { form, setField, loadInventario, saveInventario, recordId, reset } = useInventario();

  const [saving, setSaving] = React.useState(false);
  const [warn, setWarn] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [variant, setVariant] = React.useState('');

  React.useEffect(() => {
    const id = params.get('id');
    if (id) {
      loadInventario(id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    reset();
    setMsg('');
    setVariant('');
    setWarn(false);
    navigate(location.pathname, { replace: true });
  };

  const startEdit = () => {
    const input = window.prompt('Informe o ID do inventário para editar:');
    if (!input) return;
    setMsg('');
    setVariant('');
    setWarn(false);
    navigate(`${location.pathname}?id=${encodeURIComponent(input.trim())}`);
  };

  // next: 'new' | 'list'
  const handleSave = async (next) => {
    if (!next) return;
    setMsg('');
    setVariant('');
    setSaving(true);
    try {
      const saved = await saveInventario(); // valida servidor (POST/PATCH)
      const okMsg = recordId ? 'Inventário atualizado com sucesso.' : 'Inventário criado com sucesso.';

      setWarn(false);

      if (next === 'new') {
        reset();
        // opcional: mostrar sucesso antes de voltar para a página 1
        // setVariant('success'); setMsg(okMsg);
        navigate(ROUTES.INVENTARIO_DADOS);
        return;
      }

      if (next === 'list') {
        // envia flash p/ a lista
        reset();
        navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: okMsg } });
        return;
      }
    } catch (e) {
      if (e?.type === 'validation') {
        setWarn(true);
        setVariant('warning');
        setMsg('Existem campos obrigatórios pendentes. Preencha os campos destacados nas etapas.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const st = e?.response?.status;
        const detail = e?.response?.data?.detail;
        setVariant('danger');
        if (st === 403) setMsg('Você não tem permissão para salvar este inventário.');
        else setMsg(detail || 'Falha ao salvar inventário.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Campos desta etapa (para destacar quando warn=true)
  const invalidAdequado = !String(form.adequado_contratualmente || '').trim() && warn;
  const invalidPaises   = !String(form.paises_tratamento || '').trim() && warn;
  const invalidMedidas  = !String(form.medidas_seguranca || '').trim() && warn;
  const invalidConsents = !String(form.consentimentos || '').trim() && warn;
  // observacao é opcional -> nunca inválido

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
        <div className="d-flex w-100 align-items-center justify-content-between" style={{ maxWidth: 1280 }}>
          <h2 className="mb-4" style={{ color: '#071744' }}>Inventário de dados</h2>
          <div className="mb-3 d-flex align-items-center gap-2">
            <small className="text-muted me-3">
              {recordId ? `Editando ID #${recordId}` : 'Novo inventário'}
            </small>
            <Button variant="outline-secondary" size="sm" onClick={startNew}>Novo</Button>
            <Button variant="outline-primary" size="sm" onClick={startEdit}>Editar…</Button>
          </div>
        </div>

        <Container fluid style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
          {msg && <Alert variant={variant}>{msg}</Alert>}

          <Form>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>
                  Adequado Contratualmente? <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.adequado_contratualmente || ''}
                  onChange={(e) => setField('adequado_contratualmente', e.target.value)}
                  isInvalid={invalidAdequado}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>

              <Col md={4}>
                <Form.Label>
                  Países Envolvidos no Tratamento <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.paises_tratamento || ''}
                  onChange={(e) => setField('paises_tratamento', e.target.value)}
                  isInvalid={invalidPaises}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Medidas de Segurança Envolvidas <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.medidas_seguranca || ''}
                  onChange={(e) => setField('medidas_seguranca', e.target.value)}
                  isInvalid={invalidMedidas}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Consentimentos <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.consentimentos || ''}
                  onChange={(e) => setField('consentimentos', e.target.value)}
                  isInvalid={invalidConsents}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Observação</Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.observacao || ''}
                  onChange={(e) => setField('observacao', e.target.value)}
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.INVENTARIO_DADOS2 + (recordId ? `?id=${recordId}` : ''))}
              >
                Voltar
              </Button>

              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  onClick={() => handleSave('new')}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar e novo'}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => handleSave('list')}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar e ir para a lista'}
                </Button>
              </div>
            </div>
          </Form>
        </Container>
      </div>
    </div>
  );
}

export default InventarioDados3;