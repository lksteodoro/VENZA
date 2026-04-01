import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  RefreshCw, Share2, Copy, Check, X, Eye, EyeOff, Lock,
  ChevronDown, ChevronRight, ChevronUp, BarChart2, Layers,
  Image as ImageIcon, DollarSign, Users, MousePointer, TrendingUp,
  Link as LinkIcon, Trash2, AlertCircle, Loader2, Settings, ExternalLink,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CLIENTS } from '../data/mockData';

const META_API = 'https://graph.facebook.com/v25.0';
const PRIMARY = '#C8A23A';
const DASH_LINKS_KEY = 'venza_dashboard_links';

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

// ── Generate Link Modal ───────────────────────────────────────────────────────
const GenerateLinkModal = ({ client, adAccountId, accessToken, onClose, onGenerated }) => {
  const [label, setLabel] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [useExpiry, setUseExpiry] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [sections, setSections] = useState(['insights', 'campaigns', 'adsets', 'ads']);
  const [dateLock, setDateLock] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

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

  const handleGenerate = () => {
    const config = {
      v: 1,
      clientId: client.id,
      clientName: client.name,
      adAccountId,
      accessToken,
      label: label.trim() || null,
      password: usePassword && password.trim() ? password.trim() : null,
      expiresAt: useExpiry && expiry ? new Date(expiry + 'T23:59:59').toISOString() : null,
      allowedSections: sections,
      dateRangeLock: dateLock || null,
    };
    const token = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const link = `${window.location.origin}/dashboard/cliente/${token}`;
    setGeneratedLink(link);

    const entry = { id: uuidv4(), token, clientId: client.id, clientName: client.name, label: config.label, createdAt: new Date().toISOString(), expiresAt: config.expiresAt };
    const existing = (() => { try { return JSON.parse(localStorage.getItem(DASH_LINKS_KEY) || '[]'); } catch { return []; } })();
    const updated = [entry, ...existing];
    localStorage.setItem(DASH_LINKS_KEY, JSON.stringify(updated));
    onGenerated(updated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const canGenerate = accessToken && sections.length > 0 && !(usePassword && !password.trim());

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,162,58,0.12)', border: '1px solid rgba(200,162,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={15} color={PRIMARY} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Gerar Link de Dashboard</div>
              <div style={{ fontSize: '11px', color: '#8b8fa8' }}>{client.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!accessToken && (
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '12px', color: '#ef4444', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={14} /> Token Meta nao configurado. Configure em Configuracoes primeiro.
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

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: usePassword ? '8px' : 0 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Senha de acesso</label>
              <button onClick={() => setUsePassword(p => !p)} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: usePassword ? PRIMARY : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: '2px', left: usePassword ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            {usePassword && (
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite a senha"
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

          {generatedLink && (
            <div style={{ background: 'rgba(200,162,58,0.06)', border: '1px solid rgba(200,162,58,0.2)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: PRIMARY, marginBottom: '8px' }}>Link gerado!</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b8fa8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{generatedLink}</span>
                <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid rgba(200,162,58,0.4)`, background: copied ? 'rgba(200,162,58,0.15)' : 'transparent', color: PRIMARY, fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                  {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8b8fa8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {generatedLink ? 'Fechar' : 'Cancelar'}
          </button>
          {!generatedLink && (
            <button onClick={handleGenerate} disabled={!canGenerate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: canGenerate ? PRIMARY : 'rgba(255,255,255,0.08)', color: canGenerate ? '#000' : '#8b8fa8', fontSize: '13px', fontWeight: '700', cursor: canGenerate ? 'pointer' : 'default' }}>
              <Share2 size={13} /> Gerar Link
            </button>
          )}
        </div>
      </div>
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
  const loadedRef = useRef(null);

  const INS_FIELDS = 'spend,reach,impressions,clicks,ctr,actions,cost_per_action_type,frequency';
  const p = (extra) => new URLSearchParams({ access_token: accessToken, ...extra }).toString();

  const load = useCallback(async () => {
    if (loadedRef.current === dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const [dailyRes, campInsPages, adsetInsPages, adInsPages] = await Promise.all([
        fetch(`${META_API}/${adAccountId}/insights?${p({ fields: 'spend,reach,clicks', date_preset: dateRange, time_increment: '1' })}`).then(r => r.json()),
        fetchAllPages(`${META_API}/${adAccountId}/insights?${p({ fields: `campaign_id,campaign_name,${INS_FIELDS}`, level: 'campaign', date_preset: dateRange, limit: '100' })}`),
        fetchAllPages(`${META_API}/${adAccountId}/insights?${p({ fields: `adset_id,adset_name,campaign_id,${INS_FIELDS}`, level: 'adset', date_preset: dateRange, limit: '100' })}`),
        fetchAllPages(`${META_API}/${adAccountId}/insights?${p({ fields: `ad_id,ad_name,adset_id,adset_name,campaign_id,${INS_FIELDS}`, level: 'ad', date_preset: dateRange, limit: '100' })}`),
      ]);

      if (!dailyRes.error) {
        setDailyData((dailyRes.data || []).map(d => ({ date: d.date_start, spend: Number(d.spend || 0), clicks: Number(d.clicks || 0) })));
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

  const sortedCampaigns = sortedList(campaigns, sortCamp);
  const sortedAdsets = sortedList(adsets, sortAdset);
  const sortedAds = sortedList(ads, sortAd);

  return (
    <div style={{ padding: '0 0 8px' }}>
      {/* Mini Chart */}
      {dailyData.length > 1 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#8b8fa8', marginBottom: '10px' }}>Gasto diario</div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={dailyData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${clientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b8fa8' }} tickFormatter={fmtDate} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#8b8fa8' }} tickFormatter={v => `R$${v}`} width={48} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', color: '#fff' }} labelFormatter={fmtDate} formatter={v => [fmtMoney(v), 'Gasto']} />
              <Area type="monotone" dataKey="spend" stroke={PRIMARY} strokeWidth={2} fill={`url(#grad-${clientId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campanhas */}
      {campaigns.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart2 size={13} color={PRIMARY} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Campanhas</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1px 8px' }}>{campaigns.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ width: '28px', padding: '8px 4px 8px 16px' }} />
                  <th style={{ padding: '8px', textAlign: 'left' }}><ThSort label="Campanha" col="campaign_name" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Alcance" col="reach" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Leads" col="leads" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="CPL" col="cpl" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={{ ...thStyle, paddingRight: '16px' }}><ThSort label="CTR" col="ctr" sort={sortCamp} setSort={setSortCamp} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map(c => {
                  const cLeads = getLeads(c.actions || []);
                  const cCpl = getCpl(c);
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
                        <td style={tdStyle}>{fmtMoney(Number(c.spend || 0))}</td>
                        <td style={tdStyle}>{fmt(c.reach)}</td>
                        <td style={{ ...tdStyle, color: cLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: cLeads > 0 ? '600' : '400' }}>{fmt(cLeads)}</td>
                        <td style={tdStyle}>{cLeads > 0 ? fmtMoney(cCpl) : '—'}</td>
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
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ImageIcon size={13} color={PRIMARY} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Anuncios</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1px 8px' }}>{ads.length}</span>
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
  const [linksOpen, setLinksOpen] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insLoading, setInsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  const clientLinks = dashLinks.filter(l => l.clientId === client.id);

  useEffect(() => {
    if (!adAccountId || !accessToken) return;
    setInsLoading(true);
    const p = new URLSearchParams({ access_token: accessToken, fields: 'spend,reach,actions,cost_per_action_type,ctr', date_preset: dateRange }).toString();
    fetch(`${META_API}/${adAccountId}/insights?${p}`)
      .then(r => r.json())
      .then(json => { if (!json.error) setInsights(json.data?.[0] || null); })
      .catch(() => {})
      .finally(() => setInsLoading(false));
  }, [adAccountId, accessToken, dateRange]);

  const spend = Number(insights?.spend || 0);
  const leads = getLeads(insights?.actions || []);
  const cpl = insights ? getCpl(insights) : 0;
  const ctr = Number(insights?.ctr || 0);

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
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {insLoading ? (
              <Loader2 size={14} color="#8b8fa8" style={{ animation: 'spin 1s linear infinite' }} />
            ) : insights ? (
              <>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Gasto</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: PRIMARY }}>{fmtMoney(spend)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Leads</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: leads > 0 ? '#22c55e' : '#fff' }}>{fmt(leads)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CPL</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{leads > 0 ? fmtMoney(cpl) : '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CTR</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{fmt(ctr, 2)}%</div>
                </div>
              </>
            ) : (
              <span style={{ fontSize: '12px', color: '#8b8fa8' }}>Sem dados</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
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

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
};

export default Dashboard;
