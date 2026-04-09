import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2, Target, TrendingUp, DollarSign, Upload, RefreshCw,
  AlertCircle, Loader2, Check, ChevronDown, X, Settings, ArrowRight,
  Users, ShoppingCart, Zap, FileText, Trash2,
} from 'lucide-react';

import { CLIENTS } from '../data/mockData';
import {
  loadConversions, saveConversions, loadProjectGoals, saveProjectGoals,
  getDateRange, getCohortLeads, calcPacing, calcFunnel, calcFinancials,
  buildUTMMatrix, ACTION_META, parseCSV, upsertFromCSV,
} from '../utils/demandos';

const META_API   = 'https://graph.facebook.com/v25.0';
const PRIMARY    = '#C8A23A';
const BG_CARD    = '#1c1c24';
const BG_APP     = '#121216';
const BORDER     = '#2d2d3a';

const GREEN  = '#4ade80';
const RED    = '#f87171';
const YELLOW = '#facc15';

const fmt     = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtMoney = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct  = (n) => `${fmt(n, 1)}%`;

const DATE_RANGES = [
  { value: 'today',      label: 'Hoje' },
  { value: 'last_7d',    label: 'Últimos 7 dias' },
  { value: 'last_14d',   label: 'Últimos 14 dias' },
  { value: 'last_30d',   label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
];

const META_PRESET = { today: 'today', last_7d: 'last_7d', last_14d: 'last_14d', last_30d: 'last_30d', this_month: 'this_month', last_month: 'last_month' };

const loadClients = () => {
  try {
    const s = JSON.parse(localStorage.getItem('venza_clients') || 'null');
    if (!s) return CLIENTS;
    return CLIENTS.map(c => { const f = s.find(x => x.id === c.id); return f ? { ...c, ...f } : c; });
  } catch { return CLIENTS; }
};

const loadProjects = () => {
  try { return JSON.parse(localStorage.getItem('venza_projects') || '[]'); } catch { return []; }
};

const card = (extra = {}) => ({ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', ...extra });

// ── Pacing Bar ────────────────────────────────────────────────────────────────
const PacingBar = ({ label, current, goal, pct, formatValue }) => {
  const over = pct >= 100;
  const barColor = over ? GREEN : pct >= 70 ? PRIMARY : pct >= 40 ? YELLOW : RED;
  return (
    <div style={{ ...card(), padding: '20px 22px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>{label}</span>
        <span style={{ fontSize: '11px', color: '#8b8fa8', whiteSpace: 'nowrap', flexShrink: 0 }}>meta: {formatValue(goal)}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '10px', wordBreak: 'break-word' }}>{formatValue(current)}</div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '3px', background: barColor, width: `${Math.min(pct, 100)}%`, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ fontSize: '11px', color: barColor, fontWeight: '700', marginTop: '6px' }}>
        {goal > 0 ? `${fmt(pct, 0)}% da meta` : 'Meta não definida'}
      </div>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = '#fff', icon }) => (
  <div style={{ ...card(), padding: '18px 20px', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>{label}</span>
    </div>
    <div style={{ fontSize: '20px', fontWeight: '800', color, wordBreak: 'break-word' }}>{value}</div>
    {sub && <div style={{ fontSize: '11px', color: '#8b8fa8', marginTop: '4px' }}>{sub}</div>}
  </div>
);

// ── Funnel ────────────────────────────────────────────────────────────────────
const Funnel = ({ funnel }) => {
  const steps = [
    { label: 'Cliques', value: fmt(funnel.clicks), icon: <Users size={14} />, color: '#38bdf8' },
    { label: 'Conv. LP', value: fmtPct(funnel.convLP), arrow: true, icon: <TrendingUp size={14} />, color: PRIMARY },
    { label: 'Leads', value: fmt(funnel.leads), icon: <Target size={14} />, color: '#a78bfa' },
    { label: 'Conv. Venda', value: fmtPct(funnel.convSale), arrow: true, icon: <TrendingUp size={14} />, color: PRIMARY },
    { label: 'Vendas', value: fmt(funnel.sales), icon: <ShoppingCart size={14} />, color: GREEN },
  ];
  return (
    <div style={{ ...card(), padding: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Zap size={14} color={PRIMARY} /> Funil de Performance
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            {s.arrow ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px' }}>
                <ArrowRight size={16} color={PRIMARY} />
                <span style={{ fontSize: '11px', color: PRIMARY, fontWeight: '700', marginTop: '2px' }}>{s.value}</span>
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: '80px', background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '10px', padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ color: s.color, marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#8b8fa8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>{s.label}</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── UTM Matrix Table ──────────────────────────────────────────────────────────
const UTMMatrix = ({ rows, breakEven }) => {
  if (!rows.length) return (
    <div style={{ ...card(), padding: '32px', textAlign: 'center', color: '#8b8fa8', fontSize: '13px' }}>
      Nenhum anúncio encontrado para cruzamento de dados.<br />
      <span style={{ fontSize: '11px', marginTop: '6px', display: 'block' }}>Configure utm_content = ad_id nos seus anúncios para ativar o cruzamento.</span>
    </div>
  );

  return (
    <div style={{ ...card(), overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart2 size={15} color={PRIMARY} />
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Matriz UTM · Recomendações de Escala</span>
        {breakEven > 0 && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#8b8fa8' }}>CPA Break-even: {fmtMoney(breakEven)}</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Anúncio / UTMs', 'Gasto', 'Leads', 'Vendas', 'Receita', 'CPA Atual', 'Lucro', 'Ação'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Anúncio / UTMs' ? 'left' : 'right', fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', background: 'none' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const action = row.action;
              const am = action ? ACTION_META[action] : null;
              return (
                <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ad_name || row.ad_id}</div>
                    <div style={{ fontSize: '10px', color: '#8b8fa8', marginTop: '2px', fontFamily: 'monospace' }}>{row.ad_id}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#fff', fontWeight: '600' }}>{fmtMoney(row.spend)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: row.leads > 0 ? '#a78bfa' : '#8b8fa8' }}>{fmt(row.leads)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: row.sales > 0 ? GREEN : '#8b8fa8' }}>{fmt(row.sales)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: row.revenue > 0 ? GREEN : '#8b8fa8' }}>{fmtMoney(row.revenue)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: action === 'pause' ? RED : action === 'scale' ? GREEN : '#fff' }}>
                    {row.cpa > 0 ? fmtMoney(row.cpa) : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: row.profit >= 0 ? GREEN : RED, fontWeight: '600' }}>
                    {row.leads > 0 || row.sales > 0 ? fmtMoney(row.profit) : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {am ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: am.bg, color: am.color, border: `1px solid ${am.border}`, whiteSpace: 'nowrap' }}>
                        {am.icon} {am.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>— sem dados</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── CSV Importer ──────────────────────────────────────────────────────────────
const CSV_FIELDS = [
  { key: 'lead_id',      label: 'ID do Lead *',      required: true },
  { key: 'data_captura', label: 'Data de Captura *',  required: true },
  { key: 'data_venda',   label: 'Data de Venda',      required: false },
  { key: 'valor_venda',  label: 'Valor da Venda (R$)', required: false },
  { key: 'utm_source',   label: 'UTM Source',          required: false },
  { key: 'utm_medium',   label: 'UTM Medium',          required: false },
  { key: 'utm_campaign', label: 'UTM Campaign',        required: false },
  { key: 'utm_content',  label: 'UTM Content (ad_id)', required: false },
];

const CSVImporter = ({ projectId, onDone }) => {
  const [step, setStep] = useState('drop'); // drop | map | preview | done
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers: h, rows: r } = parseCSV(e.target.result);
      setHeaders(h);
      setRows(r);
      // Auto-mapping: tenta casar header com field key/label
      const auto = {};
      CSV_FIELDS.forEach(f => {
        const match = h.find(col =>
          col.toLowerCase().replace(/[\s_-]/g, '') === f.key.toLowerCase().replace(/[\s_-]/g, '') ||
          col.toLowerCase().includes(f.key.toLowerCase().replace('_', ''))
        );
        if (match) auto[f.key] = match;
      });
      setMapping(auto);
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = () => {
    const existing = loadConversions();
    const { result: updated, inserted, updated: upd } = upsertFromCSV(existing, projectId, rows, mapping);
    saveConversions(updated);
    setResult({ inserted, updated: upd, total: rows.length });
    setStep('done');
    onDone(updated);
  };

  const canImport = CSV_FIELDS.filter(f => f.required).every(f => mapping[f.key]);

  if (step === 'done') return (
    <div style={{ ...card(), padding: '28px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Check size={22} color={GREEN} />
      </div>
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Importação concluída!</div>
      <div style={{ fontSize: '13px', color: '#8b8fa8', marginBottom: '16px' }}>
        {result.inserted} inserido{result.inserted !== 1 ? 's' : ''} · {result.updated} atualizado{result.updated !== 1 ? 's' : ''} de {result.total} linha{result.total !== 1 ? 's' : ''}
      </div>
      <button onClick={() => { setStep('drop'); setHeaders([]); setRows([]); setMapping({}); setResult(null); }}
        style={{ padding: '8px 20px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: 'transparent', color: '#8b8fa8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
        Importar outro arquivo
      </button>
    </div>
  );

  if (step === 'map') return (
    <div style={{ ...card(), padding: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Mapeamento de Colunas</div>
      <div style={{ fontSize: '11px', color: '#8b8fa8', marginBottom: '16px' }}>{rows.length} linhas detectadas · {headers.length} colunas no CSV</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {CSV_FIELDS.map(field => (
          <div key={field.key}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: field.required ? PRIMARY : '#8b8fa8', display: 'block', marginBottom: '4px' }}>
              {field.label}
            </label>
            <select value={mapping[field.key] || ''} onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value || undefined }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', background: BG_APP, border: `1px solid ${mapping[field.key] ? PRIMARY + '60' : BORDER}`, color: mapping[field.key] ? '#fff' : '#8b8fa8', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
              <option value=''>— ignorar —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={() => { setStep('drop'); setHeaders([]); setRows([]); }}
          style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: 'transparent', color: '#8b8fa8', fontSize: '13px', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleImport} disabled={!canImport}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canImport ? PRIMARY : 'rgba(255,255,255,0.08)', color: canImport ? '#000' : '#8b8fa8', fontSize: '13px', fontWeight: '700', cursor: canImport ? 'pointer' : 'default' }}>
          Importar {rows.length} linhas
        </button>
      </div>
    </div>
  );

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => fileRef.current?.click()}
      style={{ ...card(), padding: '40px', textAlign: 'center', cursor: 'pointer', border: `2px dashed ${dragging ? PRIMARY : BORDER}`, background: dragging ? `${PRIMARY}08` : BG_CARD, transition: 'all 0.2s' }}
    >
      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      <Upload size={28} color={dragging ? PRIMARY : '#8b8fa8'} style={{ margin: '0 auto 12px', display: 'block' }} />
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Arraste o CSV aqui ou clique para selecionar</div>
      <div style={{ fontSize: '12px', color: '#8b8fa8' }}>Suporte a UTF-8 · Separador vírgula · Qualquer número de colunas</div>
    </div>
  );
};

// ── Goals Form ────────────────────────────────────────────────────────────────
const GoalsForm = ({ projectId, onSave }) => {
  const [goals, setGoals] = useState(() => loadProjectGoals(projectId));
  const [saved, setSaved] = useState(false);

  useEffect(() => { setGoals(loadProjectGoals(projectId)); }, [projectId]);

  const set = (k, v) => setGoals(g => ({ ...g, [k]: Number(v) || 0 }));

  const handle = () => {
    saveProjectGoals(projectId, goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave(goals);
  };

  const field = (label, key, prefix = '', placeholder = '0') => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: '600', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#8b8fa8' }}>{prefix}</span>}
        <input type="number" min="0" step="any" value={goals[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: `9px 12px 9px ${prefix ? '30px' : '12px'}`, borderRadius: '8px', background: BG_APP, border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
      </div>
    </div>
  );

  return (
    <div style={{ ...card(), padding: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Settings size={14} color={PRIMARY} /> Metas do Projeto
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {field('Orçamento Mensal', 'budget_monthly', 'R$')}
        {field('Meta de Leads/dia', 'lead_goal_daily', '', '0')}
        {field('Meta de Leads/semana', 'lead_goal_weekly', '', '0')}
        {field('CPA Break-even (teto)', 'cpa_break_even', 'R$')}
      </div>
      <button onClick={handle}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: saved ? 'rgba(74,222,128,0.15)' : PRIMARY, color: saved ? GREEN : '#000', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
        {saved ? <><Check size={13} /> Salvo!</> : 'Salvar Metas'}
      </button>
    </div>
  );
};

// ── Conversions Table ─────────────────────────────────────────────────────────
const ConversionsTable = ({ conversions, projectId, onDelete }) => {
  const rows = conversions.filter(c => c.project_id === projectId);

  if (!rows.length) return (
    <div style={{ ...card(), padding: '32px', textAlign: 'center', color: '#8b8fa8', fontSize: '13px' }}>
      Nenhuma conversão importada para este projeto.
    </div>
  );

  return (
    <div style={{ ...card(), overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={14} color={PRIMARY} />
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Conversões</span>
        <span style={{ fontSize: '11px', color: '#8b8fa8', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1px 8px', marginLeft: 'auto' }}>{rows.length}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Lead ID', 'Captura', 'Venda', 'Valor', 'utm_content', 'utm_campaign', ''].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: h === '' ? 'center' : 'left', fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.4px', background: 'none', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map(c => (
              <tr key={c.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '9px 12px', fontSize: '12px', color: '#fff', fontFamily: 'monospace', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lead_id}</td>
                <td style={{ padding: '9px 12px', fontSize: '12px', color: '#8b8fa8' }}>{c.data_captura || '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: '12px', color: c.data_venda ? GREEN : '#6b7280' }}>{c.data_venda || '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: '12px', color: c.valor_venda > 0 ? GREEN : '#6b7280', fontWeight: '600' }}>{c.valor_venda > 0 ? fmtMoney(c.valor_venda) : '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: '11px', color: '#8b8fa8', fontFamily: 'monospace', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.utm_content || '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: '11px', color: '#8b8fa8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.utm_campaign || '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef444460', padding: '3px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ef444460'}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 200 && <div style={{ padding: '10px 12px', fontSize: '11px', color: '#8b8fa8', textAlign: 'center' }}>Exibindo 200 de {rows.length} registros</div>}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Tracking = () => {
  const [clients]  = useState(loadClients);
  const [projects] = useState(loadProjects);
  const [selectedClientId, setSelectedClientId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlClient = params.get('client');
    const found = urlClient && loadClients().find(c => c.id === urlClient);
    return found ? found.id : (loadClients()[0]?.id || '');
  });
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tab, setTab]           = useState('dashboard'); // dashboard | conversoes | metas
  const [dateRange, setDateRange] = useState('last_30d');
  const [conversions, setConversions] = useState(loadConversions);
  const [goals, setGoals] = useState({});

  // Meta API state
  const [metaLoading, setMetaLoading]   = useState(false);
  const [metaError, setMetaError]       = useState(null);
  const [metaInsights, setMetaInsights] = useState(null); // account-level
  const [adInsights, setAdInsights]     = useState([]);   // ad-level

  const accessToken  = localStorage.getItem('meta_access_token') || '';

  // Filtrar projetos do cliente selecionado
  const clientProjects = projects.filter(p => p.clientId === selectedClientId);

  useEffect(() => {
    const first = clientProjects[0];
    setSelectedProjectId(first?.id || '');
  }, [selectedClientId, clientProjects]);

  useEffect(() => {
    if (selectedProjectId) setGoals(loadProjectGoals(selectedProjectId));
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const adAccountId = (() => {
    try { return JSON.parse(localStorage.getItem(`meta_defaults_${selectedClientId}`) || 'null')?.adAccountId || ''; } catch { return ''; }
  })();

  // ── Fetch Meta data ──
  const fetchMeta = useCallback(async () => {
    if (!adAccountId || !accessToken) return;
    setMetaLoading(true);
    setMetaError(null);
    const p = (extra) => new URLSearchParams({ access_token: accessToken, ...extra }).toString();
    const preset = META_PRESET[dateRange] || 'last_30d';
    try {
      const [insRes, adRes] = await Promise.all([
        fetch(`${META_API}/${adAccountId}/insights?${p({ fields: 'spend,clicks,impressions,reach', date_preset: preset })}`).then(r => r.json()),
        fetch(`${META_API}/${adAccountId}/insights?${p({ fields: 'ad_id,ad_name,spend,clicks,impressions', level: 'ad', date_preset: preset, limit: '500' })}`).then(r => r.json()),
      ]);
      if (insRes.error) throw new Error(insRes.error.message);
      setMetaInsights(insRes.data?.[0] || null);
      setAdInsights(adRes.data || []);
    } catch (e) {
      setMetaError(e.message);
    } finally {
      setMetaLoading(false);
    }
  }, [adAccountId, accessToken, dateRange]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  // ── Computed values ──
  const { start, end } = getDateRange(dateRange);
  const cohort = selectedProjectId ? getCohortLeads(conversions, selectedProjectId, start, end) : [];
  const spend  = Number(metaInsights?.spend || 0);
  const clicks = Number(metaInsights?.clicks || 0);

  const pacing     = selectedProjectId ? calcPacing(conversions, selectedProjectId, spend, goals) : null;
  const funnel     = calcFunnel(clicks, cohort.length, cohort);
  const financials = selectedProjectId ? calcFinancials(conversions, selectedProjectId, spend, start, end) : null;
  const utmMatrix  = buildUTMMatrix(adInsights, cohort, goals.cpa_break_even || 0);

  const handleDeleteConversion = (id) => {
    const updated = conversions.filter(c => c.id !== id);
    setConversions(updated);
    saveConversions(updated);
  };

  const TABS = [
    { key: 'dashboard',   label: 'Dashboard' },
    { key: 'conversoes',  label: 'Conversões' },
    { key: 'metas',       label: 'Metas & Config' },
  ];

  const noProject = !selectedProjectId;

  return (
    <div className="page-content" style={{ background: BG_APP }}>

      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>DemandOS · Tracking</h2>
          <p style={{ fontSize: '12px', color: '#8b8fa8', margin: '2px 0 0' }}>Performance por cohort · UTM Matrix · Pacing</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Client selector */}
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {/* Project selector */}
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
            disabled={clientProjects.length === 0}
            style={{ padding: '7px 12px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}`, color: clientProjects.length ? '#fff' : '#6b7280', fontSize: '13px', outline: 'none', cursor: clientProjects.length ? 'pointer' : 'default' }}>
            {clientProjects.length === 0
              ? <option value=''>Sem projetos</option>
              : clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
          {/* Period */}
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button onClick={fetchMeta} disabled={metaLoading || !adAccountId}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', cursor: metaLoading || !adAccountId ? 'default' : 'pointer', fontWeight: '600' }}>
            <RefreshCw size={13} style={{ animation: metaLoading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Warnings ── */}
      {!accessToken && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '12px', color: '#f87171', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={14} /> Token Meta não configurado — vá em Configurações para conectar a API.
        </div>
      )}
      {!adAccountId && accessToken && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', fontSize: '12px', color: YELLOW, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={14} /> Conta de anúncios não vinculada a este cliente — configure em Configurações &gt; Contas por Cliente.
        </div>
      )}
      {metaError && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '12px', color: '#f87171', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={14} /> {metaError}
        </div>
      )}
      {noProject && (
        <div style={{ padding: '12px 16px', background: `${PRIMARY}10`, border: `1px solid ${PRIMARY}30`, borderRadius: '10px', fontSize: '12px', color: PRIMARY, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={14} /> Crie projetos para este cliente em <strong>Clientes &amp; Projetos</strong> para começar o tracking.
        </div>
      )}

      {!noProject && (
        <>
          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: '4px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', background: tab === t.key ? PRIMARY : 'transparent', color: tab === t.key ? '#000' : '#8b8fa8' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ════════════════ TAB: DASHBOARD ════════════════ */}
          {tab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {metaLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8b8fa8', fontSize: '13px', padding: '8px 0' }}>
                  <Loader2 size={16} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} /> Buscando dados Meta Ads...
                </div>
              )}

              {/* Pacing */}
              {pacing && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Pacing</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                    <PacingBar label="Leads Hoje" current={pacing.leadsToday} goal={pacing.goalDaily} pct={pacing.pctDaily} formatValue={v => fmt(v)} />
                    <PacingBar label="Leads Semana" current={pacing.leadsWeek} goal={pacing.goalWeekly} pct={pacing.pctWeekly} formatValue={v => fmt(v)} />
                    <PacingBar label="Gasto Mensal" current={pacing.spendMonth} goal={pacing.goalMonthly} pct={pacing.pctMonthly} formatValue={v => fmtMoney(v)} />
                  </div>
                </div>
              )}

              {/* KPIs Financeiros */}
              {financials && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>KPIs Financeiros · Cohort por data de captura</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
                    <KpiCard label="Gasto" value={fmtMoney(financials.spend)} color={PRIMARY} icon={<DollarSign size={14} />} sub={`${fmt(clicks)} cliques`} />
                    <KpiCard label="Receita Rastreada" value={fmtMoney(financials.revenue)} color={GREEN} icon={<TrendingUp size={14} />} sub={`${fmt(financials.sales)} vendas`} />
                    <KpiCard label="Lucro Bruto" value={fmtMoney(financials.profit)} color={financials.profit >= 0 ? GREEN : RED} icon={<BarChart2 size={14} />} sub={financials.roas > 0 ? `ROAS ${fmt(financials.roas, 2)}x` : undefined} />
                    <KpiCard label="CPA Atual" value={financials.cpa > 0 ? fmtMoney(financials.cpa) : '—'} color={goals.cpa_break_even && financials.cpa > goals.cpa_break_even ? RED : financials.cpa > 0 ? GREEN : '#fff'} icon={<Target size={14} />} sub={goals.cpa_break_even > 0 ? `Teto: ${fmtMoney(goals.cpa_break_even)}` : undefined} />
                    <KpiCard label="Leads (cohort)" value={fmt(financials.leads)} color="#a78bfa" icon={<Users size={14} />} />
                    <KpiCard label="ROAS" value={financials.roas > 0 ? `${fmt(financials.roas, 2)}x` : '—'} color={financials.roas >= 1 ? GREEN : financials.roas > 0 ? RED : '#fff'} icon={<Zap size={14} />} />
                  </div>
                </div>
              )}

              {/* Funil */}
              <Funnel funnel={funnel} />

              {/* UTM Matrix */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Matriz UTM · Data Match Engine</div>
                <UTMMatrix rows={utmMatrix} breakEven={goals.cpa_break_even || 0} />
              </div>
            </div>
          )}

          {/* ════════════════ TAB: CONVERSOES ════════════════ */}
          {tab === 'conversoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Importar CSV</div>
                <CSVImporter projectId={selectedProjectId} onDone={(updated) => setConversions(updated)} />
              </div>
              <ConversionsTable conversions={conversions} projectId={selectedProjectId} onDelete={handleDeleteConversion} />
            </div>
          )}

          {/* ════════════════ TAB: METAS ════════════════ */}
          {tab === 'metas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GoalsForm projectId={selectedProjectId} onSave={(g) => setGoals(g)} />
              <div style={{ ...card(), padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>Projeto Selecionado</div>
                <div style={{ fontSize: '12px', color: '#8b8fa8' }}>
                  <div><strong style={{ color: '#fff' }}>Nome:</strong> {selectedProject?.name}</div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#fff' }}>Conta Meta:</strong> {adAccountId || <span style={{ color: '#6b7280' }}>Não vinculada</span>}</div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#fff' }}>Total de conversões:</strong> {conversions.filter(c => c.project_id === selectedProjectId).length}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Tracking;
