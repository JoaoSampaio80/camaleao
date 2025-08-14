import React, { useState, useEffect } from 'react';
import { Table, Container, Form, Spinner } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';

function Checklist() {
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect para carregar os dados do backend quando o componente for montado
  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const response = await AxiosInstance.get('checklists/');
        setChecklist(response.data);
      } catch (error) {
        console.error('Erro ao buscar o checklist:', error.response ? error.response.data : error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, []);

  // Função para lidar com a mudança do estado do checkbox
  const handleCheckChange = async (id, is_completed) => {
    // Cria uma cópia do checklist para atualização otimista (UI)
    const updatedChecklist = checklist.map(item =>
      item.id === id ? { ...item, is_completed: !is_completed } : item
    );
    setChecklist(updatedChecklist);

    // Faz a requisição PATCH para atualizar o item no backend
    try {
      await AxiosInstance.patch(`checklists/${id}/`, {
        is_completed: !is_completed,
      });
    } catch (error) {
      console.error('Erro ao atualizar o checklist:', error.response ? error.response.data : error.message);
      // Em caso de erro, reverte a UI para o estado anterior
      setChecklist(checklist);
      alert('Não foi possível atualizar o item. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

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
              {checklist.map((item) => (
                <tr key={item.id}>
                  <td>{item.atividade}</td>
                  <td>{item.descricao}</td>
                  <td className="text-center">
                    <Form.Check
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleCheckChange(item.id, item.is_completed)}
                    />
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