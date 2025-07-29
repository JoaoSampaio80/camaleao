import React from 'react';
import Sidebar from '../components/Sidebar';

function Documentos() {
  return (
    <div className="d-flex">
      <Sidebar />
      <main className="p-4" style={{ flex: 1 }}>
        <h2>Documentos</h2>
        <p>Conteúdo de documentos em construção...</p>
      </main>
    </div>
  );
}

export default Documentos;
