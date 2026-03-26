import React, { useState } from 'react';
import { Plus, Check, Clock, Sparkle } from 'lucide-react';

const DemandasList = ({ title, tasks, type, onToggle }) => {
  return (
    <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {type === 'recurrent' ? <Clock size={18} color="var(--primary)" /> : <Sparkle size={18} color="#f59e0b" />}
          {title}
        </h3>
        <button className="icon-btn" title="Nova Tarefa"><Plus size={16} /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>Nenhuma tarefa pendente.</p>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px', 
                backgroundColor: 'var(--bg-surface)', 
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                opacity: task.completed ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <button 
                onClick={() => onToggle(task.id)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: task.completed ? 'none' : '2px solid var(--border-main)',
                  backgroundColor: task.completed ? 'var(--primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {task.completed && <Check size={14} color="white" />}
              </button>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500', 
                color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                textDecoration: task.completed ? 'line-through' : 'none'
              }}>
                {task.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DemandasList;
