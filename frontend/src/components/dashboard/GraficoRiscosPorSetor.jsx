// src/components/dashboard/GraficoRiscosPorSetor.jsx
import React, { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = {
  primaryA: '#003366',
  primaryB: '#1789FC',
  darkTitle: '#071744',
};

// Título padrão do card
const SectionHeader = ({ title }) => (
  <h5 style={{ color: COLORS.darkTitle, fontWeight: 700, marginBottom: '0.5rem' }}>
    {title}
  </h5>
);

// Custom tick que quebra o texto em até 2 linhas se for longo
const CustomTick = ({ x, y, payload }) => {
  const text = payload.value || '';
  const words = text.split(' ');
  const maxCharsPerLine = 10;

  // divide em duas linhas se exceder o limite
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current) lines.push(current.trim());

  return (
    <g transform={`translate(${x},${y + 10})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={i * 12} textAnchor="middle" fill="#333" fontSize={11}>
          {line}
        </text>
      ))}
    </g>
  );
};

export default function GraficoRiscosPorSetor({ data = [] }) {
  // ===== Cálculo da escala dinâmica =====
  const maxValor = useMemo(
    () => Math.max(...data.map((d) => d.quantidade || 0), 0),
    [data]
  );

  // Se o maior valor for maior que 10, reduz a escala
  const domainMax = maxValor > 10 ? Math.ceil(maxValor * 0.7) + 5 : 'auto';
  // ou
  // const domainMax = maxValor > 10 ? Math.ceil(maxValor / 2) + 5 : 'auto';
  // ou
  // const domainMax = maxValor > 20 ? 20 : 'auto';

  return (
    <Card
      className="shadow-sm"
      style={{
        border: 'none',
        borderRadius: 20,
        background: 'linear-gradient(135deg, #E8F5E9, #52DEE5)', // 💚 verde suave degradê
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Card.Body
        style={{
          borderRadius: 20,
          padding: '1.2rem 1.5rem',
        }}
      >
        <SectionHeader title="Riscos por Setor" />
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="setor" tick={<CustomTick />} interval={0} height={50} />
              <YAxis domain={[0, domainMax]} tickCount={6} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="quantidade"
                name="Quantidade de Riscos"
                fill={COLORS.primaryB}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
}
