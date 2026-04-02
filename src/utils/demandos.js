// ── DemandOS · Data Engine ────────────────────────────────────────────────────
// Todas as funções são puras (sem side-effects) para facilitar testes e reuso.

export const CONVERSIONS_KEY  = 'venza_conversions';
export const GOALS_KEY        = 'venza_project_goals';

// ── Storage helpers ───────────────────────────────────────────────────────────
export const loadConversions = () => {
  try { return JSON.parse(localStorage.getItem(CONVERSIONS_KEY) || '[]'); } catch { return []; }
};

export const saveConversions = (list) => {
  localStorage.setItem(CONVERSIONS_KEY, JSON.stringify(list));
};

export const loadGoals = () => {
  try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}'); } catch { return {}; }
};

export const saveGoals = (map) => {
  localStorage.setItem(GOALS_KEY, JSON.stringify(map));
};

export const loadProjectGoals = (projectId) => {
  const all = loadGoals();
  return all[projectId] || { budget_monthly: 0, lead_goal_daily: 0, lead_goal_weekly: 0, cpa_break_even: 0 };
};

export const saveProjectGoals = (projectId, goals) => {
  const all = loadGoals();
  saveGoals({ ...all, [projectId]: goals });
};

// ── Date helpers ──────────────────────────────────────────────────────────────
export const todayISO = () => new Date().toISOString().split('T')[0];

export const getDateRange = (preset) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const offsetDay = (d, n) => {
    const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split('T')[0];
  };
  const startOfMonth = (d) => `${d.slice(0, 7)}-01`;
  const endOfMonth = (d) => {
    const [y, m] = d.split('-').map(Number);
    return new Date(y, m, 0).toISOString().split('T')[0];
  };

  switch (preset) {
    case 'today':       return { start: today, end: today };
    case 'last_7d':     return { start: offsetDay(today, -6), end: today };
    case 'last_14d':    return { start: offsetDay(today, -13), end: today };
    case 'last_30d':    return { start: offsetDay(today, -29), end: today };
    case 'this_month':  return { start: startOfMonth(today), end: today };
    case 'last_90d':    return { start: offsetDay(today, -89), end: today };
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const iso = d.toISOString().split('T')[0];
      return { start: startOfMonth(iso), end: endOfMonth(iso) };
    }
    default:            return { start: offsetDay(today, -29), end: today };
  }
};

const inRange = (isoDate, start, end) => {
  if (!isoDate) return false;
  const d = isoDate.slice(0, 10);
  return d >= start && d <= end;
};

// ── Cohort engine ─────────────────────────────────────────────────────────────
// Retorna leads cuja DATA_CAPTURA está no range, independente da data_venda.
export const getCohortLeads = (conversions, projectId, start, end) =>
  conversions.filter(c => c.project_id === projectId && inRange(c.data_captura, start, end));

// ── Pacing ────────────────────────────────────────────────────────────────────
export const calcPacing = (conversions, projectId, spendMonth, goals) => {
  const today = todayISO();
  const { start: weekStart } = getDateRange('last_7d');
  const { start: monthStart } = getDateRange('this_month');

  const projConversions = conversions.filter(c => c.project_id === projectId);

  const leadsToday  = projConversions.filter(c => c.data_captura?.slice(0, 10) === today).length;
  const leadsWeek   = projConversions.filter(c => inRange(c.data_captura, weekStart, today)).length;
  const leadsMonth  = projConversions.filter(c => inRange(c.data_captura, monthStart, today)).length;

  return {
    leadsToday,  goalDaily:   goals.lead_goal_daily   || 0,  pctDaily:   goals.lead_goal_daily   ? Math.min(leadsToday / goals.lead_goal_daily * 100, 100)   : 0,
    leadsWeek,   goalWeekly:  goals.lead_goal_weekly  || 0,  pctWeekly:  goals.lead_goal_weekly  ? Math.min(leadsWeek  / goals.lead_goal_weekly * 100, 100)  : 0,
    spendMonth,  goalMonthly: goals.budget_monthly    || 0,  pctMonthly: goals.budget_monthly    ? Math.min(spendMonth / goals.budget_monthly * 100, 100)    : 0,
    leadsMonth,
  };
};

// ── Funil ─────────────────────────────────────────────────────────────────────
export const calcFunnel = (clicks, leads, conversions) => {
  const sales   = conversions.filter(c => c.data_venda && c.valor_venda > 0).length;
  const convLP  = clicks > 0  ? (leads / clicks)  * 100 : 0;
  const convSale= leads  > 0  ? (sales / leads)   * 100 : 0;
  return { clicks, convLP, leads, convSale, sales };
};

// ── KPIs financeiros ──────────────────────────────────────────────────────────
export const calcFinancials = (conversions, projectId, spend, start, end) => {
  const cohort = getCohortLeads(conversions, projectId, start, end);
  const revenue = cohort.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
  const profit  = revenue - spend;
  const sales   = cohort.filter(c => c.data_venda && c.valor_venda > 0).length;
  const leads   = cohort.length;
  const cpa     = leads  > 0 ? spend   / leads  : 0;
  const roas    = spend  > 0 ? revenue / spend  : 0;
  return { revenue, profit, sales, leads, cpa, roas, spend };
};

// ── UTM Matrix (Data Match Engine) ───────────────────────────────────────────
// adInsights: [{ ad_id, ad_name, spend, clicks, impressions }]
// conversions: ja filtradas por cohort
export const buildUTMMatrix = (adInsights, cohortConversions, breakEven) => {
  return adInsights.map(ad => {
    const matched = cohortConversions.filter(c => {
      const content = (c.utm_content || '').toLowerCase();
      const id = (ad.ad_id || '').toLowerCase();
      return content === id || content.includes(id);
    });
    const sales   = matched.filter(c => c.data_venda && Number(c.valor_venda) > 0);
    const revenue = sales.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
    const leads   = matched.length;
    const spend   = Number(ad.spend || 0);
    const cpa     = leads > 0 ? spend / leads : 0;
    const profit  = revenue - spend;
    const action  = getAction(cpa, breakEven);
    return { ...ad, leads, sales: sales.length, revenue, profit, cpa, action };
  }).sort((a, b) => b.spend - a.spend);
};

export const getAction = (cpa, breakEven) => {
  if (!breakEven || breakEven <= 0 || cpa <= 0) return null;
  if (cpa < breakEven * 0.7) return 'scale';
  if (cpa <= breakEven)      return 'maintain';
  return 'pause';
};

export const ACTION_META = {
  scale:    { label: 'Escalar',  icon: '↑', bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.35)' },
  maintain: { label: 'Manter',   icon: '=', bg: 'rgba(250,204,21,0.12)', color: '#facc15', border: 'rgba(250,204,21,0.35)' },
  pause:    { label: 'Pausar',   icon: '⛔', bg: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'rgba(248,113,113,0.35)' },
};

// ── CSV Parser ────────────────────────────────────────────────────────────────
export const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = splitCSVLine(l);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
};

const splitCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; continue; }
    if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += line[i];
  }
  result.push(current.trim());
  return result;
};

// ── CSV Upsert ────────────────────────────────────────────────────────────────
// Aplica o mapeamento de colunas e faz upsert nos conversions existentes.
// mapping: { lead_id: 'col_name', data_captura: 'col_name', ... }
export const upsertFromCSV = (existing, projectId, rows, mapping) => {
  const parseDate = (v) => {
    if (!v) return null;
    // Aceita DD/MM/YYYY, YYYY-MM-DD, ou ISO
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return v.slice(0, 10);
    const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return null;
  };

  const parseNum = (v) => {
    if (!v) return null;
    const cleaned = v.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  const get = (row, field) => mapping[field] ? (row[mapping[field]] || '') : '';

  const result = [...existing];
  let inserted = 0, updated = 0;

  rows.forEach(row => {
    const leadId = get(row, 'lead_id');
    if (!leadId) return;

    const idx = result.findIndex(c => c.project_id === projectId && c.lead_id === leadId);
    const newData = {
      data_captura:  parseDate(get(row, 'data_captura')),
      data_venda:    parseDate(get(row, 'data_venda')),
      valor_venda:   parseNum(get(row, 'valor_venda')),
      utm_source:    get(row, 'utm_source')   || null,
      utm_medium:    get(row, 'utm_medium')   || null,
      utm_campaign:  get(row, 'utm_campaign') || null,
      utm_content:   get(row, 'utm_content')  || null,
    };

    if (idx >= 0) {
      // Upsert: preserva data_captura original se não vier no CSV
      result[idx] = {
        ...result[idx],
        ...newData,
        data_captura: newData.data_captura || result[idx].data_captura,
      };
      updated++;
    } else {
      result.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, project_id: projectId, lead_id: leadId, ...newData });
      inserted++;
    }
  });

  return { result, inserted, updated };
};
