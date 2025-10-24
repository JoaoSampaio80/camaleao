// src/pages/Calendar.jsx
import '../estilos/calendario.css';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Modal,
  Form,
  Badge,
  ButtonGroup,
  Dropdown,
  DropdownButton,
} from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import AxiosInstance from '../components/Axios';

export default function Calendar() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [events, setEvents] = useState({});
  const [view, setView] = useState('month');

  const [showModal, setShowModal] = useState(false);
  const [modalDateISO, setModalDateISO] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newText, setNewText] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ====== Estado e funções da visão semanal ======
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // domingo
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const gotoPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(weekStart.getDate() - 7);
    setWeekStart(prev);
  };

  const gotoNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  const getWeekNumber = (date) => {
    const tempDate = new Date(date);
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  };

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // =========================
  // 🔹 Buscar eventos do backend
  // =========================
  useEffect(() => {
    AxiosInstance.get('/calendarevent/')
      .then((res) => {
        const grouped = {};
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];

        data.forEach((ev) => {
          const key = ev.date;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            id: ev.id,
            time: ev.time?.slice(0, 5),
            text: ev.text,
            details: ev.details || '',
          });
        });

        setEvents(grouped);
      })
      .catch((err) => console.error('Erro ao carregar eventos:', err));
  }, []);

  const pad2 = (n) => String(n).padStart(2, '0');
  const isoKey = (y, m0, d) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
  const getDaysInMonth = (m0, y) => new Date(y, m0 + 1, 0).getDate();
  const firstWeekday = (y, m0) => new Date(y, m0, 1).getDay();
  const todayISO = useMemo(
    () => `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
    [now]
  );

  // ✅ Corrige comparação de datas considerando fuso horário local (Brasil)
  const isPastDate = (iso) => {
    const nowLocal = new Date();
    const dateToCheck = new Date(iso + 'T23:59:59'); // considera o fim do dia local
    return dateToCheck < nowLocal;
  };

  const gotoPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };
  const gotoNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const openModal = (y, m0, d) => {
    const key = isoKey(y, m0, d);
    setModalDateISO(key);
    setNewText('');
    setNewTime('');
    setNewDetails('');
    setEditingIndex(null);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setModalDateISO('');
    setNewText('');
    setNewTime('');
    setEditingIndex(null);
  };

  // =========================
  // 🔹 Criar ou atualizar evento (POST / PUT)
  // =========================
  const addOrUpdateEvent = async (e) => {
    e.preventDefault();
    if (!newTime || !newText) return;
    if (isPastDate(modalDateISO)) return;

    const data = {
      date: modalDateISO,
      time: newTime,
      text: newText,
      details: newDetails,
    };

    try {
      if (editingIndex !== null) {
        const existing = events[modalDateISO][editingIndex];
        await AxiosInstance.put(`/calendarevent/${existing.id}/`, data);
        data.id = existing.id;
      } else {
        const res = await AxiosInstance.post('/calendarevent/', data);
        data.id = res.data.id;
      }

      setEvents((prev) => {
        const arr = [...(prev[modalDateISO] || [])];
        if (editingIndex !== null) arr[editingIndex] = data;
        else arr.push(data);
        arr.sort((a, b) => a.time.localeCompare(b.time));
        return { ...prev, [modalDateISO]: arr };
      });

      setNewText('');
      setNewTime('');
      setNewDetails('');
      setEditingIndex(null);
    } catch (err) {
      console.error('Erro ao salvar evento:', err);
    }
  };

  // =========================
  // 🔹 Editar e excluir (PUT / DELETE)
  // =========================
  const editEvent = (idx) => {
    const ev = events[modalDateISO][idx];
    setNewTime(ev.time);
    setNewText(ev.text);
    setNewDetails(ev.details || '');
    setEditingIndex(idx);
  };

  const deleteEvent = async () => {
    try {
      const idx = pendingDeleteIndex;
      const existing = events[modalDateISO][idx];
      await AxiosInstance.delete(`/calendarevent/${existing.id}/`);

      setEvents((prev) => {
        const arr = [...(prev[modalDateISO] || [])];
        arr.splice(idx, 1);
        const copy = { ...prev };
        if (arr.length) copy[modalDateISO] = arr;
        else delete copy[modalDateISO];
        return copy;
      });

      setPendingDeleteIndex(null);
      setShowConfirm(false);
      setEditingIndex(null);
      setNewText('');
      setNewTime('');
      setNewDetails('');
    } catch (err) {
      console.error('Erro ao excluir evento:', err);
    }
  };

  const confirmDeleteEvent = (idx) => {
    setPendingDeleteIndex(idx);
    setShowConfirm(true);
  };

  // === Visão Mensal ===
  const renderMonthView = () => {
    const totalDays = getDaysInMonth(currentMonth, currentYear);
    const leadingEmpty = firstWeekday(currentYear, currentMonth);
    return (
      <div className="fade-in" style={{ width: '100%', maxWidth: 1120 }}>
        {/* Cabeçalho */}
        <div
          className="d-flex align-items-center justify-content-between rounded-3 shadow-sm mb-3"
          style={{
            background: 'linear-gradient(90deg, #003366 0%, #005b96 100%)',
            color: '#fff',
            padding: '0.75rem 1rem',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <Button variant="light" size="sm" onClick={gotoPrevMonth}>
              ◀
            </Button>
            <h4 className="mb-0" style={{ fontWeight: 700 }}>
              {monthNames[currentMonth]} {currentYear}
            </h4>
            <Button variant="light" size="sm" onClick={gotoNextMonth}>
              ▶
            </Button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <DropdownButton
              as={ButtonGroup}
              variant="light"
              size="sm"
              title="Ir para"
              align="end"
            >
              {monthNames.map((m, idx) => (
                <Dropdown.Item
                  key={m}
                  onClick={() => setCurrentMonth(idx)}
                  active={idx === currentMonth}
                >
                  {m}
                </Dropdown.Item>
              ))}
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => {
                  setCurrentYear(now.getFullYear());
                  setCurrentMonth(now.getMonth());
                }}
              >
                Hoje
              </Dropdown.Item>
            </DropdownButton>
            <Button size="sm" variant="outline-light" onClick={() => setView('week')}>
              Semana
            </Button>
            <Button size="sm" variant="outline-light" onClick={() => setView('year')}>
              Ano
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="rounded-3 shadow-sm p-2" style={{ background: '#fff' }}>
          <div
            className="mb-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
            }}
          >
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div
                key={d}
                className="text-center"
                style={{
                  color: '#071744',
                  fontWeight: 700,
                  padding: '0.4rem 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
            }}
          >
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border rounded-2"
                style={{ minHeight: 90, background: '#f7fafc' }}
              />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const key = isoKey(currentYear, currentMonth, day);
              const list = events[key] || [];
              const isToday = key === todayISO;
              const isPast = isPastDate(key);
              const hasEvents = list.length > 0;

              return (
                <div
                  key={key}
                  className="border rounded-2 d-flex flex-column"
                  style={{
                    minHeight: 110,
                    background: isToday ? '#e9f3ff' : '#ffffff',
                    boxShadow: isToday ? 'inset 0 0 0 2px rgba(0,91,150,0.25)' : 'none',
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between px-2 py-1 border-bottom">
                    <span style={{ fontWeight: 700, color: '#071744', fontSize: 14 }}>
                      {day}
                    </span>
                    {isPast ? (
                      hasEvents ? (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => openModal(currentYear, currentMonth, day)}
                        >
                          👁 Ver
                        </Button>
                      ) : (
                        <span className="text-muted small">—</span>
                      )
                    ) : (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openModal(currentYear, currentMonth, day)}
                      >
                        + evento
                      </Button>
                    )}
                  </div>

                  <div className="px-2 py-2 d-flex flex-column gap-1">
                    {list.map((ev, idx) => (
                      <Badge
                        key={idx}
                        bg="primary"
                        pill
                        className="d-inline-flex align-items-center justify-content-between"
                      >
                        <span>{`${ev.time} — ${ev.text}`}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // === Visão Anual ===
  const renderYearView = () => (
    <div className="fade-in" style={{ width: '100%', maxWidth: 1120 }}>
      <div
        className="d-flex align-items-center justify-content-between rounded-3 shadow-sm mb-3"
        style={{
          background: 'linear-gradient(90deg, #003366 0%, #005b96 100%)',
          color: '#fff',
          padding: '0.75rem 1rem',
        }}
      >
        <h4 className="mb-0" style={{ fontWeight: 700 }}>
          {currentYear}
        </h4>
        <div className="d-flex gap-2">
          <Button size="sm" variant="light" onClick={() => setCurrentYear((y) => y - 1)}>
            ◀
          </Button>
          <Button size="sm" variant="light" onClick={() => setCurrentYear((y) => y + 1)}>
            ▶
          </Button>
          <Button size="sm" variant="outline-light" onClick={() => setView('month')}>
            Mês
          </Button>
        </div>
      </div>

      <div className="rounded-3 year-grid" style={{ display: 'grid', gap: 16 }}>
        {monthNames.map((m, idx) => {
          const totalDays = getDaysInMonth(idx, currentYear);
          const first = firstWeekday(currentYear, idx);
          const daysArray = [
            ...Array.from({ length: first }).map(() => ''),
            ...Array.from({ length: totalDays }).map((_, i) => i + 1),
          ];
          return (
            <div
              key={m}
              onClick={() => {
                setCurrentMonth(idx);
                setView('month');
              }}
              className="month-card p-3"
              style={{
                cursor: 'pointer',
                background: '#fff',
              }}
            >
              <div
                className="rounded-2 mb-2 text-white text-center"
                style={{
                  background: 'linear-gradient(90deg, #003366 0%, #005b96 100%)',
                  fontWeight: 700,
                  padding: '6px 10px',
                }}
              >
                {m}
              </div>
              <div
                className="mini-grid text-center"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  fontSize: 11,
                  color: '#071744',
                }}
              >
                {daysOfWeek.map((d) => (
                  <div key={`${m}-${d}`} style={{ fontWeight: 700, opacity: 0.7 }}>
                    {d}
                  </div>
                ))}
                {daysArray.map((d, i) => (
                  <div
                    key={`${m}-day-${i}`}
                    className="border rounded-1"
                    style={{
                      height: 16,
                      background: d ? '#f8fafc' : 'transparent',
                      color: d ? '#071744' : 'transparent',
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // === Visão Semanal ===
  const renderWeekView = () => {
    // 🔹 Gerar os dias da semana atual
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });

    // 🔹 Calcular início e fim da semana
    const startDate = days[0];
    const endDate = days[6];
    const weekNumber = getWeekNumber(weekStart);

    return (
      <div className="fade-in" style={{ width: '100%', maxWidth: 1120 }}>
        {/* Cabeçalho */}
        <div
          className="d-flex align-items-center justify-content-between rounded-3 shadow-sm mb-3"
          style={{
            background: 'linear-gradient(90deg, #003366 0%, #005b96 100%)',
            color: '#fff',
            padding: '0.75rem 1rem',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <Button variant="light" size="sm" onClick={gotoPrevWeek}>
              ◀
            </Button>
            <h5 className="mb-0" style={{ fontWeight: 700 }}>
              Semana {weekNumber} — {startDate.toLocaleDateString('pt-BR')} a{' '}
              {endDate.toLocaleDateString('pt-BR')}
            </h5>
            <Button variant="light" size="sm" onClick={gotoNextWeek}>
              ▶
            </Button>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="light" onClick={() => setView('month')}>
              Mês
            </Button>
            <Button size="sm" variant="outline-light" onClick={() => setView('year')}>
              Ano
            </Button>
          </div>
        </div>

        {/* Grid Semanal */}
        <div
          className="rounded-3 shadow-sm p-3 bg-white"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
          }}
        >
          {days.map((d, idx) => {
            const iso = isoKey(d.getFullYear(), d.getMonth(), d.getDate());
            const list = events[iso] || [];
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                className="border rounded-2 p-2 d-flex flex-column"
                style={{
                  background: isToday ? '#e9f3ff' : '#ffffff',
                  boxShadow: isToday ? 'inset 0 0 0 2px rgba(0,91,150,0.25)' : 'none',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong style={{ color: '#071744' }}>
                    {d.toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </strong>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openModal(d.getFullYear(), d.getMonth(), d.getDate())}
                  >
                    + evento
                  </Button>
                </div>

                {list.length > 0 ? (
                  list.map((ev, i) => (
                    <Badge
                      key={i}
                      bg="primary"
                      pill
                      className="d-inline-flex align-items-center justify-content-between mb-1"
                    >
                      {ev.time} — {ev.text}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted small text-center mt-2">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // === Render Principal ===
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div
        style={{
          background: '#f5f5f5',
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem 1rem',
          marginTop: '56px',
          boxSizing: 'border-box',
        }}
      >
        {view === 'month'
          ? renderMonthView()
          : view === 'week'
            ? renderWeekView()
            : renderYearView()}

        {/* Modal principal */}
        <Modal show={showModal} onHide={closeModal} centered>
          <Modal.Header
            closeButton
            style={{
              background: 'linear-gradient(90deg, #003366 0%, #005b96 100%)',
              color: '#fff',
            }}
          >
            <Modal.Title style={{ fontWeight: 700, color: '#fff' }}>
              {modalDateISO
                ? `Eventos — ${modalDateISO.split('-').reverse().join('/')}`
                : 'Eventos'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form onSubmit={addOrUpdateEvent} className="mb-3">
              <div className="d-flex gap-2">
                <Form.Control
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{ width: '30%' }}
                  required
                  disabled={isPastDate(modalDateISO)}
                />
                <Form.Control
                  type="text"
                  placeholder="Descrição do evento"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  required
                  disabled={isPastDate(modalDateISO)}
                />
                {!isPastDate(modalDateISO) && (
                  <Button type="submit" variant="primary">
                    {editingIndex !== null ? 'Salvar' : 'Adicionar'}
                  </Button>
                )}
              </div>

              <Form.Group className="mt-3">
                <Form.Label>Detalhes do evento</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Adicione detalhes complementares..."
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  disabled={isPastDate(modalDateISO)}
                />
              </Form.Group>
            </Form>

            {/* 🔹 Lista de eventos */}
            {(events[modalDateISO] || []).length > 0 ? (
              <div className="d-flex flex-column gap-2 event-list">
                {events[modalDateISO].map((ev, idx) => (
                  <div
                    key={idx}
                    className="event-item border rounded-2 px-2 py-1 d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{ev.time}</strong> — {ev.text}
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-info"
                        onClick={() => {
                          setSelectedEvent(ev);
                          setShowDetails(true);
                        }}
                      >
                        👁
                      </Button>
                      {!isPastDate(modalDateISO) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => editEvent(idx)}
                          >
                            ✏️
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => confirmDeleteEvent(idx)}
                          >
                            🗑️
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="alert alert-light border mt-2 mb-0 text-center"
                role="alert"
              >
                Nenhum evento para exibir nesse dia.
              </div>
            )}
          </Modal.Body>

          <Modal.Footer className="d-flex justify-content-between">
            <small className="text-muted"></small>
            <Button variant="secondary" onClick={closeModal}>
              Fechar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* 🔹 Modal de Detalhes do Evento */}
        <Modal show={showDetails} onHide={() => setShowDetails(false)} centered>
          <Modal.Header
            closeButton
            style={{
              background: 'linear-gradient(90deg, #003366 0%, #005b96 100%)',
              color: '#fff',
            }}
          >
            <Modal.Title style={{ fontWeight: 700 }}>Detalhes do Evento</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedEvent ? (
              <>
                <p>
                  <strong>Data:</strong> {modalDateISO.split('-').reverse().join('/')}
                </p>
                <p>
                  <strong>Horário:</strong> {selectedEvent.time}
                </p>
                <p>
                  <strong>Título:</strong> {selectedEvent.text}
                </p>
                <p className="mb-0">
                  <strong>Detalhes:</strong>{' '}
                  {selectedEvent.details
                    ? selectedEvent.details
                    : 'Sem detalhes adicionais.'}
                </p>
              </>
            ) : (
              <p>Nenhum detalhe disponível.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetails(false)}>
              Fechar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* 🔹 Modal de Confirmação de Exclusão */}
        <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirmar Exclusão</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Tem certeza de que deseja excluir este evento? <br />
            Essa ação não poderá ser desfeita.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deleteEvent}>
              Excluir
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
