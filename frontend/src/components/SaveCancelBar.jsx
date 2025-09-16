import React from 'react';
import { Button, Spinner } from 'react-bootstrap';

export default function SaveCancelBar({
  onSave,
  onCancel,
  disabled = false,
  saving = false,
  className = '',
  btnClassName = 'btn-white-custom', // padroniza com o restante do app
  ...rest
}) {
  return (
    <div className={`d-flex justify-content-end gap-2 ${className}`} {...rest}>
      <Button
        type="button"
        className={btnClassName}
        variant="outline-secondary"
        onClick={onCancel}
        disabled={saving}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        className={btnClassName}
        variant="primary"
        onClick={onSave}
        disabled={disabled || saving}
        aria-live="polite"
      >
        {saving ? (
          <>
            <Spinner size="sm" className="me-2" /> Salvando…
          </>
        ) : (
          'Salvar'
        )}
      </Button>
    </div>
  );
}
