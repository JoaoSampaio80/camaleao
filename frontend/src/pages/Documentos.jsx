import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import Axios from '../components/Axios';
import TooltipInfo from '../components/TooltipInfo';
import FilterBar from '../components/FilterBar';

// Fallbacks caso /api/documentos/choices/ falhe ou venha vazio
const FALLBACK_CHOICES = {
  dimensao: [
    ['GPV', 'Gestão de privacidade'],
    ['GSI', 'Gestão de SI'],
    ['PRC', 'Processos'],
  ],
  criticidade: [
    ['NA', 'Não aplicável'],
    ['BP', 'Boas práticas'],
    ['BX', 'Baixa'],
    ['MD', 'Média'],
    ['AL', 'Alta'],
  ],
  status: [
    ['NA', 'Não aplicável'],
    ['NI', 'Não Iniciado'],
    ['EA', 'Em andamento'],
    ['FI', 'Finalizado'],
  ],
};

function FormularioAtividades() {
  const [rows, setRows] = useState([]);
  const [choices, setChoices] = useState(FALLBACK_CHOICES);
  const [loading, setLoading] = useState(false);
  const [filterDim, setFilterDim] = useState('');
  const [filterCrit, setFilterCrit] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // Modal criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    dimensao: '',
    atividade: '',
    base_legal: '',
    evidencia: '',
    proxima_revisao: '',
    comentarios: '',
    criticidade: 'NA',
    status: 'NI',
  });
  const [saving, setSaving] = useState(false);

  // Upload (via input oculto por linha)
  const fileInputsRef = useRef({});

  // Mensagens (padrão 1,5s)
  const [notice, setNotice] = useState(null); // {variant, text}
  const showMsg = (variant, text, ms = 1500) => {
    setNotice({ variant, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  // Confirmação de exclusão (modal moderno)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // row
  const [deleting, setDeleting] = useState(false);

  // TODO: integre com seu backend de auth / JWT
  const isStaffOrDPO = true;

  const safeMergeChoices = (data) => ({
    dimensao: data?.dimensao?.length ? data.dimensao : FALLBACK_CHOICES.dimensao,
    criticidade: data?.criticidade?.length
      ? data.criticidade
      : FALLBACK_CHOICES.criticidade,
    status: data?.status?.length ? data.status : FALLBACK_CHOICES.status,
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Garante que a data ISO não seja interpretada em UTC
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts.map(Number);
    const d = new Date(year, month - 1, day); // cria data local (sem fuso)
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const clearFilters = () => {
    setFilterDim('');
    setFilterCrit('');
    setFilterStatus('');
    setPage(1);
  };

  const loadChoices = async () => {
    try {
      const { data } = await Axios.get('/documentos/choices/');
      setChoices(safeMergeChoices(data));
    } catch {
      setChoices(FALLBACK_CHOICES);
    }
  };

  const loadRows = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);

    try {
      const params = {
        page: targetPage,
        page_size: targetPageSize,
        ...(filterDim && { dimensao: filterDim }),
        ...(filterCrit && { criticidade: filterCrit }),
        ...(filterStatus && { status: filterStatus }),
      };

      const { data } = await Axios.get('/documentos/', { params });

      const results = Array.isArray(data) ? data : data.results || [];
      const total = Array.isArray(data) ? results.length : (data.count ?? results.length);

      if (!Array.isArray(data) && results.length === 0 && targetPage > 1) {
        const prev = targetPage - 1;
        const retry = await Axios.get('/documentos/', {
          params: {
            page: prev,
            page_size: targetPageSize,
            ...(filterDim && { dimensao: filterDim }),
            ...(filterCrit && { criticidade: filterCrit }),
            ...(filterStatus && { status: filterStatus }),
          },
        });
        const r2 = retry.data.results || [];

        setRows(r2);
        setCount(retry.data.count ?? 0);
        setPage(prev); // apenas aqui!
        return;
      }

      setRows(results);
      setCount(total);
    } catch {
      showMsg(
        'danger',
        'Falha ao carregar a listagem. Se o problema persistir, contate o administrador.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChoices();
  }, []);

  useEffect(() => {
    loadRows(page, pageSize);
  }, [page, pageSize]);

  useEffect(() => {
    loadRows(1, pageSize);
  }, [filterDim, filterCrit, filterStatus]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      dimensao: '',
      atividade: '',
      base_legal: '',
      evidencia: '',
      proxima_revisao: '',
      comentarios: '',
      criticidade: 'NA',
      status: 'NI',
    });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      dimensao: row.dimensao || '',
      atividade: row.atividade || '',
      base_legal: row.base_legal || '',
      evidencia: row.evidencia || '',
      proxima_revisao: row.proxima_revisao || '',
      comentarios: row.comentarios || '',
      criticidade: row.criticidade || 'NA',
      status: row.status || 'NI',
    });
    setShowModal(true);
  };

  const normalizePayload = (f) => ({
    ...f,
    proxima_revisao: f.proxima_revisao ? f.proxima_revisao : null, // '' -> null
  });

  const parseErrorMsg = (e) => {
    if (e?.response) {
      const { status, data } = e.response;
      if (status === 403) return 'Sem permissão. (Apenas Admin/DPO podem salvar aqui.)';
      if (typeof data === 'string')
        return `${data} Se o problema persistir, contate o administrador.`;
      if (data && typeof data === 'object') {
        try {
          const parts = Object.entries(data).map(([k, v]) => {
            const val = Array.isArray(v) ? v.join('; ') : String(v);
            return `${k}: ${val}`;
          });
          return `${parts.join(' | ')} Se o problema persistir, contate o administrador.`;
        } catch {
          return 'Erro ao salvar (validação). Se o problema persistir, contate o administrador.';
        }
      }
    }
    return 'Erro ao salvar. Verifique a conexão. Se o problema persistir, contate o administrador.';
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = normalizePayload(form);
      if (editing) {
        await Axios.put(`/documentos/${editing.id}/`, payload);
        showMsg('success', 'Atividade atualizada com sucesso!');
      } else {
        await Axios.post('/documentos/', payload);
        showMsg('success', 'Atividade criada com sucesso!');
      }
      setShowModal(false);
      await loadRows(page, pageSize);
    } catch (e) {
      console.error(e);
      showMsg('danger', parseErrorMsg(e));
    } finally {
      setSaving(false);
    }
  };

  // —— Exclusão com modal moderno e mensagens 3s ——
  const askDelete = (row) => {
    setConfirmTarget(row);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await Axios.delete(`/documentos/${confirmTarget.id}/`);
      showMsg('success', 'Excluído com sucesso.');
      await loadRows(page, pageSize);
    } catch (e) {
      console.error(e);
      showMsg('danger', parseErrorMsg(e));
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  // ===== DOWNLOAD ROBUSTO (mantém extensão correta) =====
  const filenameFromCD = (headers) => {
    const cd = headers?.['content-disposition'] || headers?.['Content-Disposition'] || '';
    const m1 = /filename\*=(?:UTF-8''|)([^;]+)/i.exec(cd);
    const m2 = /filename="([^"]+)"/i.exec(cd);
    const raw = (m1?.[1] || m2?.[1] || '').trim();
    return raw ? decodeURIComponent(raw.replace(/^UTF-8''/, '')) : null;
  };

  const filenameFromUrl = (maybeUrl) => {
    if (!maybeUrl) return null;
    try {
      const base = (Axios.defaults.baseURL || '').replace(/\/+$/, '');
      const u = new URL(maybeUrl, base);
      const last = u.pathname.split('/').pop();
      return last ? decodeURIComponent(last) : null;
    } catch {
      const parts = `${maybeUrl}`.split('/');
      return parts.pop() || null;
    }
  };

  const extFromMime = (mime) => {
    const map = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'application/zip': 'zip',
      'application/x-zip-compressed': 'zip',
      'application/json': 'json',
    };
    return map[mime] || null;
  };

  const hasExtension = (name) => /\.[A-Za-z0-9]{2,8}$/.test(name);
  const ensureExtension = (name, mime) => {
    if (hasExtension(name)) return name;
    const ext = extFromMime(mime);
    return ext ? `${name}.${ext}` : name;
  };

  const absoluteFileUrl = (maybeUrl) => {
    if (!maybeUrl) return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    const base = (Axios.defaults.baseURL || '').replace(/\/+$/, '');
    return `${base}${maybeUrl}`;
  };

  const handleDownload = async (row) => {
    try {
      if (!row.arquivo_url) return;
      const url = absoluteFileUrl(row.arquivo_url);
      const resp = await Axios.get(url, { responseType: 'blob' });

      const mime = resp.headers['content-type'] || row.arquivo_mime || undefined;
      let filename =
        filenameFromCD(resp.headers) ||
        row.arquivo_name ||
        filenameFromUrl(url) ||
        (row.atividade ? row.atividade.slice(0, 50).replace(/\s+/g, '_') : 'arquivo');

      filename = ensureExtension(filename, mime);

      const blob = new Blob([resp.data], mime ? { type: mime } : undefined);
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(href);
      showMsg('success', 'Download iniciado.');
    } catch (e) {
      console.error(e);
      showMsg(
        'danger',
        'Falha no download. Verifique suas permissões e o arquivo. Se o problema persistir, contate o administrador.'
      );
    }
  };

  // ---- UPLOAD por input oculto ----
  const triggerUpload = (rowId) => {
    const el = fileInputsRef.current[rowId];
    if (el) el.click();
  };

  const onFilePicked = async (rowId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('arquivo', file);
    try {
      await Axios.post(`/documentos/${rowId}/upload/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMsg('success', 'Arquivo enviado.');
      await loadRows(page, pageSize);
    } catch (e) {
      console.error(e);
      showMsg('danger', parseErrorMsg(e));
    } finally {
      if (fileInputsRef.current[rowId]) fileInputsRef.current[rowId].value = '';
    }
  };

  const selectOptions = (list) =>
    list.map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ));

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

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <style>{`
        /* Tabela e título */
        .custom-table, .custom-table th, .custom-table td { border-color: #d9e1e8 !important; }
        .thead-gradient tr { background: linear-gradient(135deg, #003366, #005b96) !important; }
        .thead-gradient th { background: transparent !important; color: #fff !important; border-color: #00528a !important; white-space: nowrap; }
        .custom-table tbody tr.row-white td { background: #ffffff !important; color: #212529; }
        .custom-table tbody tr.row-blue  td { background: #005b96 !important; color: #ffffff; }
        .custom-table.table-hover tbody tr:hover td { background: #004b80 !important; color: #fff; }
        .custom-table tbody tr.row-blue td .form-select,
        .custom-table tbody tr.row-blue td .form-control,
        .custom-table tbody tr.row-blue td .btn,
        .custom-table.table-hover tbody tr:hover td .form-select,
        .custom-table.table-hover tbody tr:hover td .form-control,
        .custom-table.table-hover tbody tr:hover td .btn {
          background-color: #ffffff !important;
          color: #212529 !important;
          border-color: #ced4da !important;
          box-shadow: none !important;
        }
        .custom-table tbody tr.row-blue td .form-select:focus { border-color: #80bdff !important; }

        /* Dropdown acima da tabela */
        .custom-table .dropdown-menu { z-index: 1060; }

        /* Painel que ocupa a altura toda até o rodapé */
        .list-shell {
          width: 100%;
          background: #f7fbff;
          border-radius: .75rem;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
          display: flex;
          flex-direction: column;
          /* 56px = navbar fixa; 120px ~ header + espaçamentos */
          min-height: calc(100vh - 56px - 120px);
        }
        .table-wrap { flex: 1; overflow-x: auto; }
        .table-wrap table { margin-bottom: 0; }

        .list-footer {
          margin-top: .75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #eef5fb;
          border-radius: .5rem;
          padding: .5rem .75rem;
        }

        /* ===== MODAL estilo "card" azul ===== */
        .lgpd-modal-dialog { max-width: min(1200px, 95vw); margin: 2rem auto; }
        .lgpd-modal-content { border: 0; border-radius: 1rem; overflow: hidden; }
        .lgpd-modal-content .modal-header { background: #063a6b; color: #fff; }
        .lgpd-modal-content .modal-header .btn-close { filter: invert(1); opacity: .9; }
        .lgpd-modal-content .modal-title { width: 100%; text-align: center; margin: 0; }
        .lgpd-modal-content .modal-body   { background: #063a6b; }
        .lgpd-modal-content .modal-footer { background: #063a6b; border-top: 1px solid rgba(255,255,255,0.15); }
        .lgpd-modal-content .modal-body label { color: #ffffff; font-weight: 600; }
        .lgpd-modal-content .modal-body .form-control,
        .lgpd-modal-content .modal-body .form-select {
          background: #ffffff !important;
          color: #212529 !important;
          border-color: #ced4da !important;
          box-shadow: none !important;
        }
      `}</style>

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
        {/* Mensagens globais */}
        {notice && (
          <div className="w-100 mb-2">
            <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          </div>
        )}

        {/* Título centralizado */}
        <div className="w-100 mb-2">
          <h2
            className="text-center"
            style={{ color: '#071744', fontWeight: 700, fontSize: '1.6rem', margin: 0 }}
          >
            Atividades da LGPD
          </h2>
        </div>

        <FilterBar
          pageSize={{
            value: pageSize,
            onChange: (v) => {
              setPage(1);
              setPageSize(v);
            },
          }}
          extraActions={
            <Button variant="primary" onClick={openCreate}>
              + Novo
            </Button>
          }
          filters={[
            {
              key: 'dimensao',
              label: 'Dimensão',
              value: filterDim,
              onChange: setFilterDim,
              options: choices.dimensao,
              emptyOption: 'Todas',
            },
            {
              key: 'criticidade',
              label: 'Criticidade',
              value: filterCrit,
              onChange: setFilterCrit,
              options: choices.criticidade,
              emptyOption: 'Todas',
            },
            {
              key: 'status',
              label: 'Status',
              value: filterStatus,
              onChange: setFilterStatus,
              options: choices.status,
              emptyOption: 'Todos',
            },
          ]}
          onClearFilters={clearFilters}
          renderPagination={renderPagination}
        />

        {/* Painel que estica até o rodapé */}
        <div className="list-shell">
          <div className="table-wrap">
            <Table
              bordered
              hover
              responsive={false}
              className="custom-table"
              style={{ width: '100%', minWidth: 1200 }}
            >
              <thead className="thead-gradient">
                <tr>
                  <th>Dimensão</th>
                  <th>
                    Atividade / Documento{' '}
                    <TooltipInfo message="Atividades de gerenciamento de privacidade e proteção de dados pessoais" />
                  </th>
                  <th>
                    Base Legal{' '}
                    <TooltipInfo message="Artigo ou referência da lei que justifique a atividade" />
                  </th>
                  <th>
                    Evidência{' '}
                    <TooltipInfo message="Documento que comprove a execução da atividade" />
                  </th>
                  <th>
                    Próxima Revisão{' '}
                    <TooltipInfo message="Prazo pré-definido da validade do documento" />
                  </th>
                  <th>
                    Comentários <TooltipInfo message="Campo de preenchimento opcional" />
                  </th>
                  <th>Criticidade</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr className="row-white">
                    <td colSpan={9} className="text-center text-muted">
                      Carregando…
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr className="row-white">
                    <td colSpan={9} className="text-center text-muted">
                      Nenhum documento encontrado.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 === 0 ? 'row-white' : 'row-blue'}>
                      <td title={r.dimensao_display}>{r.dimensao_display}</td>
                      <td>{r.atividade}</td>
                      <td>{r.base_legal}</td>
                      <td>{r.evidencia}</td>
                      <td>{r.proxima_revisao ? formatDate(r.proxima_revisao) : '-'}</td>
                      <td>{r.comentarios || '-'}</td>
                      <td title={r.criticidade_display}>{r.criticidade_display}</td>
                      <td title={r.status_display}>{r.status_display}</td>
                      <td>
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputsRef.current[r.id] = el;
                          }}
                          className="d-none"
                          onChange={(e) => onFilePicked(r.id, e.target.files?.[0])}
                        />

                        <Dropdown align="end">
                          <Dropdown.Toggle size="sm" variant="outline-secondary">
                            Ações
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            {r.arquivo_url && (
                              <Dropdown.Item onClick={() => handleDownload(r)}>
                                Download
                              </Dropdown.Item>
                            )}
                            {isStaffOrDPO && (
                              <>
                                <Dropdown.Item onClick={() => triggerUpload(r.id)}>
                                  Upload
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => openEdit(r)}>
                                  Editar
                                </Dropdown.Item>
                                <Dropdown.Item
                                  className="text-danger"
                                  onClick={() => askDelete(r)}
                                >
                                  Excluir
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>

          {/* Rodapé da lista */}
          <div className="list-footer mt-3">
            <div className="text-muted">
              <strong>Total:</strong> {count} • Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>

        {/* Modal de criação/edição — XL, azul escuro e título centralizado */}
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
                {editing ? 'Editar Atividade' : 'Nova Atividade'}
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Dimensão</Form.Label>
                  <Form.Select
                    value={form.dimensao}
                    onChange={(e) => setForm((f) => ({ ...f, dimensao: e.target.value }))}
                    required
                  >
                    <option value=""></option>
                    {selectOptions(choices.dimensao)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Criticidade</Form.Label>
                  <Form.Select
                    value={form.criticidade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, criticidade: e.target.value }))
                    }
                    required
                  >
                    {selectOptions(choices.criticidade)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    required
                  >
                    {selectOptions(choices.status)}
                  </Form.Select>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>
                  Atividade / Documento{' '}
                  <TooltipInfo message="Atividades de gerenciamento de privacidade e proteção de dados pessoais" />{' '}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.atividade}
                  onChange={(e) => setForm((f) => ({ ...f, atividade: e.target.value }))}
                  required
                />
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>
                    Base Legal{' '}
                    <TooltipInfo message="Artigo ou referência da lei que justifique a atividade" />
                  </Form.Label>
                  <Form.Control
                    value={form.base_legal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, base_legal: e.target.value }))
                    }
                    placeholder="Ex.: Art. 41 da Lei 13.709/2018"
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>
                    Evidência{' '}
                    <TooltipInfo message="Documento que comprove a execução da atividade" />
                  </Form.Label>
                  <Form.Control
                    value={form.evidencia}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, evidencia: e.target.value }))
                    }
                    placeholder="Ex.: NI Nº 123-AB"
                  />
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Label>
                    Próxima Revisão{' '}
                    <TooltipInfo message="Prazo pré-definido da validade do documento" />
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={form.proxima_revisao || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, proxima_revisao: e.target.value }))
                    }
                  />
                </Col>
                <Col md={8}>
                  <Form.Label>
                    Comentários <TooltipInfo message="Campo de preenchimento opcional" />
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.comentarios}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, comentarios: e.target.value }))
                    }
                    placeholder="Observações gerais, contexto, responsáveis, links, etc."
                  />
                </Col>
              </Row>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>

      {/* Modal de confirmação de exclusão (padrão, 3s feedback) */}
      <Modal
        show={confirmOpen}
        onHide={() => !deleting && setConfirmOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirmar exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza de que deseja <strong>excluir</strong> este registro?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Excluindo…' : 'Excluir'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default FormularioAtividades;
