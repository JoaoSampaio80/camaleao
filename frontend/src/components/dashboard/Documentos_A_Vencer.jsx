import React, { useState } from 'react';
import { Card, Table, Badge, Row, Col } from 'react-bootstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
dayjs.locale('pt-br');

const SectionHeader = ({ title }) => (
  <h5 style={{ color: '#071744', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h5>
);

export default function Documentos_A_Vencer({ data = [] }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  return (
    <Row className="mt-3">
      <Col>
        <Card
          className="shadow-sm"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #E3F2FD, #1789FC)',
            boxShadow:
              'inset 0 1px 3px rgba(255,255,255,0.3), 0 4px 10px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <Card.Body style={{ paddingTop: '1rem' }}>
            <SectionHeader title="Próximas Revisões de Documentos (≤ 30 dias)" />

            {data.length === 0 ? (
              <p className="text-center text-muted mb-0">
                Nenhum documento com revisão próxima.
              </p>
            ) : (
              <Table
                responsive
                style={{
                  borderCollapse: 'collapse',
                  marginTop: '0.5rem',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr>
                    {['Documento', 'Criticidade', 'Vence em'].map((header, idx) => (
                      <th
                        key={idx}
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
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.map((d, i) => {
                    const isHovered = hoveredRow === i;

                    // mesmas cores da outra tabela
                    const bg = isHovered
                      ? 'rgba(33, 15, 203, 0.95)' // hover (um azul mais forte)
                      : i % 2 === 0
                        ? 'rgba(23, 175, 231, 0.95)' // linha clara
                        : 'rgba(29, 83, 175, 0.95)'; // linha mais azul

                    const cellBase = {
                      border: 'none',
                      padding: '0.9rem',
                      background: 'transparent', // ⬅️ deixa o <td> transparente
                    };

                    return (
                      <tr
                        key={i}
                        onMouseEnter={() => setHoveredRow(i)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          background: bg, // ⬅️ cor vai no <tr>
                          // ⬇️ impede o Bootstrap de pintar <td> e o “hover” padrão
                          '--bs-table-bg': 'transparent',
                          '--bs-table-accent-bg': 'transparent',
                          '--bs-table-color': isHovered ? '#FFFFFF' : '#071744',
                          color: isHovered ? '#FFFFFF' : '#071744',
                          transition: 'background 0.25s ease, color 0.2s ease',
                          fontWeight: 500,
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        <td style={cellBase}>{d.evidencia}</td>
                        <td style={cellBase}>
                          {d.criticidade === 'AL'
                            ? 'Alta'
                            : d.criticidade === 'MD'
                              ? 'Média'
                              : d.criticidade === 'BX'
                                ? 'Baixa'
                                : d.criticidade === 'NA'
                                  ? 'Não Aplicável'
                                  : d.criticidade === 'BP'
                                    ? 'Boas Práticas'
                                    : d.criticidade}
                        </td>
                        <td style={cellBase}>
                          <Badge
                            bg="warning"
                            text="dark"
                            style={{
                              opacity: 0.85, // leve transparência
                              fontWeight: 600,
                              borderRadius: 8,
                              padding: '0.45rem 0.75rem',
                            }}
                          >
                            {dayjs(d.proxima_revisao).format('DD/MM/YYYY')}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
