import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import KanbanView from './pages/KanbanView';
import Clientes from './pages/Clientes';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import PortalCliente from './pages/PortalCliente';
import Demandas from './pages/Demandas';
import Dashboard from './pages/Dashboard';
import Metricas from './pages/Metricas';
import MetaAdCreator from './components/MetaAdCreator';
import { CHECKLIST_TEMPLATE, CHECKLIST_META_ADS, CHECKLIST_GOOGLE_ADS, CHECKLIST_GENERICO, MOCK_CARDS } from './data/mockData';
import './App.css';

const DEMANDAS_KEY = 'venza_demandas';
const KANBAN_KEY = 'venza_kanban_cards';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('venza_auth') === 'true';
  });

  // ── Carrega demandas do localStorage na inicialização ──
  const [demandas, setDemandas] = useState(() => {
    try {
      const stored = localStorage.getItem(DEMANDAS_KEY);
      if (stored) return JSON.parse(stored);
      
      // Demanda mock inicial para exemplificar a notificação e contagem
      return [{
        id: uuidv4(),
        clientId: 'client-1',
        clientName: 'MIGUEL DO GRAU',
        titulo: 'Campanha Teste - Aguardando Aprovação',
        tipo: 'Nova Campanha',
        prioridade: 'alta',
        descricao: 'Subir anúncios para a nova campanha.',
        plataforma: 'Meta Ads',
        objetivo: 'Leads (Formulário)',
        orcamento: 'R$ 50/dia',
        publico: 'Brasil 18-35 anos',
        status: 'pendente',
        criadoEm: new Date().toLocaleDateString('pt-BR'),
      }];
    } catch { return []; }
  });

  // ── Carrega cards do Kanban do localStorage ──
  const [kanbanCards, setKanbanCards] = useState(() => {
    try {
      const stored = localStorage.getItem(KANBAN_KEY);
      return stored ? JSON.parse(stored) : MOCK_CARDS;
    } catch { return MOCK_CARDS; }
  });

  // ── Persiste kanbanCards ──
  useEffect(() => {
    localStorage.setItem(KANBAN_KEY, JSON.stringify(kanbanCards));
  }, [kanbanCards]);

  // ── Notificação Toast ──
  const [toast, setToast] = useState(null);
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  // ── Sincroniza entre abas: quando o Portal (outra aba) salva, o painel atualiza ──
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === DEMANDAS_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          if (parsed.length > demandas.length) {
            showToast("🔔 Nova demanda recebida pelo Portal!");
          }
          setDemandas(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [demandas]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('venza_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('venza_auth');
  };

  const handleSubmitDemanda = (novaDemanda) => {
    setDemandas(prev => {
      const updated = [novaDemanda, ...prev];
      localStorage.setItem(DEMANDAS_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast("🔔 Nova demanda recebida!");
  };

  // ── Aprovação de Demanda → cria card no Kanban ──
  const handleApproveDemanda = (demanda) => {
    setDemandas(prev => {
      const updated = prev.map(d => d.id === demanda.id
        ? { ...d, status: 'andamento', aprovadoEm: new Date().toLocaleDateString('pt-BR') }
        : d);
      localStorage.setItem(DEMANDAS_KEY, JSON.stringify(updated));
      return updated;
    });

    let selectedChecklist = CHECKLIST_GENERICO;
    if (demanda.plataforma?.includes('Meta')) selectedChecklist = CHECKLIST_META_ADS;
    else if (demanda.plataforma?.includes('Google')) selectedChecklist = CHECKLIST_GOOGLE_ADS;

    const newCard = {
      id: uuidv4(),
      title: demanda.titulo,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      clientId: demanda.clientId,
      clientName: demanda.clientName,
      columnId: 'pendente',
      type: 'subir',
      wabas: [],
      contactsList: '-',
      tag: demanda.tipo,
      linkComplete: demanda.arquivo || '',
      linkShort: '',
      checklist: selectedChecklist.map(item => ({ ...item, id: uuidv4(), completed: false })),
      messageLabel: `Plataforma: ${demanda.plataforma || 'N/A'} - Obj: ${demanda.objetivo || 'N/A'}`,
      fromPortal: true,
      demandaId: demanda.id,
      demandaTipo: demanda.tipo,
      demandaPrioridade: demanda.prioridade,
      demandaDescricao: demanda.descricao,
      demandaJustificativa: demanda.justificativaUrgencia || null,
      demandaArquivo: demanda.arquivo || null,
      demandaCriadoEm: demanda.criadoEm,
      demandaPlataforma: demanda.plataforma,
      demandaObjetivo: demanda.objetivo,
      demandaOrcamento: demanda.orcamento,
      demandaPublico: demanda.publico,
    };
    setKanbanCards(prev => [newCard, ...prev]);
  };

  // ── Rejeição de Demanda ──
  const handleRejectDemanda = (demandaId) => {
    setDemandas(prev => {
      const updated = prev.map(d => d.id === demandaId ? { ...d, status: 'rejeitado' } : d);
      localStorage.setItem(DEMANDAS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // ── Rota Pública: Portal do Cliente (/portal/:clientId) ──
  const isPortalRoute = window.location.pathname.startsWith('/portal/');
  if (isPortalRoute) {
    return (
      <Routes>
        <Route path="/portal/:clientId" element={<PortalCliente demandas={demandas} onSubmitDemanda={handleSubmitDemanda} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // ── Rotas Privadas (área interna) ──
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const pendingDemandas = demandas.filter(d => d.status === 'pendente').length;

  const [quickAdOpen, setQuickAdOpen] = useState(false);
  const quickAdCard = {
    id: uuidv4(),
    title: 'Nova Campanha',
    clientId: '',
    demandaObjetivo: '',
    demandaOrcamento: '',
    demandaPublico: '',
    linkComplete: '',
  };

  return (
    <div className="app-container">
      <Sidebar onLogout={handleLogout} demandaBadge={pendingDemandas} onOpenAdCreator={() => setQuickAdOpen(true)} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/demandas" element={<Demandas demandas={demandas} onApprove={handleApproveDemanda} onReject={handleRejectDemanda} />} />
          <Route path="/kanban" element={<KanbanView cards={kanbanCards} setCards={setKanbanCards} />} />
          <Route path="/metricas" element={<Metricas />} />
          <Route path="/clientes" element={<Clientes demandas={demandas} />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/demandas" replace />} />
        </Routes>
      </main>

      {quickAdOpen && (
        <MetaAdCreator
          card={quickAdCard}
          onClose={() => setQuickAdOpen(false)}
          onComplete={() => { setQuickAdOpen(false); showToast('🚀 Campanha enviada para revisão na Business Manager!'); }}
        />
      )}

      {/* Global Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', 
          padding: '16px 24px', borderRadius: '12px', 
          boxShadow: '0 8px 32px rgba(139,92,246,0.5)',
          display: 'flex', alignItems: 'center', gap: '12px', 
          fontWeight: '700', fontSize: '15px',
          animation: 'slideIn 0.3s ease-out forwards', cursor: 'pointer'
        }} onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
