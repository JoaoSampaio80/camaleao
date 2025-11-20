import Sidebar from '../components/Sidebar';

function Alerts() {
  return (
    <div className="d-flex">
      <Sidebar />

      <div
        style={{
          flex: 1,
          background: '#f5f5f5',
          padding: '2rem 0',
          marginTop: '56px',
        }}
      >
        {/* TÍTULO (centralizado, cor da identidade) */}
        <div className="text-center mb-3">
          <h2 style={{ color: '#071744', fontWeight: 700 }}>Avisos e Alertas</h2>
        </div>
        <p>
          <h3>Avisos sobre vencimento de documentos e prazos.</h3>
        </p>
        <p>Página em desenvolvimento...</p>
      </div>
    </div>
  );
}

export default Alerts;
