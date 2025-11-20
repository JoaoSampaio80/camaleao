import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import { Table, Dropdown, Form, Pagination } from 'react-bootstrap';

function Monitoramento() {
  const [tab, setTab] = useState('logins'); // logins | acoes
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const endpoint =
        tab === 'logins'
          ? `/audit/logins/?page=${page}&page_size=${pageSize}`
          : `/audit/acoes/?page=${page}&page_size=${pageSize}`;

      const resp = await AxiosInstance.get(endpoint);

      setRows(resp.data.results || resp.data);
      setCount(resp.data.count || resp.data.length);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [tab, page, pageSize]);

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
    <div className="d-flex">
      <Sidebar />

      <main className="p-4" style={{ flex: 1 }}>
        <h2 className="mb-4">Monitoramento</h2>

        {/* ABAS */}
        <div className="d-flex gap-3 mb-4">
          <button
            className={`btn btn-${tab === 'logins' ? 'primary' : 'outline-primary'}`}
            onClick={() => {
              setPage(1);
              setTab('logins');
            }}
          >
            Atividades de Login
          </button>

          <button
            className={`btn btn-${tab === 'acoes' ? 'primary' : 'outline-primary'}`}
            onClick={() => {
              setPage(1);
              setTab('acoes');
            }}
          >
            Ações Executadas
          </button>
        </div>

        {/* Barra superior: itens por página */}
        <div className="d-flex w-100 align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0">Itens por página</Form.Label>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: 110 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>
        </div>

        {/* =============== TABELA =============== */}
        <div className="table-wrapper-custom">
          <Table
            bordered
            hover
            responsive={false}
            className="custom-table"
            style={{ width: '100%', minWidth: 1200 }}
          >
            <thead className="thead-gradient">
              {tab === 'logins' ? (
                <tr>
                  <th>E-mail</th>
                  <th>IP</th>
                  <th>User-Agent</th>
                  <th>Data / Hora</th>
                </tr>
              ) : (
                <tr>
                  <th>E-mail</th>
                  <th>Módulo</th>
                  <th>Operação</th>
                  <th>ID</th>
                  <th>Resultado</th>
                  <th>IP</th>
                  <th>Data / Hora</th>
                </tr>
              )}
            </thead>

            <tbody>
              {loading && (
                <tr className="row-white">
                  <td
                    colSpan={tab === 'logins' ? 4 : 7}
                    className="text-center text-muted"
                  >
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr className="row-white">
                  <td
                    colSpan={tab === 'logins' ? 4 : 7}
                    className="text-center text-muted"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r, idx) =>
                  tab === 'logins' ? (
                    <tr key={r.id} className={idx % 2 === 0 ? 'row-white' : 'row-blue'}>
                      <td>{r.email}</td>
                      <td>{r.ip_address}</td>
                      <td style={{ maxWidth: 400 }}>{r.user_agent}</td>
                      <td>
                        {new Date(r.data_login || r.timestamp).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className={idx % 2 === 0 ? 'row-white' : 'row-blue'}>
                      <td>{r.email}</td>
                      <td>{r.modulo}</td>
                      <td>{r.operacao}</td>
                      <td>{r.registro_id || '-'}</td>
                      <td>{r.resultado}</td>
                      <td>{r.ip}</td>
                      <td>{new Date(r.timestamp).toLocaleString('pt-BR')}</td>
                    </tr>
                  )
                )}
            </tbody>
          </Table>

          {/* Rodapé da lista */}
          <div className="list-footer mt-3">
            <div className="text-muted">
              <strong>Total:</strong> {count} • Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Monitoramento;
