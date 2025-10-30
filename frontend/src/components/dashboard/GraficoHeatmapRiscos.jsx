// src/components/HeatmapDashboard.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AxiosInstance from '../../components/Axios';

export default function HeatmapDashboard() {
  const [riscos, setRiscos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);

  // === Carrega dados ===
  const loadRiscos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AxiosInstance.get('/riscos/ranking/');
      const results = Array.isArray(data) ? data : data?.results || [];
      setRiscos(results);
    } catch (err) {
      console.error('Erro ao carregar riscos do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiscos();
  }, [loadRiscos]);

  // === Converte e normaliza dados ===
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

        const level =
          r.classificacao ||
          r.nivel_risco ||
          r.nivel ||
          (score > 19 ? 'Crítico' : score > 12 ? 'Alto' : score > 6 ? 'Médio' : 'Baixo');

        return {
          id: r.id,
          probabilidade: prob,
          impacto: imp,
          risco_fator: r.risco_fator || '',
          setor: r.setor || '',
          score,
          level,
        };
      });
  }, [riscos]);

  // === Tooltip - fecha ao clicar fora ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!tooltip) return;
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) return;
      const pointGroup = e.target.closest('[data-risk-id]');
      if (pointGroup && Number(pointGroup.getAttribute('data-risk-id')) === tooltip.id)
        return;
      setTooltip(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltip]);

  // === Classificação por pontuação ===
  const bandForScore = useCallback((s) => {
    const v = Number(s) || 0;
    if (v === 0) return { name: null };
    if (v <= 6) return { name: 'Baixo' };
    if (v <= 12) return { name: 'Médio' };
    if (v <= 16) return { name: 'Alto' };
    return { name: 'Crítico' };
  }, []);

  // === Render ===
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        padding: '1rem',
        minHeight: '400px',
        position: 'relative',
      }}
    >
      {loading ? (
        <div
          style={{
            color: '#071744',
            fontWeight: 600,
            textAlign: 'center',
            padding: '3rem 0',
          }}
        >
          Carregando Heatmap de Risco...
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 800 450"
            width="100%"
            height="auto"
            preserveAspectRatio="xMidYMid meet"
            style={{
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
              const chartX = 100;
              const chartY = 40;
              const chartW = 550;
              const chartH = 300;
              const padding = 12;

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

              const chartBounds = {
                minX: chartX + 8,
                maxX: chartX + chartW - 8,
                minY: chartY + 8,
                maxY: chartY + chartH - 8,
              };

              const allPoints = [];

              // Pontos agrupados (grade compacta)
              Object.entries(grouped).forEach(([key, risks]) => {
                const [p, i] = key.split('-').map(Number);
                const baseX = scaleX(p);
                const baseY = scaleY(i);
                const dotR = 4;
                const gap = 1;
                const step = dotR * 2 + gap;
                const cols = Math.ceil(Math.sqrt(risks.length));
                const rows = Math.ceil(risks.length / cols);

                risks.forEach((r, idx) => {
                  const c = idx % cols;
                  const rr = Math.floor(idx / cols);
                  const offsetX = (c - (cols - 1) / 2) * step;
                  const offsetY = (rr - (rows - 1) / 2) * step;
                  const px = baseX + offsetX;
                  const py = baseY + offsetY;
                  allPoints.push({
                    ...r,
                    x: Math.min(chartBounds.maxX, Math.max(chartBounds.minX, px)),
                    y: Math.min(chartBounds.maxY, Math.max(chartBounds.minY, py)),
                  });
                });
              });

              // Repulsão leve
              const minDist = 9;
              for (let iter = 0; iter < 3; iter++) {
                for (let a = 0; a < allPoints.length; a++) {
                  for (let b = a + 1; b < allPoints.length; b++) {
                    const dx = allPoints[b].x - allPoints[a].x;
                    const dy = allPoints[b].y - allPoints[a].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) {
                      const overlap = (minDist - dist) / 4;
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
                  {/* === Área colorida === */}
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

                  {/* === Eixos === */}
                  <text
                    x={chartX - 70}
                    y={chartY + chartH / 2}
                    transform={`rotate(-90, ${chartX - 70}, ${chartY + chartH / 2})`}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="#071744"
                  >
                    IMPACTO
                  </text>

                  {['Catastrófico', 'Grande', 'Médio', 'Pequeno', 'Muito Pequeno'].map(
                    (txt, idx) => (
                      <text
                        key={txt}
                        x={chartX - 10}
                        y={chartY + (idx * chartH) / 4 + 10}
                        textAnchor="end"
                        fontSize="11"
                        fill="#071744"
                      >
                        {txt}
                      </text>
                    )
                  )}

                  <text
                    x={chartX + chartW / 2}
                    y={chartY + chartH + 50}
                    textAnchor="middle"
                    fontSize="13"
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
                        y={chartY + chartH + 28}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#071744"
                      >
                        {txt}
                      </text>
                    )
                  )}

                  {/* === Pontos e Tooltip === */}
                  {allPoints.map((r) => {
                    const score = r.score ?? r.probabilidade * r.impacto;
                    const band = bandForScore(score);
                    const level = r.level || band.name || null;

                    let color = '#2ecc71';
                    if (score > 6 && score <= 12) color = '#f1c40f';
                    else if (score > 12 && score <= 16) color = '#e67e22';
                    else if (score > 19) color = '#e74c3c';

                    const isActive = tooltip && tooltip.id === r.id;
                    const radius = isActive ? 8 : 4;

                    return (
                      <g
                        key={r.id}
                        data-risk-id={r.id}
                        onMouseEnter={() => {
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
                              x: r.x + 12,
                              y: r.y - 90,
                            });
                          }, 80); // leve atraso pra estabilidade
                        }}
                        onMouseLeave={() => {
                          clearTimeout(window._tooltipTimer);
                        }}
                      >
                        <circle
                          cx={r.x}
                          cy={r.y}
                          r={radius}
                          fill="#007bff"
                          stroke={color}
                          strokeWidth={isActive ? 2 : 1.5}
                          style={{
                            filter: isActive
                              ? `drop-shadow(0 0 6px rgba(0,0,0,0.4)) drop-shadow(0 0 8px ${color})`
                              : 'drop-shadow(0px 2px 3px rgba(0,0,0,0.3))',
                            transition: 'all 0.25s ease',
                          }}
                        />
                      </g>
                    );
                  })}

                  {tooltip && (
                    <foreignObject
                      // === Cálculo de posição com clamp, igual à versão aprovada ===
                      x={(() => {
                        const rawX = tooltip.x; // normalmente r.x + 12
                        const chartX = 80;
                        const chartW = 550;
                        const tooltipW = 240;

                        // impede de sair da esquerda e direita da área colorida
                        return Math.min(
                          Math.max(rawX, chartX),
                          chartX + chartW - tooltipW
                        );
                      })()}
                      y={(() => {
                        const rawY = tooltip.y; // normalmente r.y - 90
                        const chartY = 40;
                        const chartH = 300;
                        const tooltipH = 150;

                        // impede de sair do topo ou da base da área colorida
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
                          minHeight: '110px',
                          maxHeight: '140px',
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

          {/* === LEGENDA VERTICAL LATERAL === */}
          <div
            style={{
              position: 'absolute',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column-reverse', // 🔹 de baixo pra cima
              alignItems: 'flex-start',
              gap: '0.6rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#071744',
              background: 'rgba(255,255,255,0.85)',
              padding: '0.7rem 0.9rem',
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
  );
}
