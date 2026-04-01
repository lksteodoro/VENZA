import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Cog, Activity, ShieldCheck, RotateCcw, Save, Check, GripVertical, ChevronDown, Pencil, Link as LinkIcon, Key, Loader2, AlertCircle, CheckCircle, Zap, ExternalLink, Users, Building2, Search, Share2, Copy, X, Lock, Eye, EyeOff, Calendar } from 'lucide-react';
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
  const [cfgBmSearch, setCfgBmSearch] = useState('');
  const [cfgAccounts, setCfgAccounts] = useState([]);
  const [cfgLoadingAccounts, setCfgLoadingAccounts] = useState(false);
  const [cfgAccountId, setCfgAccountId] = useState('');
  const [cfgAccSearch, setCfgAccSearch] = useState('');
  const [cfgManual, setCfgManual] = useState(false);
  const [cfgManualId, setCfgManualId] = useState('');
  const [cfgSavedId, setCfgSavedId] = useState(null);

  // Dashboard Link state
  const [dlModal, setDlModal] = useState(null); // { client, adAccountId }
  const [dlLabel, setDlLabel] = useState('');
  const [dlUsePassword, setDlUsePassword] = useState(false);
  const [dlPassword, setDlPassword] = useState('');
  const [dlShowPass, setDlShowPass] = useState(false);
  const [dlUseExpiry, setDlUseExpiry] = useState(false);
  const [dlExpiry, setDlExpiry] = useState('');
  const [dlSections, setDlSections] = useState(['insights', 'campaigns', 'adsets', 'ads']);
  const [dlDateLock, setDlDateLock] = useState('');
  const [dlGeneratedLink, setDlGeneratedLink] = useState('');
  const [dlCopied, setDlCopied] = useState(false);
  const [dashLinks, setDashLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('venza_dashboard_links') || '[]'); } catch { return []; }
  });

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
      const hasBm = !!saved?.bmId;
      setCfgBmId(saved?.bmId || '');
      setCfgAccountId(saved?.adAccountId || '');
      setCfgManual(!hasBm && !!saved?.adAccountId);
      setCfgManualId(saved?.adAccountId || '');
      setCfgBmSearch('');
      setCfgAccSearch('');
    } catch { setCfgBmId(''); setCfgAccountId(''); setCfgManual(false); setCfgManualId(''); }
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
    if (!cfgBmId || cfgManual || !cfgToken) { setCfgAccounts([]); return; }
    setCfgLoadingAccounts(true);
    fetch(`${META_API_CFG}/${cfgBmId}/owned_ad_accounts?fields=id,name,account_status&limit=50&access_token=${cfgToken}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCfgAccounts((data.data || []).filter(a => a.account_status === 1));
      })
      .catch(() => {})
      .finally(() => setCfgLoadingAccounts(false));
  }, [cfgBmId, cfgManual, cfgToken]);

  const saveClientConfig = (clientId) => {
    const raw = cfgManual ? cfgManualId.trim() : cfgAccountId;
    if (!raw) return;
    const adAccountId = raw.startsWith('act_') ? raw : `act_${raw}`;
    localStorage.setItem(`meta_defaults_${clientId}`, JSON.stringify({ bmId: cfgManual ? null : (cfgBmId || null), adAccountId }));
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

  const openDashLinkModal = (client, adAccountId) => {
    setDlLabel('');
    setDlUsePassword(false);
    setDlPassword('');
    setDlShowPass(false);
    setDlUseExpiry(false);
    setDlExpiry('');
    setDlSections(['insights', 'campaigns', 'adsets', 'ads']);
    setDlDateLock('');
    setDlGeneratedLink('');
    setDlCopied(false);
    setDlModal({ client, adAccountId });
  };

  const handleGenerateDashLink = () => {
    if (!dlModal) return;
    const config = {
      v: 1,
      clientId: dlModal.client.id,
      clientName: dlModal.client.name,
      adAccountId: dlModal.adAccountId,
      accessToken: cfgToken,
      label: dlLabel.trim() || null,
      password: dlUsePassword && dlPassword.trim() ? dlPassword.trim() : null,
      expiresAt: dlUseExpiry && dlExpiry ? new Date(dlExpiry + 'T23:59:59').toISOString() : null,
      allowedSections: dlSections,
      dateRangeLock: dlDateLock || null,
    };
    const token = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const link = `${window.location.origin}/dashboard/cliente/${token}`;
    setDlGeneratedLink(link);
    const entry = { id: uuidv4(), token, clientId: dlModal.client.id, clientName: dlModal.client.name, label: config.label, createdAt: new Date().toISOString(), expiresAt: config.expiresAt, isActive: true };
    const updated = [entry, ...dashLinks];
    setDashLinks(updated);
    localStorage.setItem('venza_dashboard_links', JSON.stringify(updated));
  };

  const handleCopyDashLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      setDlCopied(true);
      setTimeout(() => setDlCopied(false), 2000);
    });
  };

  const handleRevokeDashLink = (id) => {
    const updated = dashLinks.filter(l => l.id !== id);
    setDashLinks(updated);
    localStorage.setItem('venza_dashboard_links', JSON.stringify(updated));
  };

  const DL_SECTIONS_OPTIONS = [
    { value: 'insights', label: 'Resumo (KPIs + Gráfico)' },
    { value: 'campaigns', label: 'Campanhas' },
    { value: 'adsets', label: 'Conjuntos de Anúncios' },
    { value: 'ads', label: 'Anúncios & Criativos' },
  ];

  const DL_DATE_OPTIONS = [
    { value: '', label: 'Livre (cliente escolhe)' },
    { value: 'last_7d', label: 'Fixo: Últimos 7 dias' },
    { value: 'last_30d', label: 'Fixo: Últimos 30 dias' },
    { value: 'this_month', label: 'Fixo: Este mês' },
    { value: 'last_month', label: 'Fixo: Mês passado' },
  ];

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

                    {/* Mode toggle */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setCfgManual(false); setCfgBmId(''); setCfgAccountId(''); setCfgBmSearch(''); }}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1.5px solid ${!cfgManual ? 'var(--primary)' : 'var(--border-light)'}`, background: !cfgManual ? 'rgba(139,92,246,0.1)' : 'transparent', color: !cfgManual ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Building2 size={13} /> Via Business Manager
                      </button>
                      <button onClick={() => { setCfgManual(true); setCfgBmId(''); setCfgAccounts([]); }}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1.5px solid ${cfgManual ? 'var(--primary)' : 'var(--border-light)'}`, background: cfgManual ? 'rgba(139,92,246,0.1)' : 'transparent', color: cfgManual ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Pencil size={13} /> Sem BM / Manual
                      </button>
                    </div>

                    {!cfgManual ? (
                      <>
                        {/* BM: filtro + select nativo */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '7px' }}>Business Manager</label>
                          {cfgLoadingBms ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando BMs...</div>
                          ) : cfgBms.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma BM encontrada para este token.</p>
                          ) : (
                            <>
                              <div style={{ position: 'relative', marginBottom: '6px' }}>
                                <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input value={cfgBmSearch} onChange={e => setCfgBmSearch(e.target.value)} placeholder="Filtrar BM..." style={{ width: '100%', padding: '8px 10px 8px 28px', fontSize: '13px', background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '7px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-main)'} />
                              </div>
                              <select value={cfgBmId} onChange={e => { setCfgBmId(e.target.value); setCfgAccountId(''); setCfgAccSearch(''); }} style={{ width: '100%', padding: '9px 10px', fontSize: '13px', background: 'var(--bg-surface)', border: `1px solid ${cfgBmId ? 'var(--primary)' : 'var(--border-main)'}`, borderRadius: '7px', color: cfgBmId ? 'var(--text-main)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}>
                                <option value="">— Selecionar BM —</option>
                                {cfgBms.filter(bm => !cfgBmSearch || bm.name.toLowerCase().includes(cfgBmSearch.toLowerCase()) || bm.id.includes(cfgBmSearch)).map(bm => (
                                  <option key={bm.id} value={bm.id}>{bm.name} ({bm.id})</option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>

                        {/* Conta: filtro + select nativo */}
                        {cfgBmId && (
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '7px' }}>Conta de Anúncio</label>
                            {cfgLoadingAccounts ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando contas...</div>
                            ) : cfgAccounts.length === 0 ? (
                              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhuma conta ativa nesta BM.</p>
                            ) : (
                              <>
                                <div style={{ position: 'relative', marginBottom: '6px' }}>
                                  <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                  <input value={cfgAccSearch} onChange={e => setCfgAccSearch(e.target.value)} placeholder="Filtrar conta..." style={{ width: '100%', padding: '8px 10px 8px 28px', fontSize: '13px', background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '7px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = 'var(--border-main)'} />
                                </div>
                                <select value={cfgAccountId} onChange={e => setCfgAccountId(e.target.value)} style={{ width: '100%', padding: '9px 10px', fontSize: '13px', background: 'var(--bg-surface)', border: `1px solid ${cfgAccountId ? '#10b981' : 'var(--border-main)'}`, borderRadius: '7px', color: cfgAccountId ? 'var(--text-main)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}>
                                  <option value="">— Selecionar Conta —</option>
                                  {cfgAccounts.filter(a => !cfgAccSearch || a.name?.toLowerCase().includes(cfgAccSearch.toLowerCase()) || a.id.includes(cfgAccSearch)).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name || acc.id} ({acc.id})</option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Manual mode */
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '7px' }}>ID da Conta de Anúncio</label>
                        <input
                          value={cfgManualId}
                          onChange={e => setCfgManualId(e.target.value)}
                          placeholder="Ex: act_123456789  ou apenas  123456789"
                          style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                          Conta fora de BM. O prefixo <code style={{ background: 'var(--bg-app)', padding: '1px 4px', borderRadius: '3px' }}>act_</code> é adicionado automaticamente.
                        </p>
                      </div>
                    )}

                    {/* Botão salvar */}
                    {(() => {
                      const canSave = cfgManual ? !!cfgManualId.trim() : !!cfgAccountId;
                      return (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => saveClientConfig(client.id)} disabled={!canSave} className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', opacity: !canSave ? 0.5 : 1, cursor: !canSave ? 'not-allowed' : 'pointer' }}>
                            {justSaved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar para {client.name}</>}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Gerar Link de Dashboard */}
                    {saved && (
                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Dashboard Compartilhável</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Gere um link para o cliente visualizar dados em tempo real.</p>
                          </div>
                          <button
                            onClick={() => openDashLinkModal(client, saved.adAccountId)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(200,162,58,0.4)', background: 'rgba(200,162,58,0.08)', color: '#C8A23A', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <Share2 size={13} /> Gerar Link
                          </button>
                        </div>
                        {/* Links gerados para este cliente */}
                        {dashLinks.filter(l => l.clientId === client.id).length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dashLinks.filter(l => l.clientId === client.id).slice(0, 3).map(link => (
                              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                <LinkIcon size={12} color="#C8A23A" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: 'var(--text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label || 'Dashboard sem título'}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(link.createdAt).toLocaleDateString('pt-BR')}</span>
                                <button
                                  onClick={() => handleCopyDashLink(`${window.location.origin}/dashboard/cliente/${link.token}`)}
                                  title="Copiar link"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', flexShrink: 0 }}
                                >
                                  <Copy size={12} />
                                </button>
                                <button
                                  onClick={() => handleRevokeDashLink(link.id)}
                                  title="Revogar link"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px', display: 'flex', flexShrink: 0 }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Gerar Link de Dashboard ── */}
      {dlModal && (
        <div
          onClick={() => setDlModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '500px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,162,58,0.12)', border: '1px solid rgba(200,162,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={16} color="#C8A23A" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Gerar Link de Dashboard</div>
                  <div style={{ fontSize: '11px', color: '#8b8fa8' }}>{dlModal.client.name}</div>
                </div>
              </div>
              <button onClick={() => setDlModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Label */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Label (opcional)</label>
                <input
                  value={dlLabel}
                  onChange={e => setDlLabel(e.target.value)}
                  placeholder="ex: Dashboard Abril 2025"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Seções permitidas */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Seções visíveis</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DL_SECTIONS_OPTIONS.map(opt => {
                    const active = dlSections.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setDlSections(prev => active ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                        style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: `1px solid ${active ? 'rgba(200,162,58,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(200,162,58,0.1)' : 'transparent', color: active ? '#C8A23A' : '#8b8fa8', cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        {active ? '✓ ' : ''}{opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Período travado */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Período</label>
                <select
                  value={dlDateLock}
                  onChange={e => setDlDateLock(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: dlDateLock ? '#fff' : '#8b8fa8', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  {DL_DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Senha */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dlUsePassword ? '8px' : '0' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Senha de acesso</label>
                  <button
                    onClick={() => setDlUsePassword(p => !p)}
                    style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: dlUsePassword ? '#C8A23A' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                  >
                    <span style={{ position: 'absolute', top: '2px', left: dlUsePassword ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                {dlUsePassword && (
                  <div style={{ position: 'relative' }}>
                    <input
                      type={dlShowPass ? 'text' : 'password'}
                      value={dlPassword}
                      onChange={e => setDlPassword(e.target.value)}
                      placeholder="Digite a senha"
                      style={{ width: '100%', padding: '9px 40px 9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={() => setDlShowPass(s => !s)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8', display: 'flex' }}>
                      {dlShowPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Expiração */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dlUseExpiry ? '8px' : '0' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de expiração</label>
                  <button
                    onClick={() => setDlUseExpiry(p => !p)}
                    style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: dlUseExpiry ? '#C8A23A' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                  >
                    <span style={{ position: 'absolute', top: '2px', left: dlUseExpiry ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                {dlUseExpiry && (
                  <input
                    type="date"
                    value={dlExpiry}
                    onChange={e => setDlExpiry(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                )}
              </div>

              {/* Link gerado */}
              {dlGeneratedLink && (
                <div style={{ background: 'rgba(200,162,58,0.06)', border: '1px solid rgba(200,162,58,0.2)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#C8A23A', marginBottom: '8px' }}>✓ Link gerado!</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#8b8fa8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{dlGeneratedLink}</span>
                    <button
                      onClick={() => handleCopyDashLink(dlGeneratedLink)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(200,162,58,0.4)', background: dlCopied ? 'rgba(200,162,58,0.15)' : 'transparent', color: '#C8A23A', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                    >
                      {dlCopied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDlModal(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8b8fa8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                {dlGeneratedLink ? 'Fechar' : 'Cancelar'}
              </button>
              {!dlGeneratedLink && (
                <button
                  onClick={handleGenerateDashLink}
                  disabled={!cfgToken || dlSections.length === 0 || (dlUsePassword && !dlPassword.trim())}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: cfgToken && dlSections.length > 0 ? '#C8A23A' : 'rgba(255,255,255,0.08)', color: cfgToken && dlSections.length > 0 ? '#000' : '#8b8fa8', fontSize: '13px', fontWeight: '700', cursor: cfgToken && dlSections.length > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}
                >
                  <Share2 size={13} /> Gerar Link
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Configuracoes;

