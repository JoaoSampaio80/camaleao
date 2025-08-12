import React from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

function Cadastro() {
 
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
        Cadastro de Usuário
      </h2>

        {/* Formulário */}
      <Container fluid style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
        <Form>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Usuário</Form.Label>
              <Form.Control type="text"name="username" placeholder="Digite nome de usuário" />
            </Col>
            <Col md={6}>
              <Form.Label>E-mail</Form.Label>
              <Form.Control type="email" name="email" placeholder="Digite o e-mail" />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Nome</Form.Label>
              <Form.Control type="text" name="first_name" placeholder="Digite o nome " />
            </Col>
             <Col md={6}>
              <Form.Label>Telefone</Form.Label>
              <Form.Control type="tel" name="phone_number" placeholder="(xx) xxxxx-xxxx" />
            </Col>
          </Row>


          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Cargo</Form.Label>
              <Form.Control type="text"name="job_title" placeholder="Digite o cargo" />
            </Col>
             <Col md={6}>
              <Form.Label>Tipo Usuário</Form.Label>
              <Form.Select name="role" required>
                <option value="">Selecione...</option>
                <option value="administrador">Administrador</option>
                <option value="dpo">DPO</option>
                 <option value="gerente">Gerente</option>
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Data da Nomeação</Form.Label>
              <Form.Control type="date" name="appointment_date " />
            </Col>
            <Col md={6}>
              <Form.Label>Validade da Nomeação</Form.Label>
              <Form.Control type="date" name="appointment_validity" />
            </Col>
          </Row>

           <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Senha</Form.Label>
              <Form.Control type="password" name="password" placeholder="Digite a senha" />
            </Col>
          </Row>


          <div className="d-flex justify-content-end mt-4">
            <Button variant="primary" type="submit">
              Salvar
            </Button>
          </div>
        </Form>
        </Container>
      </div>
    </div>
  );
}

export default Cadastro;