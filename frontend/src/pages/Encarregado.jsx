import React from 'react';
import Sidebar from '../components/Sidebar';

function Encarregado() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      {/* Conteúdo principal */}
      <div style={{
          background: 'linear-gradient(to right, #e6f0f7, #f7fafd)',
          minHeight: '100vh',
          width: '100vw', // <- FORÇA a largura a ocupar toda a tela
          marginTop: '56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          boxSizing: 'border-box', // <- evita que o padding estoure a largura
      }}>
        {/* Título centralizado fora do card */}
        <h2 className="text-center mb-4">Informações e Contato do Encarregado de Dados</h2>

        {/* Card com dados */}
        <div
          className="bg-white rounded shadow p-4"
          style={{
            maxWidth: '700px',
            width: '100%'
          }}
        >
          <div className="row">
            <div className="col-md-6 mb-2">
              <strong>Nome:</strong><br />
              Albert Einstein
            </div>
            <div className="col-md-6 mb-2">
              <strong>E-mail:</strong><br />
              dpo@empresa.org.br
            </div>
            <div className="col-md-6 mb-2">
              <strong>Telefone:</strong><br />
              (21) 3397-0665
            </div>
            <div className="col-md-6 mb-2">
              <strong>Data da Nomeação:</strong><br />
              15/02/2024
            </div>
            <div className="col-md-6 mb-2">
              <strong>Validade da Nomeação:</strong><br />
              2 anos
            </div>
            <div className="col-md-6 mb-2">
              <strong>Cargo:</strong><br />
              Gerente de operações
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Encarregado;

