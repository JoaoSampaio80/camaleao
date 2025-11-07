import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Button,
  ProgressBar,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

import AxiosInstance from '../components/Axios';
import GraficoDistribuicaoRiscos from '../components/dashboard/GraficoDistribuicaoRiscos';
import GraficoHeatmapRiscos from '../components/dashboard/GraficoHeatmapRiscos';
import GraficoRiscosPorSetor from '../components/dashboard/GraficoRiscosPorSetor';
import TabelaTopRiscos from '../components/dashboard/TabelaTopRiscos';
import GraficoStatusPlanoAcao from '../components/dashboard/GraficoStatusPlanoAcao';
import GraficoExecucaoPlanejado from '../components/dashboard/GraficoExecucaoPlanejado';
import Documentos_A_Vencer from '../components/dashboard/Documentos_A_Vencer';
import GraficoIncidentesTimeline from '../components/dashboard/GraficoIncidentesTimeline';
import TabelaUltimosAcessos from '../components/dashboard/TabelaUltimosAcessos';
import GraficoRankingUsuarios from '../components/dashboard/GraficoRankingUsuarios';
import IndiceMaturidade from '../components/dashboard/IndiceMaturidade';
import '../estilos/dashboard.css';
// ====== Cores ======
const COLORS = {
  primaryA: '#003366',
  primaryB: '#0373ff',
  darkTitle: '#071744',
  grayBg: '#f5f5f5',
  ok: '#2e7d32',
  warn: '#ed6c02',
  danger: '#c62828',
  info: '#0288d1',
  mid: '#6c757d',
};
const PIE_COLORS = ['#ed6c02', '#2e7d32', '#c62828', '#0288d1'];

// ====== Mock ======
const fallback = {
  kpis: {
    conformidade: 76,
    riscosAtivos: 28,
    acoesAtrasadas: 5,
    docsVencendo30d: 7,
    alertas: 9,
  },
  riscosDistribuicao: [
    { name: 'Alto', value: 8 },
    { name: 'Baixo', value: 6 },
    { name: 'Crítico', value: 4 },
    { name: 'Médio', value: 10 },
  ],
  riscosPorSetor: [
    { setor: 'TI', quantidade: 9 },
    { setor: 'RH', quantidade: 6 },
    { setor: 'Financeiro', quantidade: 7 },
    { setor: 'Comercial', quantidade: 3 },
    { setor: 'Jurídico', quantidade: 3 },
  ],
  topRiscos: [
    {
      id: 101,
      titulo: 'Exposição de credenciais',
      score: 25,
      setor: 'TI',
      owner: 'Infra',
    },
    {
      id: 102,
      titulo: 'Backups sem criptografia',
      score: 22,
      setor: 'TI',
      owner: 'DevOps',
    },
    {
      id: 103,
      titulo: 'Planilhas com dados pessoais',
      score: 20,
      setor: 'Financeiro',
      owner: 'Gestor Fin.',
    },
    {
      id: 104,
      titulo: 'Acesso indevido a dossiês',
      score: 18,
      setor: 'RH',
      owner: 'Coord. RH',
    },
    {
      id: 105,
      titulo: 'Envio de e-mail sem CCO',
      score: 16,
      setor: 'Comercial',
      owner: 'Vendas',
    },
  ],
  acoesStatus: [
    { name: 'Abertas', value: 7 },
    { name: 'Em andamento', value: 12 },
    { name: 'Concluídas', value: 18 },
    { name: 'Atrasadas', value: 5 },
  ],
  acoesTimeline: [
    { mes: 'Mai', planejadas: 10, concluidas: 8 },
    { mes: 'Jun', planejadas: 12, concluidas: 9 },
    { mes: 'Jul', planejadas: 14, concluidas: 12 },
    { mes: 'Ago', planejadas: 11, concluidas: 10 },
    { mes: 'Set', planejadas: 13, concluidas: 11 },
  ],
  documentosVencimentos: [
    { titulo: 'Política de Retenção', categoria: 'Políticas', venceEm: '15 dias' },
    { titulo: 'RO — Marketing', categoria: 'Registros RO', venceEm: '22 dias' },
    { titulo: 'Contrato Operador A', categoria: 'Contratos', venceEm: '27 dias' },
  ],
  incidentesTimeline: [
    { mes: 'Mai', qtd: 2 },
    { mes: 'Jun', qtd: 1 },
    { mes: 'Jul', qtd: 3 },
    { mes: 'Ago', qtd: 2 },
    { mes: 'Set', qtd: 4 },
  ],
  loginsRecentes: [
    { usuario: 'joao@empresa.com', quando: 'há 3h', setor: 'TI' },
    { usuario: 'ana@empresa.com', quando: 'há 5h', setor: 'RH' },
    { usuario: 'carlos@empresa.com', quando: 'ontem', setor: 'Financeiro' },
  ],
  rankingUsuarios: [
    { nome: 'joao@empresa.com', acessos: 28 },
    { nome: 'ana@empresa.com', acessos: 22 },
    { nome: 'bruno@empresa.com', acessos: 17 },
    { nome: 'carlos@empresa.com', acessos: 14 },
    { nome: 'dpo@empresa.com', acessos: 9 },
  ],
};

function calcIndiceLocal(acoesStatus = []) {
  const total = Array.isArray(acoesStatus)
    ? acoesStatus.reduce((a, x) => a + (x?.value || 0), 0)
    : 0;
  const concluidas = Array.isArray(acoesStatus)
    ? acoesStatus.find((x) => x?.name === 'Concluídas')?.value || 0
    : 0;
  const percentAcoes = total ? Math.round((concluidas / total) * 100) : 0;
  // sem checklist no front, mantém 0 para percentChecklist e calcula índice só pelas ações (peso 40%)
  const indice = Math.round(0 * 0.6 + percentAcoes * 0.4);
  return { indice, percentAcoes, percentChecklist: 0 };
}

// ====== Componentes ======
const SectionHeader = ({ title }) => (
  <h5 style={{ color: COLORS.darkTitle, fontWeight: 700, marginBottom: '0.5rem' }}>
    {title}
  </h5>
);

const KpiCard = ({ title, value, variant = 'primary' }) => {
  const bg =
    variant === 'success'
      ? COLORS.ok
      : variant === 'warning'
        ? COLORS.warn
        : variant === 'danger'
          ? COLORS.danger
          : variant === 'info'
            ? COLORS.info
            : COLORS.primaryB;

  return (
    <Card
      className="mb-3 shadow-sm text-center"
      style={{ border: 'none', borderRadius: 16 }}
    >
      <Card.Body
        className="d-flex flex-column justify-content-center align-items-center"
        style={{
          background: `linear-gradient(135deg, ${COLORS.primaryA}10, ${bg}20)`,
          borderRadius: 16,
          minHeight: 100,
        }}
      >
        <div style={{ color: COLORS.mid, fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ color: COLORS.darkTitle, fontWeight: 800, fontSize: 28 }}>
          {value}
        </div>
      </Card.Body>
    </Card>
  );
};

// ====== Página ======
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [kpis, setKpis] = useState(fallback.kpis);
  const [riscosDist, setRiscosDist] = useState(fallback.riscosDistribuicao);
  const [riscosSetor, setRiscosSetor] = useState(fallback.riscosPorSetor);
  const [topRiscos, setTopRiscos] = useState(fallback.topRiscos);
  const [acoesStatus, setAcoesStatus] = useState(fallback.acoesStatus);
  const [acoesTimeline, setAcoesTimeline] = useState(fallback.acoesTimeline);
  const [docsVenc, setDocsVenc] = useState(fallback.documentosVencimentos);
  const [incidentesTimeline, setincidentesTimeline] = useState(
    fallback.incidentesTimeline
  );
  const [logins, setLogins] = useState(fallback.loginsRecentes);
  const [ranking, setRanking] = useState(fallback.rankingUsuarios);

  const [indiceMaturidade, setIndiceMaturidade] = useState({
    indice: 0,
    percentAcoes: 0,
    percentChecklist: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    console.log('🚀 Iniciando fetchDashboard...');

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setErro('');

        const { data } = await AxiosInstance.get('/dashboard/');
        console.log('📊 Dados recebidos do backend:', data);

        // Usa fallback seguro com operador ?? para valores nulos/indefinidos
        setKpis(data.kpis ?? fallback.kpis ?? {});
        setRiscosDist(data.riscosDistribuicao ?? fallback.riscosDistribuicao ?? []);
        setRiscosSetor(data.riscosPorSetor ?? fallback.riscosPorSetor ?? []);
        setTopRiscos(data.topRiscos ?? fallback.topRiscos ?? []);
        setAcoesStatus(data.acoesStatus ?? fallback.acoesStatus ?? []);
        setAcoesTimeline(data.acoesTimeline ?? fallback.acoesTimeline ?? []);
        setDocsVenc(data.documentosVencimentos ?? fallback.documentosVencimentos ?? []);
        setincidentesTimeline(
          data.incidentesTimeline ?? fallback.incidentesTimeline ?? []
        );
        setLogins(data.loginsRecentes ?? fallback.loginsRecentes ?? []);
        setRanking(data.rankingUsuarios ?? fallback.rankingUsuarios ?? []);
        if (data.indiceMaturidade) {
          setIndiceMaturidade({
            indice: Number(data.indiceMaturidade.indice) || 0,
            percentAcoes: Number(data.indiceMaturidade.percentAcoes) || 0,
            percentChecklist: Number(data.indiceMaturidade.percentChecklist) || 0,
          });
        } else {
          // fallback seguro se API antiga não enviar o campo
          setIndiceMaturidade({ indice: 0, percentAcoes: 0, percentChecklist: 0 });
        }
      } catch (err) {
        console.error('❌ Erro ao carregar dashboard:', err);
        setErro('Não foi possível carregar os dados do dashboard.');

        // Mantém os dados de fallback para evitar quebra na renderização
        setKpis(fallback.kpis ?? {});
        setRiscosDist(fallback.riscosDistribuicao ?? []);
        setRiscosSetor(fallback.riscosPorSetor ?? []);
        setTopRiscos(fallback.topRiscos ?? []);
        setAcoesStatus(fallback.acoesStatus ?? []);
        setAcoesTimeline(fallback.acoesTimeline ?? []);
        setDocsVenc(fallback.documentosVencimentos ?? []);
        setincidentesTimeline(fallback.incidentesTimeline ?? []);
        console.log('📋 Logins recebidos:', data.loginsRecentes);
        setLogins(fallback.loginsRecentes ?? []);
        setRanking(fallback.rankingUsuarios ?? []);
        setIndiceMaturidade({
          indice: 0,
          percentAcoes: 0,
          percentChecklist: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  {
    erro && <Alert variant="danger">{erro}</Alert>;
  }

  return (
    <div className="d-flex" style={{ width: '100vw', overflowX: 'hidden' }}>
      <Sidebar />
      <main
        className="dashboard-main"
        style={{
          background: 'linear-gradient(to right, #0373ff, #E8F5E9)',
          width: '100%',
        }}
      >
        <Container fluid className="py-3 px-4" style={{ maxWidth: '100%' }}>
          <h2 className="dashboard-title">Dashboard de Conformidade LGPD</h2>
          {console.log('📄 docsVenc', docsVenc)}

          {/* ==== KPI ==== */}
          <Row className="g-3 justify-content-center">
            {[
              { titulo: 'Conformidade', valor: `${kpis.conformidade}%`, cor: '#c9ff00' },
              { titulo: 'Riscos Mapeados', valor: kpis.riscosMapeados, cor: '#ff6b35' },
              { titulo: 'Ações Atrasadas', valor: kpis.acoesAtrasadas, cor: '#f72585' },
              {
                titulo: 'Docs vencendo (30d)',
                valor: kpis.docsVencendo30d,
                cor: '#fbff12',
              },
              { titulo: 'Alertas', valor: kpis.alertas, cor: '#8a2be2' },
            ].map((item, idx) => (
              <Col
                key={idx}
                xs={12}
                sm={6}
                md={4}
                lg={2}
                className="d-flex justify-content-center"
              >
                <Card
                  className="text-center shadow-sm w-100"
                  style={{
                    // border: `3px solid ${item.cor}`,
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, #E3F2FD, #1789FC)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    height: '90px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '180px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <Card.Body className="p-0">
                    <div style={{ color: '#555', fontSize: 13, fontWeight: 600 }}>
                      {item.titulo}
                    </div>
                    <div style={{ color: '#071744', fontWeight: 800, fontSize: 28 }}>
                      {item.valor}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* ==== Distribuição e Heatmap ==== */}
          <Row className="mt-3 align-items-stretch">
            {/* ==== Distribuição de Riscos ==== */}
            <Col md={6} className="d-flex">
              <Card
                className="shadow-sm flex-fill"
                style={{
                  border: 'none',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #E3F2FD, #1789FC)', // azul suave
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Card.Body
                  style={{
                    borderRadius: 20,
                    padding: '1.2rem 1.5rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h5
                    style={{
                      color: '#071744',
                      fontWeight: 700,
                      marginBottom: '0.8rem',
                    }}
                  >
                    Distribuição de Riscos
                  </h5>
                  <div style={{ flex: 1 }}>
                    <GraficoDistribuicaoRiscos data={riscosDist} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* ==== Heatmap de Riscos ==== */}
            <Col md={6} className="d-flex">
              <Card
                className="shadow-sm flex-fill"
                style={{
                  border: 'none',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #E3F2FD, #52DEE5)', // cinza-azulado
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Card.Body
                  style={{
                    borderRadius: 20,
                    padding: '1.2rem 1.5rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h5
                    style={{
                      color: '#071744',
                      fontWeight: 700,
                      marginBottom: '0.8rem',
                    }}
                  >
                    Heatmap de Riscos
                  </h5>
                  <div style={{ flex: 1 }}>
                    <GraficoHeatmapRiscos />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ==== Riscos por Setor ==== */}
          <Row className="mt-3">
            <Col>
              <GraficoRiscosPorSetor data={riscosSetor} />
            </Col>
          </Row>

          {/* ==== Top 5 Riscos ==== */}
          <Row className="mt-3">
            <Col>
              <TabelaTopRiscos data={topRiscos} />
            </Col>
          </Row>

          {/* ==== Status e Execução ==== */}
          <Row className="mt-3">
            <Col md={4}>
              <GraficoStatusPlanoAcao data={acoesStatus} />
            </Col>

            <Col md={8}>
              <GraficoExecucaoPlanejado data={acoesTimeline} />
            </Col>
          </Row>

          {/* ==== Próximas Revisões ==== */}
          <Row className="mt-3">
            <Col>
              <Documentos_A_Vencer data={docsVenc} />
            </Col>
          </Row>

          {/* ==== Incidentes ==== */}
          <Row className="mt-3">
            <Col>
              <GraficoIncidentesTimeline data={incidentesTimeline} />
            </Col>
          </Row>

          {/* ==== Últimos Acessos e Ranking ==== */}
          <Row className="mt-3">
            <Col md={6}>
              <TabelaUltimosAcessos data={logins} />
            </Col>

            <Col md={6}>
              <GraficoRankingUsuarios data={ranking} />
            </Col>
          </Row>

          {/* ==== Índice de Maturidade ==== */}
          <Row className="mt-3 mb-5">
            <Col>
              <IndiceMaturidade
                indice={indiceMaturidade.indice}
                percentAcoes={indiceMaturidade.percentAcoes}
              />
            </Col>
          </Row>

          {loading && (
            <div className="d-flex align-items-center gap-2 mt-3">
              <Spinner animation="border" size="sm" />
              <span>Carregando dados...</span>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
