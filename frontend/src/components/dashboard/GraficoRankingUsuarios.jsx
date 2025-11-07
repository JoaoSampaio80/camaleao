import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import SectionHeader from '../SectionHeader';
import AxiosInstance from '../../components/Axios';

// 🔹 Define localmente apenas as cores necessárias
const COLORS = {
  info: '#0288d1',
  darkTitle: '#071744',
};

export default function GraficoRankingUsuarios({ data = [] }) {
  const [ranking, setRanking] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Carrega o ranking inicial (Top 10) na primeira montagem
  useEffect(() => {
    const fetchTop10 = async () => {
      setLoading(true);
      try {
        const { data } = await AxiosInstance.get('/dashboard/?limit=10');
        setRanking(data.rankingUsuarios || []);
      } catch (err) {
        console.error('Erro ao carregar ranking inicial:', err);
        setRanking([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTop10();
  }, []);

  // 🔹 Alterna entre Top 10 e Todos
  const toggleRanking = async () => {
    setLoading(true);
    try {
      const limit = showAll ? 10 : 999;
      const { data } = await AxiosInstance.get(`/dashboard/?limit=${limit}`);
      setRanking(data.rankingUsuarios || []);
      setShowAll(!showAll);
    } catch (err) {
      console.error('Erro ao alternar ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const titulo = showAll
    ? 'Todos os Usuários Mais Ativos'
    : 'Top 10 Usuários Mais Ativos';

  return (
    <Card
      className="shadow-sm mb-3"
      style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, #E8F5E9, #52DEE5)',
      }}
    >
      <Card.Body>
        <div
          className="d-flex justify-content-between align-items-center mb-2"
          style={{ marginBottom: '0.5rem' }}
        >
          <SectionHeader title={titulo} />
          <Button
            size="sm"
            variant="outline-primary"
            onClick={toggleRanking}
            disabled={loading}
            style={{
              fontWeight: 500,
              borderRadius: 12,
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              color: COLORS.darkTitle,
              borderColor: COLORS.info,
            }}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : showAll ? (
              'Mostrar Top 10'
            ) : (
              'Ver Todos'
            )}
          </Button>
        </div>

        <div style={{ width: '100%', height: 600 }}>
          <ResponsiveContainer>
            <BarChart data={ranking}>
              <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(value) => [`${value} acessos`, 'Total']}
                labelFormatter={(label) => `Usuário: ${label}`}
              />
              <Bar dataKey="acessos" fill={COLORS.info} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
}
