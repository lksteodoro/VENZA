import React from 'react';
import { GripVertical, Calendar, Trash2, Phone, Clock, Check } from 'lucide-react';
import { CLIENTS } from '../data/mockData';

const TaskCard = ({ card, onEdit, onToggleCheck }) => {
  const client = CLIENTS.find(c => c.id === card.clientId);
  
  const completedCount = card.checklist.filter(item => item.completed).length;
  const totalCount = card.checklist.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const displayPlataforma = card.demandaPlataforma || 'N/A';
  const displayOrcamento = card.demandaOrcamento || 'N/A';

  return (
    <div className={`task-card type-${card.type}`}>
      <div className="card-header" onClick={onEdit} style={{ cursor: 'pointer' }}>
        <div className="card-client-info">
          <div className="drag-handle" onClick={e => e.stopPropagation()}>
            <GripVertical size={16} />
          </div>
          {client ? (
            <img src={client.avatarUrl} alt={client.name} className="client-avatar" />
          ) : (
            <div className="client-avatar" style={{ backgroundColor: 'var(--border-main)' }} />
          )}
          <div>
            <div className="client-name">{card.title}</div>
            <div className="client-tag">{card.tag}</div>
          </div>
        </div>
        <div className="card-actions">
          <button className="card-action-btn" title="Agendar"><Calendar size={16} /></button>
          <button className="card-action-btn delete" title="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="card-meta">
        <div className="meta-badge" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: 'var(--primary)' }}>
          {displayPlataforma}
        </div>
        <div className="meta-badge" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
          {displayOrcamento}
        </div>
        <div className="meta-badge time">
          <Clock size={12} /> {card.time}
        </div>
      </div>

      <div className="card-progress-section">
        <div className="progress-header">
          <span className="progress-label">Progresso</span>
          <span className="progress-count">{completedCount}/{totalCount}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="checklist-icons">
        {card.checklist.map((item) => (
          <div 
            key={item.id} 
            className={`check-icon ${item.completed ? 'completed' : 'pending'}`}
            title={item.text}
            onClick={(e) => { e.stopPropagation(); onToggleCheck(item.id); }}
            style={{ cursor: 'pointer' }}
          >
            {item.completed && <Check size={12} strokeWidth={3} />}
          </div>
        ))}
      </div>

      <div className="card-footer">
        {card.messageLabel}
      </div>
    </div>
  );
};

export default TaskCard;
