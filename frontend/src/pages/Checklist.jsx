import React from 'react';
import { Table, Container, Form } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

function Checklist() {
  const checklist = [
    {
      atividade: 'Mapeamento do tratamento de dados pessoais',
      descricao:
        'O processo de mapeamento do tratamento de dados é uma etapa para garantir a conformidade com a LGPD. Este documento visa descrever os principais passos e considerações envolvidos no mapeamento do tratamento de dados, destacando as medidas tomadas para proteger a privacidade e a segurança das informações.',
    },
    {
      atividade: 'Nomeação do DPO',
      descricao:
        'O Data Protection Officer (DPO) desempenha o papel na garantia da conformidade com as leis de proteção de dados, como a Lei Geral de Proteção de Dados (LGPD).',
    },
    {
      atividade: 'Diagnósticos',
      descricao:
        'O diagnóstico de conformidade com a LGPD é uma etapa para garantir que uma organização esteja em conformidade com as disposições legais relacionadas à proteção de dados pessoais.',
    },
  ];

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(to bottom, #e6f0ff, #dff1f5)',
          padding: '2rem',
        }}
      >
        {/* Centraliza e garante que o título apareça antes do conteúdo */}
        <div className="text-center mb-4">
          <h2 style={{ color: '#071744' }}>Checklist Itens da LGPD</h2>
        </div>

        <Container fluid>
          <Table striped bordered hover>
            <thead style={{ backgroundColor: '#2c3790', color: 'white' }}>
              <tr>
                <th>Atividade</th>
                <th>Descrição</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.atividade}</td>
                  <td>{item.descricao}</td>
                  <td className="text-center">
                    <Form.Check type="checkbox" />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Container>
      </div>
    </div>
  );
}

export default Checklist;



