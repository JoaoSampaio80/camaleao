// src/pages/ControleAcao.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Form,
  Alert,
  Spinner,
  Dropdown,
  Modal,
  Pagination,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import Axios from '../components/Axios';
import '../estilos/matriz.css';
import PaginacaoRiscos from '../components/PaginacaoRiscos';

function ControleAcoes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Paginação
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Modal Complemento
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState({
    como: '',
    funcionario: '',
    prazo: '',
    status: '',
  });

  const showMsg = (variant, text, ms = 3500) => {
    setNotice({ variant, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const TOTAL_COLS = 11;

  // ===== Carrega riscos =====
  const loadRows = async () => {
    setLoading(true);
    try {
      const { data } = await Axios.get('/riscos/', {
        params: { page_size: 9999 }, // força carregar todos os riscos
      });

      // compatibilidade com paginação DRF
      const results = Array.isArray(data) ? data : data.results || [];

      const withComplements = results.map((r) => ({
        ...r,
        matriz_filial: r.matriz_filial ?? r.matriz ?? '',
        risco_fator: r.risco_fator ?? r.risco ?? '',
        setor_avaliacao: r.setor ?? r.setor_proprietario ?? '',
        processo: r.processo ?? '',
        plano_acao_adicional: r.resposta_risco ?? '',
        como: r.como ?? '',
        funcionario: r.funcionario ?? r.funcionario_responsavel ?? '',
        prazo: r.prazo ?? '',
        status: r.status ?? '',
      }));

      setRows(withComplements);
      setPage(1);
    } catch (err) {
      console.error(err);
      showMsg('danger', 'Erro ao carregar os riscos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageClamped = Math.min(page, totalPages);

  const startIndex = (pageClamped - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [rows, startIndex, endIndex]
  );

  // ===== Modal Complemento =====
  const openModal = (mode, row) => {
    setModalMode(mode);
    setActiveId(row.id);
    setForm({
      como: row.como || '',
      funcionario: row.funcionario || '',
      prazo: row.prazo || '',
      status: row.status || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveId(null);
  };

  const onChangeField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveFromModal = async () => {
    const anyFilled = ['como', 'funcionario', 'prazo', 'status'].some(
      (k) => (form[k] || '').toString().trim() !== ''
    );
    if (!anyFilled) {
      showMsg('warning', 'Preencha pelo menos um dos campos para salvar.');
      return;
    }

    try {
      setRows((prev) => prev.map((r) => (r.id === activeId ? { ...r, ...form } : r)));
      closeModal();
      showMsg('success', 'Complemento salvo com sucesso.');
    } catch (e) {
      console.error(e);
      showMsg('danger', 'Falha ao salvar complemento.');
    }
  };

  // ===== Render =====
  const renderRow = (r, idx) => {
    return (
      <tr key={r.id} className={idx % 2 === 0 ? 'row-white' : 'row-blue'}>
        <td>
          <div className="cell-clip">{(page - 1) * pageSize + idx + 1}</div>
        </td>
        <td>
          <div className="cell-clip">{r.matriz_filial || '-'}</div>
        </td>
        <td className="col-wide">
          <div className="cell-clip">{r.risco_fator || '-'}</div>
        </td>
        <td>
          <div className="cell-clip">{r.setor_avaliacao || '-'}</div>
        </td>
        <td>
          <div className="cell-clip">{r.processo || '-'}</div>
        </td>
        <td className="col-wide">
          <div className="cell-clip">{r.plano_acao_adicional || '-'}</div>
        </td>
        <td>
          <div className="cell-clip">{r.como || '-'}</div>
        </td>
        <td>
          <div className="cell-clip">{r.funcionario || '-'}</div>
        </td>
        <td>
          <div className="cell-clip">{r.prazo || '-'}</div>
        </td>
        <td>
          <div className="cell-clip">{r.status || '-'}</div>
        </td>
        <td className="actions-cell">
          <Dropdown align="end">
            <Dropdown.Toggle size="sm" variant="outline-secondary">
              Ações
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => openModal('edit', r)}>Editar</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </td>
      </tr>
    );
  };

  // ===== Paginação =====
  const handlePageSize = (e) => {
    const val = Number(e.target.value);
    setPageSize(val);
    setPage(1);
  };

  // ===== Paginação estilo Matriz/Ranking =====
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
        }}
      >
        {notice && (
          <div className="w-100 mb-3">
            <Alert variant={notice.variant} onClose={() => setNotice(null)} dismissible>
              {notice.text}
            </Alert>
          </div>
        )}

        <h2 className="text-center mb-3" style={{ color: '#071744', fontWeight: 700 }}>
          Controle de Ações
        </h2>

        <div className="w-100 mb-4">
          <PaginacaoRiscos />
        </div>

        {/* Itens por página */}
        <div className="w-100 d-flex justify-content-end mb-2">
          <div className="d-flex align-items-center gap-2">
            <span className="me-2" style={{ color: '#071744', fontWeight: 600 }}>
              Itens por página
            </span>
            <Form.Select
              value={pageSize}
              onChange={handlePageSize}
              style={{ width: 110 }}
              size="sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>
        </div>

        {/* tabela + rodapé padronizados (igual matriz/ranking) */}

        <div className="list-shell" style={{ width: '100%', alignSelf: 'stretch' }}>
          <div className="table-wrap">
            <Table bordered hover className="custom-table">
              <thead className="thead-gradient">
                <tr>
                  <th>Item</th>
                  <th>Matriz/Filial</th>
                  <th>Risco e Fator de Risco</th>
                  <th>Setor Proprietário</th>
                  <th>Processo</th>
                  <th>Plano de Ação Adicional</th>
                  <th>Como</th>
                  <th>Funcionário Responsável</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="text-center">
                      <Spinner animation="border" size="sm" /> Carregando...
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="text-center text-muted">
                      Nenhum risco encontrado.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(renderRow)
                )}
              </tbody>
            </Table>
          </div>

          {/* rodapé padrão matriz/ranking */}
          <div className="list-footer">
            <div className="text-muted">
              <strong>Total:</strong> {totalItems} • Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>
      </div>

      {/* Modal Complemento */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton style={{ background: '#071744' }}>
          <Modal.Title style={{ color: '#fff' }}>
            {modalMode === 'add' ? 'Adicionar Complemento' : 'Editar Complemento'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#0b2a5b' }}>
          <div className="container-fluid">
            <div className="row g-3">
              <div className="col-12">
                <Form.Label className="text-white">Como</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.como}
                  onChange={(e) => onChangeField('como', e.target.value)}
                  placeholder="Descreva como executar a ação..."
                />
              </div>

              <div className="col-md-6">
                <Form.Label className="text-white">Funcionário Responsável</Form.Label>
                <Form.Control
                  value={form.funcionario}
                  onChange={(e) => onChangeField('funcionario', e.target.value)}
                  placeholder="Ex.: Gerenciadora de TI"
                />
              </div>

              <div className="col-md-3">
                <Form.Label className="text-white">Prazo</Form.Label>
                <Form.Control
                  type="date"
                  value={form.prazo}
                  onChange={(e) => onChangeField('prazo', e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <Form.Label className="text-white">Status</Form.Label>
                <Form.Select
                  value={form.status}
                  onChange={(e) => onChangeField('status', e.target.value)}
                >
                  <option value="">Selecione…</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                </Form.Select>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ background: '#0b2a5b' }}>
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={saveFromModal}>
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ControleAcoes;
