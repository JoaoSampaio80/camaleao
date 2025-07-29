import Sidebar from '../components/Sidebar';

function Dashboard() {
  return (
    <div className="d-flex">
      <Sidebar />
      <main className="p-4" style={{ flex: 1 }}>
        <h2>Dashboard</h2>
        <p>Visão geral dos dados da LGPD aqui.</p>
      </main>
    </div>
  );
}

export default Dashboard;
