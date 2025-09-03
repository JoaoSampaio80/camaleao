import React from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import { ROUTES } from '../routes';
import { useInventario } from '../context/InventarioContext';
import { useAuth } from '../context/AuthContext';

const toBRDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

function InventarioLista() {
  const navigate = useNavigate();
  const { reset } = useInventario();
  const { user } = useAuth();

  const role = (user?.role || '').toLowerCase();
  const isSuper = !!user?.is_superuser;
  const isAdminOrDPO = isSuper || role === 'admin' || role === 'dpo';
  const isGerente = role === 'gerente';

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [nextUrl, setNextUrl] = React.useState(null);
  const [prevUrl, setPrevUrl] = React.useState(null);
  const [deletingId, setDeletingId] = React.useState(null);

  const fetchList = async (url = 'inventarios/') => {
    setLoading(true);
    setError('');
    try {
      const resp = await AxiosInstance.get(url);
      const data = resp?.data;

      if (Array.isArray(data)) {
        setItems(data); setNextUrl(null); setPrevUrl(null);
      } else if (data && typeof data === 'object') {
        setItems(data.results || []); setNextUrl(data.next || null); setPrevUrl(data.previous || null);
      } else {
        setItems([]); setNextUrl(null); setPrevUrl(null);
      }
    } catch (e) {
      const st = e?.response?.status;
      if (st === 403) setError('Você não tem permissão para visualizar os inventários.');
      else setError('Falha ao carregar inventários.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchList(); }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const campo = (v) => String(v ?? '').toLowerCase();
    return items.filter((it) =>
      campo(it.id).includes(q) ||
      campo(it.processo_negocio).includes(q) ||
      campo(it.setor).includes(q) ||
      campo(it.unidade).includes(q) ||
      campo(it.responsavel_email).includes(q) ||
      campo(it.criado_por).includes(q)
    );
  }, [items, query]);

  const handleNovo = () => { reset(); navigate(ROUTES.INVENTARIO_DADOS); };
  const handleEditar = (id) => { if (id) navigate(`${ROUTES.INVENTARIO_DADOS}?id=${encodeURIComponent(id)}`); };

  const canEdit = (it) => {
    if (isAdminOrDPO) return true;
    if (isGerente) {
      // Backend envia 'criado_por' como e-mail do criador (via serializer)
      const ownerEmail = it?.criado_por || '';
      return ownerEmail && ownerEmail.toLowerCase() === (user?.email || '').toLowerCase();
    }
    return false;
  };

  const canDelete = (/* it */) => {
    // Apenas admin ou DPO pode excluir
    return isAdminOrDPO;
  };

  const handleDelete = async (id) => {
    if (!id || !canDelete()) return;
    if (!window.confirm(`Excluir inventário #${id}? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(id);
    try {
      await AxiosInstance.delete(`inventarios/${id}/`);
      await fetchList();
    } catch (e) {
      const st = e?.response?.status;
      const detail = e?.response?.data?.detail;
      alert(st === 403 ? 'Você não tem permissão para excluir este inventário.' : (detail || 'Falha ao excluir.'));
    } finally {
      setDeletingId(null);
    }
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
        <div className="d-flex w-100 align-items-center justify-content-between" style={{ maxWidth: 1280 }}>
          <h2 className="mb-4" style={{ color: '#071744' }}>Inventários</h2>
          <div className="mb-3 d-flex gap-2">
            <Button variant="primary" onClick={handleNovo}>Novo</Button>
          </div>
        </div>

        <Container fluid style={{ maxWidth: 1280 }}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <Form>
                <Row className="g-2 align-items-end">
                  <Col md={6}>
                    <Form.Label>Buscar</Form.Label>
                    <Form.Control
                      placeholder="ID, Processo, Setor, Unidade, Responsável, Criado por"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Col>
                  <Col md="auto">
                    <Button variant="outline-secondary" onClick={() => setQuery('')}>Limpar</Button>
                  </Col>
                </Row>
              </Form>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {loading ? (
                <div className="py-5 text-center">
                  <Spinner animation="border" role="status" />
                </div>
              ) : (
                <>
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>ID</th>
                        <th>Processo</th>
                        <th>Setor</th>
                        <th>Unidade</th>
                        <th>Responsável</th>
                        <th>Criado por</th>
                        <th style={{ width: 160 }}>Criado em</th>
                        <th style={{ width: 200 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((it) => {
                        const ownerEmail = it?.criado_por || '';
                        const isOwner = ownerEmail && ownerEmail.toLowerCase() === (user?.email || '').toLowerCase();
                        return (
                          <tr key={it.id}>
                            <td><Badge bg="secondary">{it.id}</Badge></td>
                            <td>{it.processo_negocio || it.nome_processo || '-'}</td>
                            <td>{it.setor || '-'}</td>
                            <td>{it.unidade || '-'}</td>
                            <td>{it.responsavel_email || '-'}</td>
                            <td>
                              {ownerEmail || '-'}
                              {isOwner && <Badge bg="info" className="ms-2">seu</Badge>}
                            </td>
                            <td>{toBRDate(it.data_criacao || it.created_at || it.updated_at)}</td>
                            <td className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleEditar(it.id)}
                                disabled={!canEdit(it)}
                              >
                                Editar
                              </Button>

                              {canDelete(it) && (
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => handleDelete(it.id)}
                                  disabled={deletingId === it.id}
                                >
                                  {deletingId === it.id ? 'Excluindo...' : 'Excluir'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            Nenhum inventário encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>

                  {(prevUrl || nextUrl) && (
                    <div className="d-flex justify-content-between">
                      <Button variant="outline-secondary" disabled={!prevUrl} onClick={() => fetchList(prevUrl)}>Anterior</Button>
                      <Button variant="outline-secondary" disabled={!nextUrl} onClick={() => fetchList(nextUrl)}>Próximo</Button>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}

export default InventarioLista;