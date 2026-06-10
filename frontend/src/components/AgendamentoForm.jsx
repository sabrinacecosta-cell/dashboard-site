import React, { useState, useEffect } from 'react';
import api from '../services/api';

const inp = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
};

function slotBtn(active) {
  return {
    padding: '0.4rem 0.9rem',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? '#000' : 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: '0.85rem',
    fontFamily: 'var(--font-sans)',
  };
}

function submitBtn(disabled) {
  return {
    width: '100%',
    padding: '0.65rem',
    borderRadius: '8px',
    border: 'none',
    background: disabled ? 'var(--bg-secondary)' : 'var(--accent)',
    color: disabled ? 'var(--text-muted)' : '#000',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    fontFamily: 'var(--font-sans)',
  };
}

function AgendamentoForm({ initialEmail = '', onSuccess, onCancel }) {
  const [datas, setDatas] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [assunto, setAssunto] = useState('');
  const [loadingDatas, setLoadingDatas] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get('/agenda/datas')
      .then(r => setDatas(r.data))
      .catch(() => setError('Erro ao carregar datas disponíveis.'))
      .finally(() => setLoadingDatas(false));
  }, []);

  async function handleSelectDate(date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    if (!date) return;
    setLoadingSlots(true);
    try {
      const r = await api.get(`/agenda/slots/${date}`);
      setSlots(r.data);
    } catch {
      setError('Erro ao buscar horários.');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return setError('Selecione uma data e horário.');
    if (!email.trim()) return setError('Informe seu e-mail.');
    setError(null);
    setSubmitting(true);
    try {
      const r = await api.post('/agenda/agendar', {
        date: selectedDate,
        time: selectedSlot.start,
        emails: [email.trim()],
        title: assunto.trim() || undefined,
      });
      setSuccess(r.data.message || 'Agendamento confirmado!');
      if (onSuccess) onSuccess(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao confirmar agendamento.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setSelectedDate('');
    setSlots([]);
    setSelectedSlot(null);
    setAssunto('');
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '2.5rem' }}> </span>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{success}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Um convite foi enviado para {email}.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={slotBtn(true)} onClick={resetForm}>Novo agendamento</button>
          {onCancel && <button style={slotBtn(false)} onClick={onCancel}>Fechar</button>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: 0, padding: '0.6rem 0.75rem', background: 'rgba(255,107,107,0.1)', borderRadius: '8px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Data</label>
        {loadingDatas ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando datas disponíveis...</span>
        ) : datas.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma data disponível no momento.</span>
        ) : (
          <select value={selectedDate} onChange={e => handleSelectDate(e.target.value)} style={inp} required>
            <option value="">— selecione uma data —</option>
            {datas.map(d => (
              <option key={d.date} value={d.date}>
                {d.label} ({d.dayOfWeek}) — {d.slotsAvailable} horário{d.slotsAvailable !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedDate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Horário</label>
          {loadingSlots ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando horários...</span>
          ) : slots.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum horário disponível nesta data.</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {slots.map(slot => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => { setSelectedSlot(slot); setError(null); }}
                  style={slotBtn(selectedSlot?.start === slot.start)}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Seu nome</label>
        <input style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Seu e-mail</label>
        <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Assunto (opcional)</label>
        <input style={inp} value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Ex: Apresentação de proposta" />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={submitting || !selectedDate || !selectedSlot} style={submitBtn(submitting || !selectedDate || !selectedSlot)}>
          {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ ...slotBtn(false), whiteSpace: 'nowrap' }}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default AgendamentoForm;
