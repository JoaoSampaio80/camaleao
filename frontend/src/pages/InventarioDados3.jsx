// src/pages/InventarioDados3.jsx
import React from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';
import { toast } from 'react-toastify';
import Axios from '../components/Axios';

const FIELDS_STEP1 = [
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

const FIELDS_STEP2 = [
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

const FIELDS_STEP3 = [
  'adequado_contratualmente',
  'paises_tratamento',
  'medidas_seguranca',
  'consentimentos',
  'observacao',
];

const ALL_FIELDS = [...FIELDS_STEP1, ...FIELDS_STEP2, ...FIELDS_STEP3];

const API_BASE = 'inventarios';

const eq = (a, b) => {
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch {
    return String(a ?? '') === String(b ?? '');
  }
};

async function apiGetOne(id) {
  const { data } = await Axios.get(`${API_BASE}/${id}/`);
  return data;
}

async function saveDiffAll(id, fields, form) {
  const server = await apiGetOne(id);
  const diff = {};
  fields.forEach((k) => {
    const sv = server?.[k];
    const cv = form?.[k];
    if (!eq(sv, cv)) diff[k] = cv;
  });
  if (Object.keys(diff).length === 0) return 0;
  await Axios.patch(`${API_BASE}/${id}/`, diff);
  return Object.keys(diff).length;
}

const FIELD_LABELS = {
  // Etapa 1
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

  // Etapa 2
  pessoas_acesso: 'Pessoas com acesso',
  atualizacoes: 'Atualizações (Quando ocorrem?)',
  transmissao_interna: 'Transmissão Interna',
  transmissao_externa: 'Transmissão Externa',
  local_armazenamento_digital: 'Local de Armazenamento (Digital)',
  controlador_operador: 'Controlador / Operador',
  motivo_retencao: 'Motivo de Retenção',
  periodo_retencao: 'Período de Retenção',
  exclusao: 'Exclusão',
  forma_exclusao: 'Forma de exclusão',
  transferencia_terceiros: 'Ocorre transferência para terceiros?',
  quais_dados_transferidos: 'Quais dados são transferidos?',
  transferencia_internacional: 'Ocorre Transferência Internacional?',
  empresa_terceira: 'Empresa terceira',

  // Etapa 3
  adequado_contratualmente: 'Adequado Contratualmente?',
  paises_tratamento: 'Países Envolvidos no Tratamento',
  medidas_seguranca: 'Medidas de Segurança Envolvidas',
  consentimentos: 'Consentimentos',
  observacao: 'Observação',
};

const CHOICES = {
  adequado_contratualmente: ['sim', 'nao'],
};

function validateField(key, value) {
  const v = String(value ?? '').trim();
  if (key === 'observacao') return [];
  if (!v) return ['Obrigatório.'];
  switch (key) {
    case 'adequado_contratualmente':
      if (!CHOICES.adequado_contratualmente.includes(v)) return ['Seleção inválida.'];
      break;
    case 'paises_tratamento':
    case 'medidas_seguranca':
    case 'consentimentos':
      if (v.length < 3) return ['Digite ao menos 3 caracteres.'];
      break;
    default:
      break;
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

function InventarioDados3() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const { form, setField, loadInventario, saveInventario, recordId, reset } =
    useInventario();

  const [saving, setSaving] = React.useState(false);
  const [warn, setWarn] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState({});
  const [clientErrors, setClientErrors] = React.useState({});

  const TOAST = { autoClose: 3000 };
  const [flash, setFlash] = React.useState({ variant: '', msg: '' });
  React.useEffect(() => {
    if (!flash.msg) return;
    const t = setTimeout(() => setFlash({ variant: '', msg: '' }), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  // 🔒 Não recarrega do backend se já estamos com o mesmo id carregado no contexto
  React.useEffect(() => {
    const id = params.get('id');
    if (id && String(recordId ?? '') !== String(id)) {
      loadInventario(id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    setWarn(false);
    setServerErrors({});
    setClientErrors({});
    reset();
    const msg = 'Alterações desta página descartadas.';
    setFlash({ variant: 'info', msg });
    try {
      toast.info(msg, TOAST);
    } catch {}
    navigate(ROUTES.INVENTARIO_LISTA, {
      state: { flash: msg, variant: 'info' },
    });
  };

  function validateStep3() {
    const keys = [
      'adequado_contratualmente',
      'paises_tratamento',
      'medidas_seguranca',
      'consentimentos',
      'observacao',
    ];
    const next = {};
    keys.forEach((k) => {
      const errs = validateField(k, form[k]);
      if (errs.length) next[k] = errs;
    });
    return next;
  }

  // salvar todos os steps no modo edição POR DIFERENÇA
  const handleSave = async (next) => {
    setSaving(true);
    setServerErrors({});
    setClientErrors({});

    // validação cliente da etapa 3 (mantida)
    const nextClientErrors = validateStep3();
    if (Object.keys(nextClientErrors).length > 0) {
      setClientErrors(nextClientErrors);
      setWarn(true);
      const msg = 'Existem campos pendentes ou inválidos. Corrija os destaques.';
      setFlash({ variant: 'warning', msg });
      try {
        toast.warn(msg, TOAST);
      } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
      return;
    }

    try {
      if (recordId) {
        // UM PATCH com tudo que mudou (1+2+3)
        await saveDiffAll(recordId, ALL_FIELDS, form);
      } else {
        // criação permanece como estava
        await saveInventario();
      }

      const okMsg = recordId
        ? 'Item atualizado com sucesso.'
        : 'Item adicionado ao Inventário com sucesso.';

      setWarn(false);
      try {
        toast.success(okMsg, TOAST);
      } catch {}

      if (recordId) {
        reset();
        navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: okMsg } });
        return;
      }

      if (next === 'new') {
        reset();
        setFlash({ variant: 'success', msg: okMsg });
        navigate(ROUTES.INVENTARIO_DADOS);
        return;
      }
      if (next === 'list') {
        reset();
        navigate(ROUTES.INVENTARIO_LISTA, { state: { flash: okMsg } });
        return;
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(
          '[InventarioDados3] erro ao salvar:',
          e?.response?.status,
          e?.response?.data || e
        );
      }
      const st = e?.response?.status;
      const mapped = normalizeServerErrors(e?.response?.data);

      if (st === 400 || st === 422) {
        const onlyNonField =
          mapped?.non_field_errors &&
          !Object.keys(mapped).some((k) => !['_general', 'non_field_errors'].includes(k));

        if (onlyNonField) {
          setServerErrors({ _general: mapped.non_field_errors });
          setWarn(true);
          const msg =
            mapped.non_field_errors[0] ||
            'Existem campos pendentes. Se o problema persistir, contate o administrador.';
          setFlash({ variant: 'warning', msg });
          try {
            toast.warn(msg, TOAST);
          } catch {}
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setSaving(false);
          return;
        }

        const cleaned = { ...mapped };
        delete cleaned.non_field_errors;
        setServerErrors(cleaned);
        setWarn(true);

        const firstField = Object.keys(cleaned).find((k) => k !== '_general');
        const firstMsg =
          (firstField && cleaned[firstField]?.[0]) ||
          cleaned._general?.[0] ||
          'Existem campos pendentes. Se o problema persistir, contate o administrador.';

        const msg = firstField
          ? `Corrija o campo “${FIELD_LABELS[firstField] || firstField}”: ${firstMsg}`
          : firstMsg;

        setFlash({ variant: 'danger', msg });
        try {
          toast.error(msg, TOAST);
        } catch {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSaving(false);
        return;
      }

      const msg =
        st === 403
          ? 'Você não tem permissão para salvar item do inventário.'
          : e?.response?.data?.detail ||
            'Falha ao salvar item. Se o problema persistir, contate o administrador.';
      setFlash({ variant: 'danger', msg });
      try {
        toast.error(msg, TOAST);
      } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const hasError = (key) =>
    !!clientErrors[key]?.length ||
    !!serverErrors[key]?.length ||
    (!String(form[key] || '').trim() && warn && key !== 'observacao');

  const getFirstError = (key) => clientErrors[key]?.[0] || serverErrors[key]?.[0] || null;

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
        <div
          className="d-flex w-100 align-items-center justify-content-center"
          style={{ maxWidth: 1280 }}
        >
          <h2 className="mb-4 page-title-ink flex-grow-1 text-center">
            Inventário de Dados
          </h2>
        </div>

        <Container fluid className="container-gradient">
          {/* flash curto no topo (3s) */}
          {flash.msg && <Alert variant={flash.variant}>{flash.msg}</Alert>}

          {/* Lista de erros consolidada */}
          {Object.keys(serverErrors).length > 0 && (
            <Alert variant="danger">
              <strong>Não foi possível salvar. Corrija os itens abaixo:</strong>
              <ul className="mb-0">
                {Object.entries(serverErrors)
                  .filter(([k]) => k !== '_general')
                  .flatMap(([k, arr]) =>
                    (arr || []).map((m, i) => (
                      <li key={`${k}-${i}`}>{`${FIELD_LABELS[k] || k}: ${m}`}</li>
                    ))
                  )}
                {(serverErrors._general || []).map((m, i) => (
                  <li key={`g-${i}`}>{m}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Form>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>
                  Adequado Contratualmente? <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.adequado_contratualmente || ''}
                  onChange={(e) => setField('adequado_contratualmente', e.target.value)}
                  isInvalid={hasError('adequado_contratualmente')}
                >
                  <option value="">Select...</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('adequado_contratualmente') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('adequado_contratualmente')}
                  </div>
                )}
              </Col>

              <Col md={4}>
                <Form.Label>
                  Países Envolvidos no Tratamento <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.paises_tratamento || ''}
                  onChange={(e) => setField('paises_tratamento', e.target.value)}
                  isInvalid={hasError('paises_tratamento')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('paises_tratamento') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('paises_tratamento')}
                  </div>
                )}
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
                  isInvalid={hasError('medidas_seguranca')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('medidas_seguranca') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('medidas_seguranca')}
                  </div>
                )}
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
                  isInvalid={hasError('consentimentos')}
                />
                <Form.Control.Feedback type="invalid">Obrigatório.</Form.Control.Feedback>
                {getFirstError('consentimentos') && (
                  <div className="invalid-feedback d-block">
                    {getFirstError('consentimentos')}
                  </div>
                )}
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Observação</Form.Label>
                <Form.Control
                  placeholder="TextField"
                  value={form.observacao || ''}
                  onChange={(e) => setField('observacao', e.target.value)}
                  isInvalid={!!serverErrors.observacao}
                />
                {serverErrors.observacao?.[0] && (
                  <div className="invalid-feedback d-block">
                    {serverErrors.observacao[0]}
                  </div>
                )}
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button
                className="btn-white-custom"
                variant="primary"
                onClick={() =>
                  navigate(ROUTES.INVENTARIO_DADOS2 + (recordId ? `?id=${recordId}` : ''))
                }
              >
                Voltar
              </Button>

              {/* Botões ajustados conforme modo criação/edição */}
              {recordId ? (
                // MODO EDIÇÃO
                <div className="d-flex gap-2">
                  <Button
                    type="button"
                    className="btn-white-custom"
                    variant="outline-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="btn-white-custom"
                    variant="primary"
                    onClick={() => handleSave('list')}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              ) : (
                // MODO CRIAÇÃO (comportamento original)
                <div className="d-flex gap-2">
                  <Button
                    type="button"
                    className="btn-white-custom"
                    variant="outline-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>

                  <Button
                    className="btn-white-custom"
                    variant="outline-primary"
                    onClick={() => handleSave('new')}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar e novo'}
                  </Button>

                  <Button
                    className="btn-white-custom"
                    variant="primary"
                    onClick={() => handleSave('list')}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar e ir para a lista'}
                  </Button>
                </div>
              )}
            </div>
          </Form>
        </Container>
      </div>
    </div>
  );
}

export default InventarioDados3;
