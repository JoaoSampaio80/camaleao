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
import ReactDOM from 'react-dom';
import TooltipInfo from '../components/TooltipInfo';
import '../estilos/matriz.css';

/* ===== Componente de Dropdown (padrão matriz / ação monitoramento) ===== */
function RowActions({ isActive, onToggle, onEdit, onDelete }) {
  const toggleRef = useRef(null);
  const menuContainer = useRef(document.createElement('div'));

  useEffect(() => {
    const el = menuContainer.current;
    el.style.position = 'fixed';
    el.style.zIndex = 3000;
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, []);

  useEffect(() => {
    if (isActive && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 120 && spaceAbove > spaceBelow;
      const menu = menuContainer.current.firstChild;
      if (menu) {
        const top = shouldOpenUp ? rect.top - 90 : rect.bottom + 4;
        menu.style.top = `${top}px`;
        menu.style.left = `${rect.right - 130}px`;
      }
    }
  }, [isActive]);

  useEffect(() => {
    const close = (e) => {
      if (
        toggleRef.current &&
        !toggleRef.current.contains(e.target) &&
        !menuContainer.current.contains(e.target)
      ) {
        if (isActive) onToggle();
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isActive, onToggle]);

  const menu = (
    <div
      className={`dropdown-menu show ${isActive ? '' : 'd-none'}`}
      style={{
        minWidth: '8rem',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderRadius: '0.25rem',
        padding: '0.5rem 0',
        position: 'fixed',
      }}
    >
      <button
        type="button"
        className="dropdown-item"
        onClick={() => {
          onEdit();
          onToggle();
        }}
      >
        Editar
      </button>
      <button
        type="button"
        className="dropdown-item text-danger"
        onClick={() => {
          onDelete();
          onToggle();
        }}
      >
        Excluir
      </button>
    </div>
  );

  return (
    <>
      <Dropdown show={false}>
        <Dropdown.Toggle
          size="sm"
          variant="outline-secondary"
          ref={toggleRef}
          onClick={onToggle}
        >
          Ações
        </Dropdown.Toggle>
      </Dropdown>
      {ReactDOM.createPortal(menu, menuContainer.current)}
    </>
  );
}

function ControleIncidentes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState(null);

  const emptyForm = {
    numero_registro: '',
    descricao: '',
    fonte: '',
    data_registro: '',
    responsavel_analise: '',
    data_final_analise: '',
    acao_recomendada: '',
    recomendacoes_reportadas: '',
    data_reporte: '',
    decisoes_resolucao: '',
    data_encerramento: '',
    fonte_informada: '',
  };

  const [form, setForm] = useState(emptyForm);

  const showMsg = (variant, text, ms = 3500) => {
    setNotice({ variant, text });
    if (ms) setTimeout(() => setNotice(null), ms);
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

  const loadRows = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const { data } = await AxiosInstance.get('/incidentes/', {
        params: { page: targetPage, page_size: targetPageSize },
      });

      const results = Array.isArray(data) ? data : data.results || [];
      const total = Array.isArray(data) ? results.length : (data.count ?? results.length);
      setRows(results);
      setCount(total);
      setPage(targetPage);
      setPageSize(targetPageSize);
    } catch {
      showMsg('danger', 'Falha ao carregar incidentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(1, pageSize);
  }, []);
  useEffect(() => {
    loadRows(page, pageSize);
  }, [page, pageSize]);

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const payload = { ...form, fonte_informada: form.fonte_informada === 'sim' };
      if (editingItem) {
        await AxiosInstance.put(`/incidentes/${editingItem.id}/`, payload);
        showMsg('success', 'Incidente atualizado com sucesso!');
      } else {
        await AxiosInstance.post('/incidentes/', payload);
        showMsg('success', 'Incidente criado com sucesso!');
      }
      setShowModal(false);
      setEditingItem(null);
      setForm(emptyForm);
      loadRows(page, pageSize);
    } catch (e) {
      console.error(e);
      showMsg('danger', 'Erro ao salvar incidente. Verifique os campos.', 6000);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      numero_registro: item.numero_registro || '',
      descricao: item.descricao || '',
      fonte: item.fonte || '',
      data_registro: item.data_registro || '',
      responsavel_analise: item.responsavel_analise || '',
      data_final_analise: item.data_final_analise || '',
      acao_recomendada: item.acao_recomendada || '',
      recomendacoes_reportadas: item.recomendacoes_reportadas || '',
      data_reporte: item.data_reporte || '',
      decisoes_resolucao: item.decisoes_resolucao || '',
      data_encerramento: item.data_encerramento || '',
      fonte_informada: item.fonte_informada ? 'sim' : 'nao',
    });
    setShowModal(true);
  };

  const handleDelete = (row) => {
    setSelectedToDelete(row);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedToDelete) return;
    try {
      await AxiosInstance.delete(`/incidentes/${selectedToDelete.id}/`);
      showMsg('success', 'Excluído com sucesso.');
      loadRows(page, pageSize);
    } catch (e) {
      showMsg('danger', 'Erro ao excluir. Verifique a conexão.', 6000);
    } finally {
      setShowDeleteModal(false);
      setSelectedToDelete(null);
    }
  };

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

  const visibleRows = useMemo(() => rows, [rows]);

  const renderRow = (r, idx) => (
    <tr key={r.id} className={idx % 2 ? 'row-blue' : 'row-white'}>
      <td>{(page - 1) * pageSize + idx + 1}</td>
      <td>{r.numero_registro}</td>
      <td>{r.descricao}</td>
      <td>{r.fonte}</td>
      <td>{formatDate(r.data_registro)}</td>
      <td>{r.responsavel_analise}</td>
      <td>{formatDate(r.data_final_analise)}</td>
      <td>{r.acao_recomendada}</td>
      <td>{r.recomendacoes_reportadas}</td>
      <td>{formatDate(r.data_reporte)}</td>
      <td>{r.decisoes_resolucao}</td>
      <td>{formatDate(r.data_encerramento)}</td>
      <td>{r.fonte_informada ? 'Sim' : 'Não'}</td>
      <td className="actions-cell">
        <RowActions
          isActive={activeDropdown === r.id}
          onToggle={() => setActiveDropdown(activeDropdown === r.id ? null : r.id)}
          onEdit={() => handleEdit(r)}
          onDelete={() => handleDelete(r)}
        />
      </td>
    </tr>
  );

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-content">
        <h2 className="page-title">Controle de Incidentes</h2>

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
              setForm(emptyForm);
              setEditingItem(null);
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
                  <th>Nº do Registro</th>
                  <th>
                    Descrição <TooltipInfo message="Descrição do Incidente" />
                  </th>
                  <th>Fonte</th>
                  <th>Data Registro</th>
                  <th>
                    Responsável{' '}
                    <TooltipInfo message="Funcionário responsável pela análise e recomendação da ação" />
                  </th>
                  <th>
                    Data Final Análise{' '}
                    <TooltipInfo message="Data de conclusão da análise" />
                  </th>
                  <th>
                    Ação Recomendada <TooltipInfo message="Ação corretiva recomendada" />
                  </th>
                  <th>
                    Recomendações <TooltipInfo message="Recomendações reportadas para:" />
                  </th>
                  <th>Data Reporte</th>
                  <th>
                    Decisões <TooltipInfo message="Decisões de resolução efetivadas" />
                  </th>
                  <th>
                    Data Encerramento{' '}
                    <TooltipInfo message="Data de encerramento do registro" />
                  </th>
                  <th>
                    Fonte Informada{' '}
                    <TooltipInfo message="A Fonte foi informada do resultado?" />
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="text-center">
                      <Spinner size="sm" className="me-2" /> Carregando...
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center text-muted">
                      Nenhum incidente cadastrado.
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

      {/* Modal de criação/edição */}
      <Modal
        show={showModal}
        onHide={() => {
          setForm(emptyForm);
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
              {editingItem ? 'Editar Incidente' : 'Novo Incidente'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container fluid>
              {notice && <Alert variant={notice.variant}>{notice.text}</Alert>}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Número do Registro</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.numero_registro || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // só números
                      setForm({ ...form, numero_registro: value });
                    }}
                    required
                    placeholder="Ex: 1001"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Fonte</Form.Label>
                  <Form.Control
                    value={form.fonte}
                    onChange={(e) => setForm({ ...form, fonte: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Data Registro</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.data_registro}
                    onChange={(e) => setForm({ ...form, data_registro: e.target.value })}
                  />
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Responsável</Form.Label>
                  <Form.Control
                    value={form.responsavel_analise}
                    onChange={(e) =>
                      setForm({ ...form, responsavel_analise: e.target.value })
                    }
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Data Final Análise</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.data_final_analise}
                    onChange={(e) =>
                      setForm({ ...form, data_final_analise: e.target.value })
                    }
                  />
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Ação Recomendada</Form.Label>
                  <Form.Control
                    value={form.acao_recomendada}
                    onChange={(e) =>
                      setForm({ ...form, acao_recomendada: e.target.value })
                    }
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Recomendações</Form.Label>
                  <Form.Control
                    value={form.recomendacoes_reportadas}
                    onChange={(e) =>
                      setForm({ ...form, recomendacoes_reportadas: e.target.value })
                    }
                  />
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Data Reporte</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.data_reporte}
                    onChange={(e) => setForm({ ...form, data_reporte: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Decisões</Form.Label>
                  <Form.Control
                    value={form.decisoes_resolucao}
                    onChange={(e) =>
                      setForm({ ...form, decisoes_resolucao: e.target.value })
                    }
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Data Encerramento</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.data_encerramento}
                    onChange={(e) =>
                      setForm({ ...form, data_encerramento: e.target.value })
                    }
                  />
                </Col>
              </Row>

              <Form.Group>
                <Form.Label>Fonte Informada</Form.Label>
                <Form.Select
                  value={form.fonte_informada}
                  onChange={(e) => setForm({ ...form, fonte_informada: e.target.value })}
                >
                  <option value=""></option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
              </Form.Group>
            </Container>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setForm(emptyForm);
                setShowModal(false);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Incidente'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ===== MODAL EXCLUSÃO ===== */}
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
          Tem certeza que deseja excluir o incidente{' '}
          <strong>{selectedToDelete?.numero_registro}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ControleIncidentes;
