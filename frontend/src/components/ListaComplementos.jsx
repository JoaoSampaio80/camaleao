// src/components/ListaComplementos.jsx
import React from 'react';
import { Form } from 'react-bootstrap';

function ListaComplementos({ complementos, setComplementos }) {
  const handleChange = (index, field, value) => {
    const updated = [...complementos];
    updated[index][field] = value;
    setComplementos(updated);
  };

  return (
    <div className="lista-complementos-wrapper">
      {complementos.map((c, idx) => (
        <div
          key={idx}
          className="p-3 mb-3 rounded"
          style={{
            background: '#05285e',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <h6 className="text-white fw-bold mb-2">
            {c.acao ? c.acao : `Ação ${idx + 1}`}
          </h6>

          <Form.Group className="mb-3">
            <Form.Label className="text-white">Como</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={c.como}
              onChange={(e) => handleChange(idx, 'como', e.target.value)}
              placeholder="Descreva como executar a ação..."
            />
          </Form.Group>

          <div className="row">
            <div className="col-md-4 mb-3">
              <Form.Label className="text-white">Responsável</Form.Label>
              <Form.Control
                value={c.responsavel}
                onChange={(e) => handleChange(idx, 'responsavel', e.target.value)}
                placeholder="Ex.: Gerente de TI"
              />
            </div>
            <div className="col-md-4 mb-3">
              <Form.Label className="text-white">Prazo</Form.Label>
              <Form.Control
                type="date"
                value={c.prazo}
                onChange={(e) => handleChange(idx, 'prazo', e.target.value)}
              />
            </div>
            <div className="col-md-4 mb-3">
              <Form.Label className="text-white">Status</Form.Label>
              <Form.Select
                value={c.status}
                onChange={(e) => handleChange(idx, 'status', e.target.value)}
              >
                <option value="nao_iniciado">Não iniciado</option>
                <option value="andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </Form.Select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListaComplementos;
