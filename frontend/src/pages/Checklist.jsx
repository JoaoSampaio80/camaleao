import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Container,
  Form,
  Spinner,
  Alert,
  Pagination,
  Button,
  Modal,
  Row,
  Col,
  Dropdown,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import { useAuth } from '../context/AuthContext';

function Checklist() {
  const { user } = useAuth();
  const canToggle = user?.role === 'admin' || user?.role === 'dpo';
  const readOnly = !canToggle;

  const [rows, setRows] = useState([]); // sempre array
  const [loading, setLoading] = useState(true);

  // mensagens globais
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState('warning');
  const showFlash = (v, t) => {
    setVariant(v);
    setMsg(t);
    setTimeout(() => setMsg(''), 3000);
  };

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0); // total do backend (quando paginado)
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);

  // ===== Modal criação/edição =====
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    atividade: '',
    descricao: '',
  });

  // ===== Modal de confirmação de exclusão =====
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ===== FETCH com normalização segura =====
  const loadList = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const params = { page: targetPage, page_size: targetPageSize };
      const resp = await AxiosInstance.get('checklists/', { params });
      const data = resp?.data;

      // aceita: [ ... ]  ou  { results: [ ... ], count, next, previous }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setRows(list || []);
      if (Array.isArray(data)) {
        setCount(data.length);
        setNext(null);
        setPrevious(null);
      } else {
        setCount(Number.isFinite(data?.count) ? data.count : (list?.length ?? 0));
        setNext(data?.next ?? null);
        setPrevious(data?.previous ?? null);
      }
      // NÃO limpar msg aqui para não apagar mensagens de sucesso de criar/editar
    } catch (error) {
      console.error(
        'Erro ao buscar o checklist:',
        error?.response?.data || error.message
      );
      setRows([]);
      setCount(0);
      setNext(null);
      setPrevious(null);
      showFlash(
        'danger',
        'Falha ao carregar itens do checklist. Se o problema persistir, contate o administrador.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // total de páginas (se backend não paginar, vira 1 página só)
  const totalPages = useMemo(() => {
    const total = count || rows.length || 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [count, rows.length, pageSize]);

  // evita ficar em página inválida ao mudar pageSize/total
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // helpers de paginação (NÃO são hooks)
  const canPrev = Boolean(previous) || page > 1;
  const canNext = Boolean(next) || page < totalPages;

  // <<< ESTE useMemo FICA ANTES DE QUALQUER RETURN >>>
  const pageItems = useMemo(() => {
    const around = 2;
    const start = Math.max(1, page - around);
    const end = Math.min(totalPages, page + around);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  // ===== Toggle com permissão e rollback =====
  const handleCheckChange = async (id, is_completed) => {
    if (!canToggle) return;

    const snapshot = rows;
    setRows((curr) =>
      (Array.isArray(curr) ? curr : []).map((it) =>
        it.id === id ? { ...it, is_completed: !is_completed } : it
      )
    );

    try {
      await AxiosInstance.patch(`checklists/${id}/`, { is_completed: !is_completed });
    } catch (error) {
      console.error(
        'Erro ao atualizar o checklist:',
        error?.response?.data || error.message
      );
      setRows(snapshot); // reverte UI
      const st = error?.response?.status;
      showFlash(
        st === 403 ? 'warning' : 'danger',
        st === 403
          ? 'Você não tem permissão para alterar este item.'
          : 'Não foi possível atualizar o item. Se o problema persistir, contate o administrador.'
      );
    }
  };

  // ===== Novo / Editar =====
  const openCreate = () => {
    if (!canToggle) return;
    setEditing(null);
    setForm({ atividade: '', descricao: '' });
    setShowModal(true);
  };

  const openEdit = (row) => {
    if (!canToggle) return;
    setEditing(row);
    setForm({
      atividade: row.atividade || '',
      descricao: row.descricao || '',
    });
    setShowModal(true);
  };

  const parseErrorMsg = (e) => {
    let base = 'Erro ao salvar. Verifique os dados e a conexão.';
    if (e?.response) {
      const { status, data } = e.response;
      if (status === 403) base = 'Sem permissão. (Apenas Admin/DPO podem salvar aqui.)';
      else if (typeof data === 'string') base = data;
      else if (data && typeof data === 'object') {
        try {
          const parts = Object.entries(data).map(([k, v]) => {
            const val = Array.isArray(v) ? v.join('; ') : String(v);
            return `${k}: ${val}`;
          });
          base = parts.join(' | ');
        } catch {
          base = 'Erro ao salvar (validação).';
        }
      }
    }
    return `${base} Se o problema persistir, contate o administrador.`;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!canToggle || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await AxiosInstance.put(`checklists/${editing.id}/`, form);
        showFlash('success', 'Item atualizado com sucesso!');
      } else {
        // cria sempre como não concluído (regra de negócio)
        await AxiosInstance.post('checklists/', { ...form, is_completed: false });
        showFlash('success', 'Item criado com sucesso!');
      }
      setShowModal(false);
      await loadList(page, pageSize);
    } catch (e) {
      console.error(e);
      showFlash('danger', parseErrorMsg(e));
    } finally {
      setSaving(false);
    }
  };

  // ===== Excluir com modal de confirmação =====
  const askDelete = (row) => {
    if (!canToggle) return;
    setConfirmTarget(row);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await AxiosInstance.delete(`checklists/${confirmTarget.id}/`);
      showFlash('success', 'Excluído com sucesso!');
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadList(page, pageSize);
    } catch (e) {
      console.error(e);
      showFlash(
        'danger',
        'Falha ao excluir o item. Se o problema persistir, contate o administrador.'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ===== Loading =====
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: '100vh' }}
      >
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <style>{`
        /* Impedir rolagem lateral */
        html, body {
          overflow-x: hidden !important;
        }

        .d-flex {
          max-width: 100vw !important;
          overflow-x: hidden !important;
        }

        /* ===== TABELA ===== */
        .custom-table,
        .custom-table th,
        .custom-table td {
          border-color: #d9e1e8 !important;
          white-space: normal !important;
          word-break: break-word !important;
        }

        /* Cabeçalho */
        .thead-gradient {
          background: linear-gradient(135deg, #003366, #005b96) !important;
        }
        .thead-gradient th {
          background: transparent !important;
          color: #fff !important;
          border-color: #00528a !important;
          white-space: nowrap;
        }

        /* Linhas alternadas */
        .custom-table tbody tr:nth-child(odd) td {
          background: #ffffff !important;
          color: #212529;
        }
        .custom-table tbody tr:nth-child(even) td {
          background: #005b96 !important;
          color: #ffffff;
        }
        .custom-table.table-hover tbody tr:hover td {
          background: #004b80 !important;
          color: #fff;
        }

        /* Inputs e botões */
        .custom-table tbody tr:nth-child(even) td .form-select,
        .custom-table tbody tr:nth-child(even) td .form-control,
        .custom-table tbody tr:nth-child(even) td .btn,
        .custom-table.table-hover tbody tr:hover td .form-select,
        .custom-table.table-hover tbody tr:hover td .form-control,
        .custom-table.table-hover tbody tr:hover td .btn {
          background-color: #ffffff !important;
          color: #212529 !important;
          border-color: #ced4da !important;
          box-shadow: none !important;
        }
        .custom-table tbody tr:nth-child(even) td .form-select:focus {
          border-color: #80bdff !important;
        }

        /* ===== LARGURAS PADRÃO ===== */
        .custom-table th:nth-child(1),
        .custom-table td:nth-child(1) {
          width: 18% !important;
          min-width: 140px !important;
        }

        .custom-table th:nth-child(2),
        .custom-table td:nth-child(2) {
          width: 48% !important;
          max-width: 520px !important;
        }

        .custom-table th:nth-child(3),
        .custom-table td:nth-child(3) {
          width: 8% !important;
          min-width: 65px !important;
          text-align: center !important;
        }

        .custom-table th:nth-child(4),
        .custom-table td:nth-child(4) {
          width: 10% !important;
          min-width: 80px !important;
          text-align: center !important;
        }

        /* ===== RESPONSIVIDADE CONSOLIDADA ===== */
        @media (max-width: 1400px) {
          .custom-table th:nth-child(2),
          .custom-table td:nth-child(2) {
            width: 38% !important;
            max-width: 420px !important;
          }
        }

        @media (max-width: 1200px) {
          .custom-table th:nth-child(1),
          .custom-table td:nth-child(1) {
            width: 22% !important;
          }
          .custom-table th:nth-child(2),
          .custom-table td:nth-child(2) {
            width: 35% !important;
            max-width: 360px !important;
          }
        }

        @media (max-width: 992px) {
          .custom-table {
            font-size: 0.9rem !important;
          }
          .custom-table th,
          .custom-table td {
            padding: 0.4rem !important;
          }
          .custom-table th:nth-child(1),
          .custom-table td:nth-child(1) {
            width: 25% !important;
          }
          .custom-table th:nth-child(2),
          .custom-table td:nth-child(2) {
            width: 33% !important;
            max-width: 320px !important;
          }
          .custom-table th:nth-child(3),
          .custom-table td:nth-child(3),
          .custom-table th:nth-child(4),
          .custom-table td:nth-child(4) {
            width: 10% !important;
          }
        }

        @media (max-width: 768px) {
          .custom-table {
            font-size: 0.85rem !important;
          }
          .custom-table th,
          .custom-table td {
            padding: 0.3rem !important;
          }
          .custom-table th:nth-child(2),
          .custom-table td:nth-child(2) {
            width: 50% !important;
            max-width: 300px !important;
          }
        }

        /* ===== MODAIS ===== */
        .lgpd-modal-dialog {
          max-width: min(900px, 95vw);
          margin: 2rem auto;
        }
        .lgpd-modal-content {
          border: 0;
          border-radius: 1rem;
          overflow: hidden;
        }
        .lgpd-modal-content .modal-header {
          background: #063a6b;
          color: #fff;
        }
        .lgpd-modal-content .modal-header .btn-close {
          filter: invert(1);
          opacity: .9;
        }
        .lgpd-modal-content .modal-title {
          width: 100%;
          text-align: center;
          margin: 0;
        }
        .lgpd-modal-content .modal-body {
          background: #063a6b;
        }
        .lgpd-modal-content .modal-footer {
          background: #063a6b;
          border-top: 1px solid rgba(255,255,255,0.15);
        }
        .lgpd-modal-content .modal-body label {
          color: #ffffff;
          font-weight: 600;
        }
        .lgpd-modal-content .modal-body .form-control,
        .lgpd-modal-content .modal-body .form-select {
          background: #ffffff !important;
          color: #212529 !important;
          border-color: #ced4da !important;
          box-shadow: none !important;
        }

        /* ===== MODAL CONFIRMAÇÃO ===== */
        .confirm-modal-content .modal-header {
          background: #0b2e59;
          color: #fff;
        }
        .confirm-modal-content .modal-footer {
          background: #0b2e59;
          border-top: 1px solid rgba(255,255,255,0.15);
        }
        .confirm-modal-content .btn-cancel {
          background: #ffffff;
          color: #0b2e59;
          border: none;
        }
        .confirm-modal-content .btn-delete {
          background: #c82333;
          border-color: #c82333;
        }

        /* ===== WRAPPER DA TABELA ===== */
        .table-wrap {
          flex: 1;
          overflow-x: auto;
        }
        .table-wrap table {
          margin-bottom: 0;
        }
      `}</style>

      <Sidebar />

      <div
        style={{
          flex: 1,
          background: '#f5f5f5',
          padding: '2rem 0',
          marginTop: '56px',
        }}
      >
        {/* TÍTULO (centralizado, cor da identidade) */}
        <div className="text-center mb-3">
          <h2 style={{ color: '#071744', fontWeight: 700 }}>Checklist Itens da LGPD</h2>
        </div>

        {/* Mensagens globais (sucesso/erro) */}
        {msg && (
          <div className="px-3 mb-2">
            <Alert variant={variant} onClose={() => setMsg('')} dismissible>
              {msg}
            </Alert>
          </div>
        )}

        <Container fluid className="px-0">
          {/* Controles superiores: tamanho da página + Novo */}
          <div className="d-flex justify-content-between align-items-center gap-2 px-3 mb-2 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0" style={{ color: '#071744' }}>
                Tamanho da página
              </Form.Label>
              <Form.Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{ width: 120 }}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Form.Select>
            </div>

            <Button variant="primary" onClick={openCreate} disabled={readOnly}>
              + Novo
            </Button>
          </div>

          {/* Tabela (full width) */}
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
                  {/* Atividade */}
                  <th> Atividade </th>

                  {/* Descrição */}
                  <th
                    style={{
                      width: '40%',
                      minWidth: 280,
                      maxWidth: 480,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    Descrição
                  </th>

                  {/* Situação */}
                  <th
                    style={{
                      width: '10%',
                      minWidth: 80,
                      maxWidth: 100,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Situação
                  </th>

                  {/* Ações */}
                  <th
                    style={{
                      width: '15%',
                      minWidth: 100,
                      maxWidth: 140,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(rows) ? rows : []).map((item) => (
                  <tr key={item.id}>
                    {/* Atividade */}
                    <td
                      style={{
                        width: '20%',
                        minWidth: 180,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.atividade}
                    </td>

                    {/* Descrição */}
                    <td
                      style={{
                        width: '40%',
                        minWidth: 280,
                        maxWidth: 480,
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.descricao}
                    </td>

                    {/* Situação */}
                    <td
                      className="text-center"
                      style={{
                        width: '10%',
                        minWidth: 80,
                        maxWidth: 100,
                      }}
                    >
                      <Form.Check
                        type="checkbox"
                        checked={!!item.is_completed}
                        disabled={readOnly}
                        onChange={() => handleCheckChange(item.id, !!item.is_completed)}
                        title={readOnly ? 'Somente leitura' : 'Alterar situação'}
                        style={{
                          cursor: readOnly ? 'not-allowed' : 'pointer',
                        }}
                      />
                    </td>

                    {/* Ações */}
                    <td
                      className="text-center"
                      style={{
                        width: '15%',
                        minWidth: 100,
                        maxWidth: 140,
                        overflow: 'visible',
                      }}
                    >
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          size="sm"
                          variant="outline-secondary"
                          disabled={readOnly}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Ações
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => openEdit(item)}
                            disabled={readOnly}
                          >
                            Editar
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="text-danger"
                            onClick={() => askDelete(item)}
                            disabled={readOnly}
                          >
                            Excluir
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
                {(Array.isArray(rows) ? rows : []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Nenhum item encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 px-3">
            <div className="text-muted">
              Total: <strong>{count || (Array.isArray(rows) ? rows.length : 0)}</strong> •
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </div>

            <Pagination className="mb-0">
              <Pagination.First disabled={!canPrev} onClick={() => setPage(1)} />
              <Pagination.Prev
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />

              {pageItems[0] > 1 && (
                <>
                  <Pagination.Item onClick={() => setPage(1)}>{1}</Pagination.Item>
                  <Pagination.Ellipsis disabled />
                </>
              )}

              {pageItems.map((p) => (
                <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                  {p}
                </Pagination.Item>
              ))}

              {pageItems[pageItems.length - 1] < totalPages && (
                <>
                  <Pagination.Ellipsis disabled />
                  <Pagination.Item onClick={() => setPage(totalPages)}>
                    {totalPages}
                  </Pagination.Item>
                </>
              )}

              <Pagination.Next
                disabled={!canNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
              <Pagination.Last disabled={!canNext} onClick={() => setPage(totalPages)} />
            </Pagination>
          </div>
        </Container>

        {/* Modal de criação/edição — sem checkbox de concluído */}
        <Modal
          show={showModal}
          onHide={() => setShowModal(false)}
          size="lg"
          centered
          scrollable
          dialogClassName="lgpd-modal-dialog"
          contentClassName="lgpd-modal-content"
        >
          <Form onSubmit={handleSave}>
            <Modal.Header closeButton closeVariant="white">
              <Modal.Title className="w-100 text-center m-0">
                {editing ? 'Editar Item do Checklist' : 'Novo Item do Checklist'}
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Row className="mb-3">
                <Col md={12}>
                  <Form.Label>Atividade</Form.Label>
                  <Form.Control
                    value={form.atividade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, atividade: e.target.value }))
                    }
                    required
                    placeholder="Ex.: Nomear o DPO e divulgar seu contato"
                  />
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descricao: e.target.value }))
                    }
                    required
                    placeholder="Detalhes da exigência, responsáveis, links, etc."
                  />
                </Col>
              </Row>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving || readOnly}>
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal de confirmação de exclusão (bonito e moderno) */}
        <Modal
          show={confirmOpen}
          onHide={() => !deleting && setConfirmOpen(false)}
          centered
          contentClassName="confirm-modal-content"
        >
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title>Confirmar exclusão</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2">
              Tem certeza de que deseja <strong>excluir</strong> este item do checklist?
            </p>
            {confirmTarget && (
              <div
                className="p-3 rounded"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <div>
                  <strong>Atividade:</strong> {confirmTarget.atividade}
                </div>
                <div className="text-muted">
                  <strong>Descrição:</strong> {confirmTarget.descricao}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              className="btn-cancel"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              className="btn-delete"
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default Checklist;
