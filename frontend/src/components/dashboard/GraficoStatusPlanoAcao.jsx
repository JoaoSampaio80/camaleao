import React from 'react';
import { Card } from 'react-bootstrap';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = {
  darkTitle: '#071744',
};

// 🔹 Cores fixas por status (oficiais do Camaleão)
const STATUS_COLORS = {
  Concluído: '#24852bff', // verde
  'Em andamento': '#0d47a1', // azul escuro
  'Não iniciado': '#ec9428ff', // laranja
  Atrasado: '#b71c1c', // vermelho forte
};

const SectionHeader = ({ title }) => (
  <h5
    style={{
      color: COLORS.darkTitle,
      fontWeight: 700,
      marginBottom: '0.5rem',
    }}
  >
    {title}
  </h5>
);

// 🔹 Função para normalizar os rótulos vindos do backend
const formatarRotulo = (nome) => {
  if (!nome) return '';
  const normalizado = nome.toLowerCase().replace(/_/g, ' ').trim();

  if (normalizado.includes('andamento')) return 'Em andamento';
  if (normalizado.includes('nao iniciado') || normalizado.includes('não iniciado'))
    return 'Não iniciado';
  if (normalizado.includes('concluido') || normalizado.includes('concluído'))
    return 'Concluído';
  if (normalizado.includes('atrasad')) return 'Atrasado';

  return nome; // caso venha algo inesperado
};

export default function GraficoStatusPlanoAcao({ data = [] }) {
  // 🔹 Normaliza e associa cor correta a cada status
  const dataFormatada = data.map((d) => {
    const nome = formatarRotulo(d.name);
    return {
      name: nome,
      value: d.value,
      color: STATUS_COLORS[nome] || '#cccccc', // cor neutra se algo fugir do padrão
    };
  });

  return (
    <Card className="shadow-sm" style={{ borderRadius: 16 }}>
      <Card.Body>
        <SectionHeader title="Status dos Planos de Ação" />
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={dataFormatada}
                dataKey="value"
                nameKey="name"
                outerRadius={75}
                label={({ value }) => value}
                labelLine={false}
              >
                {dataFormatada.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value}`, name]}
                contentStyle={{ fontSize: '0.9rem' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span style={{ fontSize: '0.9rem', color: COLORS.darkTitle }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
}
