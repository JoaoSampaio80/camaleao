import Sidebar from '../components/Sidebar';

function Reports() {
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
          <h2 style={{ color: '#071744', fontWeight: 700 }}>
            Relatórios de Conformidade
          </h2>
        </div>
        <p>
          <h3>Página de Gestão de Relatórios.</h3>
        </p>
        <p>Página em desenvolvimento...</p>
      </div>
    </div>
  );
}

export default Reports;
