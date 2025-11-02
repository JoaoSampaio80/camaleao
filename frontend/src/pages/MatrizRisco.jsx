import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Form,
  Button,
  Alert,
  Spinner,
  Pagination,
  Dropdown,
  Modal,
  Row,
  Col,
  Badge,
  Container,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import PaginacaoRiscos from '../components/PaginacaoRiscos';
import ListaPlanoAcao from '../components/ListaPlanoAcao';
import TooltipInfo from '../components/TooltipInfo';
import '../estilos/matriz.css';

function MatrizRisco() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState('');

  const [likelihoods, setLikelihoods] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [effs, setEffs] = useState([]);

  const [form, setForm] = useState({
    matriz_filial: '',
    setor: '',
    processo: '',
    risco_fator: '',
    probabilidade: '',
    impacto: '',
    medidas_controle: '',
    tipo_controle: '',
    eficacia: '',
    risco_residual: '',
    resposta_risco: '',
  });

  // ---------- helpers (reset + erros) ----------
  const resetForm = () => {
    setForm({
      matriz_filial: '',
      setor: '',
      processo: '',
      risco_fator: '',
      probabilidade: '',
      impacto: '',
      medidas_controle: '',
      tipo_controle: '',
      eficacia: '',
      risco_residual: '',
      resposta_risco: '',
    });
    setFieldErrors({});
    setError('');
    setOkMsg('');
  };

  const mapBackendErrors = (data) => {
    const out = {};
    const toText = (v) =>
      Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : String(v);

    Object.entries(data || {}).forEach(([key, val]) => {
      let k = key;
      if (k === 'plano_acao' || k === 'plano_de_acao') k = 'resposta_risco';
      if (k === 'eficacia_controle' || k === 'eficacia_do_controle') k = 'eficacia';
      if (k === 'tipo_de_controle') k = 'tipo_controle';
      out[k] = toText(val);
    });
    return out;
  };

  const focusFirstError = (errs) => {
    const firstKey = Object.keys(errs || {})[0];
    if (!firstKey) return;
    const el = document.querySelector(`[name="${firstKey}"]`);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // ---------- Listagem (com paginação server-side) ----------
  const loadRows = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const { data } = await AxiosInstance.get('riscos/', {
        params: { page: targetPage, page_size: targetPageSize },
      });

      const results = Array.isArray(data) ? data : data.results || [];
      const total = Array.isArray(data) ? results.length : (data.count ?? results.length);

      // Se pedir uma página além do fim e vier vazio, recua 1 página
      if (!Array.isArray(data) && results.length === 0 && targetPage > 1) {
        const prev = targetPage - 1;
        const retry = await AxiosInstance.get('riscos/', {
          params: { page: prev, page_size: targetPageSize },
        });
        const r2 = Array.isArray(retry.data) ? retry.data : retry.data.results || [];
        setRows(r2);
        setCount(Array.isArray(retry.data) ? r2.length : (retry.data.count ?? r2.length));
        setPage(prev);
        setPageSize(targetPageSize);
      } else {
        setRows(results);
        setCount(total);
        setPage(targetPage);
        setPageSize(targetPageSize);
      }
    } catch {
      setError('Falha ao carregar riscos.');
    } finally {
      setLoading(false);
    }
  };

  // monta: carrega primeira página
  useEffect(() => {
    loadRows(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quando trocar pageSize, volta para página 1
  useEffect(() => {
    loadRows(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // quando trocar de página, recarrega mantendo pageSize
  useEffect(() => {
    loadRows(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ---------- Configurações (risk-config) ----------
  const loadConfig = async () => {
    try {
      const { data } = await AxiosInstance.get('risk-config/');
      const like = [...(data.likelihood || [])].sort((a, b) => a.value - b.value);
      const imp = [...(data.impact || [])].sort((a, b) => a.value - b.value);
      const eff = [...(data.effectiveness || [])].sort((a, b) => a.value - b.value);
      setLikelihoods(like);
      setImpacts(imp);
      setEffs(eff);
    } catch {
      setError('Falha ao carregar parametrizações.');
    }
  };

  useEffect(() => {
    if (showModal) loadConfig();
  }, [showModal]);

  // ---------- Cálculo de pontuação e banda ----------
  const computedPontuacao = useMemo(() => {
    const p = likelihoods.find((x) => String(x.id) === String(form.probabilidade));
    const i = impacts.find((x) => String(x.id) === String(form.impacto));
    return (p?.value || 0) * (i?.value || 0);
  }, [form.probabilidade, form.impacto, likelihoods, impacts]);

  const uiBand = useMemo(() => {
    const s = computedPontuacao || 0;
    if (s === 0) return null;
    if (s <= 6) return { name: 'Baixo', color: '#00B050' };
    if (s <= 12) return { name: 'Médio', color: '#FFC000' };
    if (s <= 16) return { name: 'Alto', color: '#ED7D31' };
    return { name: 'Crítico', color: '#C00000' };
  }, [computedPontuacao]);

  const hexToRgb = (hex) => {
    const m = hex.replace('#', '');
    const bigint = parseInt(m, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r},${g},${b}`;
  };

  const bandBgStyle = uiBand
    ? { backgroundColor: 'rgba(' + hexToRgb(uiBand.color) + ',0.18)' }
    : {};

  // ---------- Form handlers ----------
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError('');
    setOkMsg('');
  };

  // --- Regras de consistência frontend ---
  // Sempre que medidas_controle mudar, ajusta tipo/eficacia
  useEffect(() => {
    const temControle = (form.medidas_controle || '').trim().length > 0;

    if (!temControle) {
      // limpa tipo e eficácia se não existir controle
      setForm((f) => ({
        ...f,
        tipo_controle: '',
        eficacia: '',
      }));
    }
  }, [form.medidas_controle]);

  const validateForm = () => {
    const errs = {};
    if (!form.matriz_filial) errs.matriz_filial = 'Selecione Matriz/Filial.';
    if (!form.setor) errs.setor = 'Informe o Setor.';
    if (!form.processo) errs.processo = 'Informe o Processo.';
    if (!form.risco_fator) errs.risco_fator = 'Descreva o risco/fator.';
    if (!form.probabilidade) errs.probabilidade = 'Selecione a Probabilidade.';
    if (!form.impacto) errs.impacto = 'Selecione o Impacto.';
    if (!form.risco_residual)
      errs.risco_residual = 'Selecione a classificação do risco residual.';
    if ((computedPontuacao ?? 0) <= 0)
      errs.pontuacao = 'Defina probabilidade e impacto válidos.';

    // --- Regras de controle ---
    const medidas = (form.medidas_controle || '').trim();
    const tipo = form.tipo_controle;
    const eficacia = form.eficacia;

    const existe = medidas.length > 0;

    if (existe) {
      if (!['C', 'D'].includes(tipo)) {
        errs.tipo_controle = 'Use "C" (Preventivo) ou "D" (Detectivo).';
      }
      // eficácia é opcional → não exige
    } else {
      if (tipo) errs.tipo_controle = 'Deixe vazio quando não existe controle.';
      if (eficacia) errs.eficacia = 'Não defina eficácia quando não existe controle.';
    }
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const errs = validateForm();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError('Verifique os campos destacados.');
      focusFirstError(errs);
      return;
    }

    setSaving(true);
    setError('');
    setOkMsg('');

    try {
      const payload = {
        ...form,
        pontuacao: computedPontuacao,
        probabilidade: Number(form.probabilidade),
        impacto: Number(form.impacto),
        eficacia: form.eficacia ? Number(form.eficacia) : null,
      };

      if (editingId) {
        await AxiosInstance.put(`riscos/${editingId}/`, payload);
        setOkMsg('Risco atualizado com sucesso.');
      } else {
        await AxiosInstance.post('riscos/', payload);
        setOkMsg('Risco criado com sucesso.');
      }

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        loadRows(page, pageSize); // mantém a página atual
      }, 1500);
    } catch (err) {
      const data = err?.response?.data;

      if (data && typeof data === 'object') {
        const mapped = mapBackendErrors(data);
        if (Object.keys(mapped).length) {
          setFieldErrors(mapped);
          setError('Verifique os campos destacados.');
          focusFirstError(mapped);
          setSaving(false);
          return;
        }
      }

      setError(
        (typeof data === 'string' && data) ||
          err?.response?.data?.detail ||
          'Erro ao salvar risco.'
      );
    } finally {
      setSaving(false);
    }
  };

  const [editingId, setEditingId] = useState(null);

  const handleEdit = (item) => {
    setEditingId(item.id);

    setForm({
      matriz_filial: item.matriz_filial || '',
      setor: item.setor || '',
      processo: item.processo || '',
      risco_fator: item.risco_fator || '',
      probabilidade: String(item.probabilidade) || '',
      impacto: String(item.impacto) || '',
      medidas_controle: item.medidas_controle || '',
      tipo_controle: item.tipo_controle || '',
      eficacia: String(item.eficacia || ''),
      risco_residual: item.risco_residual || '',
      resposta_risco: item.resposta_risco || '',
      planos: item.resposta_risco
        ? item.resposta_risco
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    });

    setShowModal(true);
    setError('');
    setOkMsg('');
    setFieldErrors({});
  };

  const handleDeleteClick = (item) => {
    setSelectedToDelete(item);
    setDeleteMsg('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedToDelete) return;
    try {
      await AxiosInstance.delete(`riscos/${selectedToDelete.id}/`);
      setDeleteMsg('Risco excluído com sucesso.');
      // atualiza a lista
      setTimeout(() => {
        setShowDeleteModal(false);
        setSelectedToDelete(null);
        loadRows(page, pageSize);
        setDeleteMsg('');
      }, 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Não foi possível excluir o risco. Tente novamente.';
      setDeleteMsg(msg);
    }
  };

  // ---------- paginação (footer) ----------
  const gotoPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const renderPagination = () => {
    const items = [];
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const realStart = Math.max(1, end - windowSize + 1);

    items.push(
      <Pagination.First key="first" disabled={page === 1} onClick={() => gotoPage(1)} />,
      <Pagination.Prev
        key="prev"
        disabled={page === 1}
        onClick={() => gotoPage(page - 1)}
      />
    );
    if (realStart > 1) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
    for (let p = realStart; p <= end; p++) {
      items.push(
        <Pagination.Item key={p} active={p === page} onClick={() => gotoPage(p)}>
          {p}
        </Pagination.Item>
      );
    }
    if (end < totalPages) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    items.push(
      <Pagination.Next
        key="next"
        disabled={page === totalPages}
        onClick={() => gotoPage(page + 1)}
      />,
      <Pagination.Last
        key="last"
        disabled={page === totalPages}
        onClick={() => gotoPage(totalPages)}
      />
    );
    return <Pagination className="mb-0">{items}</Pagination>;
  };

  const handleBlockedSelectClick = (event) => {
    event.preventDefault();
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-content">
        <h2 className="page-title">Avaliação de Risco</h2>

        <div className="mb-4">
          <PaginacaoRiscos />
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <Form.Group className="d-flex align-items-center mb-0">
            <Form.Label className="me-2 mb-0">Itens por página</Form.Label>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ width: '80px' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </Form.Select>
          </Form.Group>

          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowModal(true);
            }}
          >
            + Novo
          </Button>
        </div>

        <div className="table-wrap">
          <Table bordered hover className="custom-table">
            <thead className="thead-gradient">
              <tr>
                <th>Item</th>
                <th>Matriz/Filial</th>
                <th>Setor</th>
                <th>
                  Processo <TooltipInfo message="Proceso de negócio envolvido" />
                </th>
                <th>Risco/Fator</th>
                <th>Probabilidade</th>
                <th>Impacto</th>
                <th>Pontuação</th>
                <th>
                  Medidas de Controle <TooltipInfo message="Existe algum controle?" />
                </th>
                <th>
                  Tipo <TooltipInfo message="Preventivo [C] ou Detectivo [D]" />
                </th>
                <th>
                  Eficácia <TooltipInfo message="Avaliação de eficácia do controle." />
                </th>
                <th>Risco Residual</th>

                <th>
                  Plano de Ação
                  <TooltipInfo message="Descrever o plano de ação com medidas de controle e mitigadoras do risco residual." />
                </th>

                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center">
                    <Spinner size="sm" className="me-2" /> Carregando...
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 ? 'row-blue' : 'row-white'}>
                    <td>
                      <div className="cell-clip">{(page - 1) * pageSize + idx + 1}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.matriz_filial || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.setor || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.processo || '-'}</div>
                    </td>
                    <td className="col-wide">
                      <div className="cell-clip">{r.risco_fator || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.probabilidade_label || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.impacto_label || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.pontuacao ?? '-'}</div>
                    </td>
                    <td className="col-wide">
                      <div className="cell-clip">{r.medidas_controle || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.tipo_controle || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.eficacia_label || '-'}</div>
                    </td>
                    <td>
                      <div className="cell-clip">{r.risco_residual || '-'}</div>
                    </td>
                    <td className="col-wide">
                      {r.resposta_risco ? (
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {r.resposta_risco
                            .split(/[\n;,]+/) // divide por quebra de linha, ponto e vírgula ou vírgula
                            .filter((acao) => acao.trim() !== '')
                            .map((acao, i) => (
                              <li
                                key={i}
                                style={{
                                  whiteSpace: 'normal',
                                  lineHeight: '1.4',
                                  listStyleType: 'disc',
                                  color: '#071744', // cor institucional do Camaleão
                                  fontSize: '0.95rem',
                                }}
                              >
                                {acao.trim()}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="cell-clip">-</div>
                      )}
                    </td>
                    <td>
                      <Dropdown align="end">
                        <Dropdown.Toggle size="sm" variant="outline-secondary">
                          Ações
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleEdit(r)}>
                            Editar
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="text-danger"
                            onClick={() => handleDeleteClick(r)}
                          >
                            Excluir
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* rodapé */}
        <div className="list-footer">
          <div className="text-muted">
            <strong>Total:</strong> {count} • Página {page} de {totalPages}
          </div>
          {renderPagination()}
        </div>
      </div>

      {/* === Modal === */}
      <Modal
        show={showModal}
        onHide={() => {
          resetForm();
          setShowModal(false);
        }}
        size="xl"
        centered
        contentClassName="modal-style"
      >
        <Form onSubmit={handleSave}>
          <div
            style={{
              maxHeight: '80vh', // ocupa até 80% da altura da tela
              overflowY: 'auto', // ✅ rola tudo (body + footer)
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Modal.Header closeButton>
              <Modal.Title>
                {editingId ? 'Editar Risco' : 'Cadastro de Risco'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ flexGrow: 1 }}>
              <Container fluid>
                {error && <Alert variant="danger">{error}</Alert>}
                {okMsg && <Alert variant="success">{okMsg}</Alert>}

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Matriz/Filial</Form.Label>
                    <Form.Select
                      name="matriz_filial"
                      value={form.matriz_filial}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.matriz_filial}
                    >
                      <option value=""></option>
                      <option value="matriz">Matriz</option>
                      <option value="filial">Filial</option>
                      <option value="matriz/filial">Matriz / Filial</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.matriz_filial}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Setor</Form.Label>
                    <Form.Control
                      name="setor"
                      value={form.setor}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.setor}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.setor}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Processo</Form.Label>
                    <Form.Control
                      name="processo"
                      value={form.processo}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.processo}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.processo}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Risco/Fator</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="risco_fator"
                    value={form.risco_fator}
                    onChange={onChange}
                    isInvalid={!!fieldErrors.risco_fator}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.risco_fator}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Probabilidade</Form.Label>
                    <Form.Select
                      name="probabilidade"
                      value={form.probabilidade}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.probabilidade}
                    >
                      <option value=""></option>
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
                  <Col md={4}>
                    <Form.Label>Impacto</Form.Label>
                    <Form.Select
                      name="impacto"
                      value={form.impacto}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.impacto}
                    >
                      <option value=""></option>
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
                  <Col md={4}>
                    <Form.Label>
                      Pontuação do Risco{' '}
                      {uiBand && (
                        <Badge
                          bg="light"
                          text="dark"
                          style={{ border: `1px solid ${uiBand.color}`, marginLeft: 8 }}
                        >
                          {uiBand.name}
                        </Badge>
                      )}
                    </Form.Label>
                    <Form.Control
                      readOnly
                      value={computedPontuacao || ''}
                      isInvalid={!!fieldErrors.pontuacao}
                      style={{
                        ...bandBgStyle,
                        borderLeft: uiBand ? `6px solid ${uiBand.color}` : undefined,
                        fontWeight: 700,
                      }}
                    />
                    {fieldErrors.pontuacao ? (
                      <div className="invalid-feedback d-block">
                        {fieldErrors.pontuacao}
                      </div>
                    ) : null}
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Medidas de Controle</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="medidas_controle"
                    value={form.medidas_controle}
                    onChange={onChange}
                    isInvalid={!!fieldErrors.medidas_controle}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.medidas_controle}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Tipo de Controle</Form.Label>
                    <div style={{ position: 'relative' }}>
                      {/* overlay clicável somente quando bloqueado */}
                      {!form.medidas_controle.trim() ? (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip
                              id="tooltip-tipo-controle"
                              className="custom-tooltip"
                            >
                              Preencha o campo <strong>“Medidas de Controle”</strong> para
                              habilitar esta seleção.
                            </Tooltip>
                          }
                        >
                          <div
                            onClick={handleBlockedSelectClick}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              cursor: 'not-allowed',
                              backgroundColor: 'transparent',
                              zIndex: 2,
                            }}
                          />
                        </OverlayTrigger>
                      ) : null}
                      <Form.Select
                        name="tipo_controle"
                        value={form.tipo_controle}
                        onChange={onChange}
                        isInvalid={!!fieldErrors.tipo_controle}
                        disabled={!form.medidas_controle.trim()}
                        style={{ position: 'relative', zIndex: 1 }}
                      >
                        <option value=""></option>
                        <option value="C">Preventivo</option>
                        <option value="D">Detectivo</option>
                      </Form.Select>
                    </div>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.tipo_controle}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Eficácia</Form.Label>
                    <div style={{ position: 'relative' }}>
                      {!form.medidas_controle.trim() ? (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="tooltip-eficacia" className="custom-tooltip">
                              Preencha o campo <strong>“Medidas de Controle”</strong> para
                              habilitar esta seleção.
                            </Tooltip>
                          }
                        >
                          <div
                            onClick={handleBlockedSelectClick}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              cursor: 'not-allowed',
                              backgroundColor: 'transparent',
                              zIndex: 2,
                            }}
                          />
                        </OverlayTrigger>
                      ) : null}
                      <Form.Select
                        name="eficacia"
                        value={form.eficacia}
                        onChange={onChange}
                        isInvalid={!!fieldErrors.eficacia}
                        disabled={!form.medidas_controle.trim()}
                        style={{ position: 'relative', zIndex: 1 }}
                      >
                        <option value="">(Opcional)</option>
                        {effs.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.label_pt} ({e.value})
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.eficacia}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Risco Residual</Form.Label>
                    <Form.Select
                      name="risco_residual"
                      value={form.risco_residual}
                      onChange={onChange}
                      isInvalid={!!fieldErrors.risco_residual}
                    >
                      <option value=""></option>
                      <option value="baixo">Baixo</option>
                      <option value="medio">Médio</option>
                      <option value="alto">Alto</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.risco_residual}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Resposta ao Risco (Plano de Ação)</Form.Label>
                  <ListaPlanoAcao
                    value={form.planos || []}
                    onChange={(lista) =>
                      setForm((prev) => ({
                        ...prev,
                        planos: lista,
                        resposta_risco: lista.join('\n'), // converte p/ backend
                      }))
                    }
                  />
                  {fieldErrors.resposta_risco && (
                    <div className="invalid-feedback d-block">
                      {fieldErrors.resposta_risco}
                    </div>
                  )}
                </Form.Group>
              </Container>
            </Modal.Body>
            {/* Rodapé adaptativo */}
            <div
              className="modal-footer"
              style={{
                position:
                  window.innerHeight > 850
                    ? 'sticky' // Fixa se houver bastante espaço
                    : 'relative', // Rola junto se a viewport for pequena
                bottom: 0,
                background: 'inherit',
                borderTop: 'none',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                zIndex: 10,
              }}
            >
              <Button
                variant="outline-secondary"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Risco'}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      {/* === Modal de Exclusão === */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteMsg ? (
            <Alert
              variant={deleteMsg.includes('sucesso') ? 'success' : 'danger'}
              className="mb-0"
            >
              {deleteMsg}
            </Alert>
          ) : (
            <p>
              Tem certeza que deseja excluir o risco{' '}
              <strong>{selectedToDelete?.risco_fator}</strong>?
              <br />
              Esta ação não poderá ser desfeita.
            </p>
          )}
        </Modal.Body>
        {!deleteMsg && (
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Confirmar Exclusão
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
}

export default MatrizRisco;
