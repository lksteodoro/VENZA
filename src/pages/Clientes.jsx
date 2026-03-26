import React, { useState } from 'react';
import { CLIENTS, ACCOUNTS, PROJECTS, BASE_SUBTASKS } from '../data/mockData';
import AdsManagerTable from '../components/AdsManagerTable';
import ProjectCard from '../components/ProjectTaskManager';
import { LayoutDashboard, FolderOpen, Plus, CheckCircle2, AlertCircle, Clock, Camera, Inbox, ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';


// ─── New Client Modal ─────────────────────────────────────────────────────────
const NewClientModal = ({ onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
        borderRadius: '16px', padding: '32px', width: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Novo Cliente</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Cadastre um novo workspace isolado.</p>

        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          NOME DO CLIENTE
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Cliente A"
          style={{
            width: '100%', padding: '12px 16px', fontSize: '14px',
            border: '1px solid var(--border-main)', borderRadius: '10px',
            backgroundColor: 'var(--bg-app)', color: 'var(--text-main)',
            outline: 'none', boxSizing: 'border-box', marginBottom: '20px',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
        />

        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          URL DA FOTO / AVATAR
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
          }}>
            {avatarUrl ? <img src={avatarUrl} alt="prev" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} /> : <Camera size={18} color="var(--text-muted)" />}
            <Camera size={18} color="var(--text-muted)" style={{ display: avatarUrl ? 'none' : 'block' }} />
          </div>
          <input
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            style={{
              flex: 1, padding: '12px 14px', fontSize: '14px',
              border: '1px solid var(--border-main)', borderRadius: '10px',
              backgroundColor: 'var(--bg-app)', color: 'var(--text-main)',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>Cancelar</button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim(), avatarUrl.trim() || 'https://i.pravatar.cc/150')}
            disabled={!name.trim()}
            className="btn-primary"
            style={{ flex: 1, padding: '12px', borderRadius: '10px', opacity: name.trim() ? 1 : 0.5 }}
          >
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Helper: compute stats across all projects of a client ───────────────────
const getClientStats = (projects) => {
  let total = 0, done = 0, overdue = 0;
  projects.forEach(p => {
    (p.tasks || []).forEach(t => {
      total++;
      if (t.completed) done++;
    });
  });
  return { total, done, pending: total - done };
};

// ─── New Project Modal ────────────────────────────────────────────────────────
const NewProjectModal = ({ onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];
  const [color, setColor] = useState(colors[0]);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
        borderRadius: '12px', padding: '28px', width: '380px', boxShadow: 'var(--shadow-md)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Novo Projeto</h3>

        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
          Nome do Projeto
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim(), color)}
          placeholder="Ex: Lançamento Verão 2025"
          style={{
            width: '100%', padding: '10px 14px', fontSize: '14px',
            border: '1px solid var(--border-main)', borderRadius: '8px',
            backgroundColor: 'var(--bg-app)', color: 'var(--text-main)',
            outline: 'none', boxSizing: 'border-box', marginBottom: '20px'
          }}
        />

        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
          Cor do Projeto
        </label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: c, border: color === c ? '3px solid var(--text-main)' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim(), color)}
            disabled={!name.trim()}
            className="btn-primary"
            style={{ flex: 1, opacity: name.trim() ? 1 : 0.5 }}
          >
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CLIENTS_KEY = 'venza_clients';
const PROJECTS_KEY = 'venza_projects';

const loadFromStorage = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
};

const Clientes = ({ demandas = [] }) => {
  const [clients, setClients] = useState(() => loadFromStorage(CLIENTS_KEY, CLIENTS));
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('demandas');
  const [projects, setProjects] = useState(() => loadFromStorage(PROJECTS_KEY, PROJECTS));
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Seleciona primeiro cliente após carregar
  React.useEffect(() => {
    setSelectedClient(prev => prev ?? (clients[0] || null));
  }, []); // eslint-disable-line

  // ── Persiste clientes e projetos automaticamente ──
  React.useEffect(() => {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  }, [clients]);

  React.useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  const getPortalUrl = (clientId) => `${window.location.origin}/portal/${clientId}`;

  const handleCopyPortalLink = (clientId) => {
    navigator.clipboard.writeText(getPortalUrl(clientId)).then(() => {
      setCopiedLink(clientId);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const clientAccounts = selectedClient ? ACCOUNTS.filter(acc => acc.clientId === selectedClient.id) : [];
  const clientProjects = selectedClient ? projects.filter(p => p.clientId === selectedClient.id) : [];
  const stats = getClientStats(clientProjects);

  const handleAddClient = (name, avatarUrl) => {
    const newClient = { id: uuidv4(), name, avatarUrl };
    setClients(prev => [...prev, newClient]);
    setSelectedClient(newClient);
    setShowNewClientModal(false);
  };

  // ── CRUD: Projects ──
  const handleAddProject = (name, color) => {
    setProjects(prev => [...prev, {
      id: uuidv4(), clientId: selectedClient.id, name, color, tasks: []
    }]);
    setShowNewProjectModal(false);
  };

  const handleDeleteProject = (projectId) => {
    if (window.confirm('Excluir este projeto e todas as suas tarefas?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const handleRenameProject = (projectId, newName) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
  };

  // ── CRUD: Tasks ──
  const handleAddTask = (projectId, text, type = 'new') => {
    let subtasks = [];
    if (type === 'recurrent') {
      try {
        const stored = localStorage.getItem('crm_checklist_template');
        const template = stored ? JSON.parse(stored) : BASE_SUBTASKS;
        subtasks = template.map(s => ({ ...s, id: uuidv4(), done: false }));
      } catch {
        subtasks = BASE_SUBTASKS.map(s => ({ ...s, id: uuidv4(), done: false }));
      }
    }
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, tasks: [...p.tasks, { id: uuidv4(), text, completed: false, type, subtasks }] }
        : p
    ));
  };

  const handleToggleTask = (projectId, taskId, force) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, tasks: (p.tasks || []).map(t => t.id === taskId ? { ...t, completed: force === true ? true : !t.completed } : t) }
        : p
    ));
  };

  const handleDeleteTask = (projectId, taskId) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) } : p
    ));
  };

  // ── Converter Demanda do Portal em Tarefa com Checklist de Aprovação ──
  const [convertedIds, setConvertedIds] = useState(() => loadFromStorage('venza_converted_ids', []));
  const [inboxOpen, setInboxOpen] = useState(true);
  const [notifId, setNotifId] = useState(null);

  React.useEffect(() => {
    localStorage.setItem('venza_converted_ids', JSON.stringify(convertedIds));
  }, [convertedIds]);

  const handleConvertDemanda = (demanda) => {
    const projetoAlvo = demanda.projetoId
      ? clientProjects.find(p => p.id === demanda.projetoId) || clientProjects[0]
      : clientProjects[0];
    if (!projetoAlvo) { alert('Crie um projeto primeiro para associar esta demanda.'); return; }

    // Checklist com TODOS os detalhes do briefing do cliente
    const checklistAprovacao = [];
    if (demanda.prioridade === 'urgente' && demanda.justificativaUrgencia) {
      checklistAprovacao.push({ id: uuidv4(), text: `⚠️ URGENTE: ${demanda.justificativaUrgencia}`, done: false });
    }
    checklistAprovacao.push(
      { id: uuidv4(), text: `📌 Tipo: ${demanda.tipo}`, done: false },
      { id: uuidv4(), text: `📝 Briefing: ${demanda.descricao || 'Não informado'}`, done: false },
      { id: uuidv4(), text: demanda.arquivo ? `🔗 Referência: ${demanda.arquivo}` : '🔗 Sem link de referência', done: false },
      { id: uuidv4(), text: '☑ Revisar e aprovar internamente', done: false },
      { id: uuidv4(), text: '☑ Iniciar execução', done: false },
      { id: uuidv4(), text: '☑ Notificar cliente sobre o andamento', done: false }
    );

    const novaTarefa = {
      id: uuidv4(),
      text: `[Portal] ${demanda.titulo}`,
      completed: false,
      type: 'recurrent',
      subtasks: checklistAprovacao,
      fromPortal: true,
      demandaTipo: demanda.tipo,
      demandaPrioridade: demanda.prioridade,
      demandaDescricao: demanda.descricao,
    };

    setProjects(prev => prev.map(p =>
      p.id === projetoAlvo.id ? { ...p, tasks: [novaTarefa, ...(p.tasks || [])] } : p
    ));
    setConvertedIds(prev => [...prev, demanda.id]);
    setNotifId(demanda.id);
    setTimeout(() => setNotifId(null), 3000);
  };

  const tabStyle = (tab) => ({
    flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    border: 'none', background: 'transparent', cursor: 'pointer',
    borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: activeTab === tab ? '600' : '500', fontSize: '14px', transition: 'all 0.2s'
  });

  return (
    <div className="page-content" style={{ padding: '0 32px 24px', display: 'flex', flexDirection: 'row', height: '100%', gap: '20px' }}>

      {/* ── Sidebar: Client List ── */}
      <div style={{ width: '240px', flexShrink: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Clientes ({clients.length})
          </span>
          <button onClick={() => setShowNewClientModal(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}>
            <Plus size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {clients.map(client => {
            const cProjects = projects.filter(p => p.clientId === client.id);
            const cStats = getClientStats(cProjects);
            const isSelected = selectedClient.id === client.id;
            return (
              <div
                key={client.id}
                onClick={() => { setSelectedClient(client); setExpandedAccount(null); setActiveTab('demandas'); }}
                style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                  borderBottom: '1px solid var(--border-light)',
                  transition: 'background-color 0.2s'
                }}
              >
                <img src={client.avatarUrl} alt={client.name} style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: isSelected ? '700' : '600', color: isSelected ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {cProjects.length} projetos · {cStats.pending} pendentes
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>
        {!selectedClient ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Selecione ou crie um cliente para visualizar o workspace.
          </div>
        ) : (
          <>
            {/* Client Header */}
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px 24px', borderRadius: '10px 10px 0 0', border: '1px solid var(--border-light)', borderBottom: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img src={selectedClient.avatarUrl} alt={selectedClient.name} style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{selectedClient.name}</h2>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FolderOpen size={12} /> {clientProjects.length} projetos
                  </span>
                  <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> {stats.done} concluídas
                  </span>
                  <span style={{ fontSize: '12px', color: stats.pending > 0 ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {stats.pending} pendentes
                  </span>
                </div>
              </div>
            </div>
            {/* Link único do Portal deste cliente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={getPortalUrl(selectedClient.id)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--primary)', background: 'var(--primary-light)', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', border: '1px solid rgba(139,92,246,0.2)', transition: 'all 0.2s' }}
              >
                <ExternalLink size={13} /> Abrir Portal
              </a>
              <button
                onClick={() => handleCopyPortalLink(selectedClient.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: copiedLink === selectedClient.id ? '#10b981' : 'var(--text-muted)', background: 'var(--bg-app)', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              >
                {copiedLink === selectedClient.id ? <><CheckCircle2 size={13} /> Copiado!</> : <>🔗 Copiar Link</>}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-surface)' }}>
          <button onClick={() => setActiveTab('demandas')} style={tabStyle('demandas')}>
            <LayoutDashboard size={16} /> Projetos & Demandas
          </button>
          <button onClick={() => setActiveTab('projetos')} style={tabStyle('projetos')}>
            <FolderOpen size={16} /> Campanhas & Contas
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderTop: 'none', borderRadius: '0 0 10px 10px', flex: 1 }}>

          {/* ─── TAB: Projetos & Demandas (UNIFICADO) ─── */}
          {activeTab === 'demandas' && (() => {
            const clientDemandas = demandas.filter(d => d.clientId === selectedClient?.id);
            const novas = clientDemandas.filter(d => !convertedIds.includes(d.id));
            return (
              <div>

                {/* ─── INBOX: CARDS DE APROVAÇÃO ─── */}
                {clientDemandas.length > 0 && (
                  <div style={{ marginBottom: '28px' }}>
                    {/* Header */}
                    <div
                      onClick={() => setInboxOpen(o => !o)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Inbox size={16} color="var(--primary)" />
                        <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>Inbox — Aguardando Aprovação</span>
                        <span style={{ background: 'var(--primary)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>{novas.length} pendente{novas.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{inboxOpen ? '▲ Recolher' : '▼ Expandir'}</span>
                    </div>

                    {/* Grid de cards igual ao de projetos */}
                    {inboxOpen && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
                        {clientDemandas.filter(d => !convertedIds.includes(d.id)).map(d => {
                          const priorColor = d.prioridade === 'urgente' ? '#ef4444' : d.prioridade === 'alta' ? '#f59e0b' : '#94a3b8';
                          const projetoAssoc = d.projetoId ? clientProjects.find(p => p.id === d.projetoId) : clientProjects[0];
                          return (
                            <div key={d.id} style={{
                              background: 'var(--bg-app)', border: '1px solid var(--border-light)',
                              borderTop: `3px solid ${priorColor}`,
                              borderRadius: '0 0 12px 12px', display: 'flex', flexDirection: 'column',
                              overflow: 'hidden', transition: 'box-shadow 0.2s',
                            }}>
                              {/* Card header */}
                              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                  <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.3' }}>{d.titulo}</span>
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: priorColor, background: `${priorColor}18`, padding: '3px 8px', borderRadius: '20px', flexShrink: 0, marginLeft: '8px' }}>
                                    {d.prioridade?.toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '6px' }}>{d.tipo}</span>
                                  {projetoAssoc && <span style={{ fontSize: '11px', color: projetoAssoc.color || 'var(--primary)', background: `${projetoAssoc.color || 'var(--primary)'}18`, padding: '2px 8px', borderRadius: '6px' }}>→ {projetoAssoc.name}</span>}
                                </div>
                              </div>

                              {/* Detalhes do briefing */}
                              <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {d.descricao && (
                                  <div>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Briefing</span>
                                    <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '3px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.descricao}</p>
                                  </div>
                                )}
                                {d.justificativaUrgencia && (
                                  <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: '6px', padding: '8px 10px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase' }}>⚠️ Justificativa Urgência</span>
                                    <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '3px' }}>{d.justificativaUrgencia}</p>
                                  </div>
                                )}
                                {d.arquivo && (
                                  <a href={d.arquivo} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                    <ExternalLink size={12} /> Ver referência / Drive
                                  </a>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
                                  Recebido em {d.criadoEm}
                                </div>
                              </div>

                              {/* Botão Aprovar */}
                              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)' }}>
                                {!projetoAssoc ? (
                                  <p style={{ fontSize: '12px', color: '#f59e0b', textAlign: 'center' }}>Crie um projeto primeiro</p>
                                ) : (
                                  <button
                                    onClick={() => handleConvertDemanda(d)}
                                    style={{
                                      width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                                      background: 'linear-gradient(135deg, var(--primary), #7c3aed)', color: 'white', border: 'none', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                      boxShadow: '0 2px 8px rgba(139,92,246,0.25)', transition: 'all 0.2s',
                                    }}
                                  >
                                    <CheckCircle2 size={14} /> Aprovar & Criar Tarefa
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── PROJETOS ─── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px' }}>
                      Projetos Ativos — {selectedClient.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {stats.done} de {stats.total} tarefas concluídas no total
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    <Plus size={15} /> Novo Projeto
                  </button>
                </div>

                {clientProjects.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', borderRadius: '10px' }}>
                    <FolderOpen size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>Nenhum projeto criado</p>
                    <p style={{ fontSize: '13px' }}>Clique em "Novo Projeto" para começar a organizar as demandas.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {clientProjects.map(proj => (
                      <ProjectCard
                        key={proj.id}
                        project={proj}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                        onAddTask={handleAddTask}
                        onDeleteProject={handleDeleteProject}
                        onRenameProject={handleRenameProject}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ─── TAB: Campaigns & Accounts (Grouped by Project) ─── */}
          {activeTab === 'projetos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Projetos & Campanhas ({clientProjects.length})</h3>
                <button className="btn-primary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={15} /> Conectar Conta
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {clientProjects.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', borderRadius: '10px' }}>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>Este cliente não possui projetos cadastrados.</p>
                    <p style={{ fontSize: '13px' }}>Crie um projeto primeiro na aba de Demandas para associar contas de anúncios.</p>
                  </div>
                ) : (
                  clientProjects.map(proj => {
                    const accounts = ACCOUNTS.filter(a => a.projectId === proj.id);
                    // Determine goal status
                    // Fail count compares daily leads against dailyLeadGoal
                    let consecutiveFails = 0;
                    if (proj.leadHistory && proj.dailyLeadGoal) {
                       proj.leadHistory.forEach(day => {
                         if (day.leads < proj.dailyLeadGoal) consecutiveFails++;
                       });
                    }
                    const isCriticalAlert = consecutiveFails >= 2;

                    return (
                      <div key={proj.id} style={{ 
                        border: '1px solid var(--border-light)', 
                        borderTop: isCriticalAlert ? '3px solid var(--danger)' : `3px solid ${proj.color}`,
                        borderRadius: '0 0 10px 10px', 
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-surface)'
                      }}>
                        
                        {/* Project Header in Campaigns Tab */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{proj.name}</h4>
                                {proj.dailyLeadGoal && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Meta Diária: <strong style={{ color: 'var(--text-main)' }}>{proj.dailyLeadGoal} Leads</strong>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                 {proj.leadHistory?.map((history, idx) => {
                                    const missed = history.leads < proj.dailyLeadGoal;
                                    return (
                                      <div key={idx} style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{history.date}</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: missed ? 'var(--danger)' : '#10b981' }}>
                                          {history.leads} {/* Leads */}
                                        </div>
                                      </div>
                                    )
                                 })}
                              </div>
                           </div>
                           
                           {/* Critical Alert Banner */}
                           {isCriticalAlert && (
                             <div style={{ 
                               marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                               border: '1px solid var(--danger)', borderRadius: '6px',
                               display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)'
                             }}>
                               <AlertCircle size={16} />
                               <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                 ALERTA DE OTIMIZAÇÃO: A meta de captação de leads não foi atingida por 2 dias seguidos. Modifique os anúncios ou verifique o orçamento.
                               </span>
                             </div>
                           )}
                        </div>

                        {/* Accounts inside this Project */}
                        <div style={{ padding: '16px 20px' }}>
                          <h5 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                            Contas de Anúncios Vinculadas ({accounts.length})
                          </h5>
                          
                          {accounts.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Nenhuma conta associada a este projeto.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {accounts.map(acc => (
                                <div key={acc.id} style={{ border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                                  <div
                                    onClick={() => setExpandedAccount(expandedAccount === acc.id ? null : acc.id)}
                                    style={{
                                      padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      backgroundColor: expandedAccount === acc.id ? 'var(--bg-app)' : 'var(--bg-surface)',
                                      transition: 'background-color 0.2s'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: acc.platform === 'meta' ? '#1877F2' : '#EA4335' }} />
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{acc.name}</div>
                                      </div>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                                      {expandedAccount === acc.id ? '▲ Recolher' : '▼ Campanhas'}
                                    </span>
                                  </div>
                                  
                                  {expandedAccount === acc.id && (
                                    <div style={{ borderTop: '1px solid var(--border-light)', padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                                      <AdsManagerTable accountId={acc.id} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Toast de confirmação */}
      {notifId && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
          background: 'var(--bg-surface)', border: '1px solid #10b981',
          borderRadius: '12px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.3s ease-out',
        }}>
          <CheckCircle2 size={20} color="#10b981" />
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>Tarefa criada com sucesso!</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Checklist de aprovação adicionado ao projeto.</div>
          </div>
        </div>
      )}

      {/* Modais */}
      {showNewProjectModal && (
        <NewProjectModal
          onConfirm={handleAddProject}
          onCancel={() => setShowNewProjectModal(false)}
        />
      )}
      {showNewClientModal && (
        <NewClientModal
          onConfirm={handleAddClient}
          onCancel={() => setShowNewClientModal(false)}
        />
      )}
    </div>
  );
};

export default Clientes;
