import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Table,
  Form,
  Button,
  Modal,
  Row,
  Col,
  Pagination,
  Alert,
  Spinner,
  Dropdown,
  Container,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import PaginacaoRiscos from '../components/PaginacaoRiscos';
import TooltipInfo from '../components/TooltipInfo';
import '../estilos/matriz.css';

/** ===== Componente isolado para o Dropdown de Ações =====
 *  - Menu renderizado no <body> (portal) ⇒ não sofre com overflow do .table-wrap
 *  - strategy: 'fixed' ⇒ posicionamento independente do scroller horizontal
 *  - Sem alterar sticky da última coluna (já garantido pelo seu CSS global)
 */
function RowActions({ onEdit, onDelete }) {
  return (
    <Dropdown align="end" container={document.body} popperConfig={{ strategy: 'fixed' }}>
      <Dropdown.Toggle size="sm" variant="outline-secondary">
        Ações
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={onEdit}>Editar</Dropdown.Item>
        <Dropdown.Item className="text-danger" onClick={onDelete}>
          Excluir
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

function AcaoMonitoramento() {
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
  const [editingId, setEditingId] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const emptyForm = {
    framework_requisito: '',
    escopo: '',
    data_monitoramento: '',
    criterio_avaliacao: '',
    responsavel: '',
    data_conclusao: '',
    deficiencias: '',
    corretivas: '',
  };

  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setError('');
    setOkMsg('');
  };

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

  const focusFirstError = (errs) => {
    const firstKey = Object.keys(errs || {})[0];
    if (!firstKey) return;
    const el = document.querySelector(`[name="${firstKey}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ===== Listagem =====
  const loadRows = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const { data } = await AxiosInstance.get('/acoes-monitoramento/', {
        params: { page: targetPage, page_size: targetPageSize },
      });
      const results = Array.isArray(data) ? data : data.results || [];
      const total = Array.isArray(data) ? results.length : (data.count ?? results.length);

      if (!Array.isArray(data) && results.length === 0 && targetPage > 1) {
        const prev = targetPage - 1;
        const retry = await AxiosInstance.get('/acoes-monitoramento/', {
          params: { page: prev, page_size: targetPageSize },
        });
        const r2 = retry.data.results || [];
        setRows(r2);
        setCount(retry.data.count ?? 0);
        setPage(prev);
      } else {
        setRows(results);
        setCount(total);
        setPage(targetPage);
        setPageSize(targetPageSize);
      }
    } catch {
      setError('Falha ao carregar ações de monitoramento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(1, pageSize); /* mount */
  }, []);
  useEffect(() => {
    loadRows(page, pageSize);
  }, [page, pageSize]);

  // ===== Salvar =====
  const validateForm = () => {
    const errs = {};
    if (!form.framework_requisito.trim())
      errs.framework_requisito = 'Informe o framework.';
    if (!form.escopo.trim()) errs.escopo = 'Descreva o escopo.';
    if (!form.data_monitoramento)
      errs.data_monitoramento = 'Informe a data do monitoramento.';
    if (!form.criterio_avaliacao.trim()) errs.criterio_avaliacao = 'Informe o critério.';
    if (!form.responsavel.trim()) errs.responsavel = 'Informe o responsável.';
    if (!form.data_conclusao) errs.data_conclusao = 'Informe a data da conclusão.';
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
      const payload = { ...form };
      if (editingId) {
        await AxiosInstance.put(`/acoes-monitoramento/${editingId}/`, payload);
        setOkMsg('Ação de monitoramento atualizada com sucesso.');
      } else {
        await AxiosInstance.post('/acoes-monitoramento/', payload);
        setOkMsg('Ação de monitoramento criada com sucesso.');
      }
      setTimeout(() => {
        setShowModal(false);
        resetForm();
        loadRows(page, pageSize);
      }, 1200);
    } catch (err) {
      setError(
        err?.response?.data?.detail || 'Erro ao salvar ação. Verifique os campos.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      framework_requisito: item.framework_requisito || '',
      escopo: item.escopo || '',
      data_monitoramento: item.data_monitoramento || '',
      criterio_avaliacao: item.criterio_avaliacao || '',
      responsavel: item.responsavel || '',
      data_conclusao: item.data_conclusao || '',
      deficiencias: item.deficiencias || '',
      corretivas: item.corretivas || '',
    });
    setShowModal(true);
    setError('');
    setOkMsg('');
    setFieldErrors({});
  };

  // ===== Excluir =====
  const handleDeleteClick = (item) => {
    setSelectedToDelete(item);
    setDeleteMsg('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedToDelete) return;
    try {
      await AxiosInstance.delete(`/acoes-monitoramento/${selectedToDelete.id}/`);
      setDeleteMsg('Ação excluída com sucesso.');
      setTimeout(() => {
        setShowDeleteModal(false);
        setSelectedToDelete(null);
        loadRows(page, pageSize);
        setDeleteMsg('');
      }, 1000);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Não foi possível excluir a ação. Tente novamente.';
      setDeleteMsg(msg);
    }
  };

  // ===== Paginação =====
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

  // ===== Render row (mantém sticky da última coluna via seu CSS global) =====
  const visibleRows = useMemo(() => rows, [rows]);
  const renderRow = (r, idx) => (
    <tr key={r.id} className={idx % 2 ? 'row-blue' : 'row-white'}>
      <td>
        <div className="cell-clip">{(page - 1) * pageSize + idx + 1}</div>
      </td>
      <td>
        <div className="cell-clip">{r.framework_requisito || '-'}</div>
      </td>
      <td className="col-wide">
        <div className="cell-clip">{r.escopo || '-'}</div>
      </td>
      <td>
        <div className="cell-clip">{formatDate(r.data_monitoramento) || '-'}</div>
      </td>
      <td>
        <div className="cell-clip">{r.criterio_avaliacao || '-'}</div>
      </td>
      <td>
        <div className="cell-clip">{r.responsavel || '-'}</div>
      </td>
      <td>
        <div className="cell-clip">{formatDate(r.data_conclusao) || '-'}</div>
      </td>
      <td className="col-wide">
        <div className="cell-clip">{r.deficiencias || '-'}</div>
      </td>
      <td className="col-wide">
        <div className="cell-clip">{r.corretivas || '-'}</div>
      </td>
      <td className="actions-cell">
        <div className="dropdown-wrapper">
          <RowActions
            onEdit={() => handleEdit(r)}
            onDelete={() => handleDeleteClick(r)}
          />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-content">
        <h2 className="page-title">Ações de Monitoramento</h2>

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
              style={{ width: 80 }}
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

        <div className="list-shell" style={{ width: '100%', alignSelf: 'stretch' }}>
          <div className="table-wrap">
            <Table bordered hover className="custom-table">
              <thead className="thead-gradient">
                <tr>
                  <th>Item</th>
                  <th>
                    Framework e Requisito{' '}
                    <TooltipInfo message="Framework e requisito de avaliação para monitoramento / auditoria" />
                  </th>
                  <th>
                    Escopo / Descrição{' '}
                    <TooltipInfo message="Escopo e descrição da ação de monitoramento / auditoria" />
                  </th>
                  <th>
                    Data do Monitoramento{' '}
                    <TooltipInfo message="Data do monitoramento / auditoria" />
                  </th>
                  <th>
                    Critério de Avaliação{' '}
                    <TooltipInfo message="Critério de avaliação / mensuração" />
                  </th>
                  <th>
                    Responsável <TooltipInfo message="Funcionário responsável" />
                  </th>
                  <th>
                    Data Última Auditoria{' '}
                    <TooltipInfo message="Data da conclusão do último monitoramento / auditoria" />
                  </th>
                  <th>Deficiências Identificadas</th>
                  <th>
                    Ações Corretivas{' '}
                    <TooltipInfo message="Ações corretivas implementadas" />
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center">
                      <Spinner size="sm" className="me-2" /> Carregando...
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-muted">
                      Nenhuma ação cadastrada.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(renderRow)
                )}
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
      </div>

      {/* Modal de Edição/Criação */}
      <Modal
        show={showModal}
        onHide={() => {
          resetForm();
          setShowModal(false);
        }}
        size="xl"
        centered
        scrollable
        contentClassName="modal-style"
      >
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingId ? 'Editar Ação de Monitoramento' : 'Nova Ação de Monitoramento'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container fluid>
              {error && <Alert variant="danger">{error}</Alert>}
              {okMsg && <Alert variant="success">{okMsg}</Alert>}

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Framework e Requisito</Form.Label>
                  <Form.Control
                    name="framework_requisito"
                    value={form.framework_requisito}
                    onChange={(e) =>
                      setForm({ ...form, framework_requisito: e.target.value })
                    }
                    isInvalid={!!fieldErrors.framework_requisito}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.framework_requisito}
                  </Form.Control.Feedback>
                </Col>
                <Col md={6}>
                  <Form.Label>Critério de Avaliação</Form.Label>
                  <Form.Control
                    name="criterio_avaliacao"
                    value={form.criterio_avaliacao}
                    onChange={(e) =>
                      setForm({ ...form, criterio_avaliacao: e.target.value })
                    }
                    isInvalid={!!fieldErrors.criterio_avaliacao}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.criterio_avaliacao}
                  </Form.Control.Feedback>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Escopo / Descrição da Ação</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="escopo"
                  value={form.escopo}
                  onChange={(e) => setForm({ ...form, escopo: e.target.value })}
                  isInvalid={!!fieldErrors.escopo}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.escopo}
                </Form.Control.Feedback>
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Data do Monitoramento</Form.Label>
                  <Form.Control
                    type="date"
                    name="data_monitoramento"
                    value={form.data_monitoramento}
                    onChange={(e) =>
                      setForm({ ...form, data_monitoramento: e.target.value })
                    }
                    isInvalid={!!fieldErrors.data_monitoramento}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.data_monitoramento}
                  </Form.Control.Feedback>
                </Col>
                <Col md={6}>
                  <Form.Label>Data da Última Auditoria</Form.Label>
                  <Form.Control
                    type="date"
                    name="data_conclusao"
                    value={form.data_conclusao}
                    onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })}
                    isInvalid={!!fieldErrors.data_conclusao}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.data_conclusao}
                  </Form.Control.Feedback>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Responsável</Form.Label>
                <Form.Control
                  name="responsavel"
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  isInvalid={!!fieldErrors.responsavel}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.responsavel}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Deficiências Identificadas</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="deficiencias"
                  value={form.deficiencias}
                  onChange={(e) => setForm({ ...form, deficiencias: e.target.value })}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Ações Corretivas Implementadas</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="corretivas"
                  value={form.corretivas}
                  onChange={(e) => setForm({ ...form, corretivas: e.target.value })}
                />
              </Form.Group>
            </Container>
          </Modal.Body>
          <Modal.Footer>
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
              {saving ? 'Salvando...' : 'Salvar Ação'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Exclusão */}
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
              Tem certeza que deseja excluir a ação{' '}
              <strong>{selectedToDelete?.framework_requisito}</strong>?
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

export default AcaoMonitoramento;
