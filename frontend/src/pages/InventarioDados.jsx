import Sidebar from '../components/Sidebar';

function Inventario() {
  return (
    <div className="d-flex">
      <Sidebar />
      <main className="p-4" style={{ flex: 1 }}>
        <h2>Inventário</h2>
        <p>Conteúdo do inventário em construção...</p>
      </main>
    </div>
  );
}

export default Inventario;
