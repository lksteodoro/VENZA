import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Settings, LayoutDashboard, Zap, BarChart2, MessageSquare } from 'lucide-react';
import { CheckSquare } from 'lucide-react';
import '../App.css';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/kanban',       icon: <CheckSquare size={18} />,     label: 'Kanban Ops' },
  { to: '/clientes',     icon: <Users size={18} />,           label: 'Clientes & Projetos' },
  { to: '/portal',       icon: <MessageSquare size={18} />,   label: 'Portal do Cliente' },
  { to: '/automacoes',   icon: <Zap size={18} />,             label: 'Automações' },
  { to: '/analytics',    icon: <BarChart2 size={18} />,       label: 'Analytics & SLA' },
];

const Sidebar = ({ onLogout }) => {
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
          </NavLink>
        ))}
      </nav>

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
