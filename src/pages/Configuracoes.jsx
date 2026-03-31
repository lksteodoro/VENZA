import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Cog, Activity, ShieldCheck, RotateCcw, Save, Check, GripVertical, ChevronDown, Pencil, Link as LinkIcon, Key, Loader2, AlertCircle, CheckCircle, Zap, ExternalLink, Users, Building2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BASE_SUBTASKS, CLIENTS } from '../data/mockData';

const META_API_CFG = 'https://graph.facebook.com/v25.0';

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
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' ou 'integracoes'
  
  // Checklist State
  const [items, setItems] = useState(loadTemplate);
  const [newText, setNewText] = useState('');
  const [newPhase, setNewPhase] = useState('Criação');
  const [saved, setSaved] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragFrom = useRef(null);
  const addInputRef = useRef();

  // Integrations State
  const [metaToken, setMetaToken] = useState(() => localStorage.getItem('meta_access_token') || '');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Clientes tab state
  const [cfgClients] = useState(() => {
    try { return JSON.parse(localStorage.getItem('venza_clients')) || CLIENTS; } catch { return CLIENTS; }
  });
  const [cfgExpandedId, setCfgExpandedId] = useState(null);
  const [cfgBms, setCfgBms] = useState([]);
  const [cfgLoadingBms, setCfgLoadingBms] = useState(false);
  const [cfgBmId, setCfgBmId] = useState('');
  const [cfgAccounts, setCfgAccounts] = useState([]);
  const [cfgLoadingAccounts, setCfgLoadingAccounts] = useState(false);
  const [cfgAccountId, setCfgAccountId] = useState('');
  const [cfgSavedId, setCfgSavedId] = useState(null);

  const cfgToken = metaToken.trim() || localStorage.getItem('meta_access_token') || '';

  const META_API = 'https://graph.facebook.com/v21.0';

  const handleTestConnection = async () => {
    const token = metaToken.trim();
    if (!token) { setTestResult({ ok: false, error: 'Cole o token antes de testar.' }); return; }

    setTestLoading(true);
    setTestResult(null);

    try {
      // 1. Validar token — quem sou eu?
      const meRes = await fetch(`${META_API}/me?fields=id,name&access_token=${token}`);
      const me = await meRes.json();
      if (me.error) throw new Error(me.error.message);

      // 2. Listar Business Managers
      const bmRes = await fetch(`${META_API}/me/businesses?fields=id,name&limit=10&access_token=${token}`);
      const bmData = await bmRes.json();
      const businesses = bmData.data || [];

      // 3. Listar contas de anúncio diretas do usuário (fallback se não tiver BM)
      const accRes = await fetch(`${META_API}/me/adaccounts?fields=id,name,account_status,currency&limit=20&access_token=${token}`);
      const accData = await accRes.json();
      const adAccounts = (accData.data || []).map(a => ({
        ...a,
        status_label: a.account_status === 1 ? 'ATIVA' : a.account_status === 2 ? 'DESATIVADA' : `status ${a.account_status}`,
      }));

      setTestResult({ ok: true, user: me, businesses, adAccounts });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  // ── Handlers da aba Clientes ─────────────────────────────────────────────
  const openClientConfig = async (clientId) => {
    if (cfgExpandedId === clientId) { setCfgExpandedId(null); return; }
    setCfgExpandedId(clientId);
    setCfgAccounts([]);
    // Carrega config salva
    try {
      const saved = JSON.parse(localStorage.getItem(`meta_defaults_${clientId}`) || 'null');
      setCfgBmId(saved?.bmId || '');
      setCfgAccountId(saved?.adAccountId || '');
    } catch { setCfgBmId(''); setCfgAccountId(''); }
    // Carrega BMs se ainda não foram carregadas
    if (cfgBms.length === 0 && cfgToken) {
      setCfgLoadingBms(true);
      try {
        const res = await fetch(`${META_API_CFG}/me/businesses?fields=id,name&limit=25&access_token=${cfgToken}`);
        const data = await res.json();
        if (!data.error) setCfgBms(data.data || []);
      } catch {} finally { setCfgLoadingBms(false); }
    }
  };

  useEffect(() => {
    if (!cfgBmId || !cfgToken) { setCfgAccounts([]); return; }
    setCfgLoadingAccounts(true);
    fetch(`${META_API_CFG}/${cfgBmId}/owned_ad_accounts?fields=id,name,account_status&limit=50&access_token=${cfgToken}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCfgAccounts((data.data || []).filter(a => a.account_status === 1));
      })
      .catch(() => {})
      .finally(() => setCfgLoadingAccounts(false));
  }, [cfgBmId, cfgToken]);

  const saveClientConfig = (clientId) => {
    if (!cfgBmId || !cfgAccountId) return;
    localStorage.setItem(`meta_defaults_${clientId}`, JSON.stringify({ bmId: cfgBmId, adAccountId: cfgAccountId }));
    setCfgSavedId(clientId);
    setTimeout(() => setCfgSavedId(null), 2500);
  };

  const clearClientConfig = (clientId) => {
    localStorage.removeItem(`meta_defaults_${clientId}`);
    if (cfgExpandedId === clientId) { setCfgBmId(''); setCfgAccountId(''); }
    setCfgSavedId(null);
  };

  const getClientSaved = (clientId) => {
    try { return JSON.parse(localStorage.getItem(`meta_defaults_${clientId}`) || 'null'); } catch { return null; }
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveToken = () => {
    localStorage.setItem('meta_access_token', metaToken.trim());
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2500);
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
              Gerencie templates, regras e conexões com plataformas externas.
            </p>
          </div>
          
          <div style={{
            display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', 
            borderRadius: '10px', padding: '4px', gap: '4px'
          }}>
            <button 
              onClick={() => setActiveTab('checklist')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', background: activeTab === 'checklist' ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === 'checklist' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              <ShieldCheck size={16} /> Templates
            </button>
            <button
              onClick={() => setActiveTab('integracoes')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', background: activeTab === 'integracoes' ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === 'integracoes' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              <LinkIcon size={16} /> Integrações (APIs)
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', background: activeTab === 'clientes' ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === 'clientes' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              <Users size={16} /> Contas por Cliente
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'checklist' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button onClick={handleRestore} className="btn-secondary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={14} /> Restaurar Padrão
            </button>
            <button onClick={handleSave} className="btn-primary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar Template</>}
            </button>
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
        padding: '14px 18px', borderRadius: '10px', marginTop: '20px',
        backgroundColor: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)',
        fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6'
      }}>
        <strong style={{ color: 'var(--primary)' }}>💡 Como funciona:</strong>{' '}
        Este template é aplicado automaticamente ao criar uma tarefa do tipo <strong style={{ color: 'var(--text-main)' }}>Com Checklist</strong>.
        Clique em <strong style={{ color: 'var(--text-main)' }}>Salvar Template</strong> para confirmar. Tarefas já criadas <em>não são afetadas</em>.
      </div>
      </>
      ) : (
        /* ── Integrações ── */
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
          
          <div style={{
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
            borderRadius: '12px', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <Key size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Meta Ads (Graph API)</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Conecte o seu System User Token para permitir a publicação nativa de campanhas.
                </p>
              </div>
            </div>

            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Access Token Permanente
                </label>
                <input 
                  type="password" 
                  value={metaToken}
                  onChange={e => setMetaToken(e.target.value)}
                  placeholder="EAAI..."
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: '14px', fontFamily: 'monospace',
                    background: 'var(--bg-app)', border: '1px solid var(--border-main)',
                    borderRadius: '8px', color: 'var(--text-main)', outline: 'none'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                  Gere este token no App Dashboard da Meta &gt; System Users &gt; Generate New Token.
                  Certifique-se de habilitar as permissões <strong>ads_management</strong> e <strong>ads_read</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleTestConnection}
                  disabled={testLoading || !metaToken.trim()}
                  style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: testLoading || !metaToken.trim() ? 'not-allowed' : 'pointer', opacity: !metaToken.trim() ? 0.5 : 1, fontWeight: '600' }}
                >
                  {testLoading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Testando...</> : <><Zap size={15} /> Testar Conexão</>}
                </button>
                <button
                  onClick={handleSaveToken}
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {tokenSaved ? <><Check size={16} /> Token Salvo</> : <><Save size={16} /> Salvar Token</>}
                </button>
              </div>

              {/* ── Resultado do Teste ── */}
              {testResult && (
                <div style={{ marginTop: '4px', borderRadius: '10px', border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, background: testResult.ok ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', overflow: 'hidden' }}>

                  {/* Header do resultado */}
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {testResult.ok
                      ? <CheckCircle size={18} color="#10b981" />
                      : <AlertCircle size={18} color="#ef4444" />}
                    <span style={{ fontWeight: '700', fontSize: '14px', color: testResult.ok ? '#10b981' : '#ef4444' }}>
                      {testResult.ok ? `Conectado como: ${testResult.user.name} (ID: ${testResult.user.id})` : 'Erro na conexão'}
                    </span>
                  </div>

                  {testResult.ok ? (
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                      {/* Business Managers */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Business Managers encontradas ({testResult.businesses.length})
                        </div>
                        {testResult.businesses.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma BM associada a este token.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {testResult.businesses.map(bm => (
                              <div key={bm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{bm.name}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'monospace' }}>{bm.id}</span>
                                </div>
                                <a href={`https://business.facebook.com/overview/?business_id=${bm.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                                  <ExternalLink size={12} /> Abrir
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Contas de Anúncio */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Contas de Anúncio ({testResult.adAccounts.length})
                        </div>
                        {testResult.adAccounts.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma conta de anúncio encontrada. Verifique as permissões do token.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {testResult.adAccounts.map(acc => (
                              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{acc.name}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'monospace' }}>{acc.id}</span>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: acc.account_status === 1 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: acc.account_status === 1 ? '#10b981' : '#ef4444' }}>
                                  {acc.status_label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Permissões detectadas */}
                      <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Token válido. Salve-o para sair do Modo Demo e publicar campanhas reais.
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 16px', fontSize: '13px', color: '#ef4444', fontFamily: 'monospace' }}>
                      {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

        </div>
      )}

      {/* ── Aba Clientes ── */}
      {activeTab === 'clientes' && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Building2 size={16} color="var(--primary)" />
            <div>
              <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Contas de Anúncio por Cliente</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configure a BM e conta padrão de cada cliente. Será carregado automaticamente em Métricas e ao criar anúncios.</p>
            </div>
          </div>

          {!cfgToken && (
            <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px', color: '#f59e0b', verticalAlign: 'middle' }} />
              Configure o <strong style={{ color: 'var(--text-main)' }}>Access Token</strong> na aba Integrações antes de vincular contas.
            </div>
          )}

          {cfgClients.map(client => {
            const saved = getClientSaved(client.id);
            const isExpanded = cfgExpandedId === client.id;
            const justSaved = cfgSavedId === client.id;
            const bmName = saved ? (cfgBms.find(b => b.id === saved.bmId)?.name || saved.bmId) : null;
            const accName = saved ? (cfgAccounts.find(a => a.id === saved.adAccountId)?.name || saved.adAccountId) : null;

            return (
              <div key={client.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${isExpanded ? 'rgba(139,92,246,0.35)' : 'var(--border-light)'}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                {/* Row header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  <img src={client.avatarUrl} alt={client.name} style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{client.name}</p>
                    {saved ? (
                      <p style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={10} /> Configurado
                      </p>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Não configurado</p>
                    )}
                  </div>
                  {saved && (
                    <button onClick={() => clearClientConfig(client.id)} title="Remover configuração" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', opacity: 0.6 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => openClientConfig(client.id)}
                    disabled={!cfgToken}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${isExpanded ? 'var(--primary)' : 'var(--border-main)'}`, background: isExpanded ? 'rgba(139,92,246,0.1)' : 'var(--bg-app)', color: isExpanded ? 'var(--primary)' : 'var(--text-main)', fontSize: '12px', fontWeight: '700', cursor: cfgToken ? 'pointer' : 'not-allowed', opacity: cfgToken ? 1 : 0.4 }}
                  >
                    {isExpanded ? <ChevronDown size={13} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={13} />}
                    {isExpanded ? 'Fechar' : (saved ? 'Editar' : 'Configurar')}
                  </button>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-light)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-app)' }}>
                    {/* BM */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '7px' }}>Business Manager</label>
                      {cfgLoadingBms ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando BMs...</div>
                      ) : cfgBms.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma BM encontrada para este token.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {cfgBms.map(bm => (
                            <button key={bm.id} onClick={() => { setCfgBmId(bm.id); setCfgAccountId(''); }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${cfgBmId === bm.id ? 'var(--primary)' : 'var(--border-light)'}`, background: cfgBmId === bm.id ? 'rgba(139,92,246,0.08)' : 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left' }}>
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{bm.name}</p>
                                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{bm.id}</p>
                              </div>
                              {cfgBmId === bm.id && <Check size={14} color="var(--primary)" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Conta */}
                    {cfgBmId && (
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '7px' }}>Conta de Anúncio</label>
                        {cfgLoadingAccounts ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando contas...</div>
                        ) : cfgAccounts.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma conta ativa nesta BM.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {cfgAccounts.map(acc => (
                              <button key={acc.id} onClick={() => setCfgAccountId(acc.id)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${cfgAccountId === acc.id ? '#10b981' : 'var(--border-light)'}`, background: cfgAccountId === acc.id ? 'rgba(16,185,129,0.07)' : 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left' }}>
                                <div>
                                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{acc.name}</p>
                                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{acc.id}</p>
                                </div>
                                {cfgAccountId === acc.id && <Check size={14} color="#10b981" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão salvar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => saveClientConfig(client.id)}
                        disabled={!cfgBmId || !cfgAccountId}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', opacity: (!cfgBmId || !cfgAccountId) ? 0.5 : 1, cursor: (!cfgBmId || !cfgAccountId) ? 'not-allowed' : 'pointer' }}
                      >
                        {justSaved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar para {client.name}</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Configuracoes;

