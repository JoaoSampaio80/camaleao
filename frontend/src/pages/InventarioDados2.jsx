// src/pages/InventarioDados2.jsx
import React from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';
import SaveCancelBar from '../components/SaveCancelBar';
import { toast } from 'react-toastify';

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
const fieldsThisStep = [...requiredStep2];

const FIELD_LABELS = {
  pessoas_acesso: 'Pessoas com acesso',
  atualizacoes: 'Atualizações',
  transmissao_interna: 'Transmissão Interna',
  transmissao_externa: 'Transmissão Externa',
  local_armazenamento_digital: 'Local de Armazenamento (Digital)',
  controlador_operador: 'Controlador / Operador',
  motivo_retencao: 'Motivo de Retenção',
  periodo_retencao: 'Período de Retenção',
  exclusao: 'Exclusão',
  forma_exclusao: 'Forma de exclusão',
  transferencia_terceiros: 'Transferência para terceiros',
  quais_dados_transferidos: 'Quais dados são transferidos',
  transferencia_internacional: 'Transferência Internacional',
  empresa_terceira: 'Empresa terceira',
};

const CHOICES = {
  controlador_operador: ['controlador', 'operador', 'ambos'],
  transferencia_terceiros: ['sim', 'nao'],
  transferencia_internacional: ['sim', 'nao'],
};

function validateField(key, value, form) {
  const v = String(value ?? '').trim();
  if (!v) return ['Obrigatório.'];

  switch (key) {
    case 'controlador_operador':
      if (!CHOICES.controlador_operador.includes(v)) return ['Seleção inválida.'];
      break;
    case 'transferencia_terceiros':
      if (!CHOICES.transferencia_terceiros.includes(v)) return ['Seleção inválida.'];
      break;
    case 'transferencia_internacional':
      if (!CHOICES.transferencia_internacional.includes(v)) return ['Seleção inválida.'];
      break;
    case 'periodo_retencao': {
      if (v.length < 3) return ['Digite ao menos 3 caracteres (ex.: "12 meses").'];
      break;
    }
    // textos
    case 'pessoas_acesso':
    case 'atualizacoes':
    case 'transmissao_interna':
    case 'transmissao_externa':
    case 'local_armazenamento_digital':
    case 'motivo_retencao':
    case 'exclusao':
    case 'forma_exclusao':
    case 'quais_dados_transferidos':
    case 'empresa_terceira':
      if (v.length < 3) return ['Digite ao menos 3 caracteres.'];
      break;
    default:
      break;
  }

  if (
    key === 'quais_dados_transferidos' &&
    String(form.transferencia_terceiros || '').trim() === 'sim' &&
    v.length < 3
  ) {
    return ['Descreva os dados transferidos (mín. 3 caracteres).'];
  }

  return [];
}

function normalizeServerErrors(data) {
  const map = {};
  if (!data || typeof data !== 'object') return map;
  if (data.detail)
    map._general = Array.isArray(data.detail) ? data.detail : [String(data.detail)];
  Object.entries(data).forEach(([k, v]) => {
    if (k === 'detail') return;
    if (Array.isArray(v)) map[k] = v.map(String);
    else if (typeof v === 'string') map[k] = [v];
    else if (v && typeof v === 'object') map[k] = [JSON.stringify(v)];
  });
  return map;
}

function InventarioDados2() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { form, setField, loadInventario, recordId, saveStep, reload, reset } =
    useInventario();

  const [warn, setWarn] = React.useState(false);
  const [savingStep, setSavingStep] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState({});
  const [clientErrors, setClientErrors] = React.useState({});

  // padrão de mensagens (toast 3s) + flash no topo
  const TOAST = { autoClose: 3000 };
  const [flash, setFlash] = React.useState({ variant: '', msg: '' });
  React.useEffect(() => {
    if (!flash.msg) return;
    const t = setTimeout(() => setFlash({ variant: '', msg: '' }), 3000);
    return () => clearTimeout(t);
  }, [flash]);

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

  const handleCancelStep = React.useCallback(() => {
    reset();
    const msg = 'Alterações descartadas.';
    try {
      toast.info(msg, TOAST);
    } catch {}
    navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: msg } });
  }, [navigate, reset]);

  async function handleSaveStep() {
    if (!recordId) {
      const msg =
        'Para salvar esta página, primeiro é necessário estar em modo de edição.';
      setFlash({ variant: 'warning', msg });
      try {
        toast.warn(msg, TOAST);
      } catch {}
      return;
    }
    setSavingStep(true);
    setServerErrors({});
    setClientErrors({});

    // validação cliente
    const nextClientErrors = {};
    fieldsThisStep.forEach((k) => {
      const errs = validateField(k, form[k], form);
      if (errs.length) nextClientErrors[k] = errs;
    });

    if (Object.keys(nextClientErrors).length > 0) {
      setClientErrors(nextClientErrors);
      setWarn(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSavingStep(false);
      return;
    }

    try {
      await saveStep(fieldsThisStep);
      await reload();
      const okMsg = 'Item atualizado com sucesso.';
      setFlash({ variant: 'success', msg: 'Alterações desta página salvas!' });
      try {
        toast.success(okMsg, TOAST);
      } catch {}
      navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: okMsg } });
    } catch (e) {
      const payload = e?.response?.data;
      const mapped = normalizeServerErrors(payload);

      const onlyNonField =
        mapped?.non_field_errors &&
        !Object.keys(mapped).some((k) => !['_general', 'non_field_errors'].includes(k));

      if (onlyNonField) {
        setServerErrors({ _general: mapped.non_field_errors });
        const msg =
          mapped.non_field_errors[0] ||
          'Falha ao salvar esta página. Se o problema persistir, contate o administrador.';
        setFlash({ variant: 'danger', msg });
        try {
          toast.error(msg, TOAST);
        } catch {}
      } else {
        setServerErrors(mapped);
        const firstField = Object.keys(mapped).find(
          (k) => !['_general', 'non_field_errors'].includes(k)
        );
        const firstMsg =
          (firstField && mapped[firstField]?.[0]) ||
          mapped._general?.[0] ||
          'Falha ao salvar esta página. Se o problema persistir, contate o administrador.';
        const msg = firstField
          ? `${FIELD_LABELS[firstField] || firstField}: ${firstMsg}`
          : firstMsg;
        setFlash({ variant: 'danger', msg });
        try {
          toast.error(msg, TOAST);
        } catch {}
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSavingStep(false);
    }
  }

  const hasError = (key) =>
    !!clientErrors[key]?.length ||
    !!serverErrors[key]?.length ||
    (!String(form[key] || '').trim() && warn);

  const getFirstError = (key) => clientErrors[key]?.[0] || serverErrors[key]?.[0] || null;

  const consolidatedErrors = React.useMemo(() => {
    const list = [];
    Object.entries(clientErrors).forEach(([k, arr]) =>
      (arr || []).forEach((m) => list.push(`${FIELD_LABELS[k] || k}: ${m}`))
    );
    Object.entries(serverErrors).forEach(([k, arr]) => {
      if (k === '_general' || k === 'non_field_errors') return;
      (arr || []).forEach((m) => list.push(`${FIELD_LABELS[k] || k}: ${m}`));
    });
    (serverErrors._general || []).forEach((m) => list.push(String(m)));
    return list;
  }, [clientErrors, serverErrors]);

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
          {/* flash curto no topo (3s) */}
          {flash.msg && <Alert variant={flash.variant}>{flash.msg}</Alert>}

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
              <Col md={6}>
                <Form.Label>
                  Pessoas com acesso <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.pessoas_acesso || ''}
                  onChange={(e) => setField('pessoas_acesso', e.target.value)}
                  isInvalid={hasError('pessoas_acesso')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('pessoas_acesso') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('pessoas_acesso')}
                  </div>
                )}
              </Col>
              <Col md={6}>
                <Form.Label>
                  Atualizações (Quando ocorrem?) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.atualizacoes || ''}
                  onChange={(e) => setField('atualizacoes', e.target.value)}
                  isInvalid={hasError('atualizacoes')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('atualizacoes') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('atualizacoes')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Transmissão Interna <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.transmissao_interna || ''}
                  onChange={(e) => setField('transmissao_interna', e.target.value)}
                  isInvalid={hasError('transmissao_interna')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('transmissao_interna') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('transmissao_interna')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>
                  Transmissão Externa <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.transmissao_externa || ''}
                  onChange={(e) => setField('transmissao_externa', e.target.value)}
                  isInvalid={hasError('transmissao_externa')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('transmissao_externa') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('transmissao_externa')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>
                  Local de Armazenamento (Digital) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.local_armazenamento_digital || ''}
                  onChange={(e) =>
                    setField('local_armazenamento_digital', e.target.value)
                  }
                  isInvalid={hasError('local_armazenamento_digital')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('local_armazenamento_digital') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('local_armazenamento_digital')}
                  </div>
                )}
              </Col>
              <Col md={4}>
                <Form.Label>
                  Controlador / Operador <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.controlador_operador || ''}
                  onChange={(e) => setField('controlador_operador', e.target.value)}
                  isInvalid={hasError('controlador_operador')}
                >
                  <option value="">Select...</option>
                  <option value="controlador">Controlador</option>
                  <option value="operador">Operador</option>
                  <option value="ambos">Ambos</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('controlador_operador') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('controlador_operador')}
                  </div>
                )}
              </Col>
              <Col md={4}>
                <Form.Label>
                  Motivo de Retenção <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.motivo_retencao || ''}
                  onChange={(e) => setField('motivo_retencao', e.target.value)}
                  isInvalid={hasError('motivo_retencao')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('motivo_retencao') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('motivo_retencao')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>
                  Período de Retenção <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.periodo_retencao || ''}
                  onChange={(e) => setField('periodo_retencao', e.target.value)}
                  isInvalid={hasError('periodo_retencao')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('periodo_retencao') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('periodo_retencao')}
                  </div>
                )}
              </Col>
              <Col md={3}>
                <Form.Label>
                  Exclusão <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.exclusao || ''}
                  onChange={(e) => setField('exclusao', e.target.value)}
                  isInvalid={hasError('exclusao')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('exclusao') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('exclusao')}
                  </div>
                )}
              </Col>
              <Col md={3}>
                <Form.Label>
                  Forma de exclusão <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.forma_exclusao || ''}
                  onChange={(e) => setField('forma_exclusao', e.target.value)}
                  isInvalid={hasError('forma_exclusao')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('forma_exclusao') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('forma_exclusao')}
                  </div>
                )}
              </Col>
              <Col md={3}>
                <Form.Label>
                  Ocorre transferência para terceiros?{' '}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.transferencia_terceiros || ''}
                  onChange={(e) => setField('transferencia_terceiros', e.target.value)}
                  isInvalid={hasError('transferencia_terceiros')}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('transferencia_terceiros') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('transferencia_terceiros')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>
                  Quais dados são transferidos? <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.quais_dados_transferidos || ''}
                  onChange={(e) => setField('quais_dados_transferidos', e.target.value)}
                  isInvalid={hasError('quais_dados_transferidos')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('quais_dados_transferidos') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('quais_dados_transferidos')}
                  </div>
                )}
              </Col>
              <Col md={6}>
                <Form.Label>
                  Ocorre Transferência Internacional?{' '}
                  <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.transferencia_internacional || ''}
                  onChange={(e) =>
                    setField('transferencia_internacional', e.target.value)
                  }
                  isInvalid={hasError('transferencia_internacional')}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('transferencia_internacional') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('transferencia_internacional')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-4">
              <Col>
                <Form.Label>
                  Empresa terceira <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.empresa_terceira || ''}
                  onChange={(e) => setField('empresa_terceira', e.target.value)}
                  isInvalid={hasError('empresa_terceira')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('empresa_terceira') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('empresa_terceira')}
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

            <div className="d-flex justify-content-between mt-4">
              <Button
                type="button"
                className="btn-white-custom"
                variant="primary"
                onClick={goBack}
              >
                Voltar
              </Button>

              <div className="d-flex align-items-center gap-3">
                <div className="text-light" style={{ fontSize: 13 }}>
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

export default InventarioDados2;
