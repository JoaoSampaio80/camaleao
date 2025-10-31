// src/components/dashboard/TabelaTopRiscos.jsx
import React from 'react';
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
  return (
    <Card className="shadow-sm" style={{ borderRadius: 16 }}>
      <Card.Body>
        <SectionHeader title="Top 5 Riscos" />
        <Table hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Score</th>
              <th>Setor</th>
              <th>Processo de Negócio</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  Nenhum risco encontrado.
                </td>
              </tr>
            ) : (
              data.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{r.titulo}</td>
                  <td>
                    <Badge
                      bg={
                        r.score >= 20 ? 'danger' : r.score >= 12 ? 'warning' : 'success'
                      }
                    >
                      {r.score}
                    </Badge>
                  </td>
                  <td>{r.setor || '-'}</td>
                  <td>{r.owner || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
