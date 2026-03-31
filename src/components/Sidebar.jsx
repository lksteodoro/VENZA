import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Settings, Inbox, CheckSquare, PlusCircle, LayoutDashboard, BarChart2, Zap } from 'lucide-react';

import '../App.css';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/demandas',     icon: <Inbox size={18} />,           label: 'Demandas' },
  { to: '/metricas',     icon: <BarChart2 size={18} />,       label: 'Métricas' },
  { to: '/kanban',       icon: <CheckSquare size={18} />,     label: 'Execução (Ads)' },
  { to: '/clientes',     icon: <Users size={18} />,           label: 'Clientes & Projetos' },
  { to: '/automacoes',   icon: <Zap size={18} />,             label: 'Automações' },
];

const Sidebar = ({ onLogout, demandaBadge = 0, onOpenAdCreator }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', boxShadow: '0 4px 16px rgba(139,92,246,0.4)', fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
          V
        </div>
        <div>
          <div className="sidebar-logo-text" style={{ fontSize: '15px', letterSpacing: '-0.5px', fontWeight: '900' }}>VENZA</div>
          <div className="sidebar-logo-sub" style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: 'var(--primary)' }}>ASSESSORIA</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {item.icon}
            <span>{item.label}</span>
            {item.to === '/demandas' && demandaBadge > 0 && (
              <span style={{
                marginLeft: 'auto', minWidth: '18px', height: '18px',
                background: '#ef4444', color: 'white', fontSize: '10px',
                fontWeight: '700', borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px'
              }}>
                {demandaBadge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ margin: '16px', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #1877F2, #0056d6)', color: 'white', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 8px 16px rgba(24,119,242,0.3)' }}>
        <h4 style={{ fontSize: '12px', fontWeight: '800', margin: 0 }}>Meta Ads</h4>
        <p style={{ fontSize: '10px', opacity: 0.9, margin: 0, lineHeight: 1.3 }}>Suba anúncios rapidamente em lote.</p>
        <button onClick={onOpenAdCreator} style={{ background: 'white', color: '#1877F2', border: 'none', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>
          <PlusCircle size={14} /> Novo Anúncio
        </button>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
        <NavLink to="/configuracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span>Configurações</span>
        </NavLink>
        <div
          className="nav-item"
          style={{ cursor: 'pointer', color: 'var(--danger)', marginTop: '4px' }}
          onClick={onLogout}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sair</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
