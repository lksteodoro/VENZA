import React, { useState, useEffect, useRef } from 'react';
import { Check, Trash2, MoreHorizontal, X, Calendar } from 'lucide-react';
import ChecklistModal from './ChecklistModal';

// ─── Priority config ───────────────────────────────────────────────────────────
const PRIORITY = {
  normal:  { color: 'var(--border-main)', next: 'alta',    label: 'Normal',  border: 'transparent' },
  alta:    { color: '#f59e0b',            next: 'urgente', label: 'Alta',    border: '#f59e0b' },
  urgente: { color: '#ef4444',            next: 'normal',  label: 'Urgente', border: '#ef4444' },
};

// ─── Date helpers ──────────────────────────────────────────────────────────────
const toISO = () => new Date().toISOString().split('T')[0];

const formatDateBR = (d) => {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

const dateStatus = (dueDate) => {
  if (!dueDate) return null;
  const today = toISO();
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'future';
};

const DATE_STYLE = {
  overdue: { bg: 'rgba(239,68,68,0.12)', color: '#f87171',       border: 'rgba(239,68,68,0.3)' },
  today:   { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24',      border: 'rgba(245,158,11,0.3)' },
  future:  { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: 'var(--border-light)' },
};

// ─── TaskItem ──────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onToggle, onClick, onUpdateField, dragIdx, draggingIdx, onDragStart, onDragEnter, onDragEnd }) => {
  const [hovered, setHovered] = useState(false);
  const dateRef = useRef();

  const priority = task.priority || 'normal';
  const pMeta    = PRIORITY[priority];
  const ds       = !task.completed ? dateStatus(task.dueDate) : null;
  const isDragging = draggingIdx === dragIdx;

  return (
    <div
      draggable={!task.completed}
      onDragStart={!task.completed ? () => onDragStart(dragIdx) : undefined}
      onDragEnter={!task.completed && draggingIdx !== null ? () => onDragEnter(dragIdx) : undefined}
      onDragEnd={!task.completed ? onDragEnd : undefined}
      onDragOver={e => { if (!task.completed) e.preventDefault(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '7px 8px 7px 4px', borderRadius: '6px',
        borderLeft: `3px solid ${priority !== 'normal' ? pMeta.border : 'transparent'}`,
        backgroundColor: isDragging ? 'var(--primary-light)' : hovered ? 'var(--bg-app)' : 'transparent',
        opacity: isDragging ? 0.5 : 1,
        transition: 'background 0.15s',
        cursor: !task.completed ? 'grab' : 'default',
        marginBottom: '1px',
      }}
    >
      {/* Priority dot — click to cycle */}
      {!task.completed && (
        <button
          onClick={e => { e.stopPropagation(); onUpdateField(task.id, 'priority', pMeta.next); }}
          title={`Prioridade: ${pMeta.label} (clique para mudar)`}
          style={{
            width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
            backgroundColor: pMeta.color, border: 'none', cursor: 'pointer', padding: 0,
            opacity: priority === 'normal' ? 0.2 : 1, transition: 'all 0.2s',
          }}
        />
      )}

      {/* Checkbox */}
      <button
        onClick={e => {
          e.stopPropagation();
          task.type === 'recurrent' && !task.completed ? onClick(task) : onToggle(task.id);
        }}
        style={{
          width: '17px', height: '17px', flexShrink: 0, borderRadius: '4px',
          border: task.completed ? 'none' :
            (task.type === 'recurrent' ? '2px solid var(--primary)' : '2px solid var(--border-main)'),
          backgroundColor: task.completed ? 'var(--success)' :
            (task.type === 'recurrent' ? 'var(--primary-light)' : 'transparent'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, transition: 'all 0.2s',
        }}
      >
        {task.completed && <Check size={10} color="white" strokeWidth={3} />}
      </button>

      {/* Text */}
      <div
        onClick={() => { if (task.type === 'recurrent') onClick(task); }}
        style={{ flex: 1, minWidth: 0, cursor: task.type === 'recurrent' && !task.completed ? 'pointer' : 'default' }}
      >
        <span style={{
          display: 'block', fontSize: '13px', fontWeight: '500',
          color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
          textDecoration: task.completed ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.2s',
        }}>
          {task.text}
        </span>
      </div>

      {/* Checklist badge (abbreviated) */}
      {task.type === 'recurrent' && (
        <span style={{
          flexShrink: 0, padding: '1px 5px', borderRadius: '4px',
          backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
          fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          CL
        </span>
      )}

      {/* Due date — badge if set, calendar icon on hover if not */}
      {!task.completed && (
        <>
          {/* Hidden date input always present */}
          <input
            ref={dateRef}
            type="date"
            value={task.dueDate || ''}
            onChange={e => onUpdateField(task.id, 'dueDate', e.target.value || null)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          />
          {task.dueDate && ds ? (
            <button
              onClick={e => { e.stopPropagation(); dateRef.current?.showPicker?.(); }}
              title={`Prazo: ${task.dueDate}`}
              style={{
                position: 'relative', flexShrink: 0, fontSize: '10px', fontWeight: '600',
                padding: '2px 5px', borderRadius: '4px', cursor: 'pointer',
                border: `1px solid ${DATE_STYLE[ds].border}`,
                backgroundColor: DATE_STYLE[ds].bg, color: DATE_STYLE[ds].color,
                display: 'flex', alignItems: 'center', gap: '3px',
              }}
            >
              {ds === 'overdue' ? '⚠' : '📅'} {formatDateBR(task.dueDate)}
            </button>
          ) : hovered ? (
            <button
              onClick={e => { e.stopPropagation(); dateRef.current?.showPicker?.(); }}
              title="Definir prazo"
              style={{
                flexShrink: 0, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)', padding: '2px',
                display: 'flex', opacity: 0.5,
              }}
            >
              <Calendar size={11} />
            </button>
          ) : null}
        </>
      )}

      {/* Delete */}
      {!task.completed && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(task.id, true); }}
          style={{
            opacity: hovered ? 1 : 0, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--danger)', padding: '2px',
            display: 'flex', transition: 'opacity 0.15s', flexShrink: 0,
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

// ─── ProjectCard ───────────────────────────────────────────────────────────────
const ProjectCard = ({
  project,
  onToggleTask, onDeleteTask, onAddTask,
  onDeleteProject, onRenameProject,
  onUpdateTask, onReorderTasks, onUpdateProject,
  onOpenMeta, onConfigMeta,
}) => {
  const hasMetaConfig = !!localStorage.getItem(`meta_defaults_proj_${project.id}`);
  const [newTaskText, setNewTaskText]         = useState('');
  const [newTaskIsRecurrent, setNewTaskIsRecurrent] = useState(false);
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTaskDate, setNewTaskDate]         = useState('');
  const [showMenu, setShowMenu]               = useState(false);
  const [isRenaming, setIsRenaming]           = useState(false);
  const [renameValue, setRenameValue]         = useState(project.name);
  const [showArchived, setShowArchived]       = useState(false);
  const [activeChecklistTask, setActiveChecklistTask] = useState(null);

  // Drag state
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragFrom = useRef(null);

  const inputRef  = useRef(null);
  const renameRef = useRef(null);

  const pendingTasks   = project.tasks.filter(t => !t.completed);
  const completedTasks = project.tasks.filter(t => t.completed);
  const done     = completedTasks.length;
  const total    = project.tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone  = total > 0 && done === total;
  const isPaused = project.status === 'pausado';

  // Overdue count
  const today = toISO();
  const overdueCount = pendingTasks.filter(t => t.dueDate && t.dueDate < today).length;
  const urgentCount  = pendingTasks.filter(t => (t.priority || 'normal') === 'urgente').length;

  // ── Handlers ──
  const handleAddTask = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && newTaskText.trim()) {
      onAddTask(
        project.id,
        newTaskText.trim(),
        newTaskIsRecurrent ? 'recurrent' : 'new',
        newTaskPriority,
        newTaskDate || null,
      );
      setNewTaskText('');
      setNewTaskPriority('normal');
      setNewTaskDate('');
      inputRef.current?.focus();
    }
  };

  const handleRename = () => {
    if (renameValue.trim()) onRenameProject(project.id, renameValue.trim());
    setIsRenaming(false);
    setShowMenu(false);
  };

  const handleToggleSubtask = (taskId, subtaskId) => {
    setActiveChecklistTask(prev =>
      !prev || prev.id !== taskId ? prev : {
        ...prev,
        subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s),
      }
    );
  };

  const handleCompleteChecklist = () => {
    if (activeChecklistTask) {
      onToggleTask(project.id, activeChecklistTask.id, true);
      setActiveChecklistTask(null);
    }
  };

  // Drag handlers
  const handleDragStart = (idx) => { dragFrom.current = idx; setDraggingIdx(idx); };
  const handleDragEnter = (idx) => {
    if (dragFrom.current === null || dragFrom.current === idx) return;
    const reordered = [...pendingTasks];
    const [moved] = reordered.splice(dragFrom.current, 1);
    reordered.splice(idx, 0, moved);
    dragFrom.current = idx;
    setDraggingIdx(idx);
    onReorderTasks(project.id, [...reordered, ...completedTasks]);
  };
  const handleDragEnd = () => { dragFrom.current = null; setDraggingIdx(null); };

  useEffect(() => { if (isRenaming) renameRef.current?.focus(); }, [isRenaming]);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${isPaused ? 'var(--border-light)' : 'var(--border-light)'}`,
        borderTop: `3px solid ${isPaused ? 'var(--border-main)' : project.color}`,
        borderRadius: '0 0 10px 10px',
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        opacity: isPaused ? 0.65 : 1,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* ── Header ── */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
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
                color: 'var(--text-main)', outline: 'none', padding: '0 0 2px',
              }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </h4>
              {isPaused && (
                <span style={{
                  flexShrink: 0, fontSize: '9px', fontWeight: '700', padding: '1px 6px',
                  borderRadius: '4px', backgroundColor: 'var(--border-main)',
                  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Pausado
                </span>
              )}
            </div>
          )}

          {/* Badges: urgent + overdue */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
            {urgentCount > 0 && (
              <span title={`${urgentCount} urgente(s)`} style={{
                fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '10px',
                backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
              }}>
                ⚡ {urgentCount}
              </span>
            )}
            {overdueCount > 0 && (
              <span title={`${overdueCount} vencida(s)`} style={{
                fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '10px',
                backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
              }}>
                ⚠ {overdueCount}
              </span>
            )}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '24px', zIndex: 50,
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                  borderRadius: '8px', boxShadow: 'var(--shadow-md)', minWidth: '170px', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setIsRenaming(true); setShowMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}
                  >
                    ✏️ Renomear
                  </button>
                  <button
                    onClick={() => { onUpdateProject(project.id, { status: isPaused ? 'ativo' : 'pausado' }); setShowMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}
                  >
                    {isPaused ? '▶ Reativar' : '⏸ Pausar'}
                  </button>
                  {onConfigMeta && (
                    <button
                      onClick={() => { onConfigMeta(project); setShowMenu(false); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--primary)' }}
                    >
                      ⚙️ Config. Meta do Projeto
                    </button>
                  )}
                  <button
                    onClick={() => { onDeleteProject(project.id); setShowMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--danger)' }}
                  >
                    🗑️ Excluir
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}
                  >
                    <X size={12} style={{ marginRight: '6px' }} /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              backgroundColor: allDone ? '#10b981' : (isPaused ? 'var(--border-main)' : project.color),
              borderRadius: '10px', transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: allDone ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}>
            {done}/{total}
          </span>
        </div>
      </div>

      {/* ── Pending Tasks ── */}
      <div style={{ padding: '6px 4px', flex: 1, maxHeight: '240px', overflowY: 'auto', minHeight: '56px' }}>
        {pendingTasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0', fontStyle: 'italic' }}>
            Nenhuma pendência.
          </p>
        ) : (
          pendingTasks.map((task, idx) => (
            <TaskItem
              key={task.id}
              task={task}
              dragIdx={idx}
              draggingIdx={draggingIdx}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onToggle={(id, isDelete) => isDelete ? onDeleteTask(project.id, id) : onToggleTask(project.id, id)}
              onClick={taskObj => setActiveChecklistTask(taskObj)}
              onUpdateField={(id, field, value) => onUpdateTask(project.id, id, field, value)}
            />
          ))
        )}
      </div>

      {/* ── Archived Tasks Accordion ── */}
      {completedTasks.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              width: '100%', padding: '7px 14px', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontSize: '11px', fontWeight: '600',
              color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>{completedTasks.length} arquivadas</span>
            <span style={{ fontSize: '10px' }}>{showArchived ? '▲' : '▼'}</span>
          </button>
          {showArchived && (
            <div style={{ padding: '4px 4px 10px', maxHeight: '160px', overflowY: 'auto' }}>
              {completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  dragIdx={-1}
                  draggingIdx={null}
                  onDragStart={() => {}}
                  onDragEnter={() => {}}
                  onDragEnd={() => {}}
                  onToggle={(id, isDelete) => isDelete ? onDeleteTask(project.id, id) : onToggleTask(project.id, id)}
                  onClick={taskObj => setActiveChecklistTask(taskObj)}
                  onUpdateField={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Meta Button ── */}
      {onOpenMeta && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
          <button
            onClick={() => onOpenMeta(project)}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
              background: hasMetaConfig ? 'linear-gradient(135deg, #1877f2, #0d65d9)' : 'var(--primary-light)',
              color: hasMetaConfig ? '#fff' : 'var(--primary)',
              border: hasMetaConfig ? 'none' : '1px solid rgba(139,92,246,0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            🚀 {hasMetaConfig ? 'Subir Anúncio' : 'Subir Anúncio (configurar Meta)'}
          </button>
        </div>
      )}

      {/* ── Add Task Area ── */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border-light)',
        display: 'flex', flexDirection: 'column', gap: '7px', backgroundColor: 'var(--bg-app)',
      }}>
        {/* Row 1: type + priority */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Type pills */}
          {['normal', 'recurrent'].map((type) => {
            const isRec = type === 'recurrent';
            const active = newTaskIsRecurrent === isRec;
            return (
              <button
                key={type}
                onClick={() => setNewTaskIsRecurrent(isRec)}
                style={{
                  padding: '3px 9px', fontSize: '11px', fontWeight: '600',
                  borderRadius: '20px', border: '1px solid',
                  borderColor: active ? 'var(--primary)' : 'var(--border-light)',
                  backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {isRec ? 'Com Checklist' : 'Simples'}
              </button>
            );
          })}

          {/* Separator */}
          <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-light)', flexShrink: 0 }} />

          {/* Priority pills */}
          {Object.entries(PRIORITY).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setNewTaskPriority(key)}
              title={`Prioridade: ${meta.label}`}
              style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${newTaskPriority === key ? meta.color : 'var(--border-light)'}`,
                backgroundColor: newTaskPriority === key ? `${meta.color}22` : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: meta.color, opacity: newTaskPriority === key ? 1 : 0.25 }} />
            </button>
          ))}

          {/* Due date for new task */}
          <input
            type="date"
            value={newTaskDate}
            onChange={e => setNewTaskDate(e.target.value)}
            title="Prazo (opcional)"
            style={{
              fontSize: '11px', padding: '3px 6px', border: '1px solid var(--border-light)',
              borderRadius: '6px', backgroundColor: 'var(--bg-app)', color: newTaskDate ? 'var(--text-main)' : 'var(--text-muted)',
              outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

        {/* Row 2: text input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={newTaskIsRecurrent ? 'Processo / Checklist...' : 'Adicionar tarefa... (Enter)'}
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={handleAddTask}
            style={{ flex: 1, fontSize: '13px', border: 'none', background: 'transparent', color: 'var(--text-main)', outline: 'none' }}
          />
          {newTaskText.trim() && (
            <button
              onClick={handleAddTask}
              style={{
                padding: '4px 10px', fontSize: '11px', border: 'none',
                backgroundColor: 'var(--primary)', color: 'white',
                borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
              }}
            >
              OK
            </button>
          )}
        </div>
      </div>

      {/* ── ChecklistModal ── */}
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
