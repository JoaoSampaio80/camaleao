// src/pages/InventarioLista.jsx
import React from 'react';
import {
  Container,
  Card,
  Table,
  Button,
  Spinner,
  Alert,
  Form,
  Row,
  Col,
  Pagination,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import { ROUTES } from '../routes';

function InventarioLista() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [msg, setMsg] = React.useState('');
  const [variant, setVariant] = React.useState('');

  // Busca / ordenação / paginação (server-side)
  const [searchInput, setSearchInput] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState('id');     // id | unidade | setor | responsavel_email | processo_negocio | data_criacao
  const [sortDir, setSortDir] = React.useState('desc');   // asc | desc
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Filtros avançados por campo (icontains onde faz sentido)
  const [advFilters, setAdvFilters] = React.useState({
    unidade: '',
    setor: '',
    responsavel: '',
    processo: '',
  });

  // data do backend
  const [total, setTotal] = React.useState(0);

  // Flash de sucesso vindo de outras telas
  React.useEffect(() => {
    const flash = location.state?.flash;
    if (flash) {
      setVariant('success');
      setMsg(flash);
      navigate('.', { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lê parâmetros da URL na montagem (deep-link)
  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);

    // busca
    const initialSearch = sp.get('search') || '';
    setSearchInput(initialSearch);
    setQuery(initialSearch);

    // ordenação
    const ord = sp.get('ordering') || '-data_criacao';
    if (ord.startsWith('-')) {
      setSortKey(ord.slice(1));
      setSortDir('desc');
    } else {
      setSortKey(ord);
      setSortDir('asc');
    }

    // paginação
    const p = parseInt(sp.get('page') || '1', 10);
    const ps = parseInt(sp.get('page_size') || '10', 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    setPageSize([5, 10, 20, 50].includes(ps) ? ps : 10);

    // filtros avançados
    setAdvFilters({
      unidade: sp.get('unidade__icontains') || '',
      setor: sp.get('setor__icontains') || '',
      responsavel: sp.get('responsavel_email__icontains') || '',
      processo: sp.get('processo_negocio__icontains') || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Espelha estados na URL (sem recarregar)
  React.useEffect(() => {
    const sp = new URLSearchParams();

    if (query) sp.set('search', query);

    const ord = sortDir === 'asc' ? sortKey : `-${sortKey}`;
    sp.set('ordering', ord);

    sp.set('page', String(page));
    sp.set('page_size', String(pageSize));

    if (advFilters.unidade) sp.set('unidade__icontains', advFilters.unidade);
    if (advFilters.setor) sp.set('setor__icontains', advFilters.setor);
    if (advFilters.responsavel) sp.set('responsavel_email__icontains', advFilters.responsavel);
    if (advFilters.processo) sp.set('processo_negocio__icontains', advFilters.processo);

    navigate({ search: sp.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortKey, sortDir, page, pageSize, advFilters]);

  const fetchList = async () => {
    setLoading(true);
    try {
      // DRF: ordering = campo ou -campo
      const ordering = sortDir === 'asc' ? sortKey : `-${sortKey}`;
      const resp = await AxiosInstance.get('inventarios/', {
        params: {
          search: query || undefined,
          ordering,
          page,
          page_size: pageSize,
          // filtros avançados
          ...(advFilters.unidade ? { 'unidade__icontains': advFilters.unidade } : {}),
          ...(advFilters.setor ? { 'setor__icontains': advFilters.setor } : {}),
          ...(advFilters.responsavel ? { 'responsavel_email__icontains': advFilters.responsavel } : {}),
          ...(advFilters.processo ? { 'processo_negocio__icontains': advFilters.processo } : {}),
        },
      });
      const data = resp?.data || {};
      setItems(Array.isArray(data.results) ? data.results : []);
      setTotal(Number.isFinite(data.count) ? data.count : 0);
    } catch (e) {
      setVariant('danger');
      setMsg('Falha ao carregar inventários.');
    } finally {
      setLoading(false);
    }
  };

  // Recarrega quando filtros mudarem
  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortKey, sortDir, page, pageSize, advFilters]);

  // sempre que mudar busca, ordenação ou pageSize, volta pra página 1
  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortKey, sortDir, pageSize, advFilters]);

  // debounce da busca (input -> query)
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleEdit = (id) => {
    navigate(ROUTES.INVENTARIO_DADOS + `?id=${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este inventário?')) return;
    try {
      await AxiosInstance.delete(`inventarios/${id}/`);
      setVariant('success');
      setMsg('Inventário excluído com sucesso.');
      fetchList();
    } catch (e) {
      const st = e?.response?.status;
      const detail = e?.response?.data?.detail;
      setVariant('danger');
      if (st === 403) setMsg('Você não tem permissão para excluir este inventário.');
      else setMsg(detail || 'Falha ao excluir inventário.');
    }
  };

  const [toastShow, setToastShow] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState('');

  const extractFilename = (contentDisposition) => {
    if (!contentDisposition) return '';
    // tenta filename*=
    const star = /filename\*\=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (star && star[1]) {
      try { return decodeURIComponent(star[1]); } catch { return star[1]; }
    }
    // fallback filename=
    const plain = /filename\=\"?([^\";]+)\"?/i.exec(contentDisposition);
    return plain && plain[1] ? plain[1] : '';
  };

  const handleExport = async (tipo /* 'csv' | 'xlsx' | 'pdf' */) => {
    try {
      const ordering = sortDir === 'asc' ? sortKey : `-${sortKey}`;
      const params = {
        search: query || undefined,
        ordering,
        ...(advFilters?.unidade ? { 'unidade__icontains': advFilters.unidade } : {}),
        ...(advFilters?.setor ? { 'setor__icontains': advFilters.setor } : {}),
        ...(advFilters?.responsavel ? { 'responsavel_email__icontains': advFilters.responsavel } : {}),
        ...(advFilters?.processo ? { 'processo_negocio__icontains': advFilters.processo } : {}),
      };

      // novo path, sem ?format=
      const resp = await AxiosInstance.get(`inventarios/export/${tipo}/`, {
        params,
        responseType: 'blob',
      });

      const cd = resp.headers['content-disposition'] || '';
      const match = /filename\*?=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
      const fname = decodeURIComponent(match?.[1] || match?.[2] || `inventarios.${tipo}`);

      const blob = new Blob([resp.data], { type: resp.headers['content-type'] || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setToastMsg(`Arquivo ${tipo.toUpperCase()} gerado com sucesso.`);
      setToastShow(true);
    } catch (e) {
      setVariant('danger');
      setMsg('Falha ao exportar arquivo.');
    }
  };


  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const sortIndicator = (key) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const renderPagination = () => {
    if (pageCount <= 1) return null;
    const items = [];

    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => setPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      />
    );

    const windowSize = 3;
    const from = Math.max(1, currentPage - windowSize);
    const to = Math.min(pageCount, currentPage + windowSize);

    if (from > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => setPage(1)}>
          1
        </Pagination.Item>
      );
      if (from > 2) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
    }

    for (let p = from; p <= to; p++) {
      items.push(
        <Pagination.Item
          key={p}
          active={p === currentPage}
          onClick={() => setPage(p)}
        >
          {p}
        </Pagination.Item>
      );
    }

    if (to < pageCount) {
      if (to < pageCount - 1) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
      items.push(
        <Pagination.Item key={pageCount} onClick={() => setPage(pageCount)}>
          {pageCount}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage === pageCount}
      />
    );

    return <Pagination className="mb-0">{items}</Pagination>;
  };

  return (

    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#d6f3f9',
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
        <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1080 }}>
          <Toast bg="success" onClose={() => setToastShow(false)} show={toastShow} delay={3500} autohide>
            <Toast.Header>
              <strong className="me-auto">Exportação</strong>
            </Toast.Header>
            <Toast.Body className="text-white">{toastMsg}</Toast.Body>
          </Toast>
        </ToastContainer>
        <div className="d-flex w-100 align-items-center justify-content-between" style={{ maxWidth: 1280 }}>
          <h2 className="mb-4" style={{ color: '#071744' }}>Lista Inventários</h2>
          <div className="mb-3 d-flex align-items-center gap-2">
            <Button variant="outline-secondary" onClick={() => handleExport('xlsx')} disabled={loading}>
              Exportar XLSX
            </Button>
            <Button variant="outline-secondary" onClick={() => handleExport('pdf')} disabled={loading}>
              Exportar PDF
            </Button>
            <Button variant="outline-secondary" onClick={() => handleExport('csv')} disabled={loading}>
              Exportar CSV
            </Button>
            <Button variant="primary" onClick={() => navigate(ROUTES.INVENTARIO_DADOS)}>
              Novo Inventário
            </Button>
          </div>
        </div>

        <Container fluid style={{ maxWidth: 1280 }}>
          {msg && <Alert variant={variant}>{msg}</Alert>}

          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <Form onSubmit={(e) => e.preventDefault()}>
                <Row className="g-2 align-items-end">
                  <Col md={6}>
                    <Form.Label>Buscar</Form.Label>
                    <Form.Control
                      placeholder="Unidade, Setor, Responsável ou Processo"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </Col>
                  <Col md="auto">
                    <Form.Label>Itens por página</Form.Label>
                    <Form.Select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Form.Select>
                  </Col>
                  <Col className="d-flex justify-content-end">
                    {renderPagination()}
                  </Col>
                </Row>

                {/* Filtros avançados */}
                <Row className="g-2 mt-2">
                  <Col md={3}>
                    <Form.Label>Unidade (contém)</Form.Label>
                    <Form.Control
                      value={advFilters.unidade}
                      onChange={(e) => setAdvFilters(f => ({ ...f, unidade: e.target.value }))}
                      placeholder="ex.: Matriz"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Setor (contém)</Form.Label>
                    <Form.Control
                      value={advFilters.setor}
                      onChange={(e) => setAdvFilters(f => ({ ...f, setor: e.target.value }))}
                      placeholder="ex.: Financeiro"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Responsável (e-mail contém)</Form.Label>
                    <Form.Control
                      value={advFilters.responsavel}
                      onChange={(e) => setAdvFilters(f => ({ ...f, responsavel: e.target.value }))}
                      placeholder="ex.: joao@"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Processo (contém)</Form.Label>
                    <Form.Control
                      value={advFilters.processo}
                      onChange={(e) => setAdvFilters(f => ({ ...f, processo: e.target.value }))}
                      placeholder="ex.: Onboarding"
                    />
                  </Col>
                </Row>
                <div className="d-flex justify-content-end mt-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setAdvFilters({ unidade: '', setor: '', responsavel: '', processo: '' })}
                  >
                    Limpar filtros
                  </Button>
                </div>
              </Form>
            </Card.Header>

            <Card.Body className="pt-0">
              {loading ? (
                <div className="py-5 text-center">
                  <Spinner animation="border" role="status" />
                </div>
              ) : (
                <Table striped hover responsive className="mt-3">
                  <thead>
                    <tr>
                      <th role="button" onClick={() => handleSort('id')} title="Ordenar">
                        ID{sortIndicator('id')}
                      </th>
                      <th role="button" onClick={() => handleSort('unidade')} title="Ordenar">
                        Unidade{sortIndicator('unidade')}
                      </th>
                      <th role="button" onClick={() => handleSort('setor')} title="Ordenar">
                        Setor{sortIndicator('setor')}
                      </th>
                      <th role="button" onClick={() => handleSort('responsavel_email')} title="Ordenar">
                        Responsável{sortIndicator('responsavel_email')}
                      </th>
                      <th role="button" onClick={() => handleSort('processo_negocio')} title="Ordenar">
                        Processo{sortIndicator('processo_negocio')}
                      </th>
                      <th style={{ width: 220 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.id}</td>
                        <td>{it.unidade || '-'}</td>
                        <td>{it.setor || '-'}</td>
                        <td>{it.responsavel_email || '-'}</td>
                        <td>{it.processo_negocio || '-'}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => handleEdit(it.id)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(it.id)}
                          >
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && !loading && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          Nenhum inventário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>

            {!loading && total > 0 && (
              <Card.Footer className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Página {currentPage} de {Math.max(1, Math.ceil(total / pageSize))} — {total} registros
                </small>
                {renderPagination()}
              </Card.Footer>
            )}
          </Card>
        </Container>
      </div>
    </div>
  );
}

export default InventarioLista;