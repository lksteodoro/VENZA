import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  RefreshCw, Lock, Eye, EyeOff, DollarSign, Users, TrendingUp,
  MousePointer, ChevronDown, ChevronRight, X, Loader2, AlertCircle,
  BarChart2, Image as ImageIcon, Layers, Zap, Target, ArrowRight, ShoppingCart,
  Activity, Award, TrendingDown, Cpu
} from 'lucide-react';

const META_API = 'https://graph.facebook.com/v25.0';
const PRIMARY = '#C8A23A';

const decodeToken = (token) => {
  try { return JSON.parse(decodeURIComponent(escape(atob(token)))); } catch { return null; }
};

const LEAD_TYPES = new Set([
  'lead', 'omni_lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'contact',
  'complete_registration',
  'offsite_conversion.fb_pixel_complete_registration',
  'onsite_conversion.flow_complete',
  'onsite_conversion.messaging_first_reply',
  'onsite_conversion.messaging_conversation_started_7d',
]);

const getLeads = (actions = []) =>
  actions.filter(a => LEAD_TYPES.has(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);

// Usa cost_per_action_type da API (espelha o Gerenciador de Anúncios)
const getCpl = (row) => {
  const cpat = row.cost_per_action_type || [];
  const match = cpat.find(a => LEAD_TYPES.has(a.action_type));
  if (match) return Number(match.value || 0);
  const leads = getLeads(row.actions || []);
  return leads > 0 ? Number(row.spend || 0) / leads : 0;
};

// Busca todas as páginas de um endpoint paginado
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

const DATE_RANGES = [
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_90d', label: 'Últimos 90 dias' },
];

const STATUS_COLOR = { ACTIVE: '#22c55e', PAUSED: '#6b7280', DELETED: '#ef4444', ARCHIVED: '#f59e0b' };

// ── Password Gate ──────────────────────────────────────────────────────────────
const PasswordGate = ({ onUnlock, clientName }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onUnlock(input)) { setError(false); }
    else { setError(true); setInput(''); setTimeout(() => setError(false), 2000); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${PRIMARY}20`, border: `1px solid ${PRIMARY}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BarChart2 size={32} color={PRIMARY} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Dashboard do Cliente</h1>
          {clientName && <p style={{ fontSize: '13px', color: '#8b8fa8' }}>{clientName}</p>}
        </div>
        <form onSubmit={handleSubmit} style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Lock size={16} color={PRIMARY} />
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Acesso Protegido</span>
          </div>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type={show ? 'text' : 'password'}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite a senha de acesso"
              autoFocus
              style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: '10px', background: '#0f0f14', border: `1.5px solid ${error ? '#ef4444' : input ? PRIMARY : 'rgba(255,255,255,0.1)'}`, color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8', display: 'flex' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px', textAlign: 'center' }}>Senha incorreta. Tente novamente.</p>}
          <button type="submit" disabled={!input} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: input ? PRIMARY : 'rgba(255,255,255,0.08)', color: input ? '#000' : '#8b8fa8', fontWeight: '700', fontSize: '14px', cursor: input ? 'pointer' : 'default', transition: 'all 0.2s' }}>
            Acessar Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color = PRIMARY }) => (
  <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 18px', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>{label}</span>
    </div>
    <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', lineHeight: 1.2, wordBreak: 'break-word' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: '#8b8fa8', marginTop: '6px' }}>{sub}</div>}
  </div>
);

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
    const aCplV = getCpl(a); const bCplV = getCpl(b);
    aVal = aCplV > 0 ? aCplV : 999999;
    bVal = bCplV > 0 ? bCplV : 999999;
  } else {
    const aRaw = a[sort.key]; const bRaw = b[sort.key];
    if (typeof aRaw === 'string' && isNaN(Number(aRaw))) {
      return sort.dir === 'desc' ? bRaw.localeCompare(aRaw) : aRaw.localeCompare(bRaw);
    }
    aVal = Number(aRaw || 0); bVal = Number(bRaw || 0);
  }
  return sort.dir === 'desc' ? bVal - aVal : aVal - bVal;
});

const PER_PAGE = 10;

// ── Paginator ─────────────────────────────────────────────────────────────────
const Paginator = ({ page, total, onChange }) => {
  const pages = Math.ceil(total / PER_PAGE);
  if (pages <= 1) return null;
  const from = (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  const nums = (() => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  })();

  const btn = (label, target, disabled) => (
    <button
      key={label}
      onClick={() => !disabled && onChange(target)}
      disabled={disabled}
      style={{ minWidth: '30px', height: '30px', padding: '0 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: disabled ? '#3a3a4a' : '#8b8fa8', fontSize: '13px', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', gap: '12px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: '#8b8fa8' }}>{from}–{to} de {total}</span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {btn('«', 1, page === 1)}
        {btn('‹', page - 1, page === 1)}
        {nums.map(p => (
          <button key={p} onClick={() => onChange(p)}
            style={{ minWidth: '30px', height: '30px', padding: '0 6px', borderRadius: '6px', border: `1px solid ${p === page ? `${PRIMARY}60` : 'rgba(255,255,255,0.08)'}`, background: p === page ? `${PRIMARY}18` : 'transparent', color: p === page ? PRIMARY : '#8b8fa8', fontSize: '13px', fontWeight: p === page ? '700' : '400', cursor: 'pointer' }}
          >{p}</button>
        ))}
        {btn('›', page + 1, page === pages)}
        {btn('»', pages, page === pages)}
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ w = '100%', h = '13px', r = '6px' }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.10) 50%,rgba(255,255,255,0.04) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
);

const SkeletonTableSection = ({ icon, title, cols, rows = 7 }) => (
  <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: PRIMARY }}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{title}</span>
      <div style={{ marginLeft: 'auto' }}><Skeleton w="36px" h="20px" r="10px" /></div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} style={{ padding: '14px 10px', paddingLeft: j === 0 ? '16px' : '10px', paddingRight: j === cols - 1 ? '16px' : '10px', textAlign: j > 1 ? 'right' : 'left' }}>
                <Skeleton w={j === 0 ? '18px' : j === 1 ? `${55 + (i * 7) % 30}%` : `${40 + (j * 11 + i * 5) % 35}%`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Table Section Wrapper ─────────────────────────────────────────────────────
const TableSection = ({ icon, title, count, children, footer }) => (
  <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: PRIMARY }}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{title}</span>
      {count != null && (
        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px 10px' }}>{count}</span>
      )}
    </div>
    <div style={{ overflowX: 'auto' }}>{children}</div>
    {footer}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ClientDashboard = () => {
  const { token } = useParams();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    document.body.classList.add('public-route');
    return () => document.body.classList.remove('public-route');
  }, []);
  const [tokenError, setTokenError] = useState(null);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [adsets, setAdsets] = useState([]);
  const [ads, setAds] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const [dateRange, setDateRange] = useState('last_30d');
  const [selectedProjId, setSelectedProjId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ACTIVE' | 'PAUSED'
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState(new Set());
  const [creativeModal, setCreativeModal] = useState(null);
  const [sortCamp, setSortCamp] = useState({ key: 'spend', dir: 'desc' });
  const [sortAdset, setSortAdset] = useState({ key: 'spend', dir: 'desc' });
  const [sortAd, setSortAd] = useState({ key: 'spend', dir: 'desc' });
  const [campPage, setCampPage] = useState(1);
  const [adsetPage, setAdsetPage] = useState(1);
  const [adPage, setAdPage] = useState(1);
  const [chartMode2, setChartMode2] = useState('spend');

  useEffect(() => { setCampPage(1); }, [sortCamp, statusFilter]);
  useEffect(() => { setAdsetPage(1); }, [sortAdset, statusFilter]);
  useEffect(() => { setAdPage(1); }, [sortAd, statusFilter]);

  useEffect(() => {
    const cfg = decodeToken(token);
    if (!cfg || !cfg.adAccountId || !cfg.accessToken) { setTokenError('Link inválido ou corrompido.'); return; }
    if (cfg.expiresAt && new Date(cfg.expiresAt) < new Date()) { setTokenError('Este link expirou.'); return; }
    setConfig(cfg);
    setDateRange(cfg.dateRangeLock || 'last_30d');
    if (!cfg.password) setPasswordVerified(true);
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!config || !passwordVerified) return;
    setLoading(true);
    setError(null);

    const { adAccountId, accessToken: t } = config;
    const p = (extra) => new URLSearchParams({ access_token: t, ...extra }).toString();

    const INS_FIELDS = 'spend,reach,impressions,clicks,ctr,actions,cost_per_action_type,frequency';

    try {
      // 1. Account-level insights
      const insRes = await fetch(`${META_API}/${adAccountId}/insights?${p({ fields: INS_FIELDS, date_preset: dateRange })}`);
      const insJson = await insRes.json();
      if (insJson.error) throw new Error(insJson.error.message);
      setInsights(insJson.data?.[0] || null);

      // 2. Daily breakdown for chart
      const dailyRes = await fetch(`${META_API}/${adAccountId}/insights?${p({ fields: 'spend,reach,impressions,clicks,actions,cost_per_action_type', date_preset: dateRange, time_increment: '1' })}`);
      const dailyJson = await dailyRes.json();
      if (!dailyJson.error) {
        setDailyData((dailyJson.data || []).map(d => {
          const dayLeads = getLeads(d.actions || []);
          const daySpend = Number(d.spend || 0);
          return {
            date: d.date_start,
            spend: daySpend,
            reach: Number(d.reach || 0),
            clicks: Number(d.clicks || 0),
            leads: dayLeads,
            cpl: dayLeads > 0 ? daySpend / dayLeads : null,
          };
        }));
      }

      // 3. Campaign insights (com paginação)
      const campInsUrl = `${META_API}/${adAccountId}/insights?${p({ fields: `campaign_id,campaign_name,${INS_FIELDS}`, level: 'campaign', date_preset: dateRange, limit: '100' })}`;
      const campIns = await fetchAllPages(campInsUrl);
      const campStRes = await fetch(`${META_API}/${adAccountId}/campaigns?${p({ fields: 'id,status,objective', limit: '500' })}`);
      const campStJson = await campStRes.json();
      const campStMap = {};
      (campStJson.data || []).forEach(c => { campStMap[c.id] = { status: c.status, objective: c.objective }; });
      setCampaigns(campIns.map(c => ({ ...c, ...campStMap[c.campaign_id] })));

      // 4. Adset insights (com paginação)
      const adsetInsUrl = `${META_API}/${adAccountId}/insights?${p({ fields: `adset_id,adset_name,campaign_id,${INS_FIELDS}`, level: 'adset', date_preset: dateRange, limit: '100' })}`;
      const adsetIns = await fetchAllPages(adsetInsUrl);
      const adsetStRes = await fetch(`${META_API}/${adAccountId}/adsets?${p({ fields: 'id,status', limit: '500' })}`);
      const adsetStJson = await adsetStRes.json();
      const adsetStMap = {};
      (adsetStJson.data || []).forEach(a => { adsetStMap[a.id] = a.status; });
      setAdsets(adsetIns.map(a => ({ ...a, status: adsetStMap[a.adset_id] })));

      // 5. Ad insights (com paginação) + status
      const adInsUrl = `${META_API}/${adAccountId}/insights?${p({ fields: `ad_id,ad_name,adset_id,adset_name,campaign_id,${INS_FIELDS}`, level: 'ad', date_preset: dateRange, limit: '100' })}`;
      const adIns = await fetchAllPages(adInsUrl);
      const adStRes = await fetch(`${META_API}/${adAccountId}/ads?${p({ fields: 'id,status,creative{thumbnail_url,image_url}', limit: '500' })}`);
      const adStJson = await adStRes.json();
      const adStMap = {};
      const thumbMap = {};
      (adStJson.data || []).forEach(ad => {
        adStMap[ad.id] = ad.status;
        const url = ad.creative?.thumbnail_url || ad.creative?.image_url;
        if (url) thumbMap[ad.id] = url;
      });
      // Paginação para thumbnails também
      let thumbNext = adStJson.paging?.next;
      while (thumbNext) {
        const tr = await fetch(thumbNext);
        const tj = await tr.json();
        (tj.data || []).forEach(ad => {
          adStMap[ad.id] = ad.status;
          const url = ad.creative?.thumbnail_url || ad.creative?.image_url;
          if (url) thumbMap[ad.id] = url;
        });
        thumbNext = tj.paging?.next || null;
      }
      setAds(adIns.map(a => ({ ...a, status: adStMap[a.ad_id] })));
      setThumbnails(thumbMap);

      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [config, passwordVerified, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Error / Loading states ──
  if (tokenError) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Link Inválido</h2>
          <p style={{ color: '#8b8fa8', fontSize: '14px' }}>{tokenError}</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  if (!passwordVerified) {
    return (
      <PasswordGate
        clientName={config.clientName}
        onUnlock={(pwd) => {
          if (pwd === config.password) { setPasswordVerified(true); return true; }
          return false;
        }}
      />
    );
  }

  // ── KPI values ──
  const getRenderMetrics = () => {
    if (selectedProjId === 'all' || !config.projects) {
       return {
         spend: Number(insights?.spend || 0),
         reach: Number(insights?.reach || 0),
         impressions: Number(insights?.impressions || 0),
         clicks: Number(insights?.clicks || 0),
         ctr: Number(insights?.ctr || 0),
         frequency: Number(insights?.frequency || 0),
         leads: getLeads(insights?.actions || []),
         cpl: insights ? getCpl(insights) : 0,
       };
    }
    const proj = config.projects.find(p => p.id === selectedProjId);
    const validCamps = campaigns.filter(c => proj?.campaignIds.includes(c.campaign_id));
    const spend = validCamps.reduce((s, c) => s + Number(c.spend || 0), 0);
    const reach = validCamps.reduce((s, c) => s + Number(c.reach || 0), 0);
    const impressions = validCamps.reduce((s, c) => s + Number(c.impressions || 0), 0);
    const clicks = validCamps.reduce((s, c) => s + Number(c.clicks || 0), 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const frequency = reach > 0 ? impressions / reach : 0;
    const leads = validCamps.reduce((s, c) => s + getLeads(c.actions || []), 0);
    const cpl = leads > 0 ? spend / leads : 0;
    return { spend, reach, impressions, clicks, ctr, frequency, leads, cpl };
  };

  const { spend, reach, impressions, clicks, ctr, frequency, leads, cpl } = getRenderMetrics();

  const sections = config.allowedSections || ['insights', 'campaigns', 'adsets', 'ads'];
  
  const applyProjectFilter = (list) => {
    if (selectedProjId === 'all' || !config.projects) return list;
    const proj = config.projects.find(p => p.id === selectedProjId);
    return list.filter(item => proj?.campaignIds.includes(item.campaign_id));
  };
  
  const applyStatusFilter = (list) => statusFilter === 'all' ? list : list.filter(item => item.status === statusFilter);
  
  const sortedCampaigns = applyStatusFilter(sortedList(applyProjectFilter(campaigns), sortCamp));
  const sortedAdsets = applyStatusFilter(sortedList(applyProjectFilter(adsets), sortAdset));
  const sortedAds = applyStatusFilter(sortedList(applyProjectFilter(ads), sortAd));

  const pagedCampaigns = sortedCampaigns.slice((campPage - 1) * PER_PAGE, campPage * PER_PAGE);
  const pagedAdsets    = sortedAdsets.slice((adsetPage - 1) * PER_PAGE, adsetPage * PER_PAGE);
  const pagedAds       = sortedAds.slice((adPage - 1) * PER_PAGE, adPage * PER_PAGE);

  const thStyle = { padding: '10px 8px', textAlign: 'right', background: 'none' };
  const tdStyle = { padding: '12px 8px', textAlign: 'right', fontSize: '13px', color: '#8b8fa8' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f14', color: '#fff', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', gap: '16px', flexWrap: 'wrap', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${PRIMARY}20`, border: `1px solid ${PRIMARY}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={20} color={PRIMARY} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{config.clientName || 'Dashboard do Cliente'}</div>
              {config.label && <div style={{ fontSize: '11px', color: '#8b8fa8' }}>{config.label}</div>}
              {config.projects && config.projects.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <select value={selectedProjId} onChange={e => setSelectedProjId(e.target.value)} style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}>
                    <option value="all">Visão Unificada (Todos os Projetos)</option>
                    {config.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: '#8b8fa8' }}>
                Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

            {/* Filtro de status */}
            <div style={{ display: 'flex', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {[{ v: 'all', label: 'Todos' }, { v: 'ACTIVE', label: 'Ativos' }, { v: 'PAUSED', label: 'Pausados' }].map(opt => (
                <button key={opt.v} onClick={() => setStatusFilter(opt.v)}
                  style={{ padding: '4px 11px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                    background: statusFilter === opt.v ? (opt.v === 'ACTIVE' ? '#22c55e18' : opt.v === 'PAUSED' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)') : 'transparent',
                    color: statusFilter === opt.v ? (opt.v === 'ACTIVE' ? '#22c55e' : opt.v === 'PAUSED' ? '#f59e0b' : '#fff') : '#8b8fa8' }}>
                  {opt.v === 'ACTIVE' && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', marginRight: '5px', verticalAlign: 'middle' }} />}
                  {opt.v === 'PAUSED' && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#6b7280', marginRight: '5px', verticalAlign: 'middle' }} />}
                  {opt.label}
                </button>
              ))}
            </div>

            {!config.dateRangeLock && (
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '8px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
              >
                {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
            {config.dateRangeLock && (
              <span style={{ padding: '7px 12px', borderRadius: '8px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: '#8b8fa8', fontSize: '13px' }}>
                {DATE_RANGES.find(r => r.value === config.dateRangeLock)?.label || config.dateRangeLock}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: loading ? 'wait' : 'pointer', fontWeight: '600' }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>

        {error && (
          <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#ef4444', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading && !insights && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Skeleton w="32px" h="32px" r="8px" />
                  <Skeleton w="60%" h="10px" />
                </div>
                <Skeleton w="70%" h="22px" r="6px" />
                <div style={{ marginTop: '8px' }}><Skeleton w="45%" h="10px" /></div>
              </div>
            ))}
          </div>
        )}

        {/* ── HERO: Funil de Conversão Full-Width ── */}
        {sections.includes('insights') && insights && (() => {
          const impr = Number(insights?.impressions || 0);
          const alcance = Number(insights?.reach || 0);
          const freq = alcance > 0 ? impr / alcance : 0;
          const cpm_ = impr > 0 ? (spend / impr) * 1000 : 0;
          const taxaLP_ = clicks > 0 ? (leads / clicks) * 100 : 0;

          const funnelSteps = [
            { label: 'Impres.', value: fmt(impr), color: '#38bdf8', pct: 100, sub: `CPM ${fmtMoney(cpm_)}` },
            { arrow: true, label: `Freq. ${fmt(freq, 1)}x` },
            { label: 'Alcance', value: fmt(alcance), color: '#818cf8', pct: impr > 0 ? (alcance / impr) * 100 : 0, sub: `${fmt(impr > 0 ? (alcance/impr)*100 : 0, 1)}% das impr.` },
            { arrow: true, label: `CTR ${fmt(ctr, 2)}%` },
            { label: 'Cliques', value: fmt(clicks), color: PRIMARY, pct: alcance > 0 ? (clicks / alcance) * 100 : 0, sub: `${fmt(alcance > 0 ? (clicks/alcance)*100 : 0, 2)}% do alcance` },
            { arrow: true, label: `Conv. ${fmt(taxaLP_, 1)}%`, highlight: true },
            { label: 'Leads', value: fmt(leads), color: '#22c55e', pct: clicks > 0 ? (leads / clicks) * 100 : 0, sub: `CPL ${leads > 0 ? fmtMoney(cpl) : '—'}` },
          ];

          return (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ background: 'linear-gradient(135deg, #1a1a24 0%, #13131b 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Activity size={16} color={PRIMARY} />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Funil de Conversão</span>
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#8b8fa8', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: '20px' }}>
                    {DATE_RANGES.find(r => r.value === dateRange)?.label}
                  </span>
                </div>

                {/* Funil visual */}
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '4px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {funnelSteps.map((s, i) => s.arrow ? (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px', minWidth: '52px', flexShrink: 0 }}>
                      <ArrowRight size={20} color={s.highlight ? '#22c55e' : '#4b5563'} />
                      <span style={{ fontSize: '10px', color: s.highlight ? '#22c55e' : '#8b8fa8', fontWeight: '700', marginTop: '4px', whiteSpace: 'nowrap', textAlign: 'center' }}>{s.label}</span>
                    </div>
                  ) : (
                    <div key={i} style={{ flex: 1, minWidth: '90px', background: `${s.color}10`, border: `1px solid ${s.color}25`, borderRadius: '10px', padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ height: '3px', background: `${s.color}20`, borderRadius: '2px', marginBottom: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(2, Math.min(s.pct, 100))}%`, background: `linear-gradient(90deg, ${s.color}80, ${s.color})`, borderRadius: '2px', transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '9px', color: '#8b8fa8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>{s.label}</div>
                      <div style={{ fontSize: '10px', color: `${s.color}cc`, marginTop: '4px', fontWeight: '500' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* KPI Row abaixo do funil */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { label: 'Gasto Total', value: fmtMoney(spend), color: PRIMARY },
                    { label: 'CPM', value: fmtMoney(cpm_), color: '#38bdf8' },
                    { label: 'Taxa Conv. LP', value: `${fmt(taxaLP_, 2)}%`, color: '#22c55e' },
                    { label: 'Frequência', value: `${fmt(freq, 1)}x`, color: freq >= 4 ? '#f59e0b' : '#a78bfa', badge: freq >= 4 ? '⚠️ Saturando' : null },
                    { label: 'CTR', value: `${fmt(ctr, 2)}%`, color: '#f59e0b' },
                    { label: 'CPL', value: leads > 0 ? fmtMoney(cpl) : '—', color: '#22c55e' },
                  ].map(m => (
                    <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '9px', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>{m.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: m.color }}>{m.value}</div>
                      {m.badge && <div style={{ fontSize: '9px', color: '#f59e0b', marginTop: '3px' }}>{m.badge}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── SEÇÃO DemandOS: Pacing vs Metas ── */}
        {(config.demandos || config.projects) && insights && (() => {
          let d = null;
          if (config.projects) {
              if (selectedProjId === 'all') {
                  d = {
                     budget_monthly: config.projects.reduce((s,p) => s + (p.goals?.budget_monthly||0), 0),
                     lead_goal_weekly: config.projects.reduce((s,p) => s + (p.goals?.lead_goal_weekly||0), 0),
                     cpa_break_even: config.projects.length === 1 ? config.projects[0].goals.cpa_break_even : 0
                  };
              } else {
                  const p = config.projects.find(p => p.id === selectedProjId);
                  d = p ? p.goals : null;
              }
          } else {
              d = config.demandos;
          }
          if (!d) return null;

          const GREEN_C = '#4ade80', RED_C = '#f87171', YELLOW_C = '#facc15';
          const bar = (pct) => pct >= 100 ? GREEN_C : pct >= 70 ? PRIMARY : pct >= 40 ? YELLOW_C : RED_C;

          const pacingItems = [];
          if (d.budget_monthly > 0) {
            const pct = Math.min(spend / d.budget_monthly * 100, 100);
            pacingItems.push({ label: 'Orçamento do Mês', current: fmtMoney(spend), goal: fmtMoney(d.budget_monthly), pct, color: bar(pct) });
          }
          if (d.lead_goal_weekly > 0) {
            const pct = Math.min(leads / d.lead_goal_weekly * 100, 100);
            pacingItems.push({ label: 'Leads no Período', current: fmt(leads), goal: `meta ${fmt(d.lead_goal_weekly)}/sem`, pct, color: bar(pct) });
          }
          if (d.cpa_break_even > 0 && cpl > 0) {
            const ratio = cpl / d.cpa_break_even;
            const pct = Math.min((1 - Math.max(ratio - 1, 0)) * 100, 100);
            const cpaColor = cpl < d.cpa_break_even * 0.7 ? GREEN_C : cpl <= d.cpa_break_even ? YELLOW_C : RED_C;
            const cpaBadge = cpl < d.cpa_break_even * 0.7 ? 'Abaixo do teto ✓' : cpl <= d.cpa_break_even ? 'Dentro do limite' : 'Acima do break-even';
            pacingItems.push({ label: 'CPL vs Break-even', current: fmtMoney(cpl), goal: `teto ${fmtMoney(d.cpa_break_even)}`, pct: Math.max(0, (1 - Math.max(0, cpl - d.cpa_break_even) / d.cpa_break_even) * 100), color: cpaColor, badge: cpaBadge, badgeColor: cpaColor });
          }

          if (!pacingItems.length) return null;
          return (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TrendingUp size={15} color={PRIMARY} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Pacing · Metas do Período</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '14px' }}>
                {pacingItems.map((item, i) => (
                  <div key={i} style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.3 }}>{item.label}</span>
                      <span style={{ fontSize: '10px', color: '#8b8fa8', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.goal}</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '12px', wordBreak: 'break-word' }}>{item.current}</div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: item.color, width: `${Math.min(item.pct, 100)}%`, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: item.color, fontWeight: '700' }}>
                      {item.badge || `${fmt(item.pct, 0)}% da meta`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── SEÇÃO Tracking & Funil de Vendas ── */}
        {(config.trackingData || config.trackingDataV2) && (() => {
          let t = null;
          // Nova logica v3/v2 suporte projetos
          if (config.trackingData && config.trackingData[dateRange] && config.trackingData[dateRange].total) {
              const td = config.trackingData[dateRange];
              t = selectedProjId === 'all' ? td.total : (td.projects[selectedProjId] || { leads:0, sales:0, revenue:0 });
          } else if (config.trackingData && config.trackingData[dateRange] && selectedProjId === 'all') {
              t = config.trackingData[dateRange];
          }

          if (!t) return null;

          const convLP = clicks > 0 ? (t.leads / clicks) * 100 : 0;
          const convSale = t.leads > 0 ? (t.sales / t.leads) * 100 : 0;
          const green = '#4ade80', purple = '#a78bfa', blue = '#38bdf8';
          
          const steps = [
            { label: 'Cliques (Meta)', value: fmt(clicks), icon: <MousePointer size={14} />, color: blue },
            { label: 'Conv. LP', value: `${fmt(convLP, 1)}%`, arrow: true, color: PRIMARY },
            { label: 'Leads (CRM)', value: fmt(t.leads), icon: <Target size={14} />, color: purple },
            { label: 'Conv. Venda', value: `${fmt(convSale, 1)}%`, arrow: true, color: PRIMARY },
            { label: 'Vendas', value: fmt(t.sales), icon: <ShoppingCart size={14} />, color: green },
          ];

          const cpa = t.leads > 0 ? spend / t.leads : 0;
          const roas = spend > 0 ? t.revenue / spend : 0;
          const profit = t.revenue - spend;

          return (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <Zap size={16} color={PRIMARY} />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Performance de Vendas & CRM</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '3px 10px' }}>
                    Sincronizado via Arquivo
                  </span>
                </div>

                {/* Funil visual */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '28px' }}>
                  {steps.map((s, i) => (
                    <React.Fragment key={i}>
                      {s.arrow ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                          <ArrowRight size={18} color={PRIMARY} />
                          <span style={{ fontSize: '11px', color: PRIMARY, fontWeight: '700', marginTop: '4px' }}>{s.value}</span>
                        </div>
                      ) : (
                        <div style={{ flex: 1, minWidth: '90px', background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ color: s.color, marginBottom: '6px' }}>{s.icon}</div>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>{s.value}</div>
                          <div style={{ fontSize: '10px', color: '#8b8fa8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '4px' }}>{s.label}</div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Tracking KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                  <KpiCard icon={<DollarSign size={16} />} label="Receita Rastreada" value={fmtMoney(t.revenue)} color={green} sub={`${t.sales} vendas aprovadas`} />
                  <KpiCard icon={<BarChart2 size={16} />} label="Lucro Bruto" value={fmtMoney(profit)} color={profit >= 0 ? green : '#f87171'} sub={`Custo total: ${fmtMoney(spend)}`} />
                  <KpiCard icon={<Target size={16} />} label="CPA Integrado" value={t.leads > 0 ? fmtMoney(cpa) : '—'} color={PRIMARY} sub={`Baseado em ${t.leads} leads`} />
                  <KpiCard icon={<Zap size={16} />} label="ROAS Global" value={roas > 0 ? `${fmt(roas, 2)}x` : '—'} color={roas >= 1 ? green : '#f87171'} sub={roas > 0 ? `Retorno por R$1 investido` : 'Sem vendas'} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── SEÇÃO 2: Gráfico Dual Axis Evolução Diária ── */}
        {sections.includes('insights') && dailyData.length > 1 && (
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={16} color={PRIMARY} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Evolução Diária {selectedProjId !== 'all' && <span style={{ color: '#8b8fa8', fontSize: '12px', fontWeight: '500' }}>(Conta Completa)</span>}</span>
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                {['spend', 'leads', 'cpl'].map(m => (
                  <button key={m} onClick={() => setChartMode2(m)}
                    style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: chartMode2 === m ? PRIMARY : 'rgba(255,255,255,0.06)', color: chartMode2 === m ? '#000' : '#8b8fa8' }}>
                    {m === 'spend' ? 'Gasto' : m === 'leads' ? 'Leads' : 'CPL'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8fa8' }} tickFormatter={fmtDate} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#8b8fa8' }} tickFormatter={v => chartMode2 === 'spend' || chartMode2 === 'cpl' ? `R$${Math.round(v)}` : `${v}`} width={55} />
                <Tooltip
                  contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  labelFormatter={fmtDate}
                  formatter={(v, name) => [name === 'Gasto' || name === 'CPL' ? fmtMoney(v) : fmt(v), name]}
                />
                {chartMode2 === 'spend' && <Area type="monotone" dataKey="spend" name="Gasto" stroke={PRIMARY} strokeWidth={2} fill="url(#spendGrad)" />}
                {chartMode2 === 'leads' && <Area type="monotone" dataKey="leads" name="Leads" stroke="#22c55e" strokeWidth={2} fill="url(#leadsGrad)" />}
                {chartMode2 === 'cpl' && <Area type="monotone" dataKey="cpl" name="CPL" stroke="#f59e0b" strokeWidth={2} fill="url(#leadsGrad)" connectNulls />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── SEÇÃO 3: Campanhas BI Table ── */}
        {sections.includes('campaigns') && loading && <SkeletonTableSection icon={<BarChart2 size={16} />} title="Campanhas" cols={9} />}
        {sections.includes('campaigns') && !loading && campaigns.length > 0 && (
          <TableSection icon={<BarChart2 size={16} />} title="Ranking de Campanhas" count={sortedCampaigns.length}
footer={<Paginator page={campPage} total={sortedCampaigns.length} onChange={setCampPage} />}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ width: '36px', padding: '10px 6px 10px 16px' }} />
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}><ThSort label="Campanha" col="campaign_name" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={{ ...thStyle, fontSize: '9px', color: '#8b8fa8' }}>HEAT</th>
                  <th style={thStyle}><ThSort label="CPM" col="impressions" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Freq." col="frequency" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="Leads" col="leads" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={thStyle}><ThSort label="CPL" col="cpl" sort={sortCamp} setSort={setSortCamp} /></th>
                  <th style={{ ...thStyle, paddingRight: '16px' }}><ThSort label="Taxa LP" col="ctr" sort={sortCamp} setSort={setSortCamp} /></th>
                </tr>
              </thead>
              <tbody>
                {pagedCampaigns.map(c => {
                  const cLeads = getLeads(c.actions || []);
                  const cCpl = getCpl(c);
                  const cSpend = Number(c.spend || 0);
                  const cImpr = Number(c.impressions || 0);
                  const cReach = Number(c.reach || 0);
                  const cClicks = Number(c.clicks || 0);
                  const cCPM = cImpr > 0 ? (cSpend / cImpr) * 1000 : 0;
                  const cFreq = cReach > 0 ? cImpr / cReach : 0;
                  const cTaxaLP = cClicks > 0 ? (cLeads / cClicks) * 100 : 0;
                  const totalCampSpend = sortedCampaigns.reduce((s, x) => s + Number(x.spend || 0), 0);
                  const heatPct = totalCampSpend > 0 ? (cSpend / totalCampSpend) * 100 : 0;
                  const freqAlert = cFreq >= 4;

                  const breakEven = config.projects && selectedProjId !== 'all'
                    ? config.projects.find(p => p.id === selectedProjId)?.goals?.cpa_break_even || 0
                    : config.demandos?.cpa_break_even || 0;
                  const cplColor = breakEven > 0 && cCpl > 0 ? (cCpl <= breakEven * 0.7 ? '#22c55e' : cCpl <= breakEven ? '#f59e0b' : '#ef4444') : '#8b8fa8';

                  const isExp = expandedCampaigns.has(c.campaign_id);
                  const children = sortedAdsets.filter(a => a.campaign_id === c.campaign_id);
                  return (
                    <React.Fragment key={c.campaign_id}>
                      <tr
                        onClick={() => children.length > 0 && setExpandedCampaigns(s => { const n = new Set(s); isExp ? n.delete(c.campaign_id) : n.add(c.campaign_id); return n; })}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: children.length > 0 ? 'pointer' : 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '11px 6px 11px 16px', color: '#8b8fa8' }}>{children.length > 0 && (isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}</td>
                        <td style={{ padding: '11px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: c.status === 'ACTIVE' ? '#22c55e' : '#6b7280' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{c.campaign_name}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#fff' }}>{fmtMoney(cSpend)}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <div style={{ width: '44px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${heatPct}%`, background: `linear-gradient(90deg, ${PRIMARY}80, ${PRIMARY})`, borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '10px', color: '#8b8fa8', minWidth: '26px', textAlign: 'right' }}>{fmt(heatPct, 0)}%</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: '#38bdf8' }}>{cCPM > 0 ? fmtMoney(cCPM) : '—'}</td>
                        <td style={{ ...tdStyle, color: freqAlert ? '#f59e0b' : '#8b8fa8', fontWeight: freqAlert ? '700' : '400' }}>{fmt(cFreq, 1)}x{freqAlert ? '⚠' : ''}</td>
                        <td style={{ ...tdStyle, color: cLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: cLeads > 0 ? '600' : '400' }}>{fmt(cLeads)}</td>
                        <td style={{ ...tdStyle, color: cplColor, fontWeight: cCpl > 0 ? '700' : '400' }}>{cLeads > 0 ? fmtMoney(cCpl) : '—'}</td>
                        <td style={{ ...tdStyle, paddingRight: '16px', color: cTaxaLP > 0 ? PRIMARY : '#8b8fa8' }}>{cTaxaLP > 0 ? `${fmt(cTaxaLP, 1)}%` : '—'}</td>
                      </tr>
                      {isExp && children.map(a => {
                        const aLeads = getLeads(a.actions || []);
                        const aCplRow = getCpl(a);
                        return (
                          <tr key={a.adset_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.2)' }}>
                            <td style={{ padding: '10px 6px 10px 16px' }} />
                            <td style={{ padding: '10px 8px 10px 32px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[a.status] || '#6b7280' }} />
                                <span style={{ fontSize: '12px', color: '#8b8fa8' }}>{a.adset_name}</span>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{fmtMoney(Number(a.spend || 0))}</td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{fmt(a.reach)}</td>
                            <td style={{ ...tdStyle, fontSize: '12px', color: aLeads > 0 ? '#22c55e' : '#8b8fa8' }}>{fmt(aLeads)}</td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{aCplRow > 0 ? fmtMoney(aCplRow) : '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '12px', paddingRight: '16px' }}>{fmt(Number(a.ctr || 0), 2)}%</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </TableSection>
        )}

        {/* ── SEÇÃO: Insights Automáticos ── */}
        {sections.includes('insights') && campaigns.length > 0 && (() => {
          const totalCampSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
          const campsSorted = [...campaigns].sort((a, b) => getCpl(a) - getCpl(b));
          const bestCpl = campsSorted.find(c => getLeads(c.actions||[]) > 0);
          const worstCpl = [...campsSorted].reverse().find(c => getLeads(c.actions||[]) > 0);
          const highFreq = campaigns.filter(c => {
            const impr = Number(c.impressions || 0);
            const reach = Number(c.reach || 0);
            return reach > 0 && impr / reach >= 4;
          });
          const totalImpr = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
          const totalAlcance2 = campaigns.reduce((s, c) => s + Number(c.reach || 0), 0);
          const avgFreqAll = totalAlcance2 > 0 ? totalImpr / totalAlcance2 : 0;

          const insights2 = [];
          if (bestCpl) insights2.push({ type: 'success', text: `✨ Melhor campanha: "${bestCpl.campaign_name.slice(0,36)}" com CPL ${fmtMoney(getCpl(bestCpl))}` });
          if (highFreq.length > 0) insights2.push({ type: 'warning', text: `⚠️ ${highFreq.length} campanha(s) com frequência ≥ 4x — risco de saturação de público` });
          if (avgFreqAll > 0 && avgFreqAll < 2) insights2.push({ type: 'info', text: `💡 Frequência média baixa (${fmt(avgFreqAll, 1)}x) — potencial para aumentar o alcance` });
          if (bestCpl && worstCpl && bestCpl !== worstCpl) insights2.push({ type: 'info', text: `📉 CPL varia de ${fmtMoney(getCpl(bestCpl))} (melhor) a ${fmtMoney(getCpl(worstCpl))} (pior) — otimize o orçamento` });
          const taxaLPAll = clicks > 0 ? (leads / clicks) * 100 : 0;
          if (taxaLPAll < 5 && leads > 0) insights2.push({ type: 'warning', text: `📉 Taxa de conversão da LP está baixa (${fmt(taxaLPAll, 1)}%) — revise a landing page` });
          if (taxaLPAll >= 10) insights2.push({ type: 'success', text: `✅ Taxa de conversão excelente (${fmt(taxaLPAll, 1)}%) — continue escalando` });

          if (insights2.length === 0) return null;

          const typeStyle = { success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', dot: '#22c55e' }, warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', dot: '#f59e0b' }, info: { bg: 'rgba(200,162,58,0.07)', border: 'rgba(200,162,58,0.2)', dot: PRIMARY } };

          return (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Zap size={15} color={PRIMARY} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Insights Automáticos</span>
                  <span style={{ fontSize: '10px', color: '#8b8fa8', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '20px', marginLeft: 'auto' }}>Gerado pela IA local</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {insights2.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: typeStyle[ins.type].bg, border: `1px solid ${typeStyle[ins.type].border}` }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: typeStyle[ins.type].dot, marginTop: '5px', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── SEÇÃO 4: Conjuntos de Anúncios ── */}
        {sections.includes('adsets') && loading && <SkeletonTableSection icon={<Layers size={16} />} title="Conjuntos de Anúncios" cols={7} />}
        {sections.includes('adsets') && !loading && adsets.length > 0 && (
          <TableSection icon={<Layers size={16} />} title="Conjuntos de Anúncios" count={sortedAdsets.length}
            footer={<Paginator page={adsetPage} total={sortedAdsets.length} onChange={setAdsetPage} />}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ width: '36px', padding: '10px 6px 10px 16px' }} />
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}><ThSort label="Conjunto" col="adset_name" sort={sortAdset} setSort={setSortAdset} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortAdset} setSort={setSortAdset} /></th>
                  <th style={thStyle}><ThSort label="Alcance" col="reach" sort={sortAdset} setSort={setSortAdset} /></th>
                  <th style={thStyle}><ThSort label="Leads" col="leads" sort={sortAdset} setSort={setSortAdset} /></th>
                  <th style={thStyle}><ThSort label="CPL" col="cpl" sort={sortAdset} setSort={setSortAdset} /></th>
                  <th style={{ ...thStyle, paddingRight: '16px' }}><ThSort label="CTR" col="ctr" sort={sortAdset} setSort={setSortAdset} /></th>
                </tr>
              </thead>
              <tbody>
                {pagedAdsets.map(a => {
                  const aLeads = getLeads(a.actions || []);
                  const aCpl = getCpl(a);
                  const isExp = expandedAdsets.has(a.adset_id);
                  const children = sortedAds.filter(ad => ad.adset_id === a.adset_id);
                  return (
                    <React.Fragment key={a.adset_id}>
                      <tr
                        onClick={() => children.length > 0 && setExpandedAdsets(s => { const n = new Set(s); isExp ? n.delete(a.adset_id) : n.add(a.adset_id); return n; })}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: children.length > 0 ? 'pointer' : 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '12px 6px 12px 16px', color: '#8b8fa8' }}>
                          {children.length > 0 && (isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[a.status] || '#6b7280' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{a.adset_name}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{fmtMoney(Number(a.spend || 0))}</td>
                        <td style={tdStyle}>{fmt(a.reach)}</td>
                        <td style={{ ...tdStyle, color: aLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: aLeads > 0 ? '600' : '400' }}>{fmt(aLeads)}</td>
                        <td style={tdStyle}>{aCpl > 0 ? fmtMoney(aCpl) : '—'}</td>
                        <td style={{ ...tdStyle, paddingRight: '16px' }}>{fmt(Number(a.ctr || 0), 2)}%</td>
                      </tr>
                      {isExp && children.map(ad => {
                        const adLeads = getLeads(ad.actions || []);
                        const adCpl = getCpl(ad);
                        const thumb = thumbnails[ad.ad_id];
                        return (
                          <tr key={ad.ad_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.2)' }}>
                            <td style={{ padding: '10px 6px 10px 16px' }}>
                              {thumb ? (
                                <img src={thumb} alt="" onClick={(e) => { e.stopPropagation(); setCreativeModal({ name: ad.ad_name, url: thumb }); }} style={{ width: '32px', height: '32px', borderRadius: '5px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <ImageIcon size={12} color="#6b7280" />
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px 10px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[ad.status] || '#6b7280' }} />
                                <span style={{ fontSize: '12px', color: '#8b8fa8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '300px' }}>{ad.ad_name}</span>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{fmtMoney(Number(ad.spend || 0))}</td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{fmt(ad.reach)}</td>
                            <td style={{ ...tdStyle, fontSize: '12px', color: adLeads > 0 ? '#22c55e' : '#8b8fa8' }}>{fmt(adLeads)}</td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{adCpl > 0 ? fmtMoney(adCpl) : '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '12px', paddingRight: '16px' }}>{fmt(Number(ad.ctr || 0), 2)}%</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </TableSection>
        )}

        {/* ── SEÇÃO 5: Anúncios / Criativos ── */}
        {sections.includes('ads') && loading && <SkeletonTableSection icon={<ImageIcon size={16} />} title="Anúncios & Criativos" cols={8} />}
        {sections.includes('ads') && !loading && ads.length > 0 && (
          <TableSection icon={<ImageIcon size={16} />} title="Anúncios & Criativos" count={sortedAds.length}
            footer={<Paginator page={adPage} total={sortedAds.length} onChange={setAdPage} />}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ width: '58px', padding: '10px 8px 10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prévia</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}><ThSort label="Nome" col="ad_name" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}><ThSort label="Conjunto pai" col="adset_name" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Impressões" col="impressions" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Cliques" col="clicks" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="CTR" col="ctr" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={{ ...thStyle, paddingRight: '16px' }}><ThSort label="Leads" col="leads" sort={sortAd} setSort={setSortAd} /></th>
                </tr>
              </thead>
              <tbody>
                {pagedAds.map(a => {
                  const aLeads = getLeads(a.actions || []);
                  const thumb = thumbnails[a.ad_id];
                  return (
                    <tr key={a.ad_id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '10px 8px 10px 16px' }}>
                        {thumb ? (
                          <img src={thumb} alt="" onClick={() => setCreativeModal({ name: a.ad_name, url: thumb })} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={14} color="#6b7280" />
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[a.status] || '#6b7280' }} />
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ad_name}</div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontSize: '12px', color: '#8b8fa8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.adset_name || '—'}</div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#fff' }}>{fmtMoney(Number(a.spend || 0))}</td>
                      <td style={tdStyle}>{fmt(a.impressions)}</td>
                      <td style={tdStyle}>{fmt(a.clicks)}</td>
                      <td style={tdStyle}>{fmt(Number(a.ctr || 0), 2)}%</td>
                      <td style={{ ...tdStyle, paddingRight: '16px', color: aLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: aLeads > 0 ? '600' : '400' }}>{fmt(aLeads)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableSection>
        )}

        <div style={{ textAlign: 'center', padding: '32px 0 16px', color: '#4b4f6a', fontSize: '12px' }}>
          Dashboard gerado pela agência · Dados via Meta Ads API
        </div>
      </div>

      {/* ── Creative Modal ── */}
      {creativeModal && (
        <div onClick={() => setCreativeModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a24', borderRadius: '16px', overflow: 'hidden', maxWidth: '600px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '12px' }}>{creativeModal.name}</span>
              <button onClick={() => setCreativeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8', display: 'flex', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>
            <img src={creativeModal.url} alt={creativeModal.name} style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

export default ClientDashboard;
