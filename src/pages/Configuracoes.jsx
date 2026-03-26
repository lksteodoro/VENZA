import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Cog, Activity, ShieldCheck, RotateCcw, Save, Check, GripVertical, ChevronDown, Pencil } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BASE_SUBTASKS } from '../data/mockData';

const STORAGE_KEY = 'crm_checklist_template';
const PHASES = ['Criação', 'Otimização', 'Verificação'];

const PHASE_META = {
  'Criação':     { icon: <Cog size={14} />,        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'Otimização':  { icon: <Activity size={14} />,    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Verificação': { icon: <ShieldCheck size={14} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

const loadTemplate = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : BASE_SUBTASKS.map(s => ({ ...s, id: uuidv4() }));
  } catch {
    return BASE_SUBTASKS.map(s => ({ ...s, id: uuidv4() }));
  }
};

function reorder(list, from, to) {
  const result = [...list];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

// ─── Phase Dropdown ───────────────────────────────────────────────────────────
const PhaseDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const meta = PHASE_META[value] || PHASE_META['Criação'];
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
          fontWeight: '700', border: `1px solid ${meta.color}55`,
          backgroundColor: meta.bg, color: meta.color, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'all 0.15s'
        }}
      >
        {meta.icon} {value} <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 100,
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
          borderRadius: '10px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', minWidth: '150px'
        }}>
          {PHASES.map((p, idx) => {
            const m = PHASE_META[p];
            return (
              <button
                key={p}
                onClick={() => { onChange(p); setOpen(false); }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  fontSize: '12px', fontWeight: '600', color: m.color,
                  background: value === p ? m.bg : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  borderBottom: idx < PHASES.length - 1 ? '1px solid var(--border-light)' : 'none'
                }}
              >
                {m.icon} {p} {value === p && <Check size={11} style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Template Row ─────────────────────────────────────────────────────────────
const TemplateRow = ({ item, index, total, onChangeText, onChangePhase, onDelete, draggingIdx, onDragStart, onDragEnter, onDragEnd }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.text);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef();
  const isDragging = draggingIdx === index;

  useEffect(() => { setVal(item.text); }, [item.text]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== item.text) onChangeText(item.id, trimmed);
    else setVal(item.text);
    setEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 14px', borderRadius: '10px',
        border: isDragging ? '1px dashed var(--primary)' : `1px solid ${hovered ? 'var(--border-main)' : 'var(--border-light)'}`,
        backgroundColor: isDragging ? 'var(--primary-light)' : (hovered ? 'var(--bg-surface-hover)' : 'var(--bg-app)'),
        marginBottom: '6px', transition: 'border-color 0.15s, background-color 0.15s',
        opacity: isDragging ? 0.55 : 1, cursor: 'default',
      }}
    >
      {/* Grip */}
      <div
        style={{ cursor: 'grab', color: hovered ? 'var(--border-main)' : 'transparent', flexShrink: 0, transition: 'color 0.15s' }}
        title="Arrastar para reordenar"
      >
        <GripVertical size={15} />
      </div>

      {/* Index */}
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)'
      }}>
        {index + 1}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(item.text); setEditing(false); } }}
            style={{
              width: '100%', fontSize: '13px', fontWeight: '500',
              background: 'transparent', border: 'none',
              borderBottom: '1.5px solid var(--primary)', color: 'var(--text-main)',
              outline: 'none', padding: '2px 0', lineHeight: '1.4'
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span
              onClick={() => setEditing(true)}
              title="Clique para editar"
              style={{
                fontSize: '13px', fontWeight: '500', color: 'var(--text-main)',
                cursor: 'text', lineHeight: '1.4', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0
              }}
            >
              {item.text}
            </span>
            {hovered && (
              <button
                onClick={() => setEditing(true)}
                style={{ flexShrink: 0, color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
                title="Editar texto"
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Phase dropdown */}
      <PhaseDropdown value={item.phase} onChange={phase => onChangePhase(item.id, phase)} />

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        title="Remover item"
        style={{
          flexShrink: 0, color: 'var(--danger)', padding: '3px',
          opacity: hovered ? 0.9 : 0, transition: 'opacity 0.15s',
          display: 'flex', borderRadius: '6px'
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Configuracoes = () => {
  const [items, setItems] = useState(loadTemplate);
  const [newText, setNewText] = useState('');
  const [newPhase, setNewPhase] = useState('Criação');
  const [saved, setSaved] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragFrom = useRef(null);
  const addInputRef = useRef();

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRestore = () => {
    if (!window.confirm('Restaurar o template padrão? Todos os itens atuais serão substituídos.')) return;
    const defaults = BASE_SUBTASKS.map(s => ({ ...s, id: uuidv4() }));
    setItems(defaults);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    setItems(prev => [...prev, { id: uuidv4(), text: newText.trim(), phase: newPhase, done: false }]);
    setNewText('');
    addInputRef.current?.focus();
  };

  const handleChangeText   = (id, text)  => setItems(prev => prev.map(i => i.id === id ? { ...i, text }  : i));
  const handleChangePhase  = (id, phase) => setItems(prev => prev.map(i => i.id === id ? { ...i, phase } : i));
  const handleDelete       = (id)        => setItems(prev => prev.filter(i => i.id !== id));

  const handleDragStart = (idx) => { dragFrom.current = idx; setDraggingIdx(idx); };
  const handleDragEnter = (idx) => {
    if (dragFrom.current === null || dragFrom.current === idx) return;
    setItems(prev => reorder(prev, dragFrom.current, idx));
    dragFrom.current = idx;
    setDraggingIdx(idx);
  };
  const handleDragEnd = () => { dragFrom.current = null; setDraggingIdx(null); };

  const byPhase = PHASES.map(p => ({ phase: p, count: items.filter(i => i.phase === p).length }));

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <div style={{ paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Configurações</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Personalize o template usado ao criar tarefas do tipo <strong style={{ color: 'var(--primary)' }}>Com Checklist</strong> nos projetos de clientes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button onClick={handleRestore} className="btn-secondary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={14} /> Restaurar Padrão
            </button>
            <button onClick={handleSave} className="btn-primary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar Template</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 100px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
          borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <ShieldCheck size={19} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700' }}>{items.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>itens no template</div>
          </div>
        </div>
        {byPhase.map(({ phase, count }) => {
          const m = PHASE_META[phase];
          return (
            <div key={phase} style={{
              flex: '1 1 100px', backgroundColor: 'var(--bg-surface)', border: `1px solid ${m.color}30`,
              borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: m.color }}>{count}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{phase}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column layout: list + add form ── */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* LEFT: Template list card (scrollable) */}
        <div style={{
          flex: 1, minWidth: 0,
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
          borderRadius: '12px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Card header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <ShieldCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>Itens do Template</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Arraste · Clique para editar · Altere a fase pelo tag
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)',
              borderRadius: '20px', padding: '3px 10px'
            }}>
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {/* Scrollable list */}
          <div style={{
            overflowY: 'auto', maxHeight: '480px',
            padding: items.length === 0 ? '0' : '14px 16px'
          }}>
            {items.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShieldCheck size={36} style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: '600', marginBottom: '4px' }}>Template vazio</p>
                <p style={{ fontSize: '12px' }}>Use o formulário ao lado para adicionar itens.</p>
              </div>
            ) : (
              items.map((item, idx) => (
                <TemplateRow
                  key={item.id}
                  item={item}
                  index={idx}
                  total={items.length}
                  draggingIdx={draggingIdx}
                  onChangeText={handleChangeText}
                  onChangePhase={handleChangePhase}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Add item card (always sticky/visible) */}
        <div style={{
          width: '320px', flexShrink: 0, position: 'sticky', top: '16px',
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
          borderRadius: '12px', overflow: 'hidden'
        }}>
          {/* Card header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Plus size={16} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>Adicionar Item</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sempre visível · Enter para confirmar</div>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Text input */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Descrição do item
              </label>
              <textarea
                ref={addInputRef}
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
                placeholder="Ex: Verificar pixel de conversão..."
                rows={3}
                style={{
                  width: '100%', fontSize: '13px', padding: '10px 12px',
                  border: '1px solid var(--border-main)', borderRadius: '8px',
                  backgroundColor: 'var(--bg-app)', color: 'var(--text-main)',
                  outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif',
                  lineHeight: '1.5', boxSizing: 'border-box', transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
              />
            </div>

            {/* Phase selector */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Fase
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {PHASES.map(p => {
                  const m = PHASE_META[p];
                  const isActive = newPhase === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setNewPhase(p)}
                      style={{
                        padding: '9px 14px', fontSize: '12px', fontWeight: '600',
                        borderRadius: '8px',
                        border: `1px solid ${isActive ? m.color : 'var(--border-light)'}`,
                        backgroundColor: isActive ? m.bg : 'transparent',
                        color: isActive ? m.color : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.15s', textAlign: 'left'
                      }}
                    >
                      {m.icon} {p}
                      {isActive && <Check size={13} style={{ marginLeft: 'auto' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              style={{
                width: '100%', padding: '11px', fontSize: '13px', fontWeight: '700',
                borderRadius: '8px', border: 'none', cursor: newText.trim() ? 'pointer' : 'not-allowed',
                backgroundColor: newText.trim() ? '#10b981' : 'var(--border-main)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                transition: 'all 0.2s',
                boxShadow: newText.trim() ? '0 0 14px rgba(16,185,129,0.35)' : 'none'
              }}
            >
              <Plus size={15} /> Adicionar ao Template
            </button>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
              Pressione <kbd style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>Enter</kbd> para adicionar rapidamente
            </p>
          </div>
        </div>

      </div>

      {/* ── Info box ── */}
      <div style={{
        padding: '14px 18px', borderRadius: '10px',
        backgroundColor: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)',
        fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6'
      }}>
        <strong style={{ color: 'var(--primary)' }}>💡 Como funciona:</strong>{' '}
        Este template é aplicado automaticamente ao criar uma tarefa do tipo <strong style={{ color: 'var(--text-main)' }}>Com Checklist</strong>.
        Clique em <strong style={{ color: 'var(--text-main)' }}>Salvar Template</strong> para confirmar. Tarefas já criadas <em>não são afetadas</em>.
      </div>

    </div>
  );
};

export default Configuracoes;

