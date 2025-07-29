import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar, Offcanvas, Button, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faBars, faRightFromBracket, faUser, faHouse,
  faUserShield, faClipboardCheck, faFileAlt, faDatabase,
  faExclamationTriangle, faChartLine, faBell, faUserSecret
} from '@fortawesome/free-solid-svg-icons';
import logo from '/logo.png';

const storedUser = localStorage.getItem('user');
const user = storedUser ? JSON.parse(storedUser) : { nome: 'Usuário', email: '' };

function Sidebar() {
  const [show, setShow] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const navLinks = [
    { to: "/Dashboard", icon: faTachometerAlt, label: "Dashboard" },
    { to: "/Relatorios", icon: faChartLine, label: "Relatórios" },
    { to: "/Checklist", icon: faClipboardCheck, label: "Checklist" },
    { to: "/Notificacao", icon: faBell, label: "Notificação" },
    { to: "/Encarregado", icon: faUserShield, label: "Encarregado" },
    { to: "/Monitoramento", icon: faUserSecret, label: "Monitoramento" },
    { to: "/Documentos", icon: faFileAlt, label: "Documentos" },
    { to: "/InventarioDados", icon: faDatabase, label: "Inventário de Dados" },
    { to: "/MatrizRisco", icon: faExclamationTriangle, label: "Matriz de Risco" }
  ];

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

            <Button as={Link} to="/Home" style={{
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
                <strong>{user.nome}</strong><br />
                <small>{user.email}</small>
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
          <Nav className="flex-column">
            {navLinks.map(({ to, icon, label }) => (
              <Nav.Link
                key={to}
                as={Link}
                to={to}
                onClick={handleClose}
                className={`sidebar-link d-flex align-items-center ${location.pathname === to ? 'active' : ''}`}
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








