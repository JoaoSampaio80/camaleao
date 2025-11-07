// src/components/dashboard/TabelaUltimosAcessos.jsx
import React, { useState } from 'react';
import { Card, Table } from 'react-bootstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const SectionHeader = ({ title }) => (
  <h5 style={{ color: '#071744', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h5>
);

export default function TabelaUltimosAcessos({ data = [] }) {
  const [hoveredRow, setHoveredRow] = useState(null);

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    usuario: r.usuario ?? '-',
    setor: r.setor ?? '-',
    quandoTxt: r.quando ?? (r.quandoISO ? dayjs(r.quandoISO).fromNow() : '-'),
  }));

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
        <SectionHeader title="Últimos Acessos" />

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
              {['Usuário', 'Setor', 'Quando'].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '0.9rem',
                    background: 'linear-gradient(135deg, #0B3C6D, #1565C0)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    border: 'none',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-muted py-3">
                  Nenhum acesso registrado.
                </td>
              </tr>
            ) : (
              rows.slice(0, 10).map((r, i) => {
                const isHovered = hoveredRow === i;
                const bg = isHovered
                  ? 'rgba(33, 15, 203, 0.95)'
                  : i % 2 === 0
                    ? 'rgba(23, 175, 231, 0.95)'
                    : 'rgba(29, 83, 175, 0.95)';

                const cellBase = {
                  border: 'none',
                  padding: '0.9rem',
                  background: 'transparent',
                };

                return (
                  <tr
                    key={i}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: bg,
                      '--bs-table-bg': 'transparent',
                      '--bs-table-accent-bg': 'transparent',
                      '--bs-table-color': isHovered ? '#FFFFFF' : '#071744',
                      transition: 'background 0.25s ease, color 0.2s ease',
                      color: isHovered ? '#FFFFFF' : '#071744',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                    }}
                  >
                    <td style={cellBase}>{r.usuario}</td>
                    <td style={cellBase}>{r.setor}</td>
                    <td style={cellBase}>{r.quandoTxt}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
