// src/pages/RankingRisco.jsx
import React, { useEffect, useState } from 'react';
import { Table, Form, Pagination, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import Axios from '../components/Axios';
import PaginacaoRiscos from '../components/PaginacaoRiscos';
import '../estilos/matriz.css';

function RankingRisco() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // {variant, text}

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const showMsg = (variant, text, ms = 3500) => {
    setNotice({ variant, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  const TOTAL_COLS = 6; // Item + Risco/Fator + Prob + Impacto + Pontuação + Plano de Ação
  const itemNumber = (idx) => (page - 1) * pageSize + idx + 1;
  const zebra = (idx) => (idx % 2 === 0 ? 'row-white' : 'row-blue');

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

  const loadRows = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const { data } = await Axios.get('/riscos/ranking/');

      // 🔹 já vem globalmente ordenado do backend
      const allResults = Array.isArray(data) ? data : [];

      const total = allResults.length;

      // 🔹 paginação apenas no front
      const startIdx = (targetPage - 1) * targetPageSize;
      const endIdx = startIdx + targetPageSize;
      const paginated = allResults.slice(startIdx, endIdx);

      setRows(paginated);
      setCount(total);
      setPage(targetPage);
      setPageSize(targetPageSize);
    } catch (e) {
      console.error(e);
      showMsg('danger', 'Falha ao carregar a listagem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => {
    loadRows(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <div className="main-content">
        {/* msg global */}
        {notice && (
          <div className="w-100 mb-2">
            <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          </div>
        )}

        {/* título */}
        <div className="w-100 mb-2">
          <h2 className="page-title">Ranking de Risco</h2>
        </div>

        <div className="w-100 mb-4">
          <PaginacaoRiscos />
        </div>

        {/* barra topo (apenas itens por página) */}
        <div className="d-flex w-100 align-items-center justify-content-end mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0">Itens por página</Form.Label>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ width: 110 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>
        </div>

        {/* tabela */}
        <div className="list-shell" style={{ width: '100%', alignSelf: 'stretch' }}>
          <div className="table-wrap">
            <Table bordered hover className="custom-table custom-table-ranking">
              <thead className="thead-gradient">
                <tr>
                  <th>Item</th>
                  <th className="col-wide">Risco e Fator de Risco</th>
                  <th>Probabilidade [1–5]</th>
                  <th>Impacto [1–5]</th>
                  <th>Pontuação do Risco</th>
                  <th className="col-wide">Plano de Ação</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr className="row-white">
                    <td colSpan={TOTAL_COLS} className="text-center text-muted">
                      Carregando…
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr className="row-white">
                    <td colSpan={TOTAL_COLS} className="text-center text-muted">
                      Nenhum risco cadastrado.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r, idx) => {
                    const prob = r.probabilidade?.value ?? null;
                    const imp = r.impacto?.value ?? null;
                    const score = Number(r.pontuacao);

                    return (
                      <tr key={r.id} className={zebra(idx)}>
                        <td className="col-wide" title={r.risco_fator}>
                          <div className="cell-clip">{itemNumber(idx)}</div>
                        </td>
                        <td title={r.risco_fator}>
                          <div className="cell-clip">{r.risco_fator || '-'}</div>
                        </td>
                        <td className="text-center">
                          <div className="cell-clip">{prob ?? '-'}</div>
                        </td>
                        <td className="text-center">
                          <div className="cell-clip">{imp ?? '-'}</div>
                        </td>
                        <td className="text-center" style={{ fontWeight: 600 }}>
                          <div className="cell-clip">{score ?? '-'}</div>
                        </td>
                        <td className="col-wide">
                          {r.resposta_risco ? (
                            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                              {r.resposta_risco
                                .split(/[\n;,]+/) // divide por quebra de linha, ponto e vírgula ou vírgula
                                .filter((acao) => acao.trim() !== '')
                                .map((acao, i) => (
                                  <li
                                    key={i}
                                    style={{
                                      whiteSpace: 'normal',
                                      lineHeight: '1.4',
                                      listStyleType: 'disc',
                                      color: 'inherit',
                                      fontSize: '0.95rem',
                                    }}
                                  >
                                    {acao.trim()}
                                  </li>
                                ))}
                            </ul>
                          ) : (
                            <div className="cell-clip">-</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>

          {/* rodapé */}
          <div className="list-footer">
            <div className="text-muted">
              <strong>Total:</strong> {count} • Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RankingRisco;
