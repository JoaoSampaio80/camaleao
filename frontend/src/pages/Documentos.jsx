import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

function Documentos() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#d6f3f9', // fundo azul claro da imagem
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
        <h2 className="mb-4" style={{ color: '#071744',}}>
          Documentos
        </h2>

        <Container fluid style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
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
                <Form.Label>Responsável (E-mail)</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Processo de Negócio</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Finalidade</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Dados pessoais coletados / tratados</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>Tipo de dado</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>Origem</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
              <Col md={3}>
                <Form.Label>Formato</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>Impresso?</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label>Titulares dos dados</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>Dados de menores</Form.Label>
                <Form.Select>
                  <option>Select...</option>
                </Form.Select>
              </Col>
              <Col md={9}>
                <Form.Label>Base Legal</Form.Label>
                <Form.Control placeholder="TextField" />
              </Col>
            </Row>

            <div className="d-flex justify-content-end">
              <Button variant="primary" onClick={() => navigate('/inventarioDados2')}>
                Próxima Página
              </Button>
            </div>
          </Form>
        </Container>
      </div>
    </div>
  );
}

export default Documentos;