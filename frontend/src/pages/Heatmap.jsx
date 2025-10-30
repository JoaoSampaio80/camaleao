import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';
import PaginacaoRiscos from '../components/PaginacaoRiscos';

export default function Heatmap() {
  const [matrix, setMatrix] = useState(() => buildEmptyMatrix());
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const [riscos, setRiscos] = useState([]);
  const tooltipRef = React.useRef(null);

  function buildEmptyMatrix() {
    const m = [];
    for (let impacto = 1; impacto <= 5; impacto++) {
      const row = [];
      for (let prob = 1; prob <= 5; prob++) {
        row.push({
          impacto,
          probabilidade: prob,
          count: 0,
          scoreSum: 0,
          riscosIds: [],
        });
      }
      m.push(row);
    }
    return m;
  }

  const aggregateToMatrix = useCallback((riscosList) => {
    const draft = buildEmptyMatrix();
    riscosList.forEach((r) => {
      const p =
        typeof r.probabilidade === 'object'
          ? Number(r.probabilidade.value)
          : Number(r.probabilidade);
      const i =
        typeof r.impacto === 'object' ? Number(r.impacto.value) : Number(r.impacto);
      if (p >= 1 && p <= 5 && i >= 1 && i <= 5 && !Number.isNaN(p) && !Number.isNaN(i)) {
        const rowIndex = i - 1;
        const colIndex = p - 1;
        draft[rowIndex][colIndex].count += 1;
        draft[rowIndex][colIndex].scoreSum += p * i;
        if (r.id !== undefined && r.id !== null) {
          draft[rowIndex][colIndex].riscosIds.push(r.id);
        }
      }
    });
    return draft;
  }, []);

  const loadRiscos = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await AxiosInstance.get('/riscos/ranking/');
      const allResults = Array.isArray(data) ? data : data?.results || [];

      setRiscos(allResults);

      const aggregated = aggregateToMatrix(allResults);
      setMatrix(aggregated);
    } catch (err) {
      console.error('Erro ao carregar riscos:', err);
      setErrorMsg('Não foi possível carregar todos os dados de risco.');
    } finally {
      setLoading(false);
    }
  }, [aggregateToMatrix]);

  useEffect(() => {
    loadRiscos();
  }, [loadRiscos]);

  const kpis = useMemo(() => {
    let totalRiscos = 0,
      riscoCritico = 0,
      riscoAlto = 0,
      riscoMedio = 0,
      riscoBaixo = 0;

    function classifyLevel(avgScore) {
      if (avgScore <= 6) return 'baixo';
      if (avgScore <= 12) return 'medio';
      if (avgScore < 20) return 'alto';
      return 'critico';
    }

    matrix.forEach((row) => {
      row.forEach((cell) => {
        if (cell.count > 0) {
          totalRiscos += cell.count;
          const avg = cell.scoreSum / cell.count;
          const level = classifyLevel(avg);
          if (level === 'critico') riscoCritico += cell.count;
          else if (level === 'alto') riscoAlto += cell.count;
          else if (level === 'medio') riscoMedio += cell.count;
          else riscoBaixo += cell.count;
        }
      });
    });

    return { totalRiscos, riscoCritico, riscoAlto, riscoMedio, riscoBaixo };
  }, [matrix]);

  const bandForScore = useCallback((s) => {
    const v = Number(s) || 0;
    if (v === 0) return { name: null };
    if (v <= 6) return { name: 'Baixo' };
    if (v <= 12) return { name: 'Médio' };
    if (v <= 16) return { name: 'Alto' };
    return { name: 'Crítico' };
  }, []);

  const flatData = useMemo(() => {
    return riscos
      .filter((r) => r && r.probabilidade && r.impacto)
      .map((r) => {
        const prob =
          typeof r.probabilidade === 'object'
            ? Number(r.probabilidade.value)
            : Number(r.probabilidade);
        const imp =
          typeof r.impacto === 'object' ? Number(r.impacto.value) : Number(r.impacto);

        const score = Number(r.pontuacao) || prob * imp;

        return {
          id: r.id,
          probabilidade: prob,
          impacto: imp,
          risco_fator: r.risco_fator || '',
          setor: r.setor || '',
          score,
          // 🔹 garante que a classificação sempre esteja presente, mesmo se backend mudar o nome
          level:
            r.classificacao ||
            r.nivel_risco ||
            r.nivel ||
            (score > 19
              ? 'Crítico'
              : score > 12
                ? 'Alto'
                : score > 6
                  ? 'Médio'
                  : 'Baixo'),
        };
      });
  }, [riscos]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // nada aberto → ignora
      if (!tooltip) return;

      // se clicou dentro do card → não fecha
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) return;

      // se clicou no mesmo ponto que gerou o tooltip → não fecha (onClick já trata)
      const pointGroup = e.target.closest('[data-risk-id]');
      if (pointGroup && Number(pointGroup.getAttribute('data-risk-id')) === tooltip.id) {
        return;
      }

      // caso contrário → fecha o tooltip
      setTooltip(null);
    };

    // adiciona listener global
    document.addEventListener('mousedown', handleClickOutside);

    // limpeza ao desmontar
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tooltip]);

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Sidebar />

      <main
        style={{
          flex: 1,
          minHeight: '100vh',
          padding: '1rem 1rem 4rem 1rem',
          marginTop: '56px',
          boxSizing: 'border-box',
        }}
      >
        {/* Cabeçalho da página */}
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {/* Bloco do título centralizado */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2
              className="page-title"
              style={{
                margin: 0,
                fontWeight: '700',
                color: '#071744',
              }}
            >
              Heatmap de Risco
            </h2>
          </div>

          {/* Indicador de carregamento */}
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: loading ? '#999' : '#16a34a',
              background: loading ? '#eee' : '#dcfce7',
              border: loading ? '1px solid #ddd' : '1px solid #86efac',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
            }}
          >
            {loading ? 'Carregando dados...' : 'Dados carregados'}
          </div>

          {/* Paginador e descrição mantidos abaixo */}
          <div className="w-100 mb-4">
            <PaginacaoRiscos />
          </div>
          <p style={{ fontSize: '0.9rem', color: '#4a5568', margin: 0 }}>
            Visualização consolidada de probabilidade × impacto. Cada ponto representa
            riscos reais cadastrados no sistema.
          </p>
        </header>

        {errorMsg && (
          <div
            style={{
              background: '#fdecea',
              border: '1px solid #f5c2c0',
              color: '#7a1c1a',
              fontSize: '0.9rem',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* KPIs */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <KpiCard
            label="Riscos mapeados"
            value={kpis.totalRiscos}
            bg="linear-gradient(135deg,#003366 0%,#005b96 100%)"
            textColor="#fff"
          />
          <KpiCard
            label="Crítico"
            value={kpis.riscoCritico}
            bg="#e74c3c"
            textColor="#fff"
          />
          <KpiCard label="Alto" value={kpis.riscoAlto} bg="#e67e22" textColor="#fff" />
          <KpiCard
            label="Médio"
            value={kpis.riscoMedio}
            bg="#f1c40f"
            textColor="#071744"
          />
          <KpiCard
            label="Baixo"
            value={kpis.riscoBaixo}
            bg="#2ecc71"
            textColor="#071744"
          />
        </section>

        {/* === CARD DO HEATMAP === */}
        <section
          style={{
            background: '#fff',
            borderRadius: '12px',
            boxShadow:
              '0 20px 40px -10px rgb(0 0 0 / 0.12), 0 4px 16px -4px rgb(0 0 0 / 0.06)',
            border: '1px solid #e2e8f0',
            padding: '1rem 1rem 1.5rem 1rem',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <p style={{ fontSize: '0.8rem', color: '#4a5568', margin: 0 }}>
              Distribuição dos riscos por probabilidade e impacto. Quanto mais à direita e
              mais acima, maior a severidade.
            </p>
          </div>

          {/* === HEATMAP === */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              position: 'relative',
            }}
          >
            {loading ? (
              <div style={{ color: '#071744', fontWeight: 600 }}>
                Carregando matriz de risco...
              </div>
            ) : (
              <>
                <svg
                  viewBox="0 0 800 450"
                  width="100%"
                  height="auto"
                  preserveAspectRatio="xMidYMid meet"
                  style={{
                    maxWidth: '1000px',
                    background: '#fff',
                    borderRadius: '12px',
                  }}
                >
                  <defs>
                    <linearGradient id="riskGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2ecc71" />
                      <stop offset="35%" stopColor="#f1c40f" />
                      <stop offset="65%" stopColor="#e67e22" />
                      <stop offset="100%" stopColor="#e74c3c" />
                    </linearGradient>
                  </defs>

                  {(() => {
                    const chartX = 140;
                    const chartY = 50;
                    const chartW = 550;
                    const chartH = 300;
                    const padding = 12;

                    // Escalas comprimidas para dar respiro nas bordas
                    const scaleX = (p) =>
                      chartX + ((p - 1) / 4) * (chartW - padding * 2) + padding;
                    const scaleY = (i) =>
                      chartY + ((5 - i) / 4) * (chartH - padding * 2) + padding;

                    // Agrupamento por coordenada
                    const grouped = {};
                    flatData.forEach((r) => {
                      const key = `${r.probabilidade}-${r.impacto}`;
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(r);
                    });

                    // Limites do gráfico (para evitar saída)
                    const chartBounds = {
                      minX: chartX + 8,
                      maxX: chartX + chartW - 8,
                      minY: chartY + 8,
                      maxY: chartY + chartH - 8,
                    };

                    const allPoints = [];

                    // 1️⃣ Inicializa pontos em grade compacta (mantém agrupamento no mesmo quadrante)
                    Object.entries(grouped).forEach(([key, risks]) => {
                      const [p, i] = key.split('-').map(Number);
                      const baseX = scaleX(p);
                      const baseY = scaleY(i);

                      // --- parâmetros básicos dos pontos ---
                      const dotR = 4; // mesmo raio visual
                      const gap = 1; // pequena folga para não sobrepor
                      const step = dotR * 2 + gap; // distância entre centros dos pontos

                      // --- calcula grade centrada ---
                      const cols = Math.ceil(Math.sqrt(risks.length));
                      const rows = Math.ceil(risks.length / cols);

                      risks.forEach((r, idx) => {
                        const c = idx % cols; // coluna atual
                        const rr = Math.floor(idx / cols); // linha atual

                        // centraliza grade no ponto base (baseX, baseY)
                        const offsetX = (c - (cols - 1) / 2) * step;
                        const offsetY = (rr - (rows - 1) / 2) * step;

                        const px = baseX + offsetX;
                        const py = baseY + offsetY;

                        // mantém dentro dos limites do gráfico
                        allPoints.push({
                          ...r,
                          x: Math.min(chartBounds.maxX, Math.max(chartBounds.minX, px)),
                          y: Math.min(chartBounds.maxY, Math.max(chartBounds.minY, py)),
                        });
                      });
                    });

                    // 2️⃣ Aplica repulsão automática (3 iterações)
                    const minDist = 9; // igual ao diâmetro + gap (~8–9)
                    for (let iter = 0; iter < 3; iter++) {
                      for (let a = 0; a < allPoints.length; a++) {
                        for (let b = a + 1; b < allPoints.length; b++) {
                          const dx = allPoints[b].x - allPoints[a].x;
                          const dy = allPoints[b].y - allPoints[a].y;
                          const dist = Math.sqrt(dx * dx + dy * dy);
                          if (dist < minDist) {
                            const overlap = (minDist - dist) / 4; // empurra de leve
                            const nx = dx / (dist || 1);
                            const ny = dy / (dist || 1);
                            allPoints[a].x = Math.max(
                              chartBounds.minX,
                              Math.min(chartBounds.maxX, allPoints[a].x - nx * overlap)
                            );
                            allPoints[a].y = Math.max(
                              chartBounds.minY,
                              Math.min(chartBounds.maxY, allPoints[a].y - ny * overlap)
                            );
                            allPoints[b].x = Math.max(
                              chartBounds.minX,
                              Math.min(chartBounds.maxX, allPoints[b].x + nx * overlap)
                            );
                            allPoints[b].y = Math.max(
                              chartBounds.minY,
                              Math.min(chartBounds.maxY, allPoints[b].y + ny * overlap)
                            );
                          }
                        }
                      }
                    }

                    return (
                      <>
                        {/* === ÁREA COLORIDA === */}
                        <rect
                          x={chartX}
                          y={chartY}
                          width={chartW}
                          height={chartH}
                          fill="url(#riskGradient)"
                          stroke="rgba(0,0,0,0.2)"
                          strokeWidth="1"
                          rx="8"
                        />

                        {/* === EIXO Y === */}
                        <text
                          x={chartX - 85}
                          y={chartY + chartH / 2}
                          transform={`rotate(-90, ${chartX - 85}, ${chartY + chartH / 2})`}
                          textAnchor="middle"
                          fontSize="14"
                          fontWeight="700"
                          fill="#071744"
                        >
                          IMPACTO
                        </text>

                        {[
                          'Catastrófico',
                          'Grande',
                          'Médio',
                          'Pequeno',
                          'Muito Pequeno',
                        ].map((txt, idx) => {
                          // idx = 0 -> Catastrófico (topo)
                          // idx = 4 -> Muito Pequeno (base)

                          // posição base "bonita" igualmente espaçada dentro do retângulo:
                          const baseY = chartY + (idx * chartH) / 4;

                          // empurra só o último rótulo ("Muito Pequeno") ligeiramente pra cima,
                          // e sobe todos um pouquinho pra garantir que nenhum fique fora do retângulo.
                          const adjust =
                            idx === 4
                              ? -5 // sobe "Muito Pequeno" 5px
                              : 10; // os demais descem 10px pra ficarem mais centralizados nas faixas

                          return (
                            <text
                              key={txt}
                              x={chartX - 10}
                              y={baseY + adjust}
                              textAnchor="end"
                              fontSize="12"
                              fill="#071744"
                            >
                              {txt}
                            </text>
                          );
                        })}

                        {/* === EIXO X === */}
                        <text
                          x={chartX + chartW / 2}
                          y={chartY + chartH + 60}
                          textAnchor="middle"
                          fontSize="14"
                          fontWeight="700"
                          fill="#071744"
                        >
                          PROBABILIDADE
                        </text>

                        {['Muito Baixa', 'Baixa', 'Média', 'Alta', 'Muito Alta'].map(
                          (txt, idx) => (
                            <text
                              key={txt}
                              x={chartX + idx * (chartW / 4)}
                              y={chartY + chartH + 35}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#071744"
                            >
                              {txt}
                            </text>
                          )
                        )}

                        {/* === PONTOS COM FOCO INTERATIVO E TOOLTIP CORRIGIDO === */}
                        {allPoints.map((r) => {
                          const score = r.score ?? r.probabilidade * r.impacto;

                          // Nível igual à Matriz
                          const band = bandForScore(score);
                          const level = r.level || band.name || null;

                          // Mantém seu esquema de cores, mas com os mesmos cortes da Matriz
                          let color = '#2ecc71'; // Baixo
                          if (score > 6 && score <= 12)
                            color = '#f1c40f'; // Médio
                          else if (score > 12 && score <= 16)
                            color = '#e67e22'; // Alto
                          else if (score > 19) color = '#e74c3c'; // Crítico

                          const isActive = tooltip && tooltip.id === r.id;
                          const radius = isActive ? 8 : 4;

                          return (
                            <g
                              key={r.id}
                              data-risk-id={r.id}
                              onMouseEnter={(e) => {
                                clearTimeout(window._tooltipTimer);
                                window._tooltipTimer = setTimeout(() => {
                                  setTooltip({
                                    id: r.id,
                                    risco_fator: r.risco_fator || 'Risco não informado',
                                    setor: r.setor || 'Setor não informado',
                                    probabilidade: r.probabilidade,
                                    impacto: r.impacto,
                                    score,
                                    level,
                                    color,
                                    x: r.x + 12, // desloca ligeiramente à direita
                                    y: r.y - 90, // tenta exibir acima
                                    fixed: false,
                                  });
                                }, 100);
                              }}
                              onMouseLeave={() => {
                                clearTimeout(window._tooltipTimer);
                                // if (!tooltip?.fixed) setTooltip(null);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (tooltip && tooltip.id === r.id && tooltip.fixed) {
                                  setTooltip(null);
                                } else {
                                  setTooltip({
                                    id: r.id,
                                    risco_fator: r.risco_fator || 'Risco não informado',
                                    setor: r.setor || 'Setor não informado',
                                    probabilidade: r.probabilidade,
                                    impacto: r.impacto,
                                    score,
                                    level,
                                    color,
                                    x: r.x + 12,
                                    y: r.y - 90,
                                    fixed: true,
                                  });
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <circle
                                cx={r.x}
                                cy={r.y}
                                r={radius}
                                fill="#007bff"
                                stroke={isActive ? color : '#003366'}
                                strokeWidth={isActive ? 2 : 1.5}
                                style={{
                                  filter: isActive
                                    ? `drop-shadow(0 0 6px rgba(0,0,0,0.4)) drop-shadow(0 0 8px ${color})`
                                    : 'drop-shadow(0px 2px 3px rgba(0,0,0,0.3))',
                                  transition: 'all 0.25s ease',
                                }}
                              />
                              <text
                                x={r.x + 10}
                                y={r.y + 4}
                                fontSize="11"
                                fontWeight="600"
                                fill="#071744"
                                pointerEvents="none"
                              >
                                {/* {r.id} */}
                              </text>
                            </g>
                          );
                        })}
                        {/* === TOOLTIP AGORA DENTRO DO SVG === */}
                        {tooltip && (
                          <foreignObject
                            // calcula posição preliminar baseada no ponto
                            x={(() => {
                              const rawX = tooltip.x; // normalmente r.x + 12
                              const chartX = 140;
                              const chartW = 550;
                              const tooltipW = 240;

                              // const minX = chartX; // não passar da esquerda
                              // const maxX = chartX + chartW - tooltipW; // não passar da direita

                              // clamp
                              return Math.min(
                                Math.max(rawX, chartX),
                                chartX + chartW - tooltipW
                              );
                            })()}
                            y={(() => {
                              const rawY = tooltip.y; // normalmente r.y - 90
                              const chartY = 50;
                              const chartH = 300;
                              const tooltipH = 150;

                              const minY = chartY; // não passar do topo
                              const maxY = chartY + chartH - tooltipH; // não passar do fundo

                              // clamp
                              return Math.min(
                                Math.max(rawY, chartY),
                                chartY + chartH - tooltipH
                              );
                            })()}
                            width={240}
                            height={150}
                            style={{ overflow: 'visible' }}
                          >
                            <div
                              ref={tooltipRef}
                              xmlns="http://www.w3.org/1999/xhtml"
                              style={{
                                background: '#fff',
                                border: `2px solid ${tooltip.color}`,
                                borderRadius: '10px',
                                padding: '0.7rem 0.9rem',
                                paddingRight: '0.9rem',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                                fontFamily: 'sans-serif',
                                fontSize: '0.55rem',
                                color: '#071744',
                                lineHeight: 1.2,
                                width: '230px',
                                minHeight: '110px', // 🔹 altura mínima
                                maxHeight: '140px', // 🔹 se ultrapassar, ativa rolagem
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                wordBreak: 'break-word',
                                whiteSpace: 'normal',
                                pointerEvents: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                scrollbarWidth: 'thin',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  color: tooltip.color,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>Risco #{tooltip.id}</span>
                                <span>{tooltip.level}</span>
                              </div>

                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {tooltip.risco_fator}
                              </div>

                              <div
                                style={{
                                  color: '#4a5568',
                                  fontSize: '0.65rem',
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {tooltip.setor}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '0.65rem',
                                  color: '#071744',
                                }}
                              >
                                <span>Prob: {tooltip.probabilidade}</span>
                                <span>Impacto: {tooltip.impacto}</span>
                                <span>Pontuação: {tooltip.score}</span>
                              </div>
                            </div>
                          </foreignObject>
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* === LEGENDA DENTRO DO CARD === */}
                <div
                  style={{
                    position: 'absolute',
                    right: '1.5rem',
                    bottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#071744',
                    background: 'rgba(255,255,255,0.8)',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  {[
                    { cor: '#2ecc71', texto: 'Baixo' },
                    { cor: '#f1c40f', texto: 'Médio' },
                    { cor: '#e67e22', texto: 'Alto' },
                    { cor: '#e74c3c', texto: 'Crítico' },
                  ].map((item) => (
                    <div
                      key={item.texto}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          background: item.cor,
                          borderRadius: '3px',
                          border: '1px solid rgba(0,0,0,0.15)',
                        }}
                      />
                      <span>{item.texto}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* === Subcomponentes === */
function KpiCard({ label, value, bg, textColor }) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: '10px',
        padding: '0.9rem 1rem',
        minHeight: '88px',
        boxShadow: '0 16px 32px -8px rgb(0 0 0 / 0.4)',
        border:
          bg === 'linear-gradient(135deg,#003366 0%,#005b96 100%)'
            ? '1px solid rgba(255,255,255,0.18)'
            : '1px solid rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: textColor,
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.9 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value ?? 0}</div>
    </div>
  );
}
