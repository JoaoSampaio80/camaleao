import React, { useEffect, useState } from 'react';
import { Table, Form } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

function FormularioAtividades() {
  const [atividades, setAtividades] = useState([]);

  useEffect(() => {
    const dados = [
      {
        dimensao: '',
        atividade:
          'Manter um encarregado de Dados Pessoais (DPO) e, se pertinente, outros profissionais dedicados ao tema de Privacidade e Proteção de Dados Pessoais',
        baseLegal: 'Art. 41 da Lei 13.709/2018',
        evidencia: 'NI Nº NNN-AA',
        proximaRevisao: 'Rev-NN - dd/mm/aaaa',
      },
      {
        dimensao: '',
        atividade:
          'Adotar medidas de segurança física e lógica para dados pessoais armazenados nos servidores e dispositivos',
        baseLegal: 'Art. 49 da Lei 13.709/2018',
        evidencia: 'NI Nº NNN-AA',
        proximaRevisao: 'Rev-NN - dd/mm/aaaa',
      },
      {
        dimensao: '',
        atividade:
          'Solicitar a todos os setores constantes do mapeamento de processos que tratam dados pessoais a formalização da revisão da necessidade dos dados pessoais tratados e, caso necessário, listar as medidas de segurança adotadas',
        baseLegal: 'Art. 6º, III, da Lei 13.709/2018',
        evidencia: 'NI Nº NNN-AA',
        proximaRevisao: 'Rev-NN - dd/mm/aaaa',
      },
    ];
    setAtividades(dados);
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <style>{`
        /* Bordas discretas */
        .custom-table, .custom-table th, .custom-table td {
          border-color: #d9e1e8 !important;
        }

        /* Cabeçalho: gradiente numa faixa única */
        .thead-gradient tr {
          background: linear-gradient(135deg, #003366, #005b96) !important;
        }
        .thead-gradient th {
          background: transparent !important;
          color: #fff !important;
          border-color: #00528a !important;
          white-space: nowrap;
        }

        /* Corpo: linhas alternadas (branco ↔ azul) por LINHA inteira */
        .custom-table tbody tr.row-white td { background: #ffffff !important; color: #212529; }
        .custom-table tbody tr.row-blue  td { background: #005b96 !important; color: #ffffff; }

        /* Hover na linha toda (mantém inputs brancos) */
        .custom-table.table-hover tbody tr:hover td { background: #004b80 !important; color: #fff; }

        /* MUITO IMPORTANTE: manter selects/inputs brancos dentro da linha azul */
        .custom-table tbody tr.row-blue td .form-select,
        .custom-table tbody tr.row-blue td .form-control,
        .custom-table tbody tr.row-blue td .btn,
        .custom-table.table-hover tbody tr:hover td .form-select,
        .custom-table.table-hover tbody tr:hover td .form-control,
        .custom-table.table-hover tbody tr:hover td .btn {
          background-color: #ffffff !important;
          color: #212529 !important;
          border-color: #ced4da !important;
          box-shadow: none !important;
        }
        /* caret do select visível em fundo branco */
        .custom-table tbody tr.row-blue td .form-select:focus {
          border-color: #80bdff !important;
        }
      `}</style>

      <Sidebar />

      <div
        style={{
          background: '#f5f5f5',
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          paddingTop: '5rem', // espaço pro header fixo
          boxSizing: 'border-box',
        }}
      >
        {/* Título menor */}
        <h2
          style={{
            color: '#071744',
            fontWeight: 700,
            fontSize: '1.6rem', // ➜ tamanho reduzido
            lineHeight: 1.2,
            marginBottom: '1rem',
            marginTop: '30px',
          }}
        >
          Formulário de Atividades
        </h2>

        <Table
          bordered
          hover
          responsive
          className="custom-table"
          style={{ width: '100%' }}
        >
          <thead className="thead-gradient">
            <tr>
              <th>Dimensão</th>
              <th>
                Atividade de Gerenciamento de Privacidade e Proteção de Dados Pessoais
              </th>
              <th>Base Legal</th>
              <th>Evidência</th>
              <th>Próxima Revisão</th>
              <th>Classificação</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {atividades.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'row-white' : 'row-blue'}>
                <td>
                  <Form.Select>
                    <option>Select...</option>
                  </Form.Select>
                </td>
                <td>{item.atividade}</td>
                <td>{item.baseLegal}</td>
                <td>{item.evidencia}</td>
                <td>{item.proximaRevisao}</td>
                <td>
                  <Form.Select>
                    <option>Select...</option>
                  </Form.Select>
                </td>
                <td>
                  <Form.Select>
                    <option>Select...</option>
                  </Form.Select>
                </td>
                <td>
                  <Form.Select>
                    <option>Select...</option>
                  </Form.Select>
                </td>
              </tr>
            ))}
            {atividades.length === 0 && (
              <tr className="row-white">
                <td colSpan={8} className="text-center text-muted">
                  Nenhuma atividade encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default FormularioAtividades;
