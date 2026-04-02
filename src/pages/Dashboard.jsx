import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  RefreshCw, Share2, Copy, Check, X, Eye, EyeOff, Lock,
  ChevronDown, ChevronRight, ChevronUp, BarChart2, Layers,
  Image as ImageIcon, DollarSign, Users, MousePointer, TrendingUp,
  Link as LinkIcon, Trash2, AlertCircle, Loader2, Settings, ExternalLink, Pencil, Target,
  Zap, Award, Activity, ArrowRight, TrendingDown
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CLIENTS } from '../data/mockData';
import { loadConversions, getDateRange } from '../utils/demandos';

const META_API = 'https://graph.facebook.com/v25.0';
const PRIMARY = '#C8A23A';
const DASH_LINKS_KEY = 'venza_dashboard_links';

const loadProjects = () => { try { return JSON.parse(localStorage.getItem('venza_projects') || '[]'); } catch { return []; } };

// ── Helpers ───────────────────────────────────────────────────────────────────
const LEAD_TYPES = new Set([
  'lead', 'omni_lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'contact', 'complete_registration',
  'offsite_conversion.fb_pixel_complete_registration',
  'onsite_conversion.flow_complete',
  'onsite_conversion.messaging_first_reply',
  'onsite_conversion.messaging_conversation_started_7d',
]);

const getLeads = (actions = []) =>
  actions.filter(a => LEAD_TYPES.has(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);

const getCpl = (row) => {
  const cpat = row.cost_per_action_type || [];
  const match = cpat.find(a => LEAD_TYPES.has(a.action_type));
  if (match) return Number(match.value || 0);
  const leads = getLeads(row.actions || []);
  return leads > 0 ? Number(row.spend || 0) / leads : 0;
};

const fetchAllPages = async (url) => {
  let data = [];
  let next = url;
  while (next) {
    const res = await fetch(next);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    data = [...data, ...(json.data || [])];
    next = json.paging?.next || null;
    if (data.length > 3000) break;
  }
  return data;
};

const fmt = (n, dec = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch { return d; } };

const STATUS_COLOR = { ACTIVE: '#22c55e', PAUSED: '#6b7280', DELETED: '#ef4444', ARCHIVED: '#f59e0b' };

const DATE_RANGES = [
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_90d', label: 'Últimos 90 dias' },
];

const decodeToken = (token) => {
  try { return JSON.parse(decodeURIComponent(escape(atob(token)))); } catch { return null; }
};

const loadClients = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('venza_clients') || 'null');
    if (!stored) return CLIENTS;
    return CLIENTS.map(c => {
      const found = stored.find(s => s.id === c.id);
      return found ? { ...c, name: found.name, avatarUrl: found.avatarUrl } : c;
    });
  } catch { return CLIENTS; }
};

// ── Sort Header Button ────────────────────────────────────────────────────────
const ThSort = ({ label, col, sort, setSort }) => {
  const active = sort.key === col;
  return (
    <button
      onClick={() => setSort(s => ({ key: col, dir: s.key === col && s.dir === 'desc' ? 'asc' : 'desc' }))}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: active ? PRIMARY : '#8b8fa8', fontWeight: active ? '700' : '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '3px', padding: 0, whiteSpace: 'nowrap' }}
    >
      {label}{active ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </button>
  );
};

const sortedList = (list, sort) => [...list].sort((a, b) => {
  let aVal, bVal;
  if (sort.key === 'leads') {
    aVal = getLeads(a.actions || []); bVal = getLeads(b.actions || []);
  } else if (sort.key === 'cpl') {
    const av = getCpl(a); const bv = getCpl(b);
    aVal = av > 0 ? av : 999999; bVal = bv > 0 ? bv : 999999;
  } else {
    const ar = a[sort.key]; const br = b[sort.key];
    if (typeof ar === 'string' && isNaN(Number(ar)))
      return sort.dir === 'desc' ? br.localeCompare(ar) : ar.localeCompare(br);
    aVal = Number(ar || 0); bVal = Number(br || 0);
  }
  return sort.dir === 'desc' ? bVal - aVal : aVal - bVal;
});

// ── Generate / Edit Link Modal ────────────────────────────────────────────────
// existing = { id, token, createdAt } → modo edição; undefined → modo criação
const GenerateLinkModal = ({ client, adAccountId, accessToken, onClose, onGenerated, existing }) => {
  const isEdit = !!existing;
  const existingCfg = isEdit ? decodeToken(existing.token) : null;

  const [label, setLabel] = useState(existingCfg?.label || '');
  const [usePassword, setUsePassword] = useState(!!(existingCfg?.password));
  const [password, setPassword] = useState(existingCfg?.password || '');
  const [showPass, setShowPass] = useState(false);
  const [useExpiry, setUseExpiry] = useState(!!(existingCfg?.expiresAt));
  const [expiry, setExpiry] = useState(existingCfg?.expiresAt ? existingCfg.expiresAt.split('T')[0] : '');
  const [sections, setSections] = useState(existingCfg?.allowedSections || ['insights', 'campaigns', 'adsets', 'ads']);
  const [dateLock, setDateLock] = useState(existingCfg?.dateRangeLock || '');
  const [savedLink, setSavedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const [loadingCamps, setLoadingCamps] = useState(false);
  const [availableCamps, setAvailableCamps] = useState([]);
  const [projectsToMap, setProjectsToMap] = useState([]);

  useEffect(() => {
    if (!accessToken || !adAccountId) return;
    setLoadingCamps(true);
    fetch(`https://graph.facebook.com/v25.0/${adAccountId}/campaigns?fields=id,name,status&limit=500&access_token=${accessToken}`)
      .then(r => r.json())
      .then(res => {
         const camps = res.data || [];
         setAvailableCamps(camps);
         
         const allProjs = loadProjects();
         const clientProjs = allProjs.filter(p => p.clientId === client.id);
         
         let initialMap = existingCfg?.projects || clientProjs.map(p => ({
            id: p.id,
            name: p.name,
            campaignIds: [],
            goals: { budget_monthly: '', lead_goal_daily: '', lead_goal_weekly: '', cpa_break_even: '' }
         }));
         
         if (!existingCfg?.projects) {
            initialMap = initialMap.map(pm => {
               const matched = camps.filter(c => c.name.toLowerCase().includes(pm.name.toLowerCase())).map(c => c.id);
               return { ...pm, campaignIds: matched };
            });
         }
         
         setProjectsToMap(initialMap);
      })
      .finally(() => setLoadingCamps(false));
  }, [accessToken, adAccountId, client.id, existingCfg]);

  const SECTIONS_OPTS = [
    { value: 'insights', label: 'Resumo (KPIs + Grafico)' },
    { value: 'campaigns', label: 'Campanhas' },
    { value: 'adsets', label: 'Conjuntos' },
    { value: 'ads', label: 'Anuncios & Criativos' },
  ];
  const DATE_OPTS = [
    { value: '', label: 'Livre (cliente escolhe)' },
    { value: 'last_7d', label: 'Fixo: Ultimos 7 dias' },
    { value: 'last_30d', label: 'Fixo: Ultimos 30 dias' },
    { value: 'this_month', label: 'Fixo: Este mes' },
    { value: 'last_month', label: 'Fixo: Mes passado' },
  ];

  const buildConfig = () => {
    const trackingData = {};
    const RANGES = ['last_7d', 'last_14d', 'last_30d', 'last_month', 'this_month', 'last_90d', 'today'];
    const conversions = loadConversions();

    projectsToMap.forEach(proj => {
       const projConversions = conversions.filter(c => c.project_id === proj.id);
       if (projConversions.length === 0) return;
       RANGES.forEach(r => {
           const { start, end } = getDateRange(r);
           const cohort = projConversions.filter(c => c.data_captura && c.data_captura.slice(0, 10) >= start && c.data_captura.slice(0, 10) <= end);
           const sales = cohort.filter(c => c.data_venda && Number(c.valor_venda) > 0);
           const revenue = sales.reduce((sum, c) => sum + Number(c.valor_venda || 0), 0);
           if (!trackingData[r]) trackingData[r] = { total: { leads:0, sales:0, revenue:0 }, projects: {} };
           
           trackingData[r].projects[proj.id] = { leads: cohort.length, sales: sales.length, revenue: revenue };
           trackingData[r].total.leads += cohort.length;
           trackingData[r].total.sales += sales.length;
           trackingData[r].total.revenue += revenue;
       });
    });

    return {
      v: 3,
      clientId: client.id,
      clientName: client.name,
      adAccountId: existingCfg?.adAccountId || adAccountId,
      accessToken: existingCfg?.accessToken || accessToken,
      label: label.trim() || null,
      password: usePassword && password.trim() ? password.trim() : null,
      expiresAt: useExpiry && expiry ? new Date(expiry + 'T23:59:59').toISOString() : null,
      allowedSections: sections,
      dateRangeLock: dateLock || null,
      projects: projectsToMap.map(p => ({
         id: p.id,
         name: p.name,
         campaignIds: p.campaignIds,
         goals: {
           budget_monthly: Number(p.goals.budget_monthly) || 0,
           lead_goal_daily: Number(p.goals.lead_goal_daily) || 0,
           lead_goal_weekly: Number(p.goals.lead_goal_weekly) || 0,
           cpa_break_even: Number(p.goals.cpa_break_even) || 0,
         }
      })),
      trackingData: Object.keys(trackingData).length > 0 ? trackingData : null,
    };
  };

  const handleSave = () => {
    const config = buildConfig();
    const token = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const link = `${window.location.origin}/dashboard/cliente/${token}`;
    setSavedLink(link);

    const stored = (() => { try { return JSON.parse(localStorage.getItem(DASH_LINKS_KEY) || '[]'); } catch { return []; } })();

    let updated;
    if (isEdit) {
      // Atualiza o entry existente mantendo id e createdAt
      updated = stored.map(e => e.id === existing.id
        ? { ...e, token, label: config.label, expiresAt: config.expiresAt }
        : e
      );
    } else {
      const entry = { id: uuidv4(), token, clientId: client.id, clientName: client.name, label: config.label, createdAt: new Date().toISOString(), expiresAt: config.expiresAt };
      updated = [entry, ...stored];
    }

    localStorage.setItem(DASH_LINKS_KEY, JSON.stringify(updated));
    onGenerated(updated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(savedLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const canSave = (existingCfg?.accessToken || accessToken) && sections.length > 0 && !(usePassword && !password.trim());

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,162,58,0.12)', border: '1px solid rgba(200,162,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEdit ? <Pencil size={15} color={PRIMARY} /> : <Share2 size={15} color={PRIMARY} />}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{isEdit ? 'Editar Link' : 'Gerar Link de Dashboard'}</div>
              <div style={{ fontSize: '11px', color: '#8b8fa8' }}>{client.name}{existing?.label ? ` · ${existing.label}` : ''}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8' }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
          {!accessToken && !existingCfg?.accessToken && (
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '12px', color: '#ef4444', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={14} /> Token Meta nao configurado. Configure em Configuracoes primeiro.
            </div>
          )}

          {isEdit && (
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '11px', color: '#8b8fa8' }}>
              O link sera atualizado com um novo token. O link anterior deixara de funcionar.
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Label (opcional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="ex: Dashboard Abril 2025"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Secoes visiveis</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SECTIONS_OPTS.map(opt => {
                const active = sections.includes(opt.value);
                return (
                  <button key={opt.value} onClick={() => setSections(prev => active ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                    style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: `1px solid ${active ? 'rgba(200,162,58,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(200,162,58,0.1)' : 'transparent', color: active ? PRIMARY : '#8b8fa8', cursor: 'pointer' }}>
                    {active ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Periodo</label>
            <select value={dateLock} onChange={e => setDateLock(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: dateLock ? '#fff' : '#8b8fa8', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
              {DATE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* DemandOS Metas / Projetos */}
          <div style={{ background: 'rgba(200,162,58,0.04)', border: '1px solid rgba(200,162,58,0.15)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projetos & DemandOS</div>
                <div style={{ fontSize: '11px', color: '#8b8fa8', marginTop: '2px' }}>Mapeamento de Campanhas Meta e Metas unitárias (Dashboard Multivisão)</div>
              </div>
            </div>

            {loadingCamps ? (
              <div style={{ fontSize: '12px', color: '#8b8fa8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando campanhas da Meta...
              </div>
            ) : projectsToMap.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#8b8fa8' }}>Nenhum projeto encontrado para este cliente. (Crie projetos no CRM).</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {projectsToMap.map((pm) => (
                  <div key={pm.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Target size={14} color={PRIMARY} /> {pm.name}
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '600', color: '#8b8fa8', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Atribuir Campanhas ({pm.campaignIds.length})</label>
                      <select multiple value={pm.campaignIds} onChange={e => {
                        const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                        setProjectsToMap(prev => prev.map(p => p.id === pm.id ? { ...p, campaignIds: vals } : p));
                      }} style={{ width: '100%', height: '80px', padding: '6px', borderRadius: '6px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', outline: 'none' }}>
                        {availableCamps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>Segure Ctrl/Cmd para selecionar várias. Multi-vinculação permitida.</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { key: 'budget_monthly',  label: 'Orçamento (Mês)' },
                        { key: 'cpa_break_even',  label: 'CPA Teto' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: '9px', fontWeight: '600', color: '#8b8fa8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>{f.label}</label>
                          <input type="number" min="0" step="any" value={pm.goals[f.key] || ''} onChange={e => {
                              setProjectsToMap(prev => prev.map(p => p.id === pm.id ? { ...p, goals: { ...p.goals, [f.key]: e.target.value } } : p));
                          }} placeholder="0"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: usePassword ? '8px' : 0 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Senha de acesso</label>
              <button onClick={() => setUsePassword(p => !p)} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: usePassword ? PRIMARY : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: '2px', left: usePassword ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            {usePassword && (
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={isEdit && existingCfg?.password ? 'Manter ou alterar senha' : 'Digite a senha'}
                  style={{ width: '100%', padding: '9px 40px 9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8', display: 'flex' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: useExpiry ? '8px' : 0 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de expiracao</label>
              <button onClick={() => setUseExpiry(p => !p)} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: useExpiry ? PRIMARY : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: '2px', left: useExpiry ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            {useExpiry && (
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
            )}
          </div>

          {savedLink && (
            <div style={{ background: 'rgba(200,162,58,0.06)', border: '1px solid rgba(200,162,58,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: PRIMARY, marginBottom: '8px' }}>
                {isEdit ? 'Link atualizado!' : 'Link gerado!'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b8fa8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{savedLink}</span>
                <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid rgba(200,162,58,0.4)`, background: copied ? 'rgba(200,162,58,0.15)' : 'transparent', color: PRIMARY, fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                  {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8b8fa8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {savedLink ? 'Fechar' : 'Cancelar'}
          </button>
          {!savedLink && (
            <button onClick={handleSave} disabled={!canSave}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: canSave ? PRIMARY : 'rgba(255,255,255,0.08)', color: canSave ? '#000' : '#8b8fa8', fontSize: '13px', fontWeight: '700', cursor: canSave ? 'pointer' : 'default' }}>
              {isEdit ? <><Pencil size={13} /> Salvar Alteracoes</> : <><Share2 size={13} /> Gerar Link</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Funnel Step ───────────────────────────────────────────────────────────────
const FunnelStep = ({ label, value, sub, color, isArrow = false, pct }) => {
  if (isArrow) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 6px', minWidth: '50px' }}>
      <ArrowRight size={18} color={color || '#8b8fa8'} />
      {sub && <span style={{ fontSize: '10px', color: color || PRIMARY, fontWeight: '700', marginTop: '4px', whiteSpace: 'nowrap' }}>{sub}</span>}
    </div>
  );
  return (
    <div style={{ flex: 1, minWidth: '80px', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '10px', padding: '12px 10px', textAlign: 'center' }}>
      {pct != null && (
        <div style={{ height: '3px', background: `${color}20`, borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(pct,100)}%`, background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
        </div>
      )}
      <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '9px', color: '#8b8fa8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '5px' }}>{label}</div>
    </div>
  );
};

// ── Client Detail Panel (campanhas / adsets / anuncios) ───────────────────────
const ClientDetail = ({ clientId, adAccountId, accessToken, dateRange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [adsets, setAdsets] = useState([]);
  const [ads, setAds] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [dailyData, setDailyData] = useState([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState(new Set());
  const [creativeModal, setCreativeModal] = useState(null);
  const [sortCamp, setSortCamp] = useState({ key: 'spend', dir: 'desc' });
  const [sortAdset, setSortAdset] = useState({ key: 'spend', dir: 'desc' });
  const [sortAd, setSortAd] = useState({ key: 'spend', dir: 'desc' });
  const [statusFilter, setStatusFilter] = useState('all');
  const loadedRef = useRef(null);

  const [chartMode, setChartMode] = useState('spend');
  const INS_FIELDS = 'spend,reach,impressions,clicks,ctr,actions,cost_per_action_type,frequency';
  const p = (extra) => new URLSearchParams({ access_token: accessToken, ...extra }).toString();

  const load = useCallback(async () => {
    if (loadedRef.current === dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const [dailyRes, campInsPages, adsetInsPages, adInsPages] = await Promise.all([
        fetch(`${META_API}/${adAccountId}/insights?${p({ fields: 'spend,reach,clicks,actions,cost_per_action_type', date_preset: dateRange, time_increment: '1' })}`).then(r => r.json()),
        fetchAllPages(`${META_API}/${adAccountId}/insights?${p({ fields: `campaign_id,campaign_name,${INS_FIELDS}`, level: 'campaign', date_preset: dateRange, limit: '100' })}`),
        fetchAllPages(`${META_API}/${adAccountId}/insights?${p({ fields: `adset_id,adset_name,campaign_id,${INS_FIELDS}`, level: 'adset', date_preset: dateRange, limit: '100' })}`),
        fetchAllPages(`${META_API}/${adAccountId}/insights?${p({ fields: `ad_id,ad_name,adset_id,adset_name,campaign_id,${INS_FIELDS}`, level: 'ad', date_preset: dateRange, limit: '100' })}`),
      ]);

      if (!dailyRes.error) {
        setDailyData((dailyRes.data || []).map(d => {
          const dayLeads = getLeads(d.actions || []);
          const daySpend = Number(d.spend || 0);
          return { date: d.date_start, spend: daySpend, clicks: Number(d.clicks || 0), leads: dayLeads, cpl: dayLeads > 0 ? daySpend / dayLeads : null };
        }));
      }

      const [campStRes, adsetStRes, adStRes] = await Promise.all([
        fetch(`${META_API}/${adAccountId}/campaigns?${p({ fields: 'id,status,objective', limit: '500' })}`).then(r => r.json()),
        fetch(`${META_API}/${adAccountId}/adsets?${p({ fields: 'id,status', limit: '500' })}`).then(r => r.json()),
        fetch(`${META_API}/${adAccountId}/ads?${p({ fields: 'id,status,creative{thumbnail_url,image_url}', limit: '500' })}`).then(r => r.json()),
      ]);

      const campStMap = {};
      (campStRes.data || []).forEach(c => { campStMap[c.id] = { status: c.status, objective: c.objective }; });
      setCampaigns(campInsPages.map(c => ({ ...c, ...campStMap[c.campaign_id] })));

      const adsetStMap = {};
      (adsetStRes.data || []).forEach(a => { adsetStMap[a.id] = a.status; });
      setAdsets(adsetInsPages.map(a => ({ ...a, status: adsetStMap[a.adset_id] })));

      const adStMap = {};
      const thumbMap = {};
      let thumbNext = null;
      (adStRes.data || []).forEach(ad => {
        adStMap[ad.id] = ad.status;
        const url = ad.creative?.thumbnail_url || ad.creative?.image_url;
        if (url) thumbMap[ad.id] = url;
      });
      thumbNext = adStRes.paging?.next;
      while (thumbNext) {
        const tj = await fetch(thumbNext).then(r => r.json());
        (tj.data || []).forEach(ad => {
          adStMap[ad.id] = ad.status;
          const url = ad.creative?.thumbnail_url || ad.creative?.image_url;
          if (url) thumbMap[ad.id] = url;
        });
        thumbNext = tj.paging?.next || null;
      }
      setAds(adInsPages.map(a => ({ ...a, status: adStMap[a.ad_id] })));
      setThumbnails(thumbMap);

      loadedRef.current = dateRange;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, accessToken, dateRange]);

  useEffect(() => { loadedRef.current = null; load(); }, [dateRange]);
  useEffect(() => { load(); }, []);

  const thStyle = { padding: '10px 8px', textAlign: 'right', background: 'none' };
  const tdStyle = { padding: '11px 8px', textAlign: 'right', fontSize: '12px', color: '#8b8fa8' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '28px 24px', color: '#8b8fa8', fontSize: '13px' }}>
      <Loader2 size={18} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} /> Carregando dados...
    </div>
  );
  if (error) return (
    <div style={{ padding: '16px 24px', color: '#ef4444', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <AlertCircle size={14} /> {error}
    </div>
  );

  const applyStatus = (list) => statusFilter === 'all' ? list : list.filter(i => i.status === statusFilter);
  const sortedCampaigns = applyStatus(sortedList(campaigns, sortCamp));
  const sortedAdsets = applyStatus(sortedList(adsets, sortAdset));
  const sortedAds = applyStatus(sortedList(ads, sortAd));

  const StatusFilterBar = () => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', padding: '2px', gap: '2px' }}>
      {[{ v: 'all', label: 'Todos' }, { v: 'ACTIVE', label: 'Ativos' }, { v: 'PAUSED', label: 'Pausados' }].map(opt => (
        <button key={opt.v} onClick={() => setStatusFilter(opt.v)}
          style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
            background: statusFilter === opt.v ? (opt.v === 'ACTIVE' ? '#22c55e18' : 'rgba(255,255,255,0.07)') : 'transparent',
            color: statusFilter === opt.v ? (opt.v === 'ACTIVE' ? '#22c55e' : opt.v === 'PAUSED' ? '#f59e0b' : '#fff') : '#8b8fa8' }}>
          {opt.v === 'ACTIVE' && <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', marginRight: '4px', verticalAlign: 'middle' }} />}
          {opt.v === 'PAUSED' && <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#6b7280', marginRight: '4px', verticalAlign: 'middle' }} />}
          {opt.label}
        </button>
      ))}
    </div>
  );

  // Aggregate totals from campaigns
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const totalImpressoes = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalAlcance = campaigns.reduce((s, c) => s + Number(c.reach || 0), 0);
  const totalCliques = campaigns.reduce((s, c) => s + Number(c.clicks || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + getLeads(c.actions || []), 0);
  const totalFreq = totalAlcance > 0 ? totalImpressoes / totalAlcance : 0;
  const totalCPM = totalImpressoes > 0 ? (totalSpend / totalImpressoes) * 1000 : 0;
  const totalCTR = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
  const totalCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const taxaLP = totalCliques > 0 ? (totalLeads / totalCliques) * 100 : 0;

  return (
    <div style={{ padding: '0 0 8px' }}>

      {/* ── Funil de Performance ── */}
      {campaigns.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Funil de Performance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
            <FunnelStep label="Impressões" value={fmt(totalImpressoes)} color="#38bdf8" pct={100} />
            <FunnelStep isArrow color="#8b8fa8" sub={`Freq. ${fmt(totalFreq, 1)}x`} />
            <FunnelStep label="Alcance" value={fmt(totalAlcance)} color="#a78bfa" pct={totalImpressoes > 0 ? (totalAlcance / totalImpressoes) * 100 : 0} />
            <FunnelStep isArrow color="#8b8fa8" sub={`CTR ${fmt(totalCTR, 2)}%`} />
            <FunnelStep label="Cliques" value={fmt(totalCliques)} color={PRIMARY} pct={totalAlcance > 0 ? (totalCliques / totalAlcance) * 100 : 0} />
            <FunnelStep isArrow color="#22c55e" sub={`Conv. ${fmt(taxaLP, 1)}%`} />
            <FunnelStep label="Leads" value={fmt(totalLeads)} color="#22c55e" pct={totalCliques > 0 ? (totalLeads / totalCliques) * 100 : 0} />
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'CPM', value: fmtMoney(totalCPM), color: '#38bdf8' },
              { label: 'CPL', value: totalLeads > 0 ? fmtMoney(totalCPL) : '—', color: '#22c55e' },
              { label: 'Frequência', value: `${fmt(totalFreq, 1)}x`, color: '#a78bfa' },
              { label: 'Taxa LP', value: `${fmt(taxaLP, 2)}%`, color: PRIMARY },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: '9px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{m.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gráfico Dual Axis ── */}
      {dailyData.length > 1 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolução Diária</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['spend', 'leads', 'cpl'].map(m => (
                <button key={m} onClick={() => setChartMode(m)}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: 'none', fontSize: '10px', fontWeight: '600', cursor: 'pointer', background: chartMode === m ? PRIMARY : 'rgba(255,255,255,0.06)', color: chartMode === m ? '#000' : '#8b8fa8' }}>
                  {m === 'spend' ? 'Gasto' : m === 'leads' ? 'Leads' : 'CPL'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <ComposedChart data={dailyData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${clientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`grad2-${clientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b8fa8' }} tickFormatter={fmtDate} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#8b8fa8' }} tickFormatter={v => chartMode === 'spend' ? `R$${Math.round(v)}` : chartMode === 'cpl' ? `R$${Math.round(v)}` : `${v}`} width={50} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', color: '#fff' }} labelFormatter={fmtDate} formatter={(v, name) => [name === 'Gasto' || name === 'CPL' ? fmtMoney(v) : fmt(v), name]} />
              {chartMode === 'spend' && <Area yAxisId="left" type="monotone" dataKey="spend" name="Gasto" stroke={PRIMARY} strokeWidth={2} fill={`url(#grad-${clientId})`} />}
              {chartMode === 'leads' && <Area yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#22c55e" strokeWidth={2} fill={`url(#grad2-${clientId})`} />}
              {chartMode === 'cpl' && <Line yAxisId="left" type="monotone" dataKey="cpl" name="CPL" stroke="#f59e0b" strokeWidth={2} dot={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campanhas */}
      {campaigns.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <BarChart2 size={13} color={PRIMARY} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Campanhas</span>
            <span style={{ fontSize: '10px', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1px 8px' }}>{sortedCampaigns.length}/{campaigns.length}</span>
            <div style={{ marginLeft: 'auto' }}><StatusFilterBar /></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ width: '28px', padding: '8px 4px 8px 16px' }} />
                  <th style={{ padding: '8px', textAlign: 'left' }}><ThSort label="Campanha" col="campaign_name" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={{ ...thStyle, fontSize: '10px', color: '#8b8fa8' }}>HEAT</th>
                  <th style={thStyle}><ThSort label="Alcance" col="reach" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="CPM" col="impressions" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Freq." col="frequency" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Leads" col="leads" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="CPL" col="cpl" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Taxa LP" col="ctr" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={{ ...thStyle, paddingRight: '16px' }}><ThSort label="CTR" col="ctr" sort={sortCamp} setSort={setSortCamp} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map(c => {
                  const cLeads = getLeads(c.actions || []);
                  const cCpl = getCpl(c);
                  const cSpend = Number(c.spend || 0);
                  const cImpr = Number(c.impressions || 0);
                  const cReach = Number(c.reach || 0);
                  const cClicks = Number(c.clicks || 0);
                  const cCPM = cImpr > 0 ? (cSpend / cImpr) * 1000 : 0;
                  const cFreq = cReach > 0 ? cImpr / cReach : 0;
                  const cTaxaLP = cClicks > 0 ? (cLeads / cClicks) * 100 : 0;
                  const heatPct = totalSpend > 0 ? (cSpend / totalSpend) * 100 : 0;
                  const freqAlert = cFreq >= 4;
                  const isExp = expandedCampaigns.has(c.campaign_id);
                  const children = sortedAdsets.filter(a => a.campaign_id === c.campaign_id);
                  return (
                    <React.Fragment key={c.campaign_id}>
                      <tr onClick={() => children.length > 0 && setExpandedCampaigns(s => { const n = new Set(s); isExp ? n.delete(c.campaign_id) : n.add(c.campaign_id); return n; })}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: children.length > 0 ? 'pointer' : 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '10px 4px 10px 16px', color: '#8b8fa8' }}>{children.length > 0 && (isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[c.status] || '#6b7280' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{c.campaign_name}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#fff' }}>{fmtMoney(cSpend)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <div style={{ width: '48px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${heatPct}%`, background: PRIMARY, borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '10px', color: '#8b8fa8' }}>{fmt(heatPct, 0)}%</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{fmt(cReach)}</td>
                        <td style={{ ...tdStyle, color: '#38bdf8' }}>{cCPM > 0 ? fmtMoney(cCPM) : '—'}</td>
                        <td style={{ ...tdStyle, color: freqAlert ? '#f59e0b' : '#8b8fa8', fontWeight: freqAlert ? '700' : '400' }}>{fmt(cFreq, 1)}x{freqAlert ? ' ⚠️' : ''}</td>
                        <td style={{ ...tdStyle, color: cLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: cLeads > 0 ? '600' : '400' }}>{fmt(cLeads)}</td>
                        <td style={tdStyle}>{cLeads > 0 ? fmtMoney(cCpl) : '—'}</td>
                        <td style={{ ...tdStyle, color: cTaxaLP > 0 ? PRIMARY : '#8b8fa8' }}>{cTaxaLP > 0 ? `${fmt(cTaxaLP, 1)}%` : '—'}</td>
                        <td style={{ ...tdStyle, paddingRight: '16px' }}>{fmt(Number(c.ctr || 0), 2)}%</td>
                      </tr>
                      {isExp && children.map(a => {
                        const aLeads = getLeads(a.actions || []);
                        const aCpl = getCpl(a);
                        return (
                          <tr key={a.adset_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: 'rgba(0,0,0,0.15)' }}>
                            <td style={{ padding: '8px 4px 8px 16px' }} />
                            <td style={{ padding: '8px 8px 8px 28px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[a.status] || '#6b7280' }} />
                                <span style={{ fontSize: '11px', color: '#8b8fa8' }}>{a.adset_name}</span>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontSize: '11px' }}>{fmtMoney(Number(a.spend || 0))}</td>
                            <td style={{ ...tdStyle, fontSize: '11px' }}>{fmt(a.reach)}</td>
                            <td style={{ ...tdStyle, fontSize: '11px', color: aLeads > 0 ? '#22c55e' : '#8b8fa8' }}>{fmt(aLeads)}</td>
                            <td style={{ ...tdStyle, fontSize: '11px' }}>{aCpl > 0 ? fmtMoney(aCpl) : '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '11px', paddingRight: '16px' }}>{fmt(Number(a.ctr || 0), 2)}%</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anuncios */}
      {ads.length > 0 && (
        <div>
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <ImageIcon size={13} color={PRIMARY} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Anuncios</span>
            <span style={{ fontSize: '10px', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1px 8px' }}>{sortedAds.length}/{ads.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ width: '52px', padding: '8px 8px 8px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previa</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}><ThSort label="Anuncio" col="ad_name" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Cliques" col="clicks" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="CTR" col="ctr" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Leads" col="leads" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={{ ...thStyle, paddingRight: '16px' }}><ThSort label="CPL" col="cpl" sort={sortAd} setSort={setSortAd} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedAds.map(a => {
                  const aLeads = getLeads(a.actions || []);
                  const aCpl = getCpl(a);
                  const thumb = thumbnails[a.ad_id];
                  return (
                    <tr key={a.ad_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '9px 8px 9px 16px' }}>
                        {thumb ? (
                          <img src={thumb} alt="" onClick={() => setCreativeModal({ name: a.ad_name, url: thumb })}
                            style={{ width: '36px', height: '36px', borderRadius: '5px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', display: 'block' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={12} color="#6b7280" />
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '1px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[a.status] || '#6b7280' }} />
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ad_name}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#8b8fa8', paddingLeft: '10px', display: 'block', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.adset_name}</span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#fff' }}>{fmtMoney(Number(a.spend || 0))}</td>
                      <td style={tdStyle}>{fmt(a.clicks)}</td>
                      <td style={tdStyle}>{fmt(Number(a.ctr || 0), 2)}%</td>
                      <td style={{ ...tdStyle, color: aLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: aLeads > 0 ? '600' : '400' }}>{fmt(aLeads)}</td>
                      <td style={{ ...tdStyle, paddingRight: '16px' }}>{aCpl > 0 ? fmtMoney(aCpl) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {campaigns.length === 0 && ads.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#8b8fa8', fontSize: '13px' }}>Sem dados para o periodo selecionado.</div>
      )}

      {/* Creative Modal */}
      {creativeModal && (
        <div onClick={() => setCreativeModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a24', borderRadius: '12px', overflow: 'hidden', maxWidth: '500px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '12px' }}>{creativeModal.name}</span>
              <button onClick={() => setCreativeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8' }}><X size={16} /></button>
            </div>
            <img src={creativeModal.url} alt={creativeModal.name} style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Client Row ─────────────────────────────────────────────────────────────────
const ClientRow = ({ client, accessToken, dateRange, dashLinks, onDashLinksChange }) => {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(`meta_defaults_${client.id}`) || 'null'); } catch { return null; } })();
  const adAccountId = saved?.adAccountId || null;

  const [expanded, setExpanded] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null); // link entry sendo editado
  const [linksOpen, setLinksOpen] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insLoading, setInsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  const clientLinks = dashLinks.filter(l => l.clientId === client.id);

  useEffect(() => {
    if (!adAccountId || !accessToken) return;
    setInsLoading(true);
    const p = new URLSearchParams({ access_token: accessToken, fields: 'spend,reach,impressions,clicks,frequency,actions,cost_per_action_type,ctr', date_preset: dateRange }).toString();
    fetch(`${META_API}/${adAccountId}/insights?${p}`)
      .then(r => r.json())
      .then(json => { if (!json.error) setInsights(json.data?.[0] || null); })
      .catch(() => {})
      .finally(() => setInsLoading(false));
  }, [adAccountId, accessToken, dateRange]);

  const spend = Number(insights?.spend || 0);
  const impressions = Number(insights?.impressions || 0);
  const clicks = Number(insights?.clicks || 0);
  const frequency = Number(insights?.frequency || 0);
  const leads = getLeads(insights?.actions || []);
  const cpl = insights ? getCpl(insights) : 0;
  const ctr = Number(insights?.ctr || 0);
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const taxaLP = clicks > 0 ? (leads / clicks) * 100 : 0;
  const healthScore = cpl > 0 ? Math.min(100, (1 - (cpl / (cpl * 1.5))) * 100 + 50) : null;
  const healthColor = !insights ? '#6b7280' : cpl === 0 && leads === 0 ? '#6b7280' : cpl > 0 && cpm < 15 ? '#22c55e' : cpl > 0 ? '#f59e0b' : '#22c55e';

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => { setCopiedLink(link); setTimeout(() => setCopiedLink(null), 2000); });
  };

  const handleRevokeLink = (id) => {
    const existing = (() => { try { return JSON.parse(localStorage.getItem(DASH_LINKS_KEY) || '[]'); } catch { return []; } })();
    const updated = existing.filter(l => l.id !== id);
    localStorage.setItem(DASH_LINKS_KEY, JSON.stringify(updated));
    onDashLinksChange(updated);
  };

  return (
    <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Card Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${PRIMARY}15`, border: `1px solid ${PRIMARY}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {client.avatarUrl ? (
            <img src={client.avatarUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: '700', color: PRIMARY }}>{client.name[0]}</span>
          )}
        </div>

        {/* Name + account */}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{client.name}</div>
          <div style={{ fontSize: '11px', color: '#8b8fa8', marginTop: '1px' }}>
            {adAccountId ? adAccountId : <span style={{ color: '#6b7280' }}>Sem conta configurada</span>}
          </div>
        </div>

        {/* KPIs inline */}
        {adAccountId && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {insLoading ? (
              <Loader2 size={14} color="#8b8fa8" style={{ animation: 'spin 1s linear infinite' }} />
            ) : insights ? (
              <>
                {/* Health indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px', background: `${healthColor}15`, border: `1px solid ${healthColor}40` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: healthColor, animation: healthColor === '#22c55e' ? 'pulse 2s infinite' : 'none' }} />
                  <span style={{ fontSize: '10px', fontWeight: '700', color: healthColor }}>
                    {healthColor === '#22c55e' ? 'Saudável' : healthColor === '#f59e0b' ? 'Atenção' : 'Verificar'}
                  </span>
                </div>
                {[
                  { label: 'Gasto', value: fmtMoney(spend), color: PRIMARY },
                  { label: 'Impres.', value: fmt(impressions), color: '#8b8fa8' },
                  { label: 'CPM', value: fmtMoney(cpm), color: '#38bdf8' },
                  { label: 'Leads', value: fmt(leads), color: leads > 0 ? '#22c55e' : '#fff' },
                  { label: 'CPL', value: leads > 0 ? fmtMoney(cpl) : '—', color: '#fff' },
                  { label: 'Taxa LP', value: taxaLP > 0 ? `${fmt(taxaLP, 1)}%` : '—', color: PRIMARY },
                  { label: 'Freq.', value: `${fmt(frequency, 1)}x`, color: frequency >= 4 ? '#f59e0b' : '#8b8fa8' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ textAlign: 'right', minWidth: '60px' }}>
                    <div style={{ fontSize: '9px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{kpi.label}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: kpi.color, whiteSpace: 'nowrap' }}>{kpi.value}</div>
                  </div>
                ))}
              </>
            ) : (
              <span style={{ fontSize: '12px', color: '#8b8fa8' }}>Sem dados</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <a href={`/tracking?client=${client.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#818cf8', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
            <TrendingUp size={12} /> Tracking
          </a>
          {adAccountId && (
            <button
              onClick={() => setDlOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid rgba(200,162,58,0.3)`, background: 'rgba(200,162,58,0.06)', color: PRIMARY, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              <Share2 size={12} /> Link
            </button>
          )}
          {clientLinks.length > 0 && (
            <button
              onClick={() => setLinksOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#8b8fa8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              <LinkIcon size={12} /> {clientLinks.length}
            </button>
          )}
          {adAccountId && (
            <button
              onClick={() => setExpanded(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: expanded ? 'rgba(255,255,255,0.05)' : 'transparent', color: expanded ? '#fff' : '#8b8fa8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              {expanded ? <><ChevronUp size={12} /> Fechar</> : <><ChevronDown size={12} /> Detalhar</>}
            </button>
          )}
        </div>
      </div>

      {/* Links list */}
      {linksOpen && clientLinks.length > 0 && (
        <div style={{ padding: '0 20px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 0 8px' }}>Links gerados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {clientLinks.map(link => {
              const expired = link.expiresAt && new Date(link.expiresAt) < new Date();
              const fullLink = `${window.location.origin}/dashboard/cliente/${link.token}`;
              return (
                <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${expired ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                  <LinkIcon size={11} color={expired ? '#ef4444' : PRIMARY} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: expired ? '#6b7280' : '#fff', fontWeight: '600' }}>{link.label || 'Sem label'}</span>
                    {link.expiresAt && (
                      <span style={{ fontSize: '10px', color: expired ? '#ef4444' : '#8b8fa8', marginLeft: '8px' }}>
                        {expired ? 'Expirado' : `Expira ${new Date(link.expiresAt).toLocaleDateString('pt-BR')}`}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleCopyLink(fullLink)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '5px', border: `1px solid rgba(200,162,58,0.3)`, background: 'transparent', color: PRIMARY, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    {copiedLink === fullLink ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                  </button>
                  <button onClick={() => setEditingLink(link)} title="Editar link" style={{ display: 'flex', alignItems: 'center', padding: '4px 7px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#8b8fa8', cursor: 'pointer' }}>
                    <Pencil size={11} />
                  </button>
                  <a href={fullLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '4px 7px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', color: '#8b8fa8', textDecoration: 'none' }}>
                    <ExternalLink size={11} />
                  </a>
                  <button onClick={() => handleRevokeLink(link.id)} style={{ display: 'flex', alignItems: 'center', padding: '4px 7px', borderRadius: '5px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {expanded && adAccountId && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <ClientDetail clientId={client.id} adAccountId={adAccountId} accessToken={accessToken} dateRange={dateRange} />
        </div>
      )}

      {/* Generate Link Modal */}
      {dlOpen && (
        <GenerateLinkModal
          client={client}
          adAccountId={adAccountId}
          accessToken={accessToken}
          onClose={() => setDlOpen(false)}
          onGenerated={(updated) => { onDashLinksChange(updated); setDlOpen(false); setLinksOpen(true); }}
        />
      )}

      {editingLink && (
        <GenerateLinkModal
          client={client}
          adAccountId={adAccountId}
          accessToken={accessToken}
          existing={editingLink}
          onClose={() => setEditingLink(null)}
          onGenerated={(updated) => { onDashLinksChange(updated); setEditingLink(null); }}
        />
      )}
    </div>
  );
};

// ── Command Center ─────────────────────────────────────────────────────────────
const CommandCenter = ({ clients, accessToken, dateRange }) => {
  const [allInsights, setAllInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    const promises = clients.map(c => {
      const saved = (() => { try { return JSON.parse(localStorage.getItem(`meta_defaults_${c.id}`) || 'null'); } catch { return null; } })();
      if (!saved?.adAccountId) return Promise.resolve(null);
      const p = new URLSearchParams({ access_token: accessToken, fields: 'spend,impressions,clicks,frequency,actions,cost_per_action_type', date_preset: dateRange }).toString();
      return fetch(`${META_API}/${saved.adAccountId}/insights?${p}`)
        .then(r => r.json())
        .then(json => json.error ? null : { clientId: c.id, clientName: c.name, data: json.data?.[0] || null })
        .catch(() => null);
    });
    Promise.all(promises).then(results => {
      setAllInsights(results.filter(Boolean));
      setLoading(false);
    });
  }, [clients, accessToken, dateRange]);

  const totals = allInsights.reduce((acc, row) => {
    if (!row.data) return acc;
    const s = Number(row.data.spend || 0);
    const l = getLeads(row.data.actions || []);
    const impr = Number(row.data.impressions || 0);
    return { spend: acc.spend + s, leads: acc.leads + l, impressions: acc.impressions + impr };
  }, { spend: 0, leads: 0, impressions: 0 });

  const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const avgCPM = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const topPerformer = allInsights.filter(r => r.data && getLeads(r.data.actions || []) > 0)
    .sort((a, b) => getCpl(a.data) - getCpl(b.data))[0];

  if (!accessToken || clients.length === 0) return null;

  return (
    <div style={{ background: 'linear-gradient(135deg, #1a1a24 0%, #13131b 100%)', border: '1px solid rgba(200,162,58,0.2)', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Zap size={15} color={PRIMARY} />
        <span style={{ fontSize: '12px', fontWeight: '800', color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Command Center — Consolidado</span>
        {loading && <Loader2 size={12} color="#8b8fa8" style={{ animation: 'spin 1s linear infinite', marginLeft: '4px' }} />}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b8fa8' }}>{DATE_RANGES.find(r => r.value === dateRange)?.label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
        {[
          { icon: <DollarSign size={14} />, label: 'Gasto Total', value: fmtMoney(totals.spend), color: PRIMARY },
          { icon: <Users size={14} />, label: 'Total Leads', value: fmt(totals.leads), color: '#22c55e' },
          { icon: <Target size={14} />, label: 'CPL Médio', value: avgCPL > 0 ? fmtMoney(avgCPL) : '—', color: '#a78bfa' },
          { icon: <Activity size={14} />, label: 'CPM Médio', value: avgCPM > 0 ? fmtMoney(avgCPM) : '—', color: '#38bdf8' },
          { icon: <Award size={14} />, label: 'Top CPL', value: topPerformer ? topPerformer.clientName.split(' ')[0] : '—', color: '#f59e0b', sub: topPerformer ? fmtMoney(getCpl(topPerformer.data)) : '' },
          { icon: <BarChart2 size={14} />, label: 'Clientes Ativos', value: `${clients.length}`, color: '#fff' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: kpi.color }}>{loading ? '...' : kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: '10px', color: '#8b8fa8', marginTop: '2px' }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [dateRange, setDateRange] = useState('last_30d');
  const [clients] = useState(loadClients);
  const [dashLinks, setDashLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DASH_LINKS_KEY) || '[]'); } catch { return []; }
  });
  const accessToken = localStorage.getItem('meta_access_token') || '';

  const configuredClients = clients.filter(c => {
    try { return !!JSON.parse(localStorage.getItem(`meta_defaults_${c.id}`) || 'null')?.adAccountId; } catch { return false; }
  });
  const unconfiguredClients = clients.filter(c => !configuredClients.find(cc => cc.id === c.id));

  return (
    <div style={{ padding: '24px', background: '#0f0f14', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>Dashboard Master</h1>
          <p style={{ fontSize: '13px', color: '#8b8fa8', margin: '3px 0 0' }}>
            {configuredClients.length} cliente{configuredClients.length !== 1 ? 's' : ''} com conta Meta configurada · {dashLinks.length} link{dashLinks.length !== 1 ? 's' : ''} gerado{dashLinks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!accessToken && (
            <a href="/configuracoes" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
              <Settings size={13} /> Configurar token Meta
            </a>
          )}
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
            {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {/* Command Center */}
      <CommandCenter clients={configuredClients} accessToken={accessToken} dateRange={dateRange} />

      {/* Clients with config */}
      {configuredClients.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {configuredClients.map(client => (
            <ClientRow
              key={client.id}
              client={client}
              accessToken={accessToken}
              dateRange={dateRange}
              dashLinks={dashLinks}
              onDashLinksChange={setDashLinks}
            />
          ))}
        </div>
      ) : (
        <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
          <BarChart2 size={36} color="#8b8fa8" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>Nenhum cliente configurado</div>
          <div style={{ fontSize: '13px', color: '#8b8fa8', marginBottom: '16px' }}>Configure as contas Meta Ads dos clientes em Configuracoes</div>
          <a href="/configuracoes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', background: PRIMARY, color: '#000', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
            <Settings size={13} /> Ir para Configuracoes
          </a>
        </div>
      )}

      {/* Clients without config */}
      {unconfiguredClients.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Sem conta configurada ({unconfiguredClients.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
            {unconfiguredClients.map(client => (
              <div key={client.id} style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>{client.name[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#8b8fa8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Sem conta</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} } * { box-sizing: border-box; }`}</style>
    </div>
  );
};

export default Dashboard;
