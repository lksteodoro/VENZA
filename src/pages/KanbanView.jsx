import { useState, useMemo, useRef, useEffect } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import EditModal from '../components/EditModal';
import { CLIENTS, BOARD_COLUMNS } from '../data/mockData';
import { Users, ChevronDown, Check, LayoutGrid } from 'lucide-react';
import './KanbanView.css';

const COL_META = {
  pendente:  { color: '#f59e0b', label: 'Pendente' },
  andamento: { color: '#3b82f6', label: 'Em Andamento' },
  aprovacao: { color: '#f97316', label: 'Aprovação' },
  concluido: { color: '#10b981', label: 'Concluído' },
};

const KanbanView = ({ cards, setCards }) => {
  const [editingCard, setEditingCard]   = useState(null);
  const [activeClient, setActiveClient] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clientsWithCards = useMemo(() => {
    const ids = new Set(cards.map(c => c.clientId));
    return CLIENTS.filter(c => ids.has(c.id));
  }, [cards]);

  const filteredCards = useMemo(() =>
    activeClient === 'all' ? cards : cards.filter(c => c.clientId === activeClient),
    [cards, activeClient]
  );

  const selectedClient = clientsWithCards.find(c => c.id === activeClient);

  const selectClient = (id) => {
    setActiveClient(id);
    setDropdownOpen(false);
  };

  const updateCard = (updatedCard) =>
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));

  const deleteCard = (cardId) =>
    setCards(prev => prev.filter(c => c.id !== cardId));

  return (
    <div className="kv-root">

      {/* ── Toolbar ── */}
      <div className="kv-toolbar">

        {/* KPIs por coluna */}
        <div className="kv-kpis">
          {BOARD_COLUMNS.map(col => {
            const meta  = COL_META[col.id];
            const count = filteredCards.filter(c => c.columnId === col.id).length;
            return (
              <div key={col.id} className="kv-kpi" style={{ '--kpi-color': meta.color }}>
                <span className="kv-kpi-dot" />
                <span className="kv-kpi-label">{meta.label}</span>
                <span className="kv-kpi-count">{count}</span>
              </div>
            );
          })}
          <div className="kv-kpi kv-kpi--total">
            <LayoutGrid size={12} />
            <span className="kv-kpi-label">Total</span>
            <span className="kv-kpi-count">{filteredCards.length}</span>
          </div>
        </div>

        {/* Dropdown de cliente */}
        <div className="kv-dropdown-wrap" ref={dropdownRef}>
          <button
            className={`kv-dropdown-trigger ${dropdownOpen ? 'kv-dropdown-trigger--open' : ''} ${activeClient !== 'all' ? 'kv-dropdown-trigger--active' : ''}`}
            onClick={() => setDropdownOpen(o => !o)}
          >
            {activeClient === 'all' ? (
              <>
                <Users size={14} className="kv-trigger-icon" />
                <span className="kv-trigger-label">Todos os clientes</span>
              </>
            ) : (
              <>
                {selectedClient?.avatarUrl
                  ? <img src={selectedClient.avatarUrl} alt="" className="kv-trigger-avatar" />
                  : <span className="kv-trigger-avatar kv-trigger-avatar--fallback">{selectedClient?.name[0]}</span>
                }
                <span className="kv-trigger-label">{selectedClient?.name}</span>
                <span className="kv-trigger-badge">
                  {filteredCards.length}
                </span>
              </>
            )}
            <ChevronDown size={13} className={`kv-trigger-chevron ${dropdownOpen ? 'kv-trigger-chevron--open' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="kv-dropdown-menu">
              <div className="kv-dropdown-header">Filtrar por cliente</div>

              {/* Opção "Todos" */}
              <button
                className={`kv-dropdown-item ${activeClient === 'all' ? 'kv-dropdown-item--selected' : ''}`}
                onClick={() => selectClient('all')}
              >
                <div className="kv-item-avatar-wrap">
                  <Users size={13} className="kv-item-icon-all" />
                </div>
                <span className="kv-item-name">Todos os clientes</span>
                <span className="kv-item-count">{cards.length}</span>
                {activeClient === 'all' && <Check size={12} className="kv-item-check" />}
              </button>

              <div className="kv-dropdown-divider" />

              {clientsWithCards.map(client => {
                const count    = cards.filter(c => c.clientId === client.id).length;
                const isActive = activeClient === client.id;
                return (
                  <button
                    key={client.id}
                    className={`kv-dropdown-item ${isActive ? 'kv-dropdown-item--selected' : ''}`}
                    onClick={() => selectClient(client.id)}
                  >
                    <div className="kv-item-avatar-wrap">
                      {client.avatarUrl
                        ? <img src={client.avatarUrl} alt={client.name} className="kv-item-avatar" />
                        : <span className="kv-item-avatar kv-item-avatar--fallback">{client.name[0]}</span>
                      }
                    </div>
                    <span className="kv-item-name">{client.name}</span>
                    <span className="kv-item-count">{count}</span>
                    {isActive && <Check size={12} className="kv-item-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="board-container">
        <KanbanBoard
          cards={filteredCards}
          setCards={setCards}
          onEditCard={(card) => setEditingCard(card)}
          onDeleteCard={deleteCard}
        />
      </div>

      {editingCard && (
        <EditModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(updatedCard) => {
            updateCard(updatedCard);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanView;
