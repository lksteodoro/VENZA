import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  RefreshCw, Lock, Eye, EyeOff, DollarSign, Users, TrendingUp,
  MousePointer, ChevronDown, ChevronRight, X, Loader2, AlertCircle,
  BarChart2, Image as ImageIcon, Layers
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
  <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{value}</div>
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

// ── Table Section Wrapper ─────────────────────────────────────────────────────
const TableSection = ({ icon, title, count, children }) => (
  <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: PRIMARY }}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{title}</span>
      {count != null && (
        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px 10px' }}>{count}</span>
      )}
    </div>
    <div style={{ overflowX: 'auto' }}>{children}</div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ClientDashboard = () => {
  const { token } = useParams();
  const [config, setConfig] = useState(null);
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
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState(new Set());
  const [creativeModal, setCreativeModal] = useState(null);
  const [sortCamp, setSortCamp] = useState({ key: 'spend', dir: 'desc' });
  const [sortAdset, setSortAdset] = useState({ key: 'spend', dir: 'desc' });
  const [sortAd, setSortAd] = useState({ key: 'spend', dir: 'desc' });

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
      const dailyRes = await fetch(`${META_API}/${adAccountId}/insights?${p({ fields: 'spend,reach,impressions,clicks', date_preset: dateRange, time_increment: '1' })}`);
      const dailyJson = await dailyRes.json();
      if (!dailyJson.error) {
        setDailyData((dailyJson.data || []).map(d => ({
          date: d.date_start,
          spend: Number(d.spend || 0),
          reach: Number(d.reach || 0),
          clicks: Number(d.clicks || 0),
        })));
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
  const spend = Number(insights?.spend || 0);
  const reach = Number(insights?.reach || 0);
  const impressions = Number(insights?.impressions || 0);
  const clicks = Number(insights?.clicks || 0);
  const ctr = Number(insights?.ctr || 0);
  const frequency = Number(insights?.frequency || 0);
  const leads = getLeads(insights?.actions || []);
  const cpl = insights ? getCpl(insights) : 0;

  const sections = config.allowedSections || ['insights', 'campaigns', 'adsets', 'ads'];
  const sortedCampaigns = sortedList(campaigns, sortCamp);
  const sortedAdsets = sortedList(adsets, sortAdset);
  const sortedAds = sortedList(ads, sortAd);

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
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: '#8b8fa8' }}>
                Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '12px', color: '#8b8fa8' }}>
            <Loader2 size={24} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Carregando dados da campanha...</span>
          </div>
        )}

        {/* ── SEÇÃO 1: KPIs ── */}
        {sections.includes('insights') && insights && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <KpiCard icon={<DollarSign size={16} />} label="Gasto Total" value={fmtMoney(spend)} color={PRIMARY} />
            <KpiCard icon={<Users size={16} />} label="Alcance" value={fmt(reach)} sub={`Frequência ${fmt(frequency, 1)}x`} color="#38bdf8" />
            <KpiCard icon={<Eye size={16} />} label="Impressões" value={fmt(impressions)} color="#a78bfa" />
            <KpiCard icon={<TrendingUp size={16} />} label="Leads" value={fmt(leads)} sub={leads > 0 ? `CPL: ${fmtMoney(cpl)}` : 'Sem conversões'} color="#22c55e" />
            <KpiCard icon={<MousePointer size={16} />} label="Cliques" value={fmt(clicks)} sub={`CTR: ${fmt(ctr, 2)}%`} color="#f59e0b" />
          </div>
        )}

        {/* ── SEÇÃO 2: Gráfico ── */}
        {sections.includes('insights') && dailyData.length > 1 && (
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <TrendingUp size={16} color={PRIMARY} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Gasto Diário</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8fa8' }} tickFormatter={fmtDate} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#8b8fa8' }} tickFormatter={v => `R$${v}`} width={55} />
                <Tooltip
                  contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  labelFormatter={fmtDate}
                  formatter={(v) => [fmtMoney(v), 'Gasto']}
                />
                <Area type="monotone" dataKey="spend" stroke={PRIMARY} strokeWidth={2} fill="url(#spendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── SEÇÃO 3: Campanhas ── */}
        {sections.includes('campaigns') && campaigns.length > 0 && (
          <TableSection icon={<BarChart2 size={16} />} title="Campanhas" count={campaigns.length}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ width: '36px', padding: '10px 6px 10px 16px' }} />
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}><ThSort label="Campanha" col="campaign_name" sort={sortCamp} setSort={setSortCamp} /></th>
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
                      <tr
                        onClick={() => children.length > 0 && setExpandedCampaigns(s => { const n = new Set(s); isExp ? n.delete(c.campaign_id) : n.add(c.campaign_id); return n; })}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: children.length > 0 ? 'pointer' : 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '12px 6px 12px 16px', color: '#8b8fa8' }}>
                          {children.length > 0 && (isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[c.status] || '#6b7280' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{c.campaign_name}</span>
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

        {/* ── SEÇÃO 4: Conjuntos de Anúncios ── */}
        {sections.includes('adsets') && adsets.length > 0 && (
          <TableSection icon={<Layers size={16} />} title="Conjuntos de Anúncios" count={adsets.length}>
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
                {sortedAdsets.map(a => {
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
        {sections.includes('ads') && ads.length > 0 && (
          <TableSection icon={<ImageIcon size={16} />} title="Anúncios & Criativos" count={ads.length}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ width: '58px', padding: '10px 8px 10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prévia</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}><ThSort label="Anúncio" col="ad_name" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Gasto" col="spend" sort={sortAd} setSort={setSortAd} /></th>
                  <th style={thStyle}><ThSort label="Impr." col="impressions" sort={sortAd} setSort={setSortAd} /></th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[a.status] || '#6b7280' }} />
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ad_name}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8b8fa8', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '12px' }}>{a.adset_name}</div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#fff' }}>{fmtMoney(Number(a.spend || 0))}</td>
                      <td style={tdStyle}>{fmt(a.impressions)}</td>
                      <td style={tdStyle}>{fmt(a.clicks)}</td>
                      <td style={tdStyle}>{fmt(Number(a.ctr || 0), 2)}%</td>
                      <td style={{ ...tdStyle, color: aLeads > 0 ? '#22c55e' : '#8b8fa8', fontWeight: aLeads > 0 ? '600' : '400' }}>{fmt(aLeads)}</td>
                      <td style={{ ...tdStyle, paddingRight: '16px' }}>{aCpl > 0 ? fmtMoney(aCpl) : '—'}</td>
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

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
};

export default ClientDashboard;
