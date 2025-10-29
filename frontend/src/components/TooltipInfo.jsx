import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaRegQuestionCircle } from 'react-icons/fa';
import '../estilos/tooltip.css';

/**
 * TooltipInfo
 * Ícone de interrogação com tooltip explicativo.
 *
 * Props:
 * - message: string — texto exibido no tooltip
 * - size: número — tamanho do ícone (default 14)
 * - color: string — cor do ícone (default "#fff")
 */
function TooltipInfo({ message, size = 14, color = '#fff' }) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id="tooltip-info" className="custom-tooltip">
          {message}
        </Tooltip>
      }
    >
      <span
        style={{
          marginLeft: '6px',
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <FaRegQuestionCircle size={size} color={color} />
      </span>
    </OverlayTrigger>
  );
}

export default TooltipInfo;
