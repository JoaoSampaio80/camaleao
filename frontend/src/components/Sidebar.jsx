import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Nav,
  Navbar,
  Offcanvas,
  Button,
  Dropdown,
  Badge,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt,
  faBars,
  faRightFromBracket,
  faUser,
  faHouse,
  faUserShield,
  faClipboardCheck,
  faFileAlt,
  faDatabase,
  faExclamationTriangle,
  faChartLine,
  faBell,
  faUserSecret,
  faUserPlus,
  faList,
  faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../routes';

const ROLE_LABEL = {
  admin: 'Administrador',
  dpo: 'DPO',
  gerente: 'Gerente',
};

// Avatar com fallback no ícone
function AvatarImg({ src, className, iconColor = 'white' }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <FontAwesomeIcon icon={faUser} size="lg" style={{ color: iconColor }} />;
  }
  return (
    <img
      src={src}
      alt="Avatar do usuário"
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

function Sidebar() {
  const [show, setShow] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();

  const isAdmin = !!user && user.role === 'admin';

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const navLinks = [
    { to: ROUTES.DASHBOARD, icon: faTachometerAlt, label: 'Dashboard' },
    { to: ROUTES.RELATORIOS, icon: faChartLine, label: 'Relatórios' },
    { to: ROUTES.CHECKLIST, icon: faClipboardCheck, label: 'Checklist' },
    { to: ROUTES.NOTIFICACOES, icon: faBell, label: 'Notificação' },
    { to: ROUTES.ENCARREGADO, icon: faUserShield, label: 'Encarregado' },
    { to: ROUTES.MONITORAMENTO, icon: faUserSecret, label: 'Monitoramento' },
    { to: ROUTES.DOCUMENTOS, icon: faFileAlt, label: 'Documentos' },
    { to: ROUTES.INVENTARIO_DADOS, icon: faDatabase, label: 'Inventário de Dados' },
    { to: ROUTES.INVENTARIO_LISTA, icon: faList, label: 'Lista Inventários' },
    { to: ROUTES.MATRIZ_RISCO, icon: faExclamationTriangle, label: 'Matriz de Risco' },
    { to: ROUTES.CALENDARIO, icon: faCalendarAlt, label: 'Calendário' },
    {
      to: ROUTES.CADASTRO,
      icon: faUserPlus,
      label: 'Cadastro de Usuário',
      adminOnly: true,
    },
    { to: ROUTES.PERFIL, icon: faUser, label: 'Meu Perfil' },
  ];

  const filteredNavLinks = navLinks.filter(
    (link) => !link.adminOnly || (!loading && isAdmin)
  );
  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const userName = loading ? 'Carregando...' : user?.first_name || '-';
  const userEmail = loading ? 'carregando...' : user?.email || '-';
  const userRole = loading ? '' : ROLE_LABEL[user?.role] || '';

  return (
    <>
      {/* Estilos mínimos só para tamanhos do avatar */}
      <style>{`
        .avatar-btn{ display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; padding:0; }
        .avatar-img{ border-radius:50%; object-fit:cover; width:36px; height:36px; display:block; }
        .avatar-mini{ border-radius:50%; object-fit:cover; width:32px; height:32px; }
      `}</style>

      {/* NAVBAR */}
      <Navbar className="navbar-gradient" variant="dark" fixed="top">
        <Container fluid className="justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Button
              onClick={handleShow}
              className="ghost-btn white-border"
              aria-label="Abrir menu lateral"
            >
              <FontAwesomeIcon icon={faBars} />
            </Button>

            <Button
              as={Link}
              to={ROUTES.HOME}
              className="ghost-btn white-border d-flex align-items-center"
              aria-label="Ir para a página inicial"
            >
              <FontAwesomeIcon icon={faHouse} size="lg" />
            </Button>
          </div>

          <Navbar.Brand className="ms-3 d-flex align-items-center gap-2 white-text">
            <span>Gestão de Documentos LGPD</span>
          </Navbar.Brand>

          <Dropdown align="end">
            <Dropdown.Toggle
              as="button"
              type="button"
              className="avatar-btn"
              aria-label="Abrir menu do usuário"
              aria-haspopup="menu"
              aria-expanded="false"
            >
              <AvatarImg src={user?.avatar} className="avatar-img" />
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Header>
                <div className="d-flex align-items-center gap-2">
                  <AvatarImg
                    src={user?.avatar}
                    className="avatar-mini"
                    iconColor="#6c757d"
                  />
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
                </div>
              </Dropdown.Header>
              <Dropdown.Divider />
              <Dropdown.Item as={Link} to={ROUTES.PERFIL}>
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Meu Perfil
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} className="me-2" />
                Sair
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </Navbar>

      {/* SIDEBAR (Offcanvas) */}
      <Offcanvas
        show={show}
        onHide={handleClose}
        placement="start"
        style={{ width: '220px' }}
        className="sidebar-offcanvas"
        aria-label="Menu lateral de navegação"
      >
        <Offcanvas.Header closeButton className="offcanvas-header-gradient">
          <div className="w-100 text-center fw-bold">Gestão de Documentos</div>
        </Offcanvas.Header>

        <Offcanvas.Body className="px-3 py-2">
          <Nav className="flex-column">
            {filteredNavLinks.map(({ to, icon, label }) => (
              <Nav.Link
                key={to}
                as={Link}
                to={to}
                onClick={handleClose}
                className={`sidebar-link d-flex align-items-center ${isActive(to) ? 'active' : ''}`}
                aria-label={`Ir para ${label}`}
              >
                <FontAwesomeIcon icon={icon} className="fa-icon" aria-hidden="true" />
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
