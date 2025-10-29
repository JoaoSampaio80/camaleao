// src/pages/InventarioDados.jsx
import React from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';
import SaveCancelBar from '../components/SaveCancelBar';
import { toast } from 'react-toastify';
import TooltipInfo from '../components/TooltipInfo';

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

const fieldsThisStep = [...requiredStep1];

// Nomes amigáveis para as mensagens
const FIELD_LABELS = {
  unidade: 'Unidade (Matriz / Filial)',
  setor: 'Setor',
  responsavel_email: 'Responsável (E-mail)',
  processo_negocio: 'Processo de Negócio',
  finalidade: 'Finalidade',
  dados_pessoais: 'Dados pessoais coletados / tratados',
  tipo_dado: 'Tipo de dado',
  origem: 'Origem',
  formato: 'Formato',
  impresso: 'Impresso?',
  titulares: 'Titulares dos dados',
  dados_menores: 'Dados de menores',
  base_legal: 'Base Legal',
};

function normalizeServerErrors(data) {
  // Espera algo no formato DRF: { campo: ["msg1","msg2"], non_field_errors: [...], detail: "..." }
  const map = {};
  if (!data || typeof data !== 'object') return map;

  // detail genérico
  if (data.detail) {
    map._general = Array.isArray(data.detail) ? data.detail : [String(data.detail)];
  }

  Object.entries(data).forEach(([k, v]) => {
    if (k === 'detail') return;
    if (Array.isArray(v)) map[k] = v.map((x) => String(x));
    else if (typeof v === 'string') map[k] = [v];
    else if (v && typeof v === 'object') map[k] = [JSON.stringify(v)];
  });

  return map;
}

function InventarioDados() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { form, setField, loadInventario, recordId, saveStep, reload, reset } =
    useInventario();

  const [warn, setWarn] = React.useState(false);
  const [savingStep, setSavingStep] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState({}); // <— novo

  // toast padrão 3s
  const TOAST = { autoClose: 3000 };

  // Se vier ?id, carrega para edição (uma vez)
  React.useEffect(() => {
    const id = params.get('id');
    if (id) loadInventario(id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validação da etapa 1 (cliente)
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

  // ===== Salvar/Cancelar SOMENTE desta página =====
  async function handleSaveStep() {
    if (!recordId) {
      const msg =
        'Para salvar esta página, primeiro é necessário estar em modo de edição.';
      try {
        toast.warn(msg, TOAST);
      } catch {}
      return;
    }
    setSavingStep(true);
    setServerErrors({}); // limpa erros antigos
    try {
      await saveStep(fieldsThisStep); // PATCH só dos campos do step
      await reload(); // mantém o form sincronizado
      const okMsg = 'Item atualizado com sucesso.';
      try {
        toast.success(okMsg, TOAST);
      } catch {}
      navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: okMsg } });
    } catch (e) {
      const payload = e?.response?.data;
      const mapped = normalizeServerErrors(payload);

      // Se vier APENAS non_field_errors, trata como mensagem geral
      const onlyNonField =
        mapped?.non_field_errors &&
        !Object.keys(mapped).some((k) => !['_general', 'non_field_errors'].includes(k));

      if (onlyNonField) {
        setServerErrors({ _general: mapped.non_field_errors });
        const msg =
          mapped.non_field_errors[0] ||
          'Falha ao salvar esta página. Se o problema persistir, contate o administrador.';
        try {
          toast.error(msg, TOAST);
        } catch {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setServerErrors(mapped);
        const firstField = Object.keys(mapped).find(
          (k) => !['_general', 'non_field_errors'].includes(k)
        );
        const firstMsg =
          (firstField && mapped[firstField]?.[0]) ||
          mapped._general?.[0] ||
          'Falha ao salvar esta página. Se o problema persistir, contate o administrador.';
        try {
          toast.error(
            firstField
              ? `${FIELD_LABELS[firstField] || firstField}: ${firstMsg}`
              : firstMsg,
            TOAST
          );
        } catch {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSavingStep(false);
    }
  }

  function handleCancelStep() {
    reset();
    const msg = 'Operação cancelada.';
    try {
      toast.info(msg, TOAST);
    } catch {}
    navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: msg } });
  }

  // helper para invalidar campo
  const isInvalid = (key) =>
    (!!serverErrors[key] && serverErrors[key].length > 0) ||
    (!String(form[key] || '').trim() && warn);

  // Lista consolidada para o Alert
  const consolidatedErrors = React.useMemo(() => {
    const list = [];
    Object.entries(serverErrors).forEach(([k, arr]) => {
      if (k === '_general' || k === 'non_field_errors') return; // nunca listar non_field_errors
      (arr || []).forEach((msg) => list.push(`${FIELD_LABELS[k] || k}: ${msg}`));
    });
    (serverErrors._general || []).forEach((msg) => list.push(String(msg)));
    return list;
  }, [serverErrors]);

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
        <h2 className="mb-4 page-title-ink">Inventário de Dados</h2>

        <Container fluid className="container-gradient">
          {warn && (
            <Alert variant="warning">
              Existem campos obrigatórios pendentes. Preencha os campos destacados.
            </Alert>
          )}
          {consolidatedErrors.length > 0 && (
            <Alert variant="danger">
              <strong>Não foi possível salvar. Corrija os itens abaixo:</strong>
              <ul className="mb-0">
                {consolidatedErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
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
                  isInvalid={isInvalid('unidade')}
                >
                  <option value=""></option>
                  <option value="matriz">Matriz</option>
                  <option value="filial">Filial</option>
                  <option value="matriz_filial">Matriz / Filial</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.unidade?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.unidade[0]}
                  </div>
                )}
              </Col>

              <Col md={3}>
                <Form.Label>
                  Setor <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.setor || ''}
                  onChange={(e) => setField('setor', e.target.value)}
                  isInvalid={isInvalid('setor')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.setor?.[0] && (
                  <div className="invalid-feedback d-block">{serverErrors.setor[0]}</div>
                )}
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
                  isInvalid={isInvalid('responsavel_email')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.responsavel_email?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.responsavel_email[0]}
                  </div>
                )}
              </Col>

              <Col md={3}>
                <Form.Label>
                  Processo de Negócio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.processo_negocio || ''}
                  onChange={(e) => setField('processo_negocio', e.target.value)}
                  isInvalid={isInvalid('processo_negocio')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.processo_negocio?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.processo_negocio[0]}
                  </div>
                )}
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
                  isInvalid={isInvalid('finalidade')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.finalidade?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.finalidade[0]}
                  </div>
                )}
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
                  isInvalid={isInvalid('dados_pessoais')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.dados_pessoais?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.dados_pessoais[0]}
                  </div>
                )}
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
                  isInvalid={isInvalid('tipo_dado')}
                >
                  <option value=""></option>
                  <option value="pessoal">Pessoal</option>
                  <option value="sensivel">Sensível</option>
                  <option value="anonimizado">Anonimizado</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.tipo_dado?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.tipo_dado[0]}
                  </div>
                )}
              </Col>

              <Col md={3}>
                <Form.Label>
                  Origem <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.origem || ''}
                  onChange={(e) => setField('origem', e.target.value)}
                  isInvalid={isInvalid('origem')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.origem?.[0] && (
                  <div className="invalid-feedback d-block">{serverErrors.origem[0]}</div>
                )}
              </Col>

              <Col md={3}>
                <Form.Label>
                  Formato <span className="text-danger">*</span>
                  <TooltipInfo message="Físico ou digital?" />
                </Form.Label>
                <Form.Select
                  value={form.formato || ''}
                  onChange={(e) => setField('formato', e.target.value)}
                  isInvalid={isInvalid('formato')}
                >
                  <option value=""></option>
                  <option value="digital">Digital</option>
                  <option value="fisico">Físico</option>
                  <option value="hibrido">Físico e Digital</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.formato?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.formato[0]}
                  </div>
                )}
              </Col>

              <Col md={3}>
                <Form.Label>
                  Impresso? <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.impresso || ''}
                  onChange={(e) => setField('impresso', e.target.value)}
                  isInvalid={isInvalid('impresso')}
                >
                  <option value=""></option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.impresso?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.impresso[0]}
                  </div>
                )}
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
                  isInvalid={isInvalid('titulares')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.titulares?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.titulares[0]}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>
                  Dados de menores <span className="text-danger">*</span>
                  <TooltipInfo message="Dados de criança / adolescente ou vulnerável?" />
                </Form.Label>
                <Form.Select
                  value={form.dados_menores || ''}
                  onChange={(e) => setField('dados_menores', e.target.value)}
                  isInvalid={isInvalid('dados_menores')}
                >
                  <option value=""></option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.dados_menores?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.dados_menores[0]}
                  </div>
                )}
              </Col>

              <Col md={9}>
                <Form.Label>
                  Base Legal <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.base_legal || ''}
                  onChange={(e) => setField('base_legal', e.target.value)}
                  isInvalid={isInvalid('base_legal')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {serverErrors.base_legal?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.base_legal[0]}
                  </div>
                )}
              </Col>
            </Row>

            {recordId && (
              <SaveCancelBar
                className="mt-3"
                onSave={handleSaveStep}
                onCancel={handleCancelStep}
                saving={savingStep}
                disabled={false}
              />
            )}

            {/* Navegação / Cancelar (modo criação também) */}
            <div
              className={`d-flex mt-4 ${
                recordId ? 'justify-content-end' : 'justify-content-between'
              }`}
            >
              {!recordId && (
                <Button
                  type="button"
                  className="btn-white-custom"
                  variant="outline-secondary"
                  onClick={handleCancelStep}
                >
                  Cancelar
                </Button>
              )}

              <div className="d-flex align-items-center">
                <div
                  className="me-3 align-self-center text-light"
                  style={{ fontSize: 13 }}
                >
                  {!canGoNext ? 'Existem campos obrigatórios pendentes.' : ''}
                </div>
                <Button
                  type="button"
                  className="btn-white-custom"
                  variant="primary"
                  onClick={goNext}
                >
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

export default InventarioDados;
