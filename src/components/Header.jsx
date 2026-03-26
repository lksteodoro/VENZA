import React from 'react';
import { Search, Filter, Calendar, LayoutGrid, List, Plus } from 'lucide-react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-top">
        <div>
          <h1 className="page-title">Workspace</h1>
          <p className="page-subtitle">Gestão central de clientes e operação</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} /> Hoje
          </button>
          <button className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            Nova Demanda
          </button>
        </div>
      </div>

      <div className="header-toolbar">
        <div className="search-bar">
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Buscar por responsável ou número..." />
        </div>

        <div className="filter-select">
          <Filter size={16} />
          <span>Todas</span>
        </div>

        <div className="date-picker">
          <span>11/03/2026</span>
          <Calendar size={16} color="var(--text-muted)" />
        </div>

        <div className="view-toggle">
          <button className="view-toggle-btn active">
            <LayoutGrid size={16} />
            Kanban
          </button>
          <button className="view-toggle-btn">
            <List size={16} />
            Lista
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
