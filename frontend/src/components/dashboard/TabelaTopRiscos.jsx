// src/components/dashboard/TabelaTopRiscos.jsx
import React, { useState } from 'react';
import { Card, Table, Badge } from 'react-bootstrap';

const COLORS = {
  darkTitle: '#071744',
};

const SectionHeader = ({ title }) => (
  <h5 style={{ color: COLORS.darkTitle, fontWeight: 700, marginBottom: '0.5rem' }}>
    {title}
  </h5>
);

export default function TabelaTopRiscos({ data = [] }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  return (
    <Card
      className="shadow-sm"
      style={{
        border: 'none',
        borderRadius: 20,
        background: 'linear-gradient(135deg, #E3F2FD, #1789FC)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      <Card.Body style={{ borderRadius: 20, padding: '1.2rem 1.5rem' }}>
        <SectionHeader title="Top 5 Riscos" />

        {/* tire o `hover` do Table (Bootstrap sobrescrevia) */}
        <Table
          responsive
          bordered={false}
          style={{
            borderCollapse: 'collapse',
            background: 'transparent',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr>
              {['#', 'Fator de Risco', 'Pontuação', 'Setor', 'Processo de Negócio'].map(
                (header, idx) => (
                  <th
                    key={idx}
                    style={{
                      padding: '0.9rem',
                      background: 'linear-gradient(135deg, #0B3C6D, #1565C0)', // ✅ mantém
                      color: '#FFFFFF',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.2)',
                      border: 'none',
                    }}
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {data.map((r, i) => {
              const isHovered = hoveredRow === i;

              const bg = isHovered
                ? 'rgba(33, 15, 203, 0.95)'
                : i % 2 === 0
                  ? 'rgba(23, 175, 231, 0.95)' // clara
                  : 'rgba(29, 83, 175, 0.95)'; // mais azul

              const cellBase = {
                border: 'none',
                padding: '0.9rem',
                background: 'transparent',
              };

              const badgeStyle = {
                display: 'inline-block',
                minWidth: 32,
                textAlign: 'center',
                padding: '4px 10px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              };

              let badgeBg = 'linear-gradient(135deg, #2E7D32, #81C784)';
              let badgeColor = '#fff';
              if (r.score >= 20) badgeBg = 'linear-gradient(135deg, #C62828, #EF5350)';
              else if (r.score >= 12) {
                badgeBg = 'linear-gradient(135deg, #FBC02D, #FFE082)';
                badgeColor = '#212529';
              }

              return (
                <tr
                  key={r.id}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    background: bg,
                    // 👇 garante que o Bootstrap não pinte os <td> de branco
                    '--bs-table-bg': 'transparent',
                    '--bs-table-accent-bg': 'transparent',
                    '--bs-table-color': isHovered ? '#FFFFFF' : '#071744',
                    transition: 'background 0.25s ease, color 0.2s ease',
                    color: isHovered ? '#FFFFFF' : '#071744',
                    fontWeight: 500,
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <td style={cellBase}>{i + 1}</td>
                  <td style={cellBase}>{r.titulo}</td>
                  <td style={cellBase}>
                    <span
                      style={{ ...badgeStyle, background: badgeBg, color: badgeColor }}
                    >
                      {r.score}
                    </span>
                  </td>
                  <td style={cellBase}>{r.setor || '-'}</td>
                  <td style={cellBase}>{r.owner || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
