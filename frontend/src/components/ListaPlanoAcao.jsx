import React from 'react';
import { Button, Form, Row, Col } from 'react-bootstrap';
import { FaTrashAlt, FaPlus } from 'react-icons/fa';

/**
 * Componente de lista dinâmica de planos de ação (usado na tela de Avaliação de Risco)
 * Mantém compatibilidade com o backend (campo resposta_risco como texto \n)
 */
function ListaPlanoAcao({ value = [], onChange }) {
  const handleAdd = () => {
    onChange([...value, '']);
  };

  const handleRemove = (idx) => {
    const nova = value.filter((_, i) => i !== idx);
    onChange(nova);
  };

  const handleChange = (idx, val) => {
    const nova = [...value];
    nova[idx] = val;
    onChange(nova);
  };

  return (
    <div
      style={{
        background: '#f8f9fa',
        borderRadius: '10px',
        padding: '1rem',
        border: '1px solid #dee2e6',
      }}
    >
      <h6
        style={{
          color: '#071744',
          fontWeight: 700,
          marginBottom: '1rem',
          fontSize: '15px',
        }}
      >
        Planos de Ação / Medidas Mitigadoras
      </h6>

      {value.length === 0 && (
        <p className="text-muted" style={{ fontStyle: 'italic' }}>
          Nenhum plano adicionado.
        </p>
      )}

      {value.map((item, idx) => (
        <Row key={idx} className="align-items-center mb-2">
          <Col xs={10}>
            <Form.Control
              type="text"
              placeholder={`Ação ${idx + 1}`}
              value={item}
              onChange={(e) => handleChange(idx, e.target.value)}
            />
          </Col>
          <Col xs={2} className="text-end">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleRemove(idx)}
              title="Remover ação"
            >
              <FaTrashAlt />
            </Button>
          </Col>
        </Row>
      ))}

      <div className="mt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleAdd}
          style={{
            background: 'linear-gradient(90deg, #003366, #005b96)',
            border: 'none',
          }}
        >
          <FaPlus className="me-1" /> Adicionar ação
        </Button>
      </div>
    </div>
  );
}

export default ListaPlanoAcao;
