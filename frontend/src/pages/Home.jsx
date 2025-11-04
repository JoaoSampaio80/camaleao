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
import Sidebar from '../components/Sidebar';
import { ROUTES } from '../routes';
import AxiosInstance from '../components/Axios';

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

    (async () => {
      const lastRun = localStorage.getItem('overdue_check_date');
      const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

      if (lastRun === today) {
        console.log('Verificação de ações atrasadas já executada hoje.');
        return;
      }

      try {
        await AxiosInstance.post('/overdue/ensure/'); // ✅ mantém POST
        console.log('Verificação de ações atrasadas executada com sucesso.');
        localStorage.setItem('overdue_check_date', today);
      } catch (e) {
        console.warn('Falha ao garantir atualização de atrasados:', e?.message || e);
      }
    })();
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <main className="home-content" role="main" aria-label="Página inicial">
        <div className="home-center">
          <div className="home-grid" role="navigation" aria-label="Menu principal">
            {cardData.map((card, idx) => (
              <Card
                key={idx}
                className="home-card text-white text-center shadow-sm"
                onClick={() => navigate(card.path)}
                role="button"
                tabIndex={0}
                aria-label={`Acessar seção ${card.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(card.path);
                }}
              >
                <Card.Body className="home-card-body">
                  <FontAwesomeIcon
                    icon={card.icon}
                    size="lg"
                    className="mb-2"
                    aria-hidden="true"
                  />
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
