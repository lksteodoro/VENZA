import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, CheckCircle, Clock, FileText, AlertTriangle, Inbox } from 'lucide-react';
import { CLIENTS, PROJECTS } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';

const TIPOS = [
  'Arte para Post',
  'Alteração de Campanha',
  'Criação de Copy',
  'Relatório de Performance',
  'Solicitação de Reunião',
  'Outro',
];

const PRIORIDADES = [
  { label: 'Normal', value: 'normal', color: '#94a3b8' },
  { label: 'Alta', value: 'alta', color: '#f59e0b' },
  { label: 'Urgente', value: 'urgente', color: '#ef4444' },
];

const StatusBadge = ({ status }) => {
  const map = {
    pendente:  { label: 'Pendente',              color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    andamento: { label: 'Em Andamento',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    aprovacao: { label: 'Aguard. Aprovação',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    concluido: { label: 'Concluído',             color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  };
  const s = map[status] || map.pendente;
  return (
    <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
};

const PortalCliente = ({ demandas = [], onSubmitDemanda }) => {
  const { clientId } = useParams();

  // Encontra o cliente pelo ID da URL — isolamento total
  const client = CLIENTS.find(c => c.id === clientId);
  const clientProjects = client ? PROJECTS.filter(p => p.clientId === client.id) : [];
  const clientDemandas = demandas.filter(d => d.clientId === clientId);

  const [view, setView] = useState('form');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    tipo: TIPOS[0],
    prioridade: 'normal',
    descricao: '',
    justificativaUrgencia: '',
    projeto: '',
    arquivo: '',
  });

  // ── Cliente não encontrado ──
  if (!client) {
    return (
      <div style={{
        minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#09090b', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Link inválido</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Este portal não existe ou foi desativado. Entre em contato com sua assessoria.</p>
        </div>
      </div>
    );
  }

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.titulo.trim()) return;
    const nova = {
      id: uuidv4(),
      clientId: client.id,
      clientName: client.name,
      titulo: form.titulo,
      tipo: form.tipo,
      prioridade: form.prioridade,
      descricao: form.descricao,
      justificativaUrgencia: form.justificativaUrgencia,
      projetoId: form.projeto || (clientProjects[0]?.id ?? null),
      arquivo: form.arquivo,
      status: 'pendente',
      criadoEm: new Date().toLocaleDateString('pt-BR'),
    };
    onSubmitDemanda(nova);
    setSubmitted(true);
    setForm({ titulo: '', tipo: TIPOS[0], prioridade: 'normal', descricao: '', justificativaUrgencia: '', projeto: '', arquivo: '' });
    setTimeout(() => { setSubmitted(false); setView('historico'); }, 1800);
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    border: '1px solid #27272a', borderRadius: '10px',
    backgroundColor: '#09090b', color: '#f8fafc',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#09090b', fontFamily: 'Inter, sans-serif', overflowY: 'auto' }}>

      {/* ── Header do Portal ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', padding: '32px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '300px', height: '300px', background: '#8b5cf6', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.08, top: '-80px', right: '0' }} />
        <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src={client.avatarUrl} alt={client.name} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(139,92,246,0.4)' }} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>PORTAL EXCLUSIVO</p>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginBottom: '2px' }}>{client.name}</h1>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Envie suas solicitações e acompanhe o andamento.</p>
            </div>
          </div>

          {/* Resumo rápido */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Enviadas', count: clientDemandas.length, color: '#8b5cf6' },
              { label: 'Em Andamento', count: clientDemandas.filter(d => d.status === 'andamento').length, color: '#f59e0b' },
              { label: 'Concluídas', count: clientDemandas.filter(d => d.status === 'concluido').length, color: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>{item.count}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Corpo ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 40px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#121214', border: '1px solid #27272a', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {[{ key: 'form', label: '+ Nova Demanda' }, { key: 'historico', label: 'Minhas Demandas' }].map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
              background: view === t.key ? '#8b5cf6' : 'transparent',
              color: view === t.key ? 'white' : '#94a3b8',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── FORM ── */}
        {view === 'form' && (
          submitted ? (
            <div style={{ background: '#121214', border: '1px solid #10b981', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
              <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>Demanda enviada com sucesso!</h3>
              <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>Nossa equipe recebeu sua solicitação e retornará em breve.</p>
            </div>
          ) : (
            <div style={{ background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', borderBottom: '1px solid #27272a', paddingBottom: '16px' }}>
                Nova Solicitação
              </h2>

              {/* Título */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>TÍTULO DA DEMANDA *</label>
                <input value={form.titulo} onChange={e => handleChange('titulo', e.target.value)} placeholder="Ex: Post para Instagram — Promoção de Maio" style={inputStyle} />
              </div>

              {/* Tipo + Prioridade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>TIPO DE DEMANDA</label>
                  <select value={form.tipo} onChange={e => handleChange('tipo', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {TIPOS.map(t => <option key={t} value={t} style={{ background: '#09090b' }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>PRIORIDADE</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {PRIORIDADES.map(p => (
                      <button key={p.value} onClick={() => handleChange('prioridade', p.value)} style={{
                        flex: 1, padding: '10px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        border: `1.5px solid ${form.prioridade === p.value ? p.color : '#3f3f46'}`,
                        background: form.prioridade === p.value ? `${p.color}18` : 'transparent',
                        color: form.prioridade === p.value ? p.color : '#94a3b8',
                        transition: 'all 0.15s',
                      }}>{p.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campo condicional: urgência */}
              {form.prioridade === 'urgente' && (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>JUSTIFICATIVA DA URGÊNCIA *</label>
                  </div>
                  <input value={form.justificativaUrgencia} onChange={e => handleChange('justificativaUrgencia', e.target.value)} placeholder="Por que esta demanda é urgente?" style={{ ...inputStyle, border: '1px solid rgba(239,68,68,0.4)' }} />
                </div>
              )}

              {/* Projeto */}
              {clientProjects.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>ASSOCIAR A PROJETO</label>
                  <select value={form.projeto} onChange={e => handleChange('projeto', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="" style={{ background: '#09090b' }}>Nenhum projeto específico</option>
                    {clientProjects.map(p => <option key={p.id} value={p.id} style={{ background: '#09090b' }}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>BRIEFING / DESCRIÇÃO</label>
                <textarea value={form.descricao} onChange={e => handleChange('descricao', e.target.value)}
                  placeholder="Descreva sua solicitação com o máximo de detalhes: objetivo, referências, tom de voz, cores, prazo desejado..."
                  rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
              </div>

              {/* Link */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>LINK DE REFERÊNCIA / DRIVE (opcional)</label>
                <input value={form.arquivo} onChange={e => handleChange('arquivo', e.target.value)} placeholder="https://drive.google.com/..." style={inputStyle} />
              </div>

              <button onClick={handleSubmit} disabled={!form.titulo.trim()} style={{
                padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                background: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer',
                opacity: form.titulo.trim() ? 1 : 0.5,
                boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
                transition: 'all 0.2s',
              }}>
                <Send size={16} /> Enviar Demanda
              </button>
            </div>
          )
        )}

        {/* ── HISTÓRICO ── */}
        {view === 'historico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {clientDemandas.length === 0 ? (
              <div style={{ background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Inbox size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: '600', color: '#f8fafc' }}>Nenhuma demanda enviada ainda.</p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>Use "Nova Demanda" para começar.</p>
              </div>
            ) : clientDemandas.map(d => (
              <div key={d.id} style={{
                background: '#121214', border: '1px solid #27272a', borderRadius: '12px',
                padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                <div style={{
                  width: '4px', height: '48px', borderRadius: '4px', flexShrink: 0,
                  background: d.prioridade === 'urgente' ? '#ef4444' : d.prioridade === 'alta' ? '#f59e0b' : '#3f3f46',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>{d.titulo}</span>
                    <StatusBadge status={d.status} />
                    <span style={{ fontSize: '11px', color: '#94a3b8', background: '#1e1e20', padding: '2px 8px', borderRadius: '6px' }}>{d.tipo}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.descricao || 'Sem descrição'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Enviado em</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{d.criadoEm}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#3f3f46' }}>Powered by <strong style={{ color: '#8b5cf6' }}>VENZA ASSESSORIA</strong></p>
        </div>
      </div>
    </div>
  );
};

export default PortalCliente;
