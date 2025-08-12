import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

function InventarioDados2() {
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
              <Col md={6}>
                <Form.Label>Pessoas com acesso</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={6}>
                <Form.Label>Atualizações (Quando ocorrem?)</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Transmissão Interna</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Transmissão Externa</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>Local de Armazenamento (Digital)</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={4}>
                <Form.Label>Controlador / Operador</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Motivo de Retenção</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>Período de Retenção</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Exclusão</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Forma de exclusão</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Ocorre transferência para terceiros?</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Quais dados são transferidos?</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={6}>
                <Form.Label>Ocorre Transferência Internacional?</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col>
                <Form.Label>Empresa terceira</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Button variant="primary"  onClick={() => navigate('/inventarioDados')}>Voltar</Button>
              <Button variant="primary"  onClick={() => navigate('/inventarioDados3')}>Próxima Página</Button>
            </div>

          </Form>
        </Container>
      </div>
    </div>
  );
}

export default InventarioDados2;