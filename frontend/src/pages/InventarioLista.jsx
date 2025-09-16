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
  ToastContainer,
  Dropdown,
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import { ROUTES } from '../routes';
import '../estilos/inventariolista.css';

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
  const [sortKey, setSortKey] = React.useState('id'); // id | unidade | setor | responsavel_email | processo_negocio | data_criacao
  const [sortDir, setSortDir] = React.useState('desc'); // asc | desc
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Filtros avançados por campo (icontains onde faz sentido)
  const [advFilters, setAdvFilters] = React.useState({
    unidade: '',
    setor: '',
    responsavel: '',
    processo: '',
  });

  const ROWNUM_KEY = '__item';

  // data do backend
  const [total, setTotal] = React.useState(0);

  // ---------- NOVO: definição das colunas da tabela (ordem ampla, igual export) ----------
  // Marque sortable: true só nos campos que o backend permite ordenar
  const columns = React.useMemo(
    () => [
      //coluna sintética (não ordenável)
      { key: ROWNUM_KEY, label: 'Item', sortable: false, minWidth: 90 },

      // id continua existindo, mas ficará oculto por padrão (ver defaultVisible)
      { key: 'id', label: 'ID', sortable: true, minWidth: 80 },

      // básicos (ordenáveis)
      { key: 'unidade', label: 'Unidade', sortable: true, minWidth: 180 },
      { key: 'setor', label: 'Setor', sortable: true, minWidth: 180 },
      {
        key: 'responsavel_email',
        label: 'Responsável (E-mail)',
        sortable: true,
        minWidth: 220,
      },
      {
        key: 'processo_negocio',
        label: 'Processo de Negócio',
        sortable: true,
        minWidth: 220,
      },

      // detalhamento (alguns com quebra de linha)
      { key: 'finalidade', label: 'Finalidade', minWidth: 320, wrap: true },
      { key: 'dados_pessoais', label: 'Dados Pessoais', minWidth: 320, wrap: true },
      { key: 'tipo_dado', label: 'Tipo de Dado', minWidth: 160 },
      { key: 'origem', label: 'Origem', minWidth: 140 },
      { key: 'formato', label: 'Formato', minWidth: 120 },
      { key: 'impresso', label: 'Impresso', minWidth: 110 },
      { key: 'titulares', label: 'Titulares', minWidth: 240, wrap: true },
      { key: 'dados_menores', label: 'Dados de menores', minWidth: 130 },
      { key: 'base_legal', label: 'Base Legal', minWidth: 180 },
      { key: 'pessoas_acesso', label: 'Pessoas com Acesso', minWidth: 260, wrap: true },
      { key: 'atualizacoes', label: 'Atualizações (Quando)', minWidth: 200 },
      {
        key: 'transmissao_interna',
        label: 'Transmissão Interna',
        minWidth: 260,
        wrap: true,
      },
      {
        key: 'transmissao_externa',
        label: 'Transmissão Externa',
        minWidth: 260,
        wrap: true,
      },
      {
        key: 'local_armazenamento_digital',
        label: 'Local Armazenamento (Digital)',
        minWidth: 280,
        wrap: true,
      },
      { key: 'controlador_operador', label: 'Controlador/Operador', minWidth: 210 },
      { key: 'motivo_retencao', label: 'Motivo Retenção', minWidth: 240, wrap: true },
      { key: 'periodo_retencao', label: 'Período Retenção', minWidth: 160 },
      { key: 'exclusao', label: 'Exclusão', minWidth: 140 },
      { key: 'forma_exclusao', label: 'Forma Exclusão', minWidth: 200, wrap: true },
      { key: 'transferencia_terceiros', label: 'Transf. a Terceiros', minWidth: 180 },
      {
        key: 'quais_dados_transferidos',
        label: 'Quais Dados Transferidos',
        minWidth: 260,
        wrap: true,
      },
      {
        key: 'transferencia_internacional',
        label: 'Transf. Internacional',
        minWidth: 190,
      },
      { key: 'empresa_terceira', label: 'Empresa Terceira', minWidth: 220 },
      {
        key: 'adequado_contratualmente',
        label: 'Adequado Contratualmente',
        minWidth: 210,
      },
      { key: 'paises_tratamento', label: 'Países Tratamento', minWidth: 220, wrap: true },
      {
        key: 'medidas_seguranca',
        label: 'Medidas de Segurança',
        minWidth: 320,
        wrap: true,
      },
      { key: 'consentimentos', label: 'Consentimentos', minWidth: 220, wrap: true },
      { key: 'observacao', label: 'Observação', minWidth: 320, wrap: true },

      // datas (ordenável em criação)
      { key: 'data_criacao', label: 'Data Criação', sortable: true, minWidth: 160 },
      { key: 'data_atualizacao', label: 'Última Atualização', minWidth: 170 },
    ],
    []
  );

  // Preferências salvas
  const LS_KEY = 'inventarioLista.visibleColumns.v2';
  const defaultVisible = React.useMemo(() => {
    const keys = columns.map((c) => c.key).filter((k) => k !== 'id');
    return new Set(keys);
  }, [columns]);

  const [visibleCols, setVisibleCols] = React.useState(defaultVisible);

  // carrega preferências
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        const set = new Set(arr.filter((k) => columns.some((c) => c.key === k)));
        if (set.size) setVisibleCols(set);
      }
    } catch {}
  }, [columns]);

  // persiste preferências
  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(Array.from(visibleCols)));
    } catch {}
  }, [visibleCols]);

  const toggleColumn = (key) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const showAllColumns = () => setVisibleCols(new Set(columns.map((c) => c.key)));
  const clearColumns = () => setVisibleCols(new Set());

  // coluna visível + cálculo de largura mínima da tabela
  const visibleColumns = React.useMemo(
    () => columns.filter((c) => visibleCols.has(c.key)),
    [columns, visibleCols]
  );

  const tableMinWidth = React.useMemo(
    () => visibleColumns.reduce((sum, c) => sum + (c.minWidth || 140), 220), // + Ações
    [visibleColumns]
  );

  // Estilos de header/célula e formatação de valores
  const thStyle = (col) => ({
    minWidth: col.minWidth || 140,
    whiteSpace: col.wrap ? 'normal' : 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    background: '#f8f9fa',
  });

  const tdStyle = (col) => ({
    minWidth: col.minWidth || 140,
    whiteSpace: col.wrap ? 'normal' : 'nowrap',
    verticalAlign: 'top',
    wordBreak: col.wrap ? 'break-word' : 'normal',
  });

  const formatCell = React.useCallback((raw, key) => {
    if (key === ROWNUM_KEY) return ''; // conteúdo é calculado no render
    if (raw === null || raw === undefined || raw === '') return '-';
    if (typeof raw === 'boolean') return raw ? 'Sim' : 'Não';
    if (key === 'data_criacao' || key === 'data_atualizacao') {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('pt-BR'); // dd/mm/aaaa
    }
    if (Array.isArray(raw)) return raw.join(', ');
    return String(raw);
  }, []);

  const isSortable = (key) => {
    const c = columns.find((c) => c.key === key);
    return !!c?.sortable;
  };
  // ---------- FIM colunas ----------

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

  // Esconde automaticamente mensagens de SUCESSO após 3s
  React.useEffect(() => {
    if (!msg || variant !== 'success') return;
    const t = setTimeout(() => {
      setMsg('');
      setVariant('');
    }, 3000);
    return () => clearTimeout(t);
  }, [msg, variant]);

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
    if (advFilters.responsavel)
      sp.set('responsavel_email__icontains', advFilters.responsavel);
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
          ...(advFilters.unidade ? { unidade__icontains: advFilters.unidade } : {}),
          ...(advFilters.setor ? { setor__icontains: advFilters.setor } : {}),
          ...(advFilters.responsavel
            ? { responsavel_email__icontains: advFilters.responsavel }
            : {}),
          ...(advFilters.processo
            ? { processo_negocio__icontains: advFilters.processo }
            : {}),
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

  const handleExport = async (tipo /* 'csv' | 'xlsx' | 'pdf' */) => {
    try {
      const ordering = sortDir === 'asc' ? sortKey : `-${sortKey}`;
      const params = {
        search: query || undefined,
        ordering,
        ...(advFilters?.unidade ? { unidade__icontains: advFilters.unidade } : {}),
        ...(advFilters?.setor ? { setor__icontains: advFilters.setor } : {}),
        ...(advFilters?.responsavel
          ? { responsavel_email__icontains: advFilters.responsavel }
          : {}),
        ...(advFilters?.processo
          ? { processo_negocio__icontains: advFilters.processo }
          : {}),
      };

      const resp = await AxiosInstance.get(`inventarios/export/${tipo}/`, {
        params,
        responseType: 'blob',
      });

      const cd = resp.headers['content-disposition'] || '';
      const match = /filename\*?=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
      const fname = decodeURIComponent(match?.[1] || match?.[2] || `inventarios.${tipo}`);

      const blob = new Blob([resp.data], {
        type: resp.headers['content-type'] || undefined,
      });
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
    if (!isSortable(key)) return; // segurança extra
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
        <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
          {p}
        </Pagination.Item>
      );
    }

    if (to < pageCount) {
      if (to < pageCount - 1)
        items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
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
    <>
      <div className="d-flex pg-inventariolista" style={{ minHeight: '100vh' }}>
        <Sidebar />

        <div
          style={{
            background: '#f5f5f5',
            minHeight: '100vh',
            width: '100vw',
            marginTop: '30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem',
            boxSizing: 'border-box',
          }}
        >
          <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1080 }}>
            <Toast
              bg="success"
              onClose={() => setToastShow(false)}
              show={toastShow}
              delay={3500}
              autohide
            >
              <Toast.Header>
                <strong className="me-auto">Exportação</strong>
              </Toast.Header>
              <Toast.Body className="text-white">{toastMsg}</Toast.Body>
            </Toast>
          </ToastContainer>

          {/* Título centralizado no padrão */}
          <h2 className="mb-4 page-title-ink text-center">Lista Inventários</h2>

          {/* Bloco principal no gradiente (filtros + tabela) */}
          <Container fluid className="container-gradient shell content-viewport">
            {msg && <Alert variant={variant}>{msg}</Alert>}

            {/* AÇÕES (no gradiente) */}
            <div className="d-flex w-100 align-items-center justify-content-end mb-3">
              <div className="d-flex align-items-center gap-2">
                <Dropdown align="end">
                  <Dropdown.Toggle variant="light" className="btn-white-custom">
                    Colunas
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{
                      maxHeight: 360,
                      overflowY: 'auto',
                      padding: '0.5rem 0.75rem',
                    }}
                  >
                    <div className="d-flex gap-2 justify-content-between align-items-center mb-2">
                      <Button size="sm" variant="light" onClick={showAllColumns}>
                        Marcar todas
                      </Button>
                      <Button size="sm" variant="light" onClick={clearColumns}>
                        Limpar
                      </Button>
                      <Button size="sm" variant="light" onClick={showAllColumns}>
                        Padrão
                      </Button>
                    </div>
                    <div className="pt-1">
                      {columns.map((col) => (
                        <Form.Check
                          key={col.key}
                          type="checkbox"
                          id={`col-${col.key}`}
                          label={col.label}
                          checked={visibleCols.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="mb-1"
                        />
                      ))}
                    </div>
                  </Dropdown.Menu>
                </Dropdown>

                <Button
                  className="btn-white-custom"
                  variant="light"
                  onClick={() => handleExport('xlsx')}
                  disabled={loading}
                >
                  Exportar XLSX
                </Button>
                <Button
                  className="btn-white-custom"
                  variant="light"
                  onClick={() => handleExport('pdf')}
                  disabled={loading}
                >
                  Exportar PDF
                </Button>
                <Button
                  className="btn-white-custom"
                  variant="light"
                  onClick={() => handleExport('csv')}
                  disabled={loading}
                >
                  Exportar CSV
                </Button>
                <Button
                  className="btn-white-custom"
                  variant="light"
                  onClick={() => navigate(ROUTES.INVENTARIO_DADOS)}
                >
                  Novo Inventário
                </Button>
              </div>
            </div>

            {/* FILTROS (agora sobre o gradiente, iguais aos formulários) */}
            <Form
              className="filters-on-gradient mb-3"
              onSubmit={(e) => e.preventDefault()}
            >
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
                <Col className="d-flex justify-content-end">{renderPagination()}</Col>
              </Row>

              <Row className="g-2 mt-2">
                <Col md={3}>
                  <Form.Label>Unidade (contém)</Form.Label>
                  <Form.Control
                    value={advFilters.unidade}
                    onChange={(e) =>
                      setAdvFilters((f) => ({ ...f, unidade: e.target.value }))
                    }
                    placeholder="ex.: Matriz"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Setor (contém)</Form.Label>
                  <Form.Control
                    value={advFilters.setor}
                    onChange={(e) =>
                      setAdvFilters((f) => ({ ...f, setor: e.target.value }))
                    }
                    placeholder="ex.: Financeiro"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Responsável (e-mail contém)</Form.Label>
                  <Form.Control
                    value={advFilters.responsavel}
                    onChange={(e) =>
                      setAdvFilters((f) => ({ ...f, responsavel: e.target.value }))
                    }
                    placeholder="ex.: joao@"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Processo (contém)</Form.Label>
                  <Form.Control
                    value={advFilters.processo}
                    onChange={(e) =>
                      setAdvFilters((f) => ({ ...f, processo: e.target.value }))
                    }
                    placeholder="ex.: Onboarding"
                  />
                </Col>
              </Row>

              <div className="d-flex justify-content-end mt-2">
                <Button
                  className="btn-white-custom"
                  variant="light"
                  size="sm"
                  onClick={() =>
                    setAdvFilters({
                      unidade: '',
                      setor: '',
                      responsavel: '',
                      processo: '',
                    })
                  }
                >
                  Limpar filtros
                </Button>
              </div>
            </Form>

            {/* TABELA (card branco) */}
            <Card className="shadow-sm card-fill labels-reset">
              {/* sem Card.Header (era claro); deixamos só a tabela */}
              <Card.Body className="pt-0">
                {loading ? (
                  <div className="py-5 text-center">
                    <Spinner animation="border" role="status" />
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <Table
                      striped
                      hover
                      bordered
                      className="mt-3 smart-table table-striped-columns"
                    >
                      <thead className="smart-head">
                        <tr>
                          {visibleColumns.map((col) => (
                            <th
                              key={col.key}
                              role={col.sortable ? 'button' : undefined}
                              title={col.sortable ? 'Ordenar' : undefined}
                              onClick={
                                col.sortable ? () => handleSort(col.key) : undefined
                              }
                              className={col.sortable ? 'user-select-none' : undefined}
                              style={thStyle(col)}
                            >
                              {col.label}
                              {col.sortable ? sortIndicator(col.key) : ''}
                            </th>
                          ))}
                          <th
                            style={{
                              width: 220,
                              position: 'sticky',
                              right: 0,
                              background: '#fff',
                              zIndex: 1,
                            }}
                          >
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={it.id}>
                            {visibleColumns.map((col) => {
                              let content;
                              let title = '';
                              if (col.key === ROWNUM_KEY) {
                                const base = (page - 1) * pageSize;
                                content = base + idx + 1;
                              } else {
                                const raw = it[col.key];
                                content = formatCell(raw, col.key);
                                title = raw == null ? '' : String(raw);
                              }
                              return (
                                <td key={col.key} style={tdStyle(col)} title={title}>
                                  {content}
                                </td>
                              );
                            })}
                            <td
                              style={{ position: 'sticky', right: 0, background: '#fff' }}
                            >
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="me-3"
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
                            <td
                              colSpan={visibleColumns.length + 1}
                              className="text-center text-muted py-4"
                            >
                              Nenhum inventário encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>

              {!loading && total > 0 && (
                <Card.Footer className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Página {currentPage} de {Math.max(1, Math.ceil(total / pageSize))} —{' '}
                    {total} registros
                  </small>
                  {renderPagination()}
                </Card.Footer>
              )}
            </Card>
          </Container>
        </div>
      </div>
    </>
  );
}

export default InventarioLista;
