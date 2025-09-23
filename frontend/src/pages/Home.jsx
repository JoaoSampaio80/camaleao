import React, { useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserShield,
  faClipboardCheck,
  faFileAlt,
  faTachometerAlt,
  faDatabase,
  faExclamationTriangle,
  faChartLine,
  faBell,
  faUserSecret,
} from '@fortawesome/free-solid-svg-icons';
import Sidebar from '../components/Sidebar'; // ajuste o caminho se sua estrutura for diferente
import { ROUTES } from '../routes';

function Home() {
  const navigate = useNavigate();

  const cardData = [
    { title: 'Encarregado', icon: faUserShield, path: ROUTES.ENCARREGADO },
    { title: 'Monitoramento', icon: faUserSecret, path: ROUTES.MONITORAMENTO },
    { title: 'Checklist', icon: faClipboardCheck, path: ROUTES.CHECKLIST },
    { title: 'Documentos', icon: faFileAlt, path: ROUTES.DOCUMENTOS },
    { title: 'Dashboards', icon: faTachometerAlt, path: ROUTES.DASHBOARD },
    { title: 'Inventário de Dados', icon: faDatabase, path: ROUTES.INVENTARIO_DADOS },
    { title: 'Matriz de Risco', icon: faExclamationTriangle, path: ROUTES.MATRIZ_RISCO },
    { title: 'Relatórios', icon: faChartLine, path: ROUTES.RELATORIOS },
    { title: 'Notificação', icon: faBell, path: ROUTES.NOTIFICACOES },
  ];

  useEffect(() => {
    console.log('O componente Home foi renderizado!');
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      {/* área central ocupando a tela e mantendo o grid no meio */}
      <main className="home-content">
        <div className="home-center">
          <div className="home-grid">
            {cardData.map((card, idx) => (
              <Card
                key={idx}
                className="home-card text-white text-center shadow-sm "
                onClick={() => navigate(card.path)}
              >
                <Card.Body className="home-card-body">
                  <FontAwesomeIcon icon={card.icon} size="lg" className="mb-2" />
                  <Card.Title className="home-card-title">{card.title}</Card.Title>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
