import React, { useEffect, useMemo, useState } from 'react';
import { Table, Container, Form, Spinner, Alert, Pagination } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import { useAuth } from '../context/AuthContext';

function Checklist() {
  const { user } = useAuth();
  const canToggle = user?.role === 'admin' || user?.role === 'dpo';
  const readOnly = !canToggle;

  const [rows, setRows] = useState([]); // sempre array
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState('warning');

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0); // total do backend (quando paginado)
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);

  // ===== FETCH com normalização segura =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const params = { page, page_size: pageSize };
        const resp = await AxiosInstance.get('checklists/', { params });
        const data = resp?.data;

        // aceita: [ ... ]  ou  { results: [ ... ], count, next, previous }
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        if (!mounted) return;

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
        setMsg('');
      } catch (error) {
        console.error(
          'Erro ao buscar o checklist:',
          error?.response?.data || error.message
        );
        if (!mounted) return;
        setRows([]);
        setCount(0);
        setNext(null);
        setPrevious(null);
        setMsg('Falha ao carregar itens do checklist.');
        setVariant('danger');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
      setVariant(st === 403 ? 'warning' : 'danger');
      setMsg(
        st === 403
          ? 'Você não tem permissão para alterar este item.'
          : 'Não foi possível atualizar o item. Tente novamente.'
      );
      setTimeout(() => setMsg(''), 3000);
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
      <Sidebar />

      <div
        style={{
          flex: 1,
          background: '#f5f5f5', // << cor de fundo unificada
          padding: '2rem 0',
          marginTop: '30px',
        }}
      >
        {/* TÍTULO (centralizado, cor da identidade) */}
        <div className="text-center mb-4">
          <h2 style={{ color: '#071744', fontWeight: 700 }}>Checklist Itens da LGPD</h2>
        </div>

        <Container fluid className="px-0">
          {/* Alerts (cores padrão do BS) */}
          {/* {readOnly && (
            <Alert variant="info">
              Visualização em modo somente leitura. Apenas <strong>Admin</strong> e{' '}
              <strong>DPO</strong> podem marcar/desmarcar itens.
            </Alert>
          )}
          {!!msg && (
            <Alert variant={variant} className="mb-3">
              {msg}
            </Alert>
          )} */}

          {/* Controles superiores */}
          <div className="d-flex justify-content-end align-items-center gap-2 px-3 mb-2">
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

          {/* Tabela (full width) */}
          <Table striped bordered hover responsive className="w-100">
            <thead style={{ backgroundColor: '#2c3790', color: '#fff' }}>
              <tr>
                <th style={{ width: '25%' }}>Atividade</th>
                <th>Descrição</th>
                <th style={{ width: 140, textAlign: 'center' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(rows) ? rows : []).map((item) => (
                <tr key={item.id}>
                  <td>{item.atividade}</td>
                  <td>{item.descricao}</td>
                  <td className="text-center">
                    <Form.Check
                      type="checkbox"
                      checked={!!item.is_completed}
                      disabled={readOnly}
                      onChange={() => handleCheckChange(item.id, !!item.is_completed)}
                      title={readOnly ? 'Somente leitura' : 'Alterar situação'}
                      style={{ cursor: readOnly ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
              {(Array.isArray(rows) ? rows : []).length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

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
      </div>
    </div>
  );
}

export default Checklist;
