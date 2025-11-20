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
import FilterBar from '../components/FilterBar';
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
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState(null);

  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [filterFonteInformada, setFilterFonteInformada] = useState('');

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

  // ---------- helpers (reset + erros) ----------
  const resetForm = () => {
    setForm({ ...emptyForm });
    setFieldErrors({});
    setError('');
    setOkMsg('');
  };

  const mapBackendErrors = (data) => {
    const out = {};
    const toText = (v) =>
      Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : String(v);

    Object.entries(data || {}).forEach(([key, val]) => {
      out[key] = toText(val);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts.map(Number);
    const d = new Date(year, month - 1, day);
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

      if (!Array.isArray(data) && results.length === 0 && targetPage > 1) {
        const prev = targetPage - 1;
        const retry = await AxiosInstance.get('/incidentes/', {
          params: { page: prev, page_size: targetPageSize },
        });

        const r2 = retry.data.results || [];
        setRows(r2);
        setCount(retry.data.count ?? 0);
        setPage(prev); // apenas aqui alteramos a page!
        return;
      }

      setRows(results);
      setCount(total);
    } catch {
      setError('Falha ao carregar incidentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(page, pageSize);
  }, [page, pageSize]);

  // ---------- salvar ----------
  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setOkMsg('');
    setFieldErrors({});

    try {
      const payload = { ...form, fonte_informada: form.fonte_informada === 'sim' };

      if (editingItem) {
        await AxiosInstance.put(`/incidentes/${editingItem.id}/`, payload);
        setOkMsg('Incidente atualizado com sucesso!');
      } else {
        await AxiosInstance.post('/incidentes/', payload);
        setOkMsg('Incidente criado com sucesso!');
      }

      // rola até a mensagem de sucesso
      setTimeout(() => {
        const successAlert = document.querySelector('.modal.show .alert.alert-success');
        if (successAlert && typeof successAlert.scrollIntoView === 'function') {
          successAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);

      // fecha após 1.5s
      setTimeout(() => {
        setShowModal(false);
        resetForm();
        loadRows(page, pageSize);
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
          'Erro ao salvar incidente.'
      );
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
    setError('');
    setOkMsg('');
    setFieldErrors({});
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
      setOkMsg('Incidente excluído com sucesso.');
      loadRows(page, pageSize);
    } catch {
      setError('Erro ao excluir. Verifique a conexão.');
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

  const filteredRows = useMemo(() => {
    let f = rows;

    // filtro responsável
    if (filterResponsavel) {
      const search = filterResponsavel.toLowerCase();
      f = f.filter((r) => (r.responsavel_analise || '').toLowerCase().includes(search));
    }

    // filtro fonte informada (sim / não)
    if (filterFonteInformada) {
      const search = filterFonteInformada === 'sim';
      f = f.filter((r) => r.fonte_informada === search);
    }

    return f;
  }, [rows, filterResponsavel, filterFonteInformada]);

  const visibleRows = filteredRows;

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

        <FilterBar
          pageSize={{
            value: pageSize,
            onChange: (v) => {
              setPageSize(v);
              setPage(1);
            },
          }}
          renderPagination={renderPagination}
          extraActions={
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setEditingItem(null);
                setShowModal(true);
              }}
            >
              + Novo
            </Button>
          }
          filters={[
            {
              key: 'responsavel',
              label: 'Responsável',
              value: filterResponsavel,
              onChange: setFilterResponsavel,
              render: (
                <Form.Control
                  placeholder="Buscar responsável..."
                  value={filterResponsavel}
                  onChange={(e) => {
                    setFilterResponsavel(e.target.value);
                    setPage(1);
                  }}
                />
              ),
            },
            {
              key: 'fonteinformada',
              label: 'Fonte Informada',
              value: filterFonteInformada,
              onChange: setFilterFonteInformada,
              render: (
                <Form.Select
                  value={filterFonteInformada}
                  onChange={(e) => {
                    setFilterFonteInformada(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Form.Select>
              ),
            },
          ]}
          onClearFilters={() => {
            setFilterResponsavel('');
            setFilterFonteInformada('');
            setPage(1);
          }}
        />

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
              <strong>Total:</strong>
              {filterResponsavel || filterFonteInformada ? filteredRows.length : count} •
              Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>
      </div>

      {/* Modal de criação/edição */}
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
          <div
            style={{
              maxHeight: '80vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Modal.Header closeButton>
              <Modal.Title>
                {editingItem ? 'Editar Incidente' : 'Novo Incidente'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Container fluid>
                {error && <Alert variant="danger">{error}</Alert>}
                {okMsg && <Alert variant="success">{okMsg}</Alert>}

                {/* Campos com validação */}
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Número do Registro</Form.Label>
                    <Form.Control
                      name="numero_registro"
                      value={form.numero_registro}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setForm({ ...form, numero_registro: value });
                      }}
                      isInvalid={!!fieldErrors.numero_registro}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.numero_registro}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Fonte</Form.Label>
                    <Form.Control
                      name="fonte"
                      value={form.fonte}
                      onChange={(e) => setForm({ ...form, fonte: e.target.value })}
                      isInvalid={!!fieldErrors.fonte}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.fonte}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Data Registro</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_registro"
                      value={form.data_registro}
                      onChange={(e) =>
                        setForm({ ...form, data_registro: e.target.value })
                      }
                      isInvalid={!!fieldErrors.data_registro}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.data_registro}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Descrição <TooltipInfo message="Descrição do Incidente" />
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="descricao"
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    isInvalid={!!fieldErrors.descricao}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.descricao}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>
                      Responsável{' '}
                      <TooltipInfo message="Funcionário responsável pela análise e recomendação da ação" />
                    </Form.Label>
                    <Form.Control
                      name="responsavel_analise"
                      value={form.responsavel_analise}
                      onChange={(e) =>
                        setForm({ ...form, responsavel_analise: e.target.value })
                      }
                      isInvalid={!!fieldErrors.responsavel_analise}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.responsavel_analise}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={6}>
                    <Form.Label>
                      Data Final Análise{' '}
                      <TooltipInfo message="Data de conclusão da análise" />
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="data_final_analise"
                      value={form.data_final_analise}
                      onChange={(e) =>
                        setForm({ ...form, data_final_analise: e.target.value })
                      }
                      isInvalid={!!fieldErrors.data_final_analise}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.data_final_analise}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>
                      Ação Recomendada{' '}
                      <TooltipInfo message="Ação corretiva recomendada" />
                    </Form.Label>
                    <Form.Control
                      name="acao_recomendada"
                      value={form.acao_recomendada}
                      onChange={(e) =>
                        setForm({ ...form, acao_recomendada: e.target.value })
                      }
                      isInvalid={!!fieldErrors.acao_recomendada}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.acao_recomendada}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={6}>
                    <Form.Label>
                      Recomendações{' '}
                      <TooltipInfo message="Recomendações reportadas para:" />
                    </Form.Label>
                    <Form.Control
                      name="recomendacoes_reportadas"
                      value={form.recomendacoes_reportadas}
                      onChange={(e) =>
                        setForm({ ...form, recomendacoes_reportadas: e.target.value })
                      }
                      isInvalid={!!fieldErrors.recomendacoes_reportadas}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.recomendacoes_reportadas}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Data Reporte</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_reporte"
                      value={form.data_reporte}
                      onChange={(e) => setForm({ ...form, data_reporte: e.target.value })}
                      isInvalid={!!fieldErrors.data_reporte}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.data_reporte}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>
                      Decisões <TooltipInfo message="Decisões de resolução efetivadas" />
                    </Form.Label>
                    <Form.Control
                      name="decisoes_resolucao"
                      value={form.decisoes_resolucao}
                      onChange={(e) =>
                        setForm({ ...form, decisoes_resolucao: e.target.value })
                      }
                      isInvalid={!!fieldErrors.decisoes_resolucao}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.decisoes_resolucao}
                    </Form.Control.Feedback>
                  </Col>
                  <Col md={4}>
                    <Form.Label>
                      Data Encerramento{' '}
                      <TooltipInfo message="Data de encerramento do registro" />
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="data_encerramento"
                      value={form.data_encerramento}
                      onChange={(e) =>
                        setForm({ ...form, data_encerramento: e.target.value })
                      }
                      isInvalid={!!fieldErrors.data_encerramento}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.data_encerramento}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                <Form.Group>
                  <Form.Label>
                    Fonte Informada{' '}
                    <TooltipInfo message="A Fonte foi informada do resultado?" />
                  </Form.Label>
                  <Form.Select
                    name="fonte_informada"
                    value={form.fonte_informada}
                    onChange={(e) =>
                      setForm({ ...form, fonte_informada: e.target.value })
                    }
                    isInvalid={!!fieldErrors.fonte_informada}
                  >
                    <option value=""></option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.fonte_informada}
                  </Form.Control.Feedback>
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
                {saving ? 'Salvando...' : 'Salvar Incidente'}
              </Button>
            </Modal.Footer>
          </div>
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
