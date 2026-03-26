import React from 'react';
import { X, Check, ShieldCheck, Cog, Activity } from 'lucide-react';

const ChecklistModal = ({ task, onToggleSubtask, onClose, onCompleteTask }) => {
  if (!task || !task.subtasks) return null;

  const subtasksList = task.subtasks || [];
  const total = subtasksList.length;
  const done = subtasksList.filter(s => s.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;

  // Group subtasks by phase
  const phases = ['Criação', 'Otimização', 'Verificação'];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', 
      justifyContent: 'center', zIndex: 2000
    }}>
      <div className="animate-slide-in" style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
        borderRadius: '16px', width: '560px', maxWidth: '90vw', 
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', 
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Revisão Crítica de Processo
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
                {task.text}
              </h3>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span>Progresso de Validação</span>
              <span style={{ color: allDone ? 'var(--success)' : 'inherit' }}>{progress}% ({done}/{total})</span>
            </div>
            <div style={{ height: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', width: `${progress}%`, 
                backgroundColor: allDone ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.4s ease, background-color 0.4s ease'
              }}/>
            </div>
          </div>
        </div>

        {/* Scrollable Checklist */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-app)' }}>
          {phases.map((phaseName, pIdx) => {
            const phaseSubtasks = subtasksList.filter(s => s.phase === phaseName);
            if (phaseSubtasks.length === 0) return null;

            return (
              <div key={phaseName} style={{ marginBottom: pIdx < phases.length - 1 ? '32px' : '0' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {phaseName === 'Criação' && <Cog size={14} color="var(--primary)" />}
                  {phaseName === 'Otimização' && <Activity size={14} color="var(--primary)" />}
                  {phaseName === 'Verificação' && <ShieldCheck size={14} color="var(--primary)" />}
                  {phaseName}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {phaseSubtasks.map(sub => (
                    <label key={sub.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '16px', backgroundColor: 'var(--bg-surface)',
                      border: sub.done ? '1px solid var(--success)' : '1px solid var(--border-light)',
                      borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                      opacity: sub.done ? 0.7 : 1
                    }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                        border: sub.done ? 'none' : '2px solid var(--border-main)',
                        backgroundColor: sub.done ? 'var(--success)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', marginTop: '2px'
                      }}>
                        {sub.done && <Check size={14} color="white" />}
                      </div>
                      <span style={{ 
                        fontSize: '14px', color: sub.done ? 'var(--text-muted)' : 'var(--text-main)', 
                        textDecoration: sub.done ? 'line-through' : 'none', lineHeight: '1.4'
                      }}>
                        {sub.text}
                      </span>
                      <input 
                        type="checkbox" 
                        checked={sub.done} 
                        onChange={() => onToggleSubtask(task.id, sub.id)}
                        style={{ display: 'none' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          <button 
            onClick={() => allDone && onCompleteTask()}
            disabled={!allDone}
            style={{
              padding: '10px 24px', fontSize: '14px', fontWeight: '600',
              borderRadius: '8px', border: 'none', color: 'white',
              backgroundColor: allDone ? 'var(--success)' : 'var(--border-main)',
              cursor: allDone ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: allDone ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            {allDone ? 'Finalizar Processo' : 'Aguardando Checklist'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistModal;
