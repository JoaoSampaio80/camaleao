import Sidebar from '../components/Sidebar';

function Reports() {
  return (
    <div className="d-flex">
      <Sidebar />
      <main className="p-4" style={{ flex: 1 }}>
        <h2>Relatórios</h2>
        <p>Visualização de relatórios aqui.</p>
      </main>
    </div>
  );
}

export default Reports;

