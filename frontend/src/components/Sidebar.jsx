import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar, Offcanvas, Button, Dropdown, Badge, } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faBars, faRightFromBracket, faUser, faHouse, faUserShield, faClipboardCheck, faFileAlt, faDatabase,
  faExclamationTriangle, faChartLine, faBell, faUserSecret, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../routes';
import logo from '/logo.png';

const ROLE_LABEL = {
  admin: 'Administrador',
  dpo: 'DPO',
  gerente: 'Gerente',
};

function Sidebar() {
  const [show, setShow] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();

  const isAdmin = !!user && user.role === 'admin'

  // console.log('Cargo do usuário:', user.role);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  
  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, {replace: true});
  };

  const navLinks = [
    { to: ROUTES.DASHBOARD, icon: faTachometerAlt, label: "Dashboard" },
    { to: ROUTES.RELATORIOS, icon: faChartLine, label: "Relatórios" },
    { to: ROUTES.CHECKLIST, icon: faClipboardCheck, label: "Checklist" },
    { to: ROUTES.NOTIFICACOES, icon: faBell, label: "Notificação" },
    { to: ROUTES.ENCARREGADO, icon: faUserShield, label: "Encarregado" },
    { to: ROUTES.MONITORAMENTO, icon: faUserSecret, label: "Monitoramento" },
    { to: ROUTES.DOCUMENTOS, icon: faFileAlt, label: "Documentos" },
    // Alterado para a rota pai do inventário
    { to: ROUTES.INVENTARIO_DADOS, icon: faDatabase, label: "Inventário de Dados" }, 
    { to: ROUTES.MATRIZ_RISCO, icon: faExclamationTriangle, label: "Matriz de Risco" },
    { to: ROUTES.CADASTRO, icon: faUserPlus, label: "Cadastro de Usuário", adminOnly: true },
    { to: ROUTES.PERFIL, icon: faUser, label: "Meu Perfil" },
  ];

  // Esconde itens adminOnly enquanto loading estiver true e para quem não é admin
  const filteredNavLinks = navLinks.filter(link => {
    return !link.adminOnly ||  (!loading && isAdmin)    
  });

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  const userName = loading ? 'Carregando...' : (user?.first_name || '-');
  const userEmail = loading ? 'carregando...' : (user?.email || '-');
  const userRole = loading ? '' : (ROLE_LABEL[user?.role] || '');

  return (
    <>
      <style>{`
        .sidebar-link {
          color: #071744 !important;
          font-size: 1.05rem;
          padding: 10px 12px;
          border-radius: 6px;
          text-decoration: none;
          transition: background-color 0.2s, color 0.2s;
        }

        .sidebar-link:hover {
          background-color: #d9eaff;
          color: #071744 !important;
        }

        .sidebar-link.active {
          background-color: #007bff;
          color: white !important;
        }

        .fa-icon {
          margin-right: 10px;
        }

        .sidebar-offcanvas {
          background-color: white;
        }

        .offcanvas-header {
          background-color: #071744;
          color: white;
        }

        .offcanvas-header .btn-close {
          filter: invert(1);
        }
      `}</style>

      <Navbar style={{ backgroundColor: '#071744' }} variant="dark" fixed="top">
        <Container fluid className="justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Button onClick={handleShow} style={{
              backgroundColor: 'transparent',
              border: '1px solid white',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px'
            }}>
              <FontAwesomeIcon icon={faBars} />
            </Button>

            <Button as={Link} to={ROUTES.HOME} style={{
              backgroundColor: 'transparent',
              border: '1px solid white',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px'
            }}
              className="d-flex align-items-center">
              <FontAwesomeIcon icon={faHouse} />
            </Button>
          </div>

          <Navbar.Brand className="ms-3">Gestão de Documentos LGPD</Navbar.Brand>

          <Dropdown align="end">
            <Dropdown.Toggle as="button" className="text-white border-0 p-0" style={{
              backgroundColor: 'transparent',
              padding: '6px 10px'
            }}>
              <FontAwesomeIcon icon={faUser} size="lg" />
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Header>
                <div className="d-flex flex-column">
                  <strong className="mb-1">
                    {userName}{' '}
                    {!loading && userRole && (
                      <Badge bg="secondary" pill title={user?.role}>
                        {userRole}
                      </Badge>
                    )}
                  </strong>
                  <small>{userEmail}</small>
                </div>
              </Dropdown.Header>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} className="me-2" />
                Sair
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </Navbar>

      <Offcanvas
        show={show}
        onHide={handleClose}
        placement="start"
        style={{ width: '220px' }}
        className="sidebar-offcanvas"
      >
        <Offcanvas.Header closeButton className="offcanvas-header">
          <div className="w-100 text-center fw-bold">
            Gestão de Documentos
          </div>
        </Offcanvas.Header>

        <Offcanvas.Body className="px-3 py-2">

          {/* info do usuário no topo do menu lateral (opcional)
          <div className="mb-3 px-2">
            {loading ? (
              <div className="d-flex align-items-center gap-2 text-muted">
                <Spinner size="sm" /> carregando usuário…
              </div>
            ) : (
              <>
                <div className="fw-semibold">{user?.first_name || '-'}</div>
                <div className="small text-muted">{user?.email || '-'}</div>
                {userRole && <div className="small"><Badge bg="secondary" pill>{userRole}</Badge></div>}
              </>
            )}
          </div> */}

          <Nav className="flex-column">
            {filteredNavLinks.map(({ to, icon, label }) => (
              <Nav.Link
                key={to}
                as={Link}
                to={to}
                onClick={handleClose}
                className={`sidebar-link d-flex align-items-center ${isActive(to) ? 'active' : ''}`}
              >
                <FontAwesomeIcon icon={icon} className="fa-icon" />
                {label}
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Sidebar;