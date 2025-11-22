import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const lastRun = localStorage.getItem('overdue_check_date');
      const today = new Date().toISOString().slice(0, 10);

      if (lastRun === today) return;

      try {
        await AxiosInstance.post('/overdue/ensure/');
        localStorage.setItem('overdue_check_date', today);
      } catch (e) {
        console.warn('Erro ao verificar atrasados:', e);
      }
    })();
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      {/* CAMADA PRINCIPAL */}
      <main
        className="d-flex justify-content-center align-items-center"
        role="main"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* CAMADA DE FUNDO - SÓ A IMAGEM FICA TRANSPARENTE */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('logoHome.png')`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundSize: '65%', // ⬅️ AUMENTA A LARGURA DA IMAGEM
            opacity: 0.18, // ⬅️ TRANSPARÊNCIA DA IMAGEM
            zIndex: 0,
            pointerEvents: 'none', // fundo não atrapalha clique
          }}
        ></div>

        {/* CAMADA DO TEXTO - NÃO FICA TRANSPARENTE */}
        <div className="text-center" style={{ zIndex: 1 }}>
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
