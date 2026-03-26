import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import KanbanView from './pages/KanbanView';
import Clientes from './pages/Clientes';
import Automacoes from './pages/Automacoes';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import PortalCliente from './pages/PortalCliente';
import Analytics from './pages/Analytics';
import './App.css';

const DEMANDAS_KEY = 'venza_demandas';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('venza_auth') === 'true';
  });

  // ── Carrega demandas do localStorage na inicialização ──
  const [demandas, setDemandas] = useState(() => {
    try {
      const stored = localStorage.getItem(DEMANDAS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // ── Sincroniza entre abas: quando o Portal (outra aba) salva, o painel atualiza ──
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === DEMANDAS_KEY) {
        try {
          setDemandas(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
      // Persiste no localStorage para que o painel (outra aba) capte via storage event
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

  return (
    <div className="app-container">
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard demandas={demandas} />} />
          <Route path="/kanban" element={<KanbanView />} />
          <Route path="/clientes" element={<Clientes demandas={demandas} />} />
          <Route path="/automacoes" element={<Automacoes />} />
          <Route path="/analytics" element={<Analytics demandas={demandas} />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
