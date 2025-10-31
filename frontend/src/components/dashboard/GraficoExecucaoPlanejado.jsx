// src/components/dashboard/GraficoExecucaoPlanejado.jsx
import React from 'react';
import { Card } from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const COLORS = {
  primaryA: '#003366',
  info: '#0288d1',
  ok: '#2e7d32',
  danger: '#c62828',
  darkTitle: '#071744',
  neutral: '#ccc',
};

export default function GraficoExecucaoPlanejado({ data = [] }) {
  // 🔹 Normaliza o dataset para evitar undefined/null
  const safeData = (Array.isArray(data) ? data : []).map((d) => ({
    mes: d.mes || '—',
    planejadas: d.planejadas ?? 0,
    andamento: d.andamento ?? 0,
    concluidas: d.concluidas ?? 0,
    atrasadas: d.atrasadas ?? 0,
  }));

  return (
    <Card className="shadow-sm" style={{ borderRadius: 16 }}>
      <Card.Body>
        <h5 style={{ color: COLORS.darkTitle, fontWeight: 700 }}>
          Execução (Planejado × Concluído)
        </h5>

        <div style={{ width: '100%', height: 260 }}>
          {safeData.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#777',
                fontStyle: 'italic',
                paddingTop: 80,
              }}
            >
              Nenhum dado disponível para exibição.
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={safeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.neutral} />
                <XAxis dataKey="mes" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => {
                    const sufixo = value === 1 ? 'ação' : 'ação'; // default singular
                    // Mas se for maior que 1, plural
                    const label = value > 1 ? `${value} ações` : `${value} ação`;
                    return [label, name];
                  }}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{
                    fontSize: '0.9rem',
                    borderRadius: 8,
                    borderColor: '#ddd',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: COLORS.darkTitle, fontSize: '0.9rem' }}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="planejadas"
                  name="Planejadas"
                  stroke={COLORS.primaryA}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="andamento"
                  name="Em andamento"
                  stroke={COLORS.info}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="concluidas"
                  name="Concluídas"
                  stroke={COLORS.ok}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="atrasadas"
                  name="Atrasadas"
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
