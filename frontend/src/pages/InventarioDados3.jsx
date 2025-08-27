import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';

function InventarioDados3() {
  const navigate = useNavigate();
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#d6f3f9',
          minHeight: '100vh',
          width: '100vw',
          marginTop: '56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        <h2 className="mb-4"style={{color:'#071744' }}>Inventário de dados</h2>

        <Container fluid style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
          <Form>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>Adequado Contratualmente?</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Países Envolvidos no Tratamento</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
              <Form.Label>Medidas de Segurança Envolvidas</Form.Label>
              <Form.Control placeholder="TextField" />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
              <Form.Label>Consentimentos</Form.Label>
              <Form.Control placeholder="TextField" />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
              <Form.Label>Observação</Form.Label>
              <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button variant="primary"  onClick={() => navigate(ROUTES.INVENTARIO_DADOS2)}>Voltar</Button>
              <Button variant="primary">salvar</Button>
            </div>

          </Form>
        </Container>
      </div>
    </div>
  );
}

export default InventarioDados3;