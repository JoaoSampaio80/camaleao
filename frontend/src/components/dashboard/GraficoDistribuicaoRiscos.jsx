import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from 'react-bootstrap';

const COLORS = {
  Baixo: '#2ECC71',
  Médio: '#F1C40f',
  Alto: '#E67E22',
  Crítico: '#E74C3C',
};

export default function GraficoDistribuicaoRiscos({ data }) {
  const orderedData = ['Baixo', 'Médio', 'Alto', 'Crítico']
    .map((nivel) => data.find((d) => d.name === nivel))
    .filter(Boolean);

  const total = orderedData.reduce((acc, d) => acc + d.value, 0);
  const dataWithPercent = orderedData.map((d) => ({
    ...d,
    percent: ((d.value / total) * 100).toFixed(1),
  }));

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.15; // distância equilibrada
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={COLORS[name]}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {`${name}: ${value} (${percent}%)`}
      </text>
    );
  };

  return (
    <Card
      className="shadow-sm"
      style={{
        borderRadius: '1rem',
        border: '1px solid #d1dce6',
        background: 'linear-gradient(135deg, #E3F2FD, #52DEE5)', // azul suave
        padding: '1.5rem 2rem',
        height: '100%',
      }}
    >
      <h5
        style={{
          color: '#071744',
          fontWeight: '700',
          marginBottom: '1.25rem',
        }}
      >
        Distribuição de Riscos
      </h5>

      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={dataWithPercent}
              cx="50%" // 🔹 desloca pra direita, evita corte de "Médio"
              cy="50%"
              innerRadius="50%"
              outerRadius="90%" // 🔹 ocupa o card de forma mais completa
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {dataWithPercent.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[entry.name]}
                  stroke="#F7FAFF"
                  strokeWidth={2}
                />
              ))}
            </Pie>

            {/* Total centralizado */}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                fill: '#071744',
              }}
            >
              {total} riscos
            </text>

            <Tooltip
              formatter={(value, name, props) => [
                `${value} riscos (${props.payload.percent}%)`,
                name,
              ]}
              contentStyle={{
                background: '#FFF',
                border: '1px solid #DCE4EC',
                borderRadius: '0.6rem',
                fontSize: '0.8rem',
                color: '#071744',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
