// src/pages/MatrizRiscoLista.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Form,
  Button,
  Modal,
  Row,
  Col,
  Pagination,
  Alert,
  Dropdown,
  Spinner,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import '../estilos/matriz.css';
// import PaginacaoRiscos from '../components/PaginacaoRiscos';
import { useNavigate } from 'react-router-dom';

const FALLBACK_CHOICES = {
  matriz_filial: [
    ['matriz', 'Matriz'],
    ['filial', 'Filial'],
    ['matriz/filial', 'Matriz / Filial'],
  ],
  tipo_controle: [
    ['C', 'Preventivo'],
    ['D', 'Detectivo'],
  ],
  risco_residual: [
    ['baixo', 'Baixo'],
    ['medio', 'Médio'],
    ['alto', 'Alto'],
  ],
};

const ACTIONS_COL_W = 150;
const TOTAL_COLS = 14;

function MatrizRiscoLista() {
  const navigate = useNavigate();

  // LISTAGEM
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [notice, setNotice] = useState(null);
  const showMsg = (variant, text, ms = 4000) => {
    setNotice({ variant, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  // PAGINAÇÃO
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // MODAL
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  // CHOICES (vêm de risk-config/) + mapas id->obj para cálculo local
  const [choices, setChoices] = useState({
    ...FALLBACK_CHOICES,
    probabilidade: [],
    impacto: [],
    eficacia_controle: [],
  });
  const [likById, setLikById] = useState({});
  const [impById, setImpById] = useState({});
  const [effById, setEffById] = useState({});

  // ERROS DE CAMPO NO MODAL
  const [fieldErrors, setFieldErrors] = useState({});

  // FORM DO MODAL
  const emptyForm = {
    matriz_filial: '',
    setor: '',
    processo: '',
    risco_fator: '',
    probabilidade: '',
    impacto: '',
    pontuacao: '', // apenas exibição
    medidas_controle: '',
    tipo_controle: '',
    eficacia_controle: '',
    risco_residual: '',
    plano_acao: '',
  };
  const [form, setForm] = useState(emptyForm);

  // PERMISSÃO (opcional: poderia checar role do usuário logado)
  const [canEdit, setCanEdit] = useState(true); // se receber 403, desabilitamos ações

  // --------- LOAD CHOICES (risk-config/) ----------
  const loadChoices = async () => {
    try {
      const { data } = await AxiosInstance.get('risk-config/');
      const li = (data?.likelihood || []).sort((a, b) => a.value - b.value);
      const im = (data?.impact || []).sort((a, b) => a.value - b.value);
      const ef = (data?.effectiveness || []).sort((a, b) => a.value - b.value);

      setLikById(Object.fromEntries(li.map((o) => [String(o.id), o])));
      setImpById(Object.fromEntries(im.map((o) => [String(o.id), o])));
      setEffById(Object.fromEntries(ef.map((o) => [String(o.id), o])));

      setChoices({
        matriz_filial: FALLBACK_CHOICES.matriz_filial,
        probabilidade: li.map((o) => [o.id, `${o.label_pt} (${o.value})`]),
        impacto: im.map((o) => [o.id, `${o.label_pt} (${o.value})`]),
        tipo_controle: FALLBACK_CHOICES.tipo_controle,
        eficacia_controle: ef.map((o) => [o.id, `${o.label_pt} (${o.value})`]),
        risco_residual: FALLBACK_CHOICES.risco_residual,
      });
    } catch (e) {
      // fallback mínimo — mas sem config não recomendamos criar
      showMsg(
        'warning',
        'Falha ao carregar parametrizações (risk-config). A criação/edição pode não funcionar corretamente.'
      );
    }
  };

  // --------- LISTAGEM ----------
  const normalizeRow = (r) => {
    // O serializer padrão já traz ids e extras de leitura:
    // probabilidade_value, probabilidade_label, impacto_value, impacto_label, eficacia_label
    return {
      ...r,
      probabilidade_value: r.probabilidade_value ?? null,
      probabilidade_label: r.probabilidade_label ?? '',
      impacto_value: r.impacto_value ?? null,
      impacto_label: r.impacto_label ?? '',
      eficacia_label: r.eficacia_label ?? '',
      // compat: resposta_risco é o “plano de ação”
      resposta_risco: r.resposta_risco ?? '',
    };
  };

  const loadRows = async (targetPage = page, targetPageSize = pageSize) => {
    setLoadingList(true);
    try {
      const { data } = await AxiosInstance.get('riscos/', {
        params: { page: targetPage, page_size: targetPageSize },
      });
      const results = Array.isArray(data) ? data : data.results || [];
      const total = Array.isArray(data) ? results.length : (data.count ?? results.length);
      setRows(results.map(normalizeRow));
      setCount(total);
      setPage(targetPage);
      setPageSize(targetPageSize);
      setCanEdit(true); // se conseguir listar, assume permissão ok para ver; salvamento pode falhar adiante
    } catch (e) {
      if (e?.response?.status === 403) {
        setCanEdit(false);
        showMsg('danger', 'Sem permissão (apenas Admin/DPO).');
      } else {
        showMsg('danger', 'Falha ao carregar a listagem.');
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadChoices();
  }, []);
  useEffect(() => {
    loadRows(1, pageSize);
  }, [pageSize]);
  useEffect(() => {
    loadRows(page, pageSize);
  }, [page]);

  // --------- CÁLCULO LOCAL DA PONTUAÇÃO (apenas exibição no input) ----------
  useEffect(() => {
    const p = likById[String(form.probabilidade)]?.value || 0;
    const i = impById[String(form.impacto)]?.value || 0;
    const score = p && i ? String(p * i) : '';
    setForm((f) => (f.pontuacao === score ? f : { ...f, pontuacao: score }));
  }, [form.probabilidade, form.impacto, likById, impById]);

  // --------- UI HELPERS ----------
  const selectOptions = (list) =>
    (list || []).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ));

  const gotoPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));
  const zebra = (idx) => (idx % 2 === 0 ? 'row-white' : 'row-blue');
  const itemNumber = (idx) => (page - 1) * pageSize + idx + 1;

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

  // --------- AÇÕES (modal / CRUD) ----------
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setFieldErrors({});
    setForm({
      matriz_filial: r.matriz_filial || '',
      setor: r.setor || '',
      processo: r.processo || '',
      risco_fator: r.risco_fator || '',
      probabilidade: r.probabilidade || '', // ID
      impacto: r.impacto || '', // ID
      pontuacao: String(r.pontuacao ?? ''),
      medidas_controle: r.medidas_controle || '',
      tipo_controle: r.tipo_controle || '',
      eficacia_controle: r.eficacia || '', // ID
      risco_residual: r.risco_residual || '',
      plano_acao: r.resposta_risco || '',
    });
    setShowModal(true);
  };

  const parseFieldErrors = (data) => {
    if (!data || typeof data !== 'object') return {};
    const mapped = {};
    Object.entries(data).forEach(([k, v]) => {
      if (Array.isArray(v)) mapped[k] = v.join(' ');
      else if (typeof v === 'string') mapped[k] = v;
      else mapped[k] = String(v);
    });
    return mapped;
  };

  const normalizePayload = (f) => {
    const hasMedidas = !!String(f.medidas_controle || '').trim();
    return {
      matriz_filial: f.matriz_filial || null,
      setor: f.setor?.trim() || '',
      processo: f.processo?.trim() || '',
      risco_fator: f.risco_fator?.trim() || '',
      probabilidade: f.probabilidade ? Number(f.probabilidade) : null, // ID
      impacto: f.impacto ? Number(f.impacto) : null, // ID
      // pontuacao fica a cargo do servidor
      medidas_controle: f.medidas_controle?.trim() || '',
      tipo_controle: hasMedidas ? f.tipo_controle || null : '', // zera se não há medidas
      eficacia: hasMedidas && f.eficacia_controle ? Number(f.eficacia_controle) : null,
      risco_residual: f.risco_residual || null, // "baixo|medio|alto"
      resposta_risco: f.plano_acao?.trim() || '',
    };
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (saving) return;

    setSaving(true);
    setFieldErrors({});
    try {
      const payload = normalizePayload(form);

      // Validações mínimas no front (espelham o serializer)
      const localErrs = {};
      const req = [
        'matriz_filial',
        'setor',
        'processo',
        'risco_fator',
        'probabilidade',
        'impacto',
        'risco_residual',
      ];
      req.forEach((f) => {
        const v = payload[f];
        if (v === null || v === undefined || String(v).trim() === '') {
          localErrs[f] = 'Campo obrigatório.';
        }
      });
      // regra de controle
      const existeMedidas = !!payload.medidas_controle?.trim();
      if (!existeMedidas) {
        if (payload.tipo_controle)
          localErrs.tipo_controle = 'Deixe vazio quando não existe controle.';
        if (payload.eficacia !== null)
          localErrs.eficacia = 'Não defina eficácia quando não existe controle.';
      } else {
        if (payload.tipo_controle && !['C', 'D'].includes(payload.tipo_controle)) {
          localErrs.tipo_controle = 'Use "C" (Preventivo) ou "D" (Detectivo).';
        }
      }
      if (Object.keys(localErrs).length) {
        setFieldErrors(localErrs);
        setSaving(false);
        return;
      }

      if (editing) {
        await AxiosInstance.put(`riscos/${editing.id}/`, payload);
        showMsg('success', 'Risco atualizado com sucesso!');
      } else {
        await AxiosInstance.post('riscos/', payload);
        showMsg('success', 'Risco criado com sucesso!');
      }
      setShowModal(false);
      await loadRows(page, pageSize);
      setCanEdit(true);
    } catch (e) {
      if (e?.response?.status === 403) {
        setCanEdit(false);
        showMsg('danger', 'Sem permissão (apenas Admin/DPO).', 6000);
      } else if (e?.response?.data) {
        const mapped = parseFieldErrors(e.response.data);
        if (Object.keys(mapped).length) {
          setFieldErrors(mapped);
        } else {
          showMsg('danger', 'Erro ao salvar. Verifique os campos.', 6000);
        }
      } else {
        showMsg('danger', 'Erro ao salvar. Verifique a conexão.', 6000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await AxiosInstance.delete(`riscos/${row.id}/`);
      showMsg('success', 'Excluído com sucesso.');
      loadRows(page, pageSize);
    } catch (e) {
      if (e?.response?.status === 403) {
        setCanEdit(false);
        showMsg('danger', 'Sem permissão (apenas Admin/DPO).', 6000);
      } else {
        showMsg('danger', 'Erro ao excluir. Tente novamente.', 6000);
      }
    }
  };

  // --------- RENDER ----------
  const stickyThStyle = {
    position: 'sticky',
    right: 0,
    zIndex: 5,
    background: '#0b3e6f',
    color: '#fff',
    whiteSpace: 'nowrap',
    width: ACTIONS_COL_W,
    minWidth: ACTIONS_COL_W,
    boxShadow: '-4px 0 8px rgba(0,0,0,0.08)',
  };
  const stickyTdStyle = {
    position: 'sticky',
    right: 0,
    zIndex: 4,
    background: '#fff',
    width: ACTIONS_COL_W,
    minWidth: ACTIONS_COL_W,
    boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
  };
  const disabledStyle = !canEdit ? { opacity: 0.6, pointerEvents: 'none' } : {};

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <div
        style={{
          background: '#f5f5f5',
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem 1rem',
          marginTop: '56px',
          boxSizing: 'border-box',
        }}
      >
        {notice && (
          <div className="w-100 mb-2">
            <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          </div>
        )}

        <div className="w-100 mb-2">
          <h2
            className="text-center"
            style={{ color: '#071744', fontWeight: 700, fontSize: '1.6rem', margin: 0 }}
          >
            Avaliação de Risco
          </h2>
        </div>

        {/* <div className="w-100 mb-4">
          <PaginacaoRiscos />
        </div> */}

        <div className="d-flex w-100 align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0">Itens por página</Form.Label>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ width: 110 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>

          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/matriz-risco')} // rota da tela antiga (backup)
            >
              Abrir Tela de Cadastro (antiga)
            </Button>
            <Button variant="primary" onClick={openCreate} disabled={!canEdit}>
              + Novo
            </Button>
          </div>
        </div>

        <div className="list-shell" style={{ width: '100%' }}>
          <div
            className="table-wrap"
            style={{
              ['--actions-w']: `${ACTIONS_COL_W}px`,
            }}
          >
            <Table
              bordered
              hover
              responsive={false}
              className="custom-table"
              style={{
                minWidth: '1400px',
                tableLayout: 'auto',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead className="thead-gradient">
                <tr>
                  <th style={{ width: 80 }}>Item</th>
                  <th style={{ width: 140 }}>Matriz/Filial</th>
                  <th style={{ width: 120 }}>Setor</th>
                  <th style={{ width: 260 }}>Processo de Negócio Envolvido</th>
                  <th style={{ width: 280 }}>Risco/Fator</th>
                  <th style={{ width: 150 }}>Probabilidade</th>
                  <th style={{ width: 140 }}>Impacto</th>
                  <th style={{ width: 160 }}>Pontuação do Risco</th>
                  <th style={{ width: 300 }}>Medidas de Controle</th>
                  <th style={{ width: 170 }}>Tipo de Controle</th>
                  <th style={{ width: 190 }}>Eficácia do Controle</th>
                  <th style={{ width: 170 }}>Risco Residual</th>
                  <th style={{ width: 260 }}>Plano de Ação</th>
                  <th style={stickyThStyle}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loadingList && (
                  <tr className="row-white">
                    <td colSpan={TOTAL_COLS} className="text-center text-muted">
                      <Spinner size="sm" className="me-2" /> Carregando…
                    </td>
                  </tr>
                )}

                {!loadingList && rows.length === 0 && (
                  <tr className="row-white">
                    <td colSpan={TOTAL_COLS} className="text-center text-muted">
                      Nenhum risco cadastrado.
                    </td>
                  </tr>
                )}

                {!loadingList &&
                  rows.map((r, idx) => (
                    <tr key={r.id} className={zebra(idx)}>
                      <td>{itemNumber(idx)}</td>
                      <td>{r.matriz_filial || '-'}</td>
                      <td>{r.setor || '-'}</td>
                      <td>{r.processo || '-'}</td>
                      <td title={r.risco_fator || ''}>{r.risco_fator || '-'}</td>

                      <td
                        title={
                          r.probabilidade_label
                            ? `${r.probabilidade_label} (${r.probabilidade_value})`
                            : ''
                        }
                      >
                        {r.probabilidade_label
                          ? `${r.probabilidade_label} (${r.probabilidade_value})`
                          : (r.probabilidade ?? '-')}
                      </td>

                      <td
                        title={
                          r.impacto_label ? `${r.impacto_label} (${r.impacto_value})` : ''
                        }
                      >
                        {r.impacto_label
                          ? `${r.impacto_label} (${r.impacto_value})`
                          : (r.impacto ?? '-')}
                      </td>

                      <td>{r.pontuacao ?? '-'}</td>

                      <td>{r.medidas_controle || '-'}</td>
                      <td>{r.tipo_controle || '-'}</td>
                      <td>{r.eficacia_label || '-'}</td>
                      <td>
                        {r.risco_residual
                          ? r.risco_residual.charAt(0).toUpperCase() +
                            r.risco_residual.slice(1)
                          : '-'}
                      </td>
                      <td>{r.resposta_risco || '-'}</td>

                      <td style={{ ...stickyTdStyle, ...disabledStyle }}>
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            size="sm"
                            variant="outline-secondary"
                            disabled={!canEdit}
                          >
                            Ações
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item
                              onClick={() => openEdit(r)}
                              disabled={!canEdit}
                            >
                              Editar
                            </Dropdown.Item>
                            <Dropdown.Item
                              className="text-danger"
                              onClick={() => handleDelete(r)}
                              disabled={!canEdit}
                            >
                              Excluir
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>

          <div className="list-footer">
            <div className="text-muted">
              <strong>Total:</strong> {count} • Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>

        {/* MODAL */}
        <Modal
          show={showModal}
          onHide={() => setShowModal(false)}
          size="xl"
          centered
          scrollable
          dialogClassName="lgpd-modal-dialog"
          contentClassName="lgpd-modal-content"
        >
          <Form onSubmit={handleSave}>
            <Modal.Header closeButton closeVariant="white">
              <Modal.Title className="w-100 text-center m-0">
                {editing ? 'Editar Risco' : 'Novo Risco'}
              </Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Matriz/Filial</Form.Label>
                  <Form.Select
                    value={form.matriz_filial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, matriz_filial: e.target.value }))
                    }
                    isInvalid={!!fieldErrors.matriz_filial}
                    required
                  >
                    <option value="">Selecione…</option>
                    {selectOptions(choices.matriz_filial)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.matriz_filial}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Setor</Form.Label>
                  <Form.Control
                    placeholder="Ex.: TI"
                    value={form.setor}
                    onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}
                    isInvalid={!!fieldErrors.setor}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.setor}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Processo de Negócio Envolvido</Form.Label>
                  <Form.Control
                    placeholder="Ex.: Gestão de Acessos"
                    value={form.processo}
                    onChange={(e) => setForm((f) => ({ ...f, processo: e.target.value }))}
                    isInvalid={!!fieldErrors.processo}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.processo}
                  </Form.Control.Feedback>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Risco e Fator de Risco</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Descreva o risco e seus fatores"
                  value={form.risco_fator}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, risco_fator: e.target.value }))
                  }
                  isInvalid={!!fieldErrors.risco_fator}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.risco_fator}
                </Form.Control.Feedback>
              </Form.Group>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Probabilidade (1–5)</Form.Label>
                  <Form.Select
                    value={form.probabilidade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, probabilidade: e.target.value }))
                    }
                    isInvalid={!!fieldErrors.probabilidade}
                    required
                  >
                    <option value="">Selecione…</option>
                    {selectOptions(choices.probabilidade)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.probabilidade}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Impacto (1–5)</Form.Label>
                  <Form.Select
                    value={form.impacto}
                    onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
                    isInvalid={!!fieldErrors.impacto}
                    required
                  >
                    <option value="">Selecione…</option>
                    {selectOptions(choices.impacto)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.impacto}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Pontuação do Risco</Form.Label>
                  <Form.Control
                    value={form.pontuacao}
                    readOnly
                    tabIndex={-1}
                    className="no-caret no-pointer"
                    onFocus={(e) => e.target.blur()}
                    aria-readonly="true"
                    style={{
                      caretColor: 'transparent',
                      pointerEvents: 'none',
                      fontWeight: 700,
                    }}
                    isInvalid={!!fieldErrors.pontuacao}
                  />
                  {fieldErrors.pontuacao ? (
                    <div className="invalid-feedback d-block">
                      {fieldErrors.pontuacao}
                    </div>
                  ) : null}
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Medidas de Controle (existentes)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ex.: MFA habilitada, política de senhas, segregação de funções…"
                  value={form.medidas_controle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, medidas_controle: e.target.value }))
                  }
                />
              </Form.Group>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Tipo de Controle</Form.Label>
                  <Form.Select
                    value={form.tipo_controle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tipo_controle: e.target.value }))
                    }
                    isInvalid={!!fieldErrors.tipo_controle}
                    disabled={!String(form.medidas_controle || '').trim()}
                  >
                    <option value="">Selecione…</option>
                    {selectOptions(choices.tipo_controle)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.tipo_controle}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Eficácia do Controle</Form.Label>
                  <Form.Select
                    value={form.eficacia_controle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, eficacia_controle: e.target.value }))
                    }
                    isInvalid={!!fieldErrors.eficacia}
                    disabled={!String(form.medidas_controle || '').trim()}
                  >
                    <option value="">(Opcional) Selecione…</option>
                    {selectOptions(choices.eficacia_controle)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.eficacia}
                  </Form.Control.Feedback>
                </Col>

                <Col md={4}>
                  <Form.Label>Risco Residual</Form.Label>
                  <Form.Select
                    value={form.risco_residual}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, risco_residual: e.target.value }))
                    }
                    isInvalid={!!fieldErrors.risco_residual}
                  >
                    <option value="">Selecione…</option>
                    {selectOptions(choices.risco_residual)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.risco_residual}
                  </Form.Control.Feedback>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label>Resposta ao Risco (Plano de Ação)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Descreva as medidas de resposta / plano de ação"
                  value={form.plano_acao}
                  onChange={(e) => setForm((f) => ({ ...f, plano_acao: e.target.value }))}
                />
              </Form.Group>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() =>
                  setForm(editing ? { ...emptyForm, ...form, pontuacao: '' } : emptyForm)
                }
              >
                Limpar
              </Button>
              <Button variant="outline-light" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving || !canEdit}>
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar Risco'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}

export default MatrizRiscoLista;
