import React from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

function MatrizRisco() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
       <div style={{
            background: 'linear-gradient(to right, #e6f0f7, #f7fafd)',
            minHeight: '100vh',
            width: '100vw', // <- FORÇA a largura a ocupar toda a tela
            marginTop: '56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem',
            boxSizing: 'border-box', // <- evita que o padding estoure a largura
        }}>
        <h2 className="mb-4" style={{ color: '#071744' }}>Matriz de Risco</h2>

        <Container fluid>
          <Form>
            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>Unidade (Matriz / Filial)</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>Setor</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Processo de Negócio</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Pontuação do Risco</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Risco / Fator de Risco</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={6}>
                <Form.Label>Controle existente</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Label>Tipo de controle</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Avaliação da Eficácia do controle</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Risco Residual</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
            </Row>

            <Row>
              <Col>
                <Form.Label>Resposta ao Risco</Form.Label>
                <Form.Control placeholder="Example" />
              </Col>
            </Row>
          </Form>
        </Container>
      </div>
    </div>
  );
}

export default MatrizRisco;

