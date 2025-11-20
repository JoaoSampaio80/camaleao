import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('O componente Home foi renderizado!');

    (async () => {
      const lastRun = localStorage.getItem('overdue_check_date');
      const today = new Date().toISOString().slice(0, 10);

      if (lastRun === today) {
        console.log('Verificação de ações atrasadas já executada hoje.');
        return;
      }

      try {
        await AxiosInstance.post('/overdue/ensure/');
        console.log('Verificação de ações atrasadas executada com sucesso.');
        localStorage.setItem('overdue_check_date', today);
      } catch (e) {
        console.warn('Falha ao garantir atualização de atrasados:', e?.message || e);
      }
    })();
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <main
        className="home-content d-flex justify-content-center align-items-center"
        role="main"
      >
        <div className="text-center">
          <h2 className="fw-bold" style={{ color: '#003366' }}>
            Bem-vindo(a) ao Sistema Camaleão
          </h2>

          <p style={{ fontSize: '1.1rem', marginTop: '10px', color: '#005b96' }}>
            Utilize o menu lateral para navegar entre os módulos.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Home;
