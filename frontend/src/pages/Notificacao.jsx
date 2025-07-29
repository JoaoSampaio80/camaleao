import Sidebar from '../components/Sidebar';

function Alerts() {
  return (
    <div className="d-flex">
      <Sidebar />
      <main className="p-4" style={{ flex: 1 }}>
        <h2>Avisos e Alertas</h2>
        <p>Avisos sobre vencimento de documentos e prazos.</p>
      </main>
    </div>
  );
}

export default Alerts;
