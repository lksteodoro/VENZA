import React, { useState } from 'react';
import { Inbox, X, CheckCircle2, XCircle, ExternalLink, AlertTriangle, FileText } from 'lucide-react';
import { CLIENTS } from '../data/mockData';

const PRIORIDADE_COLOR = {
  urgente: '#ef4444',
  alta: '#f59e0b',
  normal: '#3f3f46',
};

const STATUS_TABS = [
  { key: 'pendente',  label: 'Pendentes' },
  { key: 'andamento', label: 'Aprovadas' },
  { key: 'rejeitado', label: 'Rejeitadas' },
];

const BriefingModal = ({ demanda, onClose }) => {
  const priorColor = PRIORIDADE_COLOR[demanda.prioridade] || '#3f3f46';
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
        borderRadius: '16px', width: '560px', maxWidth: '92vw', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
          }}>
            <X size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FileText size={18} color="var(--primary)" />
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Briefing do Cliente
            </span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.3', marginBottom: '8px' }}>
            {demanda.titulo}
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', background: 'var(--bg-app)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: '6px' }}>
              {demanda.tipo}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px',
              color: priorColor, background: `${priorColor}18`
            }}>
              {demanda.prioridade?.toUpperCase()}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '3px 10px', borderRadius: '6px' }}>
              {demanda.clientName}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-app)' }}>
          {/* Novos campos de Tráfego */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Plataforma</span>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{demanda.plataforma || '-'}</div>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Objetivo</span>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{demanda.objetivo || '-'}</div>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Orçamento</span>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{demanda.orcamento || 'Não informado'}</div>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Público-Alvo / Região</span>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{demanda.publico || 'Não informado'}</div>
            </div>
          </div>

          {demanda.justificativaUrgencia && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Justificativa de Urgência</span>
              </div>
              <p style={{ fontSize: '13px', color: '#ef4444', lineHeight: '1.5' }}>{demanda.justificativaUrgencia}</p>
            </div>
          )}

          {demanda.descricao ? (
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Briefing / Descrição</span>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{demanda.descricao}</p>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem descrição fornecida.</p>
          )}

          {demanda.arquivo && (
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Referência / Drive</span>
              <a href={demanda.arquivo} target="_blank" rel="noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', color: 'var(--primary)', textDecoration: 'none',
                background: 'var(--primary-light)', padding: '8px 14px', borderRadius: '8px'
              }}>
                <ExternalLink size={13} /> Abrir link
              </a>
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
            Enviado em {demanda.criadoEm}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  );
};

const Demandas = ({ demandas = [], onApprove, onReject }) => {
  const [statusFilter, setStatusFilter] = useState('pendente');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [briefingModal, setBriefingModal] = useState(null);
  const [approvedId, setApprovedId] = useState(null);

  // Resolve clients from localStorage (fallback to mockData)
  const storedClients = (() => {
    try { return JSON.parse(localStorage.getItem('venza_clients') || '[]'); } catch { return []; }
  })();
  const allClients = storedClients.length ? storedClients : CLIENTS;

  const getClient = (clientId) => allClients.find(c => c.id === clientId);

  const filtered = demandas
    .filter(d => d.status === statusFilter)
    .filter(d => priorityFilter === 'all' || d.prioridade === priorityFilter)
    .sort((a, b) => {
      const order = { urgente: 0, alta: 1, normal: 2 };
      return (order[a.prioridade] ?? 2) - (order[b.prioridade] ?? 2);
    });

  const countByStatus = (s) => demandas.filter(d => d.status === s).length;

  const handleApprove = (demanda) => {
    onApprove(demanda);
    setApprovedId(demanda.id);
    setTimeout(() => setApprovedId(null), 2000);
  };

  return (
    <div className="page-content" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Inbox size={18} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              Inbox de Demandas
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Revise e aprove solicitações dos clientes para iniciar execução no Kanban.
          </p>
        </div>

        {/* Priority filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[{ key: 'all', label: 'Todas' }, { key: 'urgente', label: 'Urgente' }, { key: 'alta', label: 'Alta' }, { key: 'normal', label: 'Normal' }].map(p => (
            <button
              key={p.key}
              onClick={() => setPriorityFilter(p.key)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                border: `1.5px solid ${priorityFilter === p.key ? (PRIORIDADE_COLOR[p.key] || 'var(--primary)') : 'var(--border-light)'}`,
                background: priorityFilter === p.key ? `${PRIORIDADE_COLOR[p.key] || 'var(--primary)'}18` : 'transparent',
                color: priorityFilter === p.key ? (PRIORIDADE_COLOR[p.key] || 'var(--primary)') : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '0' }}>
        {STATUS_TABS.map(tab => {
          const count = countByStatus(tab.key);
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                border: 'none', background: 'transparent',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '11px', fontWeight: '700', minWidth: '20px', height: '20px',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
                background: isActive ? 'var(--primary)' : 'var(--bg-app)',
                color: isActive ? 'white' : 'var(--text-muted)',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
          <Inbox size={44} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>
            {statusFilter === 'pendente' ? 'Nenhuma demanda pendente' : statusFilter === 'andamento' ? 'Nenhuma demanda aprovada ainda' : 'Nenhuma demanda rejeitada'}
          </p>
          <p style={{ fontSize: '13px' }}>
            {statusFilter === 'pendente' ? 'Quando clientes enviarem solicitações, elas aparecerão aqui.' : 'Use os filtros para ver outras demandas.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
          {filtered.map(demanda => {
            const priorColor = PRIORIDADE_COLOR[demanda.prioridade] || '#3f3f46';
            const client = getClient(demanda.clientId);
            const isJustApproved = approvedId === demanda.id;

            return (
              <div key={demanda.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                borderTop: `3px solid ${priorColor}`,
                borderRadius: '0 0 12px 12px', display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.2s',
              }}>
                {/* Card header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    {client ? (
                      <img src={client.avatarUrl} alt={client.name} style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-app)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {demanda.clientName || client?.name || 'Cliente'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.3', flex: 1, marginRight: '8px' }}>
                      {demanda.titulo}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: priorColor, background: `${priorColor}18`, padding: '3px 8px', borderRadius: '20px', flexShrink: 0 }}>
                      {demanda.prioridade?.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: '6px' }}>
                    {demanda.tipo}
                  </span>
                </div>

                {/* Briefing preview */}
                <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {demanda.justificativaUrgencia && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '12px', color: '#ef4444', lineHeight: '1.4', margin: 0 }}>{demanda.justificativaUrgencia}</p>
                    </div>
                  )}
                  <p style={{
                    fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>
                    {demanda.descricao || 'Sem descrição.'}
                  </p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
                    Recebido em {demanda.criadoEm}
                  </div>
                </div>

                {/* Footer actions */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setBriefingModal(demanda)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                      border: '1px solid var(--border-light)', background: 'transparent',
                      color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <FileText size={13} /> Ver
                  </button>

                  {statusFilter === 'pendente' && (
                    <>
                      <button
                        onClick={() => onReject(demanda.id)}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                          border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                          color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <XCircle size={13} />
                      </button>
                      <button
                        onClick={() => handleApprove(demanda)}
                        disabled={isJustApproved}
                        style={{
                          flex: 2, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                          border: 'none', cursor: isJustApproved ? 'default' : 'pointer',
                          background: isJustApproved ? '#10b981' : 'linear-gradient(135deg, var(--primary), #7c3aed)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          boxShadow: isJustApproved ? '0 0 12px rgba(16,185,129,0.3)' : '0 2px 8px rgba(139,92,246,0.25)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        {isJustApproved ? 'Aprovado!' : 'Aprovar'}
                      </button>
                    </>
                  )}

                  {statusFilter === 'andamento' && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 0' }}>
                      <CheckCircle2 size={13} /> No Kanban
                    </span>
                  )}

                  {statusFilter === 'rejeitado' && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 0' }}>
                      <XCircle size={13} /> Rejeitada
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {briefingModal && (
        <BriefingModal demanda={briefingModal} onClose={() => setBriefingModal(null)} />
      )}
    </div>
  );
};

export default Demandas;
