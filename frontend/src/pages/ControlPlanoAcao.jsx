// src/pages/ControleAcoes.jsx
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
import PaginacaoRiscos from '../components/PaginacaoRiscos';
import ListaComplementos from '../components/ListaComplementos';
import TooltipInfo from '../components/TooltipInfo';
import '../estilos/matriz.css';

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
  const [complementos, setComplementos] = useState([
    { como: '', responsavel: '', prazo: '', status: '' },
  ]);

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
        params: { page_size: 9999 },
      });

      const results = Array.isArray(data) ? data : data.results || [];

      // Expande cada risco em várias linhas (1 por plano)
      const expanded = [];

      results.forEach((r) => {
        const planos = Array.isArray(r.planos)
          ? [...r.planos].sort((a, b) => (a.id > b.id ? 1 : -1))
          : [];

        const comoList = planos.map((p) => p.como ?? '');
        const respList = planos.map((p) => p.responsavel_execucao ?? '');
        const prazoList = planos.map((p) => p.prazo ?? '');
        const statusList = planos.map((p) => p.status ?? '');
        const planIds = planos.map((p) => p.id ?? null); // 🔹 pega os IDs

        expanded.push({
          id: r.id,
          risco_id: r.id,
          matriz_filial: r.matriz_filial ?? '',
          risco_fator: r.risco_fator ?? '',
          setor_avaliacao: r.setor ?? '',
          processo: r.processo ?? '',
          plano_acao_adicional: r.resposta_risco ?? '',
          como: comoList.join('; '),
          funcionario: respList.join('; '),
          prazo: prazoList.join('; '),
          status: statusList.join('; '),
          planos_ids: planIds.join(';'), // 🔹 salva lista de IDs separados por ;
        });
      });

      setRows(expanded);
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

  // ===== Modal Complemento revisado =====
  const openModal = async (mode, row) => {
    setModalMode(mode);
    setActiveId(row.risco_id);

    // 🔹 Divide o texto do plano de ação adicional em ações separadas
    const acoes = (row.plano_acao_adicional || '')
      .split(/[\n;,]+/)
      .map((a) => a.trim())
      .filter((a) => a !== '');

    // 🔹 Quebra os demais campos paralelos (mantendo índice por posição)
    const comoList = (row.como || '').split(/[\n;,]+/).map((a) => a.trim());
    const respList = (row.funcionario || '').split(/[\n;,]+/).map((a) => a.trim());
    const prazoList = (row.prazo || '').split(/[\n;,]+/).map((a) => a.trim());
    const statusList = (row.status || '').split(/[\n;,]+/).map((a) => a.trim());

    // 🔹 IDs (mantendo posições fixas)
    const idsList = (row.planos_ids || '').split(/[\n;,]+/).map((a) => a.trim() || null);
    // Se houver menos IDs que ações, completa com null
    while (idsList.length < acoes.length) idsList.push(null);

    // 🔹 Normaliza todos os arrays para o mesmo comprimento das ações
    const len = acoes.length;
    const norm = (arr) => Array.from({ length: len }, (_, i) => arr[i] || '');

    const todasAsAcoes = acoes.map((acao, i) => ({
      id: idsList[i] || null,
      acao,
      como: norm(comoList)[i],
      responsavel: norm(respList)[i],
      prazo: norm(prazoList)[i],
      status: norm(statusList)[i],
    }));

    // 🔹 Identifica quais têm conteúdo e quais estão vazias
    const preenchidas = todasAsAcoes.filter(
      (c) => c.como.trim() || c.responsavel.trim() || c.prazo.trim() || c.status.trim()
    );
    const vazias = todasAsAcoes.filter(
      (c) =>
        !c.como.trim() && !c.responsavel.trim() && !c.prazo.trim() && !c.status.trim()
    );

    let complementosIniciais = [];

    if (mode === 'edit') {
      // 🟦 Editar → usa as preenchidas (mantendo IDs e posições corretas)
      complementosIniciais =
        preenchidas.length > 0
          ? preenchidas.map((c, i) => ({
              id: c.id || null,
              acao: c.acao || `Ação ${i + 1}`,
              como: c.como || '',
              responsavel: c.responsavel || '',
              prazo: c.prazo || '',
              status: c.status || 'nao_iniciado',
            }))
          : [
              {
                acao: 'Ação 1',
                como: '',
                responsavel: '',
                prazo: '',
                status: 'nao_iniciado',
              },
            ];
    } else {
      // 🟩 Incluir → exibe apenas as ações que ainda não têm complemento
      complementosIniciais =
        vazias.length > 0
          ? vazias.map((c, i) => ({
              id: null, // novas, sem ID
              acao: c.acao || `Ação ${i + 1}`,
              como: '',
              responsavel: '',
              prazo: '',
              status: 'nao_iniciado',
            }))
          : [
              {
                acao: 'Ação 1',
                como: '',
                responsavel: '',
                prazo: '',
                status: 'nao_iniciado',
              },
            ];
    }

    // 🔹 Salva estado final e abre modal
    setComplementos(complementosIniciais);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveId(null);
  };

  function traduzStatusParaFront(str) {
    if (!str) return '-';
    const mapa = {
      nao_iniciado: 'Não iniciado',
      andamento: 'Em andamento',
      concluido: 'Concluído',
      atrasado: 'Atrasado',
    };
    return mapa[str] || str;
  }

  // ===== Funções auxiliares =====
  const createComplemento = async () => {
    const created = [];

    for (const c of complementos) {
      // Ignora linhas vazias
      if (!c.como && !c.responsavel && !c.prazo && !c.status) continue;

      const { data } = await Axios.post(`/actionplan/`, {
        risco: activeId,
        como: c.como,
        responsavel_execucao: c.responsavel,
        prazo: c.prazo || null,
        status: c.status,
      });
      created.push(data);
    }

    return created;
  };

  const updateComplemento = async () => {
    const updated = [];

    for (const c of complementos) {
      if (c.id) {
        // 🔹 Atualiza existente
        const { data } = await Axios.patch(`/actionplan/${c.id}/`, {
          como: c.como,
          responsavel_execucao: c.responsavel,
          prazo: c.prazo || null,
          status: c.status,
        });
        updated.push(data);
      } else {
        // 🔹 Cria novo (somente se for ação nova)
        const { data } = await Axios.post(`/actionplan/`, {
          risco: activeId,
          como: c.como,
          responsavel_execucao: c.responsavel,
          prazo: c.prazo || null,
          status: c.status,
        });
        updated.push(data);
      }
    }

    return updated;
  };

  // ===== Salvar do Modal =====
  const saveFromModal = async () => {
    const filled = complementos.filter(
      (c) =>
        (c.como || '').trim() ||
        (c.responsavel || '').trim() ||
        (c.prazo || '').trim() ||
        (c.status || '').trim()
    );

    if (filled.length === 0) {
      showMsg('warning', 'Adicione pelo menos um complemento antes de salvar.');
      return;
    }

    try {
      if (modalMode === 'edit' && filled.some((c) => c.id)) {
        await updateComplemento();
        showMsg('success', 'Complementos atualizados com sucesso.');
      } else {
        await createComplemento();
        showMsg('success', 'Complementos incluídos com sucesso.');
      }

      await loadRows();
      closeModal();
    } catch (e) {
      console.error('Erro ao salvar complementos:', e);
      showMsg('danger', 'Falha ao salvar complementos.');
    }
  };

  // ===== Estado para confirmação de exclusão =====
  // ===== Exclusão por item =====
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOptions, setDeleteOptions] = useState([]); // [{id, rotulo, resumo}]
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [deleteRowRef, setDeleteRowRef] = useState(null);

  const openDeletePicker = (row) => {
    const { acoes, comoList, respList, prazoList, statusList, idsList } =
      splitRowArrays(row);

    // Deletáveis = só itens que têm ID (já existem no backend) E possuem algum conteúdo (não são “base” vazia)
    const deletaveis = acoes
      .map((acao, i) => ({
        id: idsList[i] || null,
        acao,
        como: (comoList[i] || '').trim(),
        responsavel: (respList[i] || '').trim(),
        prazo: (prazoList[i] || '').trim(),
        status: (statusList[i] || '').trim(),
        idx: i,
      }))
      .filter((c) => c.id && (c.como || c.responsavel || c.prazo || c.status));

    if (deletaveis.length === 0) {
      showMsg('warning', 'Não há complementos para excluir nesta linha.');
      return;
    }

    const options = deletaveis.map((c, k) => ({
      id: c.id,
      rotulo: `Ação ${c.idx + 1}: ${c.acao}`,
      resumo: [
        c.como && `Como: ${c.como}`,
        c.responsavel && `Resp.: ${c.responsavel}`,
        c.prazo && `Prazo: ${c.prazo}`,
        c.status && `Status: ${traduzStatusParaFront(c.status)}`,
      ]
        .filter(Boolean)
        .join(' • '),
    }));

    setDeleteOptions(options);
    setSelectedDeleteId(options[0]?.id || null);
    setDeleteRowRef(row);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteOptions([]);
    setSelectedDeleteId(null);
    setDeleteRowRef(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!selectedDeleteId) return;
    try {
      // Backend limpa o complemento (não apaga ação-base)
      await Axios.patch(`/actionplan/${selectedDeleteId}/limpar/`);
      await loadRows();
      showMsg('success', 'Complemento removido com sucesso.');
    } catch (err) {
      console.error('Erro ao limpar complemento:', err);
      showMsg('danger', 'Erro ao remover o complemento.');
    } finally {
      closeDeleteModal();
    }
  };

  const splitRowArrays = (row) => {
    const acoes = (row.plano_acao_adicional || '')
      .split(/[\n;,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const comoList = (row.como || '').split(/[\n;,]+/).map((s) => s.trim());
    const respList = (row.funcionario || '').split(/[\n;,]+/).map((s) => s.trim());
    const prazoList = (row.prazo || '').split(/[\n;,]+/).map((s) => s.trim());
    const statusList = (row.status || '').split(/[\n;,]+/).map((s) => s.trim());
    const idsList = (row.planos_ids || '')
      .split(/[\n;,]+/)
      .map((s) => s.trim())
      .filter((v) => v !== '');

    // normaliza tamanhos sem quebrar a ordem (se faltar índice, fica vazio)
    const len = acoes.length;
    const norm = (arr) => Array.from({ length: len }, (_, i) => arr[i] || '');
    return {
      acoes,
      comoList: norm(comoList),
      respList: norm(respList),
      prazoList: norm(prazoList),
      statusList: norm(statusList),
      idsList: norm(idsList),
    };
  };

  // ===== Render =====
  const renderRow = (r, idx) => {
    const hasPlan = !!r.actionplan_id;

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

    console.log('Complementos atuais:', complementos);

    return (
      <tr
        key={`${r.id}-${r.actionplan_id || 'new'}`}
        className={idx % 2 === 0 ? 'row-white' : 'row-blue'}
      >
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
          {r.plano_acao_adicional ? (
            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
              {r.plano_acao_adicional
                .split(/[\n;,]+/) // divide por quebra de linha, ponto e vírgula ou vírgula
                .filter((acao) => acao.trim() !== '')
                .map((acao, i) => (
                  <li
                    key={i}
                    style={{
                      whiteSpace: 'normal',
                      lineHeight: '1.4',
                      listStyleType: 'disc',
                      color: '#071744', // cor institucional do Camaleão
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

        <td>
          {(() => {
            const { acoes, comoList } = splitRowArrays(r);
            return acoes.length ? (
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                {acoes.map((_, i) => (
                  <li
                    key={i}
                    style={{
                      whiteSpace: 'normal',
                      lineHeight: '1.4',
                      color: '#071744',
                      fontSize: '0.95rem',
                    }}
                  >
                    {comoList[i] ? comoList[i] : '-'}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cell-clip">-</div>
            );
          })()}
        </td>

        <td>
          {(() => {
            const { acoes, respList } = splitRowArrays(r);
            return acoes.length ? (
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                {acoes.map((_, i) => (
                  <li
                    key={i}
                    style={{
                      whiteSpace: 'normal',
                      lineHeight: '1.4',
                      color: '#071744',
                      fontSize: '0.95rem',
                    }}
                  >
                    {respList[i] ? respList[i] : '-'}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cell-clip">-</div>
            );
          })()}
        </td>

        <td>
          {(() => {
            const { acoes, prazoList } = splitRowArrays(r);
            return acoes.length ? (
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                {acoes.map((_, i) => (
                  <li
                    key={i}
                    style={{
                      whiteSpace: 'normal',
                      lineHeight: '1.4',
                      color: '#071744',
                      fontSize: '0.95rem',
                    }}
                  >
                    {prazoList[i] ? formatDate(prazoList[i]) : '-'}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cell-clip">-</div>
            );
          })()}
        </td>

        <td>
          {(() => {
            const { acoes, statusList } = splitRowArrays(r);
            const toFront = (s) => traduzStatusParaFront(s) || '-';
            return acoes.length ? (
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                {acoes.map((_, i) => (
                  <li
                    key={i}
                    style={{
                      whiteSpace: 'normal',
                      lineHeight: '1.4',
                      color: '#071744',
                      fontSize: '0.95rem',
                    }}
                  >
                    {statusList[i] ? toFront(statusList[i]) : '-'}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cell-clip">-</div>
            );
          })()}
        </td>

        <td className="actions-cell">
          <Dropdown align="end">
            <Dropdown.Toggle size="sm" variant="outline-secondary">
              Ações
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {(() => {
                const { acoes, comoList, respList, prazoList, statusList, idsList } =
                  splitRowArrays(r);

                const todas = acoes.map((acao, i) => ({
                  acao,
                  como: (comoList[i] || '').trim(),
                  responsavel: (respList[i] || '').trim(),
                  prazo: (prazoList[i] || '').trim(),
                  status: (statusList[i] || '').trim(),
                  id: idsList[i] || null,
                }));

                const preenchidas = todas.filter(
                  (c) => c.como || c.responsavel || c.prazo || c.status
                );
                const vazias = todas.filter(
                  (c) => !c.como && !c.responsavel && !c.prazo && !c.status
                );

                const temAcoesSemComplemento = vazias.length > 0;
                const label = temAcoesSemComplemento
                  ? 'Incluir Complemento'
                  : 'Editar Complemento';
                const mode = temAcoesSemComplemento ? 'add' : 'edit';

                const deletaveis = todas.filter(
                  (c) => c.id && (c.como || c.responsavel || c.prazo || c.status)
                );

                return (
                  <>
                    <Dropdown.Item onClick={() => openModal(mode, r)}>
                      {label}
                    </Dropdown.Item>

                    {deletaveis.length > 0 && (
                      <Dropdown.Item
                        onClick={() => openDeletePicker(r)}
                        className="text-danger"
                      >
                        Excluir Complemento…
                      </Dropdown.Item>
                    )}
                  </>
                );
              })()}
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

        <h2 className="page-title">Controle de Ações</h2>

        <div className="w-100 mb-4">
          <PaginacaoRiscos />
        </div>

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
                  <th>
                    Funcionário Responsável{' '}
                    <TooltipInfo message="Funcionário responsável pela execução." />
                  </th>
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

          <div className="list-footer">
            <div className="text-muted">
              <strong>Total:</strong> {totalItems} • Página {page} de {totalPages}
            </div>
            {renderPagination()}
          </div>
        </div>
      </div>

      {/* Modal Complemento */}
      <Modal
        show={showModal}
        onHide={closeModal}
        centered
        size="lg"
        scrollable
        contentClassName="modal-style"
      >
        <Modal.Header closeButton style={{ background: '#071744' }}>
          <Modal.Title style={{ color: '#fff' }}>
            {modalMode === 'add' ? 'Incluir Complemento' : 'Editar Complemento'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          style={{
            background: '#0b2a5b',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          <div className="container-fluid">
            <div className="row g-3">
              <div className="col-12">
                <Form.Label className="text-white fw-bold">
                  Complementos do Plano de Ação
                </Form.Label>

                {/* === Lista de complementos existentes === */}
                <ListaComplementos
                  complementos={complementos}
                  setComplementos={setComplementos}
                  readOnlyAdd={true} // 🔹 evita exibir os botões internos
                />
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer
          style={{
            background: '#0b2a5b',
            borderTop: 'none',
          }}
        >
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={saveFromModal}>
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal} centered>
        <Modal.Header closeButton style={{ background: '#071744' }}>
          <Modal.Title style={{ color: '#fff' }}>Excluir complemento</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ background: '#0b2a5b', color: '#fff' }}>
          <p className="mb-2">
            Selecione qual complemento você deseja remover (a ação-base da Avaliação de
            Riscos não será alterada):
          </p>

          <div className="list-group">
            {deleteOptions.map((opt) => (
              <label
                key={opt.id}
                className="list-group-item"
                style={{ background: '#0e386f', color: '#fff', borderColor: '#0b2a5b' }}
              >
                <input
                  type="radio"
                  name="delOpt"
                  className="form-check-input me-2"
                  checked={selectedDeleteId === opt.id}
                  onChange={() => setSelectedDeleteId(opt.id)}
                />
                <div>
                  <div className="fw-semibold">{opt.rotulo}</div>
                  {opt.resumo && <div className="small text-light">{opt.resumo}</div>}
                </div>
              </label>
            ))}
          </div>
        </Modal.Body>

        <Modal.Footer style={{ background: '#0b2a5b' }}>
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirmed}>
            Excluir
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ControleAcoes;
