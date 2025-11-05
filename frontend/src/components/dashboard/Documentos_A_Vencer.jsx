import React from 'react';
import { Card, Table, Badge, Row, Col } from 'react-bootstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
dayjs.locale('pt-br');

const SectionHeader = ({ title }) => (
  <h5 style={{ color: '#071744', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h5>
);

export default function Documentos_A_Vencer({ data = [] }) {
  return (
    <Row className="mt-3">
      <Col>
        <Card className="shadow-sm" style={{ borderRadius: 16, overflow: 'visible' }}>
          <Card.Body style={{ paddingTop: '1rem', overflow: 'visible' }}>
            <SectionHeader title="Próximas Revisões de Documentos (≤ 30 dias)" />

            {data.length === 0 ? (
              <p className="text-center text-muted mb-0">
                Nenhum documento com revisão próxima.
              </p>
            ) : (
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Criticidade</th>
                    <th>Vence em</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr key={i}>
                      <td>{d.evidencia}</td>
                      <td>
                        {d.criticidade === 'AL'
                          ? 'Alta'
                          : d.criticidade === 'MD'
                            ? 'Média'
                            : d.criticidade === 'BX'
                              ? 'Baixa'
                              : d.criticidade}
                      </td>
                      <td>
                        <Badge bg="warning" text="dark">
                          {dayjs(d.proxima_revisao).format('DD/MM/YYYY')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
