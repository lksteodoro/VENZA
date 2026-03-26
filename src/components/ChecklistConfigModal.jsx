import React, { useState } from 'react';
import { X, Plus, Trash2, Cog, Activity, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BASE_SUBTASKS } from '../data/mockData';

const PHASES = ['Criação', 'Otimização', 'Verificação'];

const PHASE_ICONS = {
  'Criação': <Cog size={14} color="var(--primary)" />,
  'Otimização': <Activity size={14} color="var(--primary)" />,
  'Verificação': <ShieldCheck size={14} color="var(--primary)" />,
};

const ChecklistConfigModal = ({ task, onClose, onSave }) => {
  const existing = task.subtasks && task.subtasks.length > 0;
  const [subtasks, setSubtasks] = useState(
    existing
      ? [...task.subtasks]
      : BASE_SUBTASKS.map(s => ({ ...s, id: uuidv4(), done: false }))
  );
  const [newItemText, setNewItemText] = useState('');
  const [newItemPhase, setNewItemPhase] = useState('Criação');

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setSubtasks(prev => [
      ...prev,
      { id: uuidv4(), text: newItemText.trim(), phase: newItemPhase, done: false }
    ]);
    setNewItemText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddItem();
  };

  const handleRemoveItem = (id) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2100
    }}>
      <div className="animate-slide-in" style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
        borderRadius: '16px', width: '540px', maxWidth: '90vw',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>

        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)', display: 'flex' }}
          >
            <X size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'var(--primary-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
            }}>
              <Cog size={22} />
            </div>
            <div>
              <div style={{
                fontSize: '11px', fontWeight: '700', color: 'var(--primary)',
                textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px'
              }}>
                Configurar Checklist
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
                {task.text}
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-app)' }}>

          {/* Add item form */}
          <div style={{
            padding: '14px', backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)', borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px'
            }}>
              Novo Item
            </div>

            {/* Phase selector pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {PHASES.map(phase => (
                <button
                  key={phase}
                  onClick={() => setNewItemPhase(phase)}
                  style={{
                    padding: '4px 12px', fontSize: '11px', fontWeight: '600',
                    borderRadius: '20px', border: '1px solid',
                    borderColor: newItemPhase === phase ? 'var(--primary)' : 'var(--border-light)',
                    backgroundColor: newItemPhase === phase ? 'var(--primary-light)' : 'transparent',
                    color: newItemPhase === phase ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {phase}
                </button>
              ))}
            </div>

            {/* Text input + Add button */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                type="text"
                placeholder="Descrever o item do checklist..."
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
                autoFocus
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemText.trim()}
                style={{
                  padding: '8px 14px', fontSize: '13px', fontWeight: '600',
                  border: 'none', borderRadius: '8px',
                  cursor: newItemText.trim() ? 'pointer' : 'not-allowed',
                  backgroundColor: newItemText.trim() ? 'var(--primary)' : 'var(--border-main)',
                  color: 'white', display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'all 0.15s', flexShrink: 0
                }}
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Items grouped by phase */}
          {PHASES.map((phaseName, pIdx) => {
            const phaseItems = subtasks.filter(s => s.phase === phaseName);
            if (phaseItems.length === 0) return null;
            return (
              <div key={phaseName} style={{ marginBottom: pIdx < PHASES.length - 1 ? '24px' : '0' }}>
                <h4 style={{
                  fontSize: '12px', fontWeight: '700', color: 'var(--text-main)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {PHASE_ICONS[phaseName]}
                  {phaseName}
                  <span style={{
                    fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                    borderRadius: '10px', padding: '1px 7px', marginLeft: '4px'
                  }}>
                    {phaseItems.length}
                  </span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {phaseItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-light)', borderRadius: '8px'
                      }}
                    >
                      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        style={{
                          flexShrink: 0, background: 'none', border: 'none',
                          cursor: 'pointer', color: 'var(--danger)',
                          padding: '2px', display: 'flex', opacity: 0.5,
                          transition: 'opacity 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {subtasks.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 16px',
              color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic'
            }}>
              Nenhum item adicionado. Use o formulário acima para criar itens do checklist.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-light)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {subtasks.length} {subtasks.length === 1 ? 'item' : 'itens'} no checklist
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={() => onSave(subtasks)} className="btn-primary">Salvar</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChecklistConfigModal;
