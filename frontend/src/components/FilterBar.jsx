import React from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';
import '../estilos/filterbar.css';

export default function FilterBar({
  search,
  pageSize,
  filters = [],
  onClearFilters,
  renderPagination,
  extraActions, // << adicionado aqui
}) {
  return (
    <div className="filterbar-container">
      <Form className="filters-on-gradient mb-3" onSubmit={(e) => e.preventDefault()}>
        <Row className="g-2 align-items-end">
          {search && (
            <Col md={5}>
              <Form.Label>Buscar</Form.Label>
              <Form.Control
                placeholder={search.placeholder || 'Buscar...'}
                value={search.value || ''}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </Col>
          )}

          {pageSize && (
            <Col md="auto">
              <Form.Label>Itens por página</Form.Label>
              <Form.Select
                value={pageSize.value}
                onChange={(e) => pageSize.onChange(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Form.Select>
            </Col>
          )}

          {/* Botões extras (ex: +Novo) */}
          {extraActions && (
            <Col md="auto" className="d-flex align-items-end">
              {extraActions}
            </Col>
          )}

          <Col className="d-flex justify-content-end">
            {renderPagination && renderPagination()}
          </Col>
        </Row>

        {filters.length > 0 && (
          <Row className="g-2 mt-2 align-items-end">
            {filters.map((f) => (
              <Col md={f.col || 3} key={f.key || f.label}>
                <Form.Label>{f.label}</Form.Label>
                {f.render ? (
                  f.render
                ) : f.options ? (
                  <Form.Select
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                  >
                    <option value="">{f.emptyOption || 'Todos'}</option>
                    {f.options.map(([val, text]) => (
                      <option key={val} value={val}>
                        {text}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    value={f.value}
                    placeholder={f.placeholder}
                    onChange={(e) => f.onChange(e.target.value)}
                  />
                )}
              </Col>
            ))}

            {/* botão agora na MESMA LINHA dos filtros */}
            <Col md="auto" className="d-flex align-items-end">
              <Button
                className="btn-white-custom"
                variant="light"
                size="sm"
                onClick={onClearFilters}
              >
                Limpar filtros
              </Button>
            </Col>
          </Row>
        )}
      </Form>
    </div>
  );
}
