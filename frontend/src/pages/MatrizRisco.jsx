import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Alert,
  Spinner,
  Badge,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';

function MatrizRisco() {
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  // opções vindas do backend
  const [likelihoods, setLikelihoods] = useState([]); // [{id, value, label_pt}]
  const [impacts, setImpacts] = useState([]); // idem
  const [effs, setEffs] = useState([]); // [{id, value, label_pt}]
  const [bands, setBands] = useState([]); // [{name, min_score, max_score, color}]

  // erros por campo
  const [fieldErrors, setFieldErrors] = useState({});

  // estado do form
  const [form, setForm] = useState({
    matriz_filial: '', // agora será select
    setor: '',
    processo: '',
    risco_fator: '',
    probabilidade: '', // id
    impacto: '', // id
    medidas_controle: '',
    tipo_controle: '', // 'C'|'D'
    eficacia: '', // id (opcional)
    risco_residual: '', // 'baixo'|'medio'|'alto'
    resposta_risco: '',
  });

  useEffect(() => {
    const load = async () => {
      setError('');
      try {
        const { data } = await AxiosInstance.get('risk-config/');

        const like = Array.isArray(data.likelihood) ? [...data.likelihood] : [];
        const imp = Array.isArray(data.impact) ? [...data.impact] : [];
        const eff = Array.isArray(data.effectiveness) ? [...data.effectiveness] : [];
        const b = Array.isArray(data.bands) ? [...data.bands] : [];

        like.sort((a, b) => a.value - b.value);
        imp.sort((a, b) => a.value - b.value);
        eff.sort((a, b) => a.value - b.value);

        setLikelihoods(like);
        setImpacts(imp);
        setEffs(eff);
        setBands(b);

        if (!like.length || !imp.length) {
          setError(
            'Recebi o risk-config, mas as listas de Probabilidade/Impacto vieram vazias.'
          );
        }
      } catch (e) {
        const msg =
          e?.response?.data?.detail || e.message || 'Falha ao carregar parametrizações.';
        setError(msg);
      } finally {
        setLoadingCfg(false);
      }
    };
    load();
  }, []);

  // pontuação = prob.value * impact.value
  const computedPontuacao = useMemo(() => {
    const p = likelihoods.find((x) => String(x.id) === String(form.probabilidade));
    const i = impacts.find((x) => String(x.id) === String(form.impacto));
    return (p?.value || 0) * (i?.value || 0);
  }, [form.probabilidade, form.impacto, likelihoods, impacts]);

  // FAIXAS (exibição): <=6 verde, <=12 amarelo, <=16 laranja, >16 vermelho
  const uiBand = useMemo(() => {
    const s = computedPontuacao || 0;
    if (s === 0) return null;
    if (s <= 6) return { name: 'Baixo', color: '#00B050' };
    if (s <= 12) return { name: 'Médio', color: '#FFC000' };
    if (s <= 16) return { name: 'Alto', color: '#ED7D31' };
    return { name: 'Crítico', color: '#C00000' };
  }, [computedPontuacao]);

  // fundo suave conforme a banda
  const bandBgStyle = uiBand
    ? { backgroundColor: 'rgba(' + hexToRgb(uiBand.color) + ',0.18)' }
    : {};
  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const bigint = parseInt(m, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r},${g},${b}`;
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setOkMsg('');
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const resetForm = () => {
    setForm((prev) => ({
      matriz_filial: '',
      setor: '',
      processo: '',
      risco_fator: '',
      probabilidade: prev.probabilidade, // mantém os selects
      impacto: prev.impacto,
      medidas_controle: '',
      tipo_controle: '',
      eficacia: prev.eficacia,
      risco_residual: '',
      resposta_risco: '',
    }));
    setFieldErrors({});
  };

  const required = (v) => String(v ?? '').trim().length > 0;

  const validateForm = () => {
    const errs = {};
    if (!required(form.matriz_filial)) errs.matriz_filial = 'Selecione Matriz/Filial.';
    if (!required(form.setor)) errs.setor = 'Informe o Setor.';
    if (!required(form.processo)) errs.processo = 'Informe o Processo.';
    if (!required(form.risco_fator)) errs.risco_fator = 'Descreva o risco/fator.';
    if (!required(form.probabilidade)) errs.probabilidade = 'Selecione a Probabilidade.';
    if (!required(form.impacto)) errs.impacto = 'Selecione o Impacto.';
    if (!required(form.risco_residual))
      errs.risco_residual = 'Selecione a classificação do risco residual.';
    if ((computedPontuacao ?? 0) <= 0)
      errs.pontuacao = 'Defina probabilidade e impacto válidos.';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setOkMsg('');
    setError('');
    setFieldErrors({});

    // validação client-side
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setSaving(false);
      setFieldErrors(errs);
      const first = Object.keys(errs)[0];
      const el = document.querySelector(`[name="${first}"]`);
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // normaliza payload
    const payload = {
      ...form,
      matriz_filial: form.matriz_filial, // já é um dos três valores do select
      setor: form.setor.trim(),
      processo: form.processo.trim(),
      risco_fator: form.risco_fator.trim(),
      medidas_controle: form.medidas_controle?.trim() || '',
      tipo_controle: form.tipo_controle || '',
      resposta_risco: form.resposta_risco?.trim() || '',
      pontuacao: computedPontuacao,
      probabilidade: form.probabilidade ? Number(form.probabilidade) : null,
      impacto: form.impacto ? Number(form.impacto) : null,
      eficacia: form.eficacia ? Number(form.eficacia) : null,
    };

    try {
      await AxiosInstance.post('riscos/', payload);
      setOkMsg('Risco criado com sucesso.');
      resetForm();
    } catch (e) {
      const data = e?.response?.data;
      // mapeia erros do DRF por campo
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const mapped = {};
        Object.entries(data).forEach(([k, v]) => {
          if (Array.isArray(v)) mapped[k] = v.join(' ');
          else if (typeof v === 'string') mapped[k] = v;
        });
        if (Object.keys(mapped).length) {
          setFieldErrors(mapped);
          const first = Object.keys(mapped)[0];
          const el = document.querySelector(`[name="${first}"]`);
          if (el?.scrollIntoView)
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setSaving(false);
          return;
        }
      }
      const msg =
        (typeof data === 'string' && data) ||
        data?.detail ||
        e.message ||
        'Falha ao criar risco.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const noOpts = !likelihoods?.length || !impacts?.length;

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
        {/* título centralizado, padrão aprovado */}
        <h2 className="mb-4 page-title-ink text-center">Matriz de Risco</h2>

        {/* bloco com gradiente aceito */}
        <Container
          fluid
          className="container-gradient px-4"
          style={{ width: '100%', margin: '0 auto' }}
        >
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          {okMsg && (
            <Alert variant="success" className="mb-3">
              {okMsg}
            </Alert>
          )}

          {loadingCfg ? (
            <div className="d-flex align-items-center">
              <Spinner animation="border" size="sm" className="me-2" />
              Carregando parametrizações...
            </div>
          ) : (
            <>
              {noOpts && (
                <Alert variant="warning" className="mb-3">
                  Não encontrei opções de Probabilidade/Impacto. Verifique o endpoint{' '}
                  <code>risk-config/</code> e sua
                  <code> VITE_API_URL</code>.
                </Alert>
              )}

              <Form onSubmit={onSubmit}>
                {/* 1ª linha: Matriz/Filial, Setor, Processo */}
                <Row className="mb-3">
                  <Col lg={4} md={6}>
                    <Form.Label>Matriz/Filial</Form.Label>
                    <Form.Select
                      name="matriz_filial"
                      value={form.matriz_filial}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.matriz_filial}
                    >
                      <option value="">Selecione...</option>
                      <option value="matriz">Matriz</option>
                      <option value="filial">Filial</option>
                      <option value="matriz/filial">Matriz / Filial</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.matriz_filial}
                    </Form.Control.Feedback>
                  </Col>

                  <Col lg={4} md={6}>
                    <Form.Label>Setor</Form.Label>
                    <Form.Control
                      name="setor"
                      value={form.setor}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.setor}
                      placeholder="Ex.: TI"
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.setor}
                    </Form.Control.Feedback>
                  </Col>

                  <Col lg={4} md={12}>
                    <Form.Label>Processo de Negócio Envolvido</Form.Label>
                    <Form.Control
                      name="processo"
                      value={form.processo}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.processo}
                      placeholder="Ex.: Gestão de Acessos"
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.processo}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                {/* 2ª linha: Risco/Fator */}
                <Row className="mb-3">
                  <Col>
                    <Form.Label>Risco e Fator de Risco</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="risco_fator"
                      value={form.risco_fator}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.risco_fator}
                      placeholder="Descreva o risco e seus fatores"
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.risco_fator}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                {/* 3ª linha: Prob, Impacto, Pontuação */}
                <Row className="mb-3">
                  <Col lg={4} md={6}>
                    <Form.Label>Probabilidade (1–5)</Form.Label>
                    <Form.Select
                      name="probabilidade"
                      value={form.probabilidade}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.probabilidade}
                    >
                      <option value="">Selecione...</option>
                      {likelihoods.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label_pt} ({l.value})
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.probabilidade}
                    </Form.Control.Feedback>
                  </Col>

                  <Col lg={4} md={6}>
                    <Form.Label>Impacto (1–5)</Form.Label>
                    <Form.Select
                      name="impacto"
                      value={form.impacto}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.impacto}
                    >
                      <option value="">Selecione...</option>
                      {impacts.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label_pt} ({i.value})
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.impacto}
                    </Form.Control.Feedback>
                  </Col>

                  <Col lg={4} md={12}>
                    <Form.Label>
                      Pontuação do Risco{' '}
                      {uiBand ? (
                        <Badge
                          bg="light"
                          text="dark"
                          style={{ marginLeft: 8, border: `1px solid ${uiBand.color}` }}
                        >
                          {uiBand.name}
                        </Badge>
                      ) : null}
                    </Form.Label>
                    <Form.Control
                      value={computedPontuacao || ''}
                      readOnly
                      isInvalid={!!fieldErrors.pontuacao}
                      style={{
                        ...bandBgStyle,
                        borderLeft: uiBand ? `6px solid ${uiBand.color}` : undefined,
                        fontWeight: 700,
                      }}
                      title={uiBand ? `${uiBand.name}` : ''}
                    />
                    {fieldErrors.pontuacao ? (
                      <div className="invalid-feedback d-block">
                        {fieldErrors.pontuacao}
                      </div>
                    ) : null}
                  </Col>
                </Row>

                {/* 4ª linha: Medidas de controle */}
                <Row className="mb-3">
                  <Col>
                    <Form.Label>Medidas de Controle (existentes)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="medidas_controle"
                      value={form.medidas_controle}
                      onChange={onChange}
                      placeholder="Ex.: MFA habilitada, política de senhas, segregação de funções..."
                    />
                  </Col>
                </Row>

                {/* 5ª linha: Tipo controle, Eficácia, Residual */}
                <Row className="mb-3">
                  <Col lg={4} md={6}>
                    <Form.Label>Tipo de Controle</Form.Label>
                    <Form.Select
                      name="tipo_controle"
                      value={form.tipo_controle}
                      onChange={onChange}
                    >
                      <option value="">Selecione...</option>
                      <option value="C">Preventivo</option>
                      <option value="D">Detectivo</option>
                    </Form.Select>
                  </Col>

                  <Col lg={4} md={6}>
                    <Form.Label>Avaliação de Eficácia do Controle</Form.Label>
                    <Form.Select
                      name="eficacia"
                      value={form.eficacia}
                      onChange={onChange}
                    >
                      <option value="">(Opcional) Selecione...</option>
                      {effs.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.label_pt} ({e.value})
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col lg={4} md={12}>
                    <Form.Label>Risco Residual</Form.Label>
                    <Form.Select
                      name="risco_residual"
                      value={form.risco_residual}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.risco_residual}
                    >
                      <option value="">Selecione...</option>
                      <option value="baixo">Baixo</option>
                      <option value="medio">Médio</option>
                      <option value="alto">Alto</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.risco_residual}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                {/* 6ª linha: Resposta ao risco */}
                <Row className="mb-3">
                  <Col>
                    <Form.Label>Resposta ao Risco (Plano de Ação)</Form.Label>
                    <Form.Control
                      name="resposta_risco"
                      value={form.resposta_risco}
                      onChange={onChange}
                      placeholder="Descreva as medidas de resposta / plano de ação"
                    />
                  </Col>
                </Row>

                <div className="d-flex gap-2">
                  <Button
                    type="submit"
                    className="btn-white-custom"
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" /> Salvando...
                      </>
                    ) : (
                      'Salvar Risco'
                    )}
                  </Button>
                  <Button
                    className="btn-white-custom"
                    variant="outline-secondary"
                    onClick={() => {
                      resetForm();
                      setError('');
                      setOkMsg('');
                    }}
                  >
                    Limpar
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Container>
      </div>
    </div>
  );
}

export default MatrizRisco;
