import React, { useState, useEffect, useRef } from 'react';
import { Check, Trash2, MoreHorizontal, X } from 'lucide-react';

import ChecklistModal from './ChecklistModal';
import { v4 as uuidv4 } from 'uuid';

const TaskItem = ({ task, onToggle, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px', borderRadius: '6px',
        backgroundColor: hovered ? 'var(--bg-app)' : 'transparent',
        transition: 'background 0.15s'
      }}
    >
      <button
        onClick={() => {
          if (task.type === 'recurrent' && !task.completed) {
            onClick(task);
          } else {
            onToggle(task.id);
          }
        }}
        style={{
          width: '18px', height: '18px', flexShrink: 0, borderRadius: '4px',
          border: task.completed ? 'none' : (task.type === 'recurrent' ? '2px solid var(--primary)' : '2px solid var(--border-main)'),
          backgroundColor: task.completed ? 'var(--success)' : (task.type === 'recurrent' ? 'var(--primary-light)' : 'transparent'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, transition: 'all 0.2s'
        }}
      >
        {task.completed && <Check size={11} color="white" strokeWidth={3} />}
      </button>

      <div
        onClick={() => {
          if (task.type === 'recurrent') onClick(task);
        }}
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px',
          cursor: task.type === 'recurrent' && !task.completed ? 'pointer' : 'default'
        }}
      >
        <span style={{
          flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '500',
          color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
          textDecoration: task.completed ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.2s'
        }}>
          {task.text}
        </span>
        {task.type === 'recurrent' && (
          <span style={{
            flexShrink: 0, padding: '2px 6px', borderRadius: '4px',
            backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
            fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            Checklist
          </span>
        )}
      </div>

      {!task.completed && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id, true); }}
          style={{
            opacity: hovered ? 1 : 0, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--danger)', padding: '2px',
            display: 'flex', transition: 'opacity 0.15s', flexShrink: 0
          }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
};

const ProjectCard = ({ project, onToggleTask, onDeleteTask, onAddTask, onDeleteProject, onRenameProject }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskIsRecurrent, setNewTaskIsRecurrent] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const [showArchived, setShowArchived] = useState(false);
  // Checklist Modal State
  const [activeChecklistTask, setActiveChecklistTask] = useState(null);
  
  const inputRef = useRef(null);
  const renameRef = useRef(null);

  const done = project.tasks.filter(t => t.completed).length;
  const total = project.tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  const pendingTasks = project.tasks.filter(t => !t.completed);
  const completedTasks = project.tasks.filter(t => t.completed);

  const handleAddTask = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && newTaskText.trim()) {
      onAddTask(project.id, newTaskText.trim(), newTaskIsRecurrent ? 'recurrent' : 'new');
      setNewTaskText('');
      inputRef.current?.focus();
    }
  };

  const handleRename = () => {
    if (renameValue.trim()) {
      onRenameProject(project.id, renameValue.trim());
    }
    setIsRenaming(false);
    setShowMenu(false);
  };

  const handleToggleSubtask = (taskId, subtaskId) => {
    // Optimistic toggle in local state for the modal
    setActiveChecklistTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      return {
        ...prev,
        subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s)
      };
    });
  };

  const handleCompleteChecklist = () => {
    if (activeChecklistTask) {
      onToggleTask(project.id, activeChecklistTask.id, true); // complete it
      setActiveChecklistTask(null);
    }
  };

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: `1px solid var(--border-light)`,
      borderTop: `3px solid ${project.color}`,
      borderRadius: '0 0 10px 10px',
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              style={{
                flex: 1, fontSize: '14px', fontWeight: '700', border: 'none',
                borderBottom: `2px solid ${project.color}`, background: 'transparent',
                color: 'var(--text-main)', outline: 'none', padding: '0 0 2px'
              }}
            />
          ) : (
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.3', flex: 1 }}>
              {project.name}
            </h4>
          )}

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '24px', zIndex: 10,
                backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                borderRadius: '8px', boxShadow: 'var(--shadow-md)', minWidth: '160px', overflow: 'hidden'
              }}>
                <button onClick={() => { setIsRenaming(true); setShowMenu(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}>
                  ✏️ Renomear Projeto
                </button>
                <button onClick={() => { onDeleteProject(project.id); setShowMenu(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--danger)' }}>
                  🗑️ Excluir Projeto
                </button>
                <button onClick={() => setShowMenu(false)} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <X size={12} style={{ marginRight: '6px' }} />Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '5px', backgroundColor: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              backgroundColor: allDone ? '#10b981' : project.color,
              borderRadius: '10px', transition: 'width 0.4s ease'
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: allDone ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}>
            {done}/{total}
          </span>
        </div>
      </div>

      {/* Task List (Pending) */}
      <div style={{ padding: '8px 6px', flex: 1, maxHeight: '220px', overflowY: 'auto', minHeight: '60px' }}>
        {pendingTasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0', fontStyle: 'italic' }}>
            Nenhuma pendência.
          </p>
        ) : (
          pendingTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={(id, isDelete) => isDelete ? onDeleteTask(project.id, id) : onToggleTask(project.id, id)}
              onClick={(taskObj) => setActiveChecklistTask(taskObj)}
            />
          ))
        )}
      </div>

      {/* Archived Tasks Accordion */}
      {completedTasks.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              width: '100%', padding: '8px 16px', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontSize: '11px', fontWeight: '600',
              color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <span>{completedTasks.length} tarefas arquivadas</span>
            <span style={{ fontSize: '10px' }}>{showArchived ? '▲ Ocultar' : '▼ Expandir'}</span>
          </button>
          
          {showArchived && (
            <div style={{ padding: '4px 6px 12px', maxHeight: '160px', overflowY: 'auto' }}>
              {completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={(id, isDelete) => isDelete ? onDeleteTask(project.id, id) : onToggleTask(project.id, id)}
                  onClick={(taskObj) => setActiveChecklistTask(taskObj)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Task Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border-light)',
        display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-app)'
      }}>
        {/* Type selector pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setNewTaskIsRecurrent(false)}
            style={{
              padding: '3px 10px', fontSize: '11px', fontWeight: '600',
              borderRadius: '20px', border: '1px solid',
              borderColor: !newTaskIsRecurrent ? 'var(--primary)' : 'var(--border-light)',
              backgroundColor: !newTaskIsRecurrent ? 'var(--primary-light)' : 'transparent',
              color: !newTaskIsRecurrent ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            Simples
          </button>
          <button
            onClick={() => setNewTaskIsRecurrent(true)}
            style={{
              padding: '3px 10px', fontSize: '11px', fontWeight: '600',
              borderRadius: '20px', border: '1px solid',
              borderColor: newTaskIsRecurrent ? 'var(--primary)' : 'var(--border-light)',
              backgroundColor: newTaskIsRecurrent ? 'var(--primary-light)' : 'transparent',
              color: newTaskIsRecurrent ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            Com Checklist
          </button>
        </div>
        {/* Text input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={newTaskIsRecurrent ? "Processo / Checklist... (Enter)" : "Adicionar tarefa... (Enter)"}
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={handleAddTask}
            style={{
              flex: 1, fontSize: '13px', border: 'none', background: 'transparent',
              color: 'var(--text-main)', outline: 'none'
            }}
          />
          {newTaskText.trim() && (
            <button
              onClick={handleAddTask}
              style={{
                padding: '4px 10px', fontSize: '11px', border: 'none',
                backgroundColor: 'var(--primary)', color: 'white',
                borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
              }}
            >
              OK
            </button>
          )}
        </div>
      </div>

      {activeChecklistTask && (
        <ChecklistModal
          task={activeChecklistTask}
          onClose={() => setActiveChecklistTask(null)}
          onToggleSubtask={handleToggleSubtask}
          onCompleteTask={handleCompleteChecklist}
        />
      )}

    </div>
  );
};

export default ProjectCard;
