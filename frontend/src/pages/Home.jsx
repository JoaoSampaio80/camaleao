import { Card, Row, Col, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserShield, faClipboardCheck, faFileAlt, faTachometerAlt,
  faDatabase, faExclamationTriangle, faChartLine, faBell, faUserSecret
} from '@fortawesome/free-solid-svg-icons';

const cardData = [
  { title: 'Encarregado', icon: faUserShield, path: '/Encarregado' },
  { title: 'Monitoramento', icon: faUserSecret, path: '/Monitoramento' },
  { title: 'Checklist', icon: faClipboardCheck, path: '/Checklist' },
  { title: 'Documentos', icon: faFileAlt, path: '/Documentos' },
  { title: 'Dashboards', icon: faTachometerAlt, path: '/Dashboard' },
  { title: 'Inventário de Dados', icon: faDatabase, path: '/InventarioDados' },
  { title: 'Matriz de Risco', icon: faExclamationTriangle, path: '/MatrizRisco' },
  { title: 'Relatórios', icon: faChartLine, path: '/Relatorios' },
  { title: 'Notificação', icon: faBell, path: '/Notificacao' }
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{   
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(to bottom, #e6f0ff, #f2f4f6)',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover'
    }}>
      {/* Cabeçalho */}
      <header style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        backgroundColor: '#071744',
        padding: '12px 24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
      }}>
        <img src="/logo.png" alt="Logo" style={{ height: '35px', marginRight: '15px' }} />
        <div style={{ flexGrow: 1, textAlign: 'center', marginRight: '50px' }}>
          <h3 className="mb-0" style={{ fontSize: '1.4rem' }}>Gestão de documentos LGPD</h3>
        </div>
      </header>

      {/* Conteúdo principal com ajuste de altura */}
      <div style={{
        paddingTop: '80px',
        minHeight: 'calc(100vh - 80px)', // altura total menos o cabeçalho
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Container fluid className="py-5 px-4">
          <Row className="g-3 justify-content-center">
            {cardData.map((card, idx) => (
              <Col key={idx} xs={12} sm={6} md={4} lg={4} className="d-flex justify-content-center mb-3">
                <Card
                  className="text-white text-center shadow-sm"
                  onClick={() => navigate(card.path)}
                  style={{
                    backgroundColor: '#071744',
                    cursor: 'pointer',
                    width: '160px',
                    height: '120px',
                    alignItems: 'center',
                    borderRadius: '12px',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                  }}
                >
                  <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                    <FontAwesomeIcon icon={card.icon} size="lg" className="mb-2" />
                    <Card.Title style={{ fontSize: '1rem', fontWeight: '500' }}>{card.title}</Card.Title>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Home;


