import React from 'react';
import { Card, Button, ProgressBar } from 'react-bootstrap';

const COLORS = {
  primaryA: '#003366',
  primaryB: '#0373ff',
  darkTitle: '#071744',
};

export default function IndiceMaturidade({ indice = 0, percentAcoes = 0 }) {
  return (
    <Card
      className="shadow-sm"
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #E3F2FD, #1789FC)',
      }}
    >
      <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 flex-wrap">
        <div>
          <h5 style={{ color: COLORS.darkTitle, fontWeight: 700 }}>
            Índice de Maturidade LGPD: {indice}%
          </h5>
          <div style={{ fontSize: 13 }}>Ações concluídas: {percentAcoes}%</div>
          <div className="mt-2" style={{ width: '100%', maxWidth: 400 }}>
            <ProgressBar
              now={indice}
              label={`${indice}%`}
              style={{
                height: '12px',
                borderRadius: '8px',
                backgroundColor: '#e9ecef',
                overflow: 'hidden',
              }}
              variant={indice >= 80 ? 'success' : indice >= 50 ? 'warning' : 'danger'}
            />
          </div>
        </div>

        <Button
          style={{
            background: `linear-gradient(135deg, ${COLORS.primaryA}, ${COLORS.primaryB})`,
            border: 'none',
            borderRadius: 12,
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Ir para o topo
        </Button>
      </Card.Body>
    </Card>
  );
}
