// src/components/PagRiscos.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../estilos/matriz.css';

// Rotas EXATAS que você definiu:
const TABS = [
  { label: 'Avaliação de Risco', path: '/matrizrisco' },
  { label: 'Ranking de Riscos', path: '/rankingrisco' },
  { label: 'Controle de Plano de Ação', path: '/controlplanoacao' },
  { label: 'Ações de monitoramento', path: '/acaomonitoramento' },
  { label: 'Controle de incidentes', path: '/controleincidentes' },
  { label: 'Heatmap', path: '/heatmap' },
];

export default function PaginacaoRiscos() {
  const { pathname } = useLocation();
  return (
    <nav className="risk-tabs-wrap" aria-label="Paginação de páginas de risco">
      <ul className="risk-tabs" role="tablist">
        {TABS.map((tab) => (
          <li key={tab.path} className="risk-tabs__item">
            <NavLink
              to={tab.path}
              className={'risk-tab' + (pathname === tab.path ? ' is-active' : '')}
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="risk-tabs__divider" />
    </nav>
  );
}
