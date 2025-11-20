// src/pages/RankingRisco.jsx
import React, { useEffect, useState } from 'react';
import { Table, Form, Pagination, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import Axios from '../components/Axios';
import PaginacaoRiscos from '../components/PaginacaoRiscos';
import FilterBar from '../components/FilterBar';
import '../estilos/rankingriscos.css';

function RankingRisco() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // {variant, text}
  const [allRows, setAllRows] = useState([]);

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // filtros
  const [filterProb, setFilterProb] = useState('');
  const [filterImpact, setFilterImpact] = useState('');
  const [filterScore, setFilterScore] = useState('');

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
      const { data } = await Axios.get('/ranking-riscos/');

      // 🔹 já vem globalmente ordenado do backend
      const allResults = Array.isArray(data) ? data : [];

      setAllRows(allResults);
    } catch (e) {
      console.error(e);
      showMsg('danger', 'Falha ao carregar a listagem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    let filtered = [...allRows];

    // filtro probabilidade
    if (filterProb) {
      const probNum = Number(filterProb);
      filtered = filtered.filter((r) => {
        const v = r.probabilidade?.value ?? r.probabilidade;
        return Number(v) === probNum;
      });
    }

    // filtro impacto
    if (filterImpact) {
      const impactNum = Number(filterImpact);
      filtered = filtered.filter((r) => {
        const v = r.impacto?.value ?? r.impacto;
        return Number(v) === impactNum;
      });
    }

    // filtro pontuação
    if (filterScore !== '') {
      const scoreNum = Number(filterScore);
      if (!Number.isNaN(scoreNum) && scoreNum >= 0) {
        filtered = filtered.filter((r) => Number(r.pontuacao) === scoreNum);
      }
    }

    const total = filtered.length;
    setCount(total);

    const totalPagesCalc = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPagesCalc) {
      setPage(totalPagesCalc);
      return;
    }

    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    setRows(filtered.slice(startIdx, endIdx));
  }, [allRows, filterProb, filterImpact, filterScore, page, pageSize]);

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

        <div className="d-flex justify-content-between align-items-start mb-3">
          {/* Filtros à esquerda */}
          <div style={{ flex: 1 }}>
            <FilterBar
              filters={[
                {
                  key: 'prob',
                  label: 'Probabilidade',
                  value: filterProb,
                  onChange: setFilterProb,
                  render: (
                    <Form.Select
                      value={filterProb}
                      onChange={(e) => {
                        setFilterProb(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Todas</option>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Form.Select>
                  ),
                },
                {
                  key: 'impact',
                  label: 'Impacto',
                  value: filterImpact,
                  onChange: setFilterImpact,
                  render: (
                    <Form.Select
                      value={filterImpact}
                      onChange={(e) => {
                        setFilterImpact(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Todos</option>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Form.Select>
                  ),
                },
                {
                  key: 'score',
                  label: 'Pontuação',
                  value: filterScore,
                  onChange: setFilterScore,
                  render: (
                    <Form.Control
                      type="number"
                      placeholder="Pontuação exata"
                      value={filterScore}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setFilterScore('');
                          setPage(1);
                          return;
                        }

                        const n = Number(raw);
                        if (Number.isNaN(n) || n < 0) return;

                        setFilterScore(String(n));
                        setPage(1);
                      }}
                    />
                  ),
                },
              ]}
              onClearFilters={() => {
                setFilterProb('');
                setFilterImpact('');
                setFilterScore('');
                setPage(1);
              }}
            />
          </div>

          {/* Itens por página + paginação à direita, na MESMA LINHA */}
          <div className="d-flex flex-column align-items-end ms-3">
            <Form.Group className="d-flex align-items-center mb-2">
              <Form.Label className="me-2 mb-0">Itens por página</Form.Label>
              <Form.Select
                size="sm"
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  setPage(1);
                  setPageSize(size);
                }}
                style={{ width: '80px' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Form.Select>
            </Form.Group>

            {renderPagination()}
          </div>
        </div>

        {/* tabela */}
        {/* <div className="list-shell" style={{ width: '100%', alignSelf: 'stretch' }}> */}
        <div className="risk-table-wrap">
          <Table bordered hover className="risk-table">
            <thead className="risk-thead-gradient">
              <tr>
                <th className="risk-col-narrow">Item</th>
                <th className="risk-col-wide">Risco e Fator de Risco</th>
                <th className="risk-col-medium">Probabilidade [1–5]</th>
                <th className="risk-col-medium">Impacto [1–5]</th>
                <th className="risk-col-medium">Pontuação do Risco</th>
                <th className="risk-col-wide">Plano de Ação</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={TOTAL_COLS} className="text-center">
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr className="risk-row-white">
                  <td colSpan={TOTAL_COLS} className="text-center">
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
                    <tr key={r.id} className={zebra(idx).replace('row', 'risk-row')}>
                      <td className="risk-col-narrow" title={r.risco_fator}>
                        <div className="risk-cell">{itemNumber(idx)}</div>
                      </td>
                      <td className="risk-col-wide" title={r.risco_fator}>
                        <div className="risk-cell">{r.risco_fator || '-'}</div>
                      </td>
                      <td className="text-center risk-col-medium">
                        <div className="risk-cell">{prob ?? '-'}</div>
                      </td>
                      <td className="text-center risk-col-medium">
                        <div className="risk-cell">{imp ?? '-'}</div>
                      </td>
                      <td
                        className="text-center risk-col-medium"
                        style={{ fontWeight: 600 }}
                      >
                        <div className="risk-cell">{score ?? '-'}</div>
                      </td>
                      <td className="risk-col-wide">
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
                          <div className="risk-cell">-</div>
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
        {/* </div> */}
      </div>
    </div>
  );
}

export default RankingRisco;
