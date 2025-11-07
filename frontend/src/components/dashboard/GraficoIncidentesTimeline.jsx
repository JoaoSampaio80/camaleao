import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from 'react-bootstrap';
import SectionHeader from '../SectionHeader';

const COLORS = {
  danger: '#C62828',
  darkTitle: '#071744',
  grid: 'rgba(0,0,0,0.1)',
};

const traduzMes = (mes) => {
  if (!mes) return '';
  const mapa = {
    Jan: 'Jan',
    Feb: 'Fev',
    Mar: 'Mar',
    Apr: 'Abr',
    May: 'Mai',
    Jun: 'Jun',
    Jul: 'Jul',
    Aug: 'Ago',
    Sep: 'Set',
    Oct: 'Out',
    Nov: 'Nov',
    Dec: 'Dez',
  };
  const [abbr, ano] = mes.split('/');
  return `${mapa[abbr] || abbr}/${ano}`;
};

export default function GraficoIncidentesTimeline({ data = [] }) {
  return (
    <Card
      className="shadow-sm"
      style={{
        border: 'none',
        borderRadius: 16,
        background: 'linear-gradient(135deg, #e3f2fd, #52DEE5)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      <Card.Body style={{ padding: '1.2rem 1.5rem' }}>
        <SectionHeader title="Incidentes ao Longo do Tempo" />

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="mes" tickFormatter={traduzMes} />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(value) => [`${value} incidente${value !== 1 ? 's' : ''}`]}
                labelFormatter={(label) => `Mês: ${traduzMes(label)}`}
                contentStyle={{
                  fontSize: '0.9rem',
                  borderRadius: 8,
                  borderColor: '#ddd',
                }}
              />
              <Legend
                formatter={() => (
                  <span style={{ color: COLORS.darkTitle, fontSize: '0.9rem' }}>
                    Incidentes
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="qtd"
                name="Incidentes"
                stroke={COLORS.danger}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
}
