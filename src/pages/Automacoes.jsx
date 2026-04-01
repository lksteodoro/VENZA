import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, MessageSquare, Settings, Users,
  ToggleLeft, ToggleRight, Check, Save, Loader2,
  CheckCircle, AlertCircle, TrendingDown,
  Search, Building2, Pencil, X,
} from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import {
  loadEvoConfig, saveEvoConfig,
  loadEvoGroups, saveEvoGroups,
  loadAutomations, saveAutomations,
  fireAutomation,
} from '../utils/automations';
import {
  checkAccountBalance, loadBalanceAlerts, saveBalanceAlerts, fmtCurrency,
  loadAutoCheckConfig, saveAutoCheckConfig, isBusinessHoursBRT,
} from '../utils/metaBalance';
import { runAutoBalanceCheck } from '../utils/balanceAutoCheck';

// ─── Gatilhos disponíveis ──────────────────────────────────────────────────────
export const TRIGGER_GROUPS = [
  {
    label: 'Portal do Cliente',
    triggers: [
      { id: 'demanda_recebida', label: 'Demanda recebida pelo portal',           emoji: '📨', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
      { id: 'demanda_interna',  label: 'Nova demanda criada pela agência',        emoji: '📝', color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
      { id: 'demanda_aprovada', label: 'Demanda aprovada (portal ou interna)',    emoji: '🎯', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    ],
  },
  {
    label: 'Meta Ads',
    triggers: [
      { id: 'saldo_baixo', label: 'Saldo baixo na conta (pré-pago)', emoji: '⚠️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    ],
  },
  {
    label: 'Colunas do Kanban',
    triggers: [
      { id: 'pendente',         label: 'Pendente',                      emoji: '📋', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
      { id: 'andamento',        label: 'Em Andamento',                  emoji: '🚀', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
      { id: 'aprovacao',        label: 'Aguardando Aprovação',          emoji: '👀', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
      { id: 'concluido',        label: 'Concluído',                     emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    ],
  },
];

const TRIGGERS = TRIGGER_GROUPS.flatMap(g => g.triggers);

// ─── Mensagem padrão ──────────────────────────────────────────────────────────
const DEFAULT_MSG = {
  demanda_recebida: '📨 *Nova demanda recebida!*\n\nOlá, {{cliente}}! Recebemos sua solicitação *"{{card}}"* e ela já está na nossa fila de análise.\n\nEm breve retornaremos com uma resposta. 😊\n_{{data}} às {{hora}}_',
  demanda_interna:  '📝 *Nova demanda registrada!*\n\nOlá, {{cliente}}! A demanda *"{{card}}"*{{projeto}} foi registrada pela nossa equipe e está na fila de execução.\n\nQualquer dúvida, é só chamar. 😊\n_{{data}} às {{hora}}_',
  demanda_aprovada: '🎯 *Sua demanda foi aprovada!*\n\nOlá, {{cliente}}! Ótima notícia: a solicitação *"{{card}}"* foi aprovada e já entrou em execução.\n\nAcompanhe as atualizações por aqui. 🚀\n_{{data}} às {{hora}}_',
  pendente:         '📋 *{{card}}* voltou para a fila.\n\nOlá, {{cliente}}! O card foi recolocado como pendente.\n_{{data}} às {{hora}}_',
  andamento:        '🚀 *{{card}}* entrou em execução!\n\nOlá, {{cliente}}! Já estamos trabalhando nisso. Acompanhe as atualizações por aqui.\n_{{data}} às {{hora}}_',
  aprovacao:        '👀 *{{card}}* aguarda sua aprovação.\n\nOlá, {{cliente}}! Precisamos da sua avaliação para prosseguir. Por favor, revise e nos dê um retorno.\n_{{data}} às {{hora}}_',
  concluido:        '✅ *{{card}}* foi concluído!\n\nOlá, {{cliente}}! A entrega está pronta. Qualquer dúvida estamos à disposição. 🎉\n_{{data}} às {{hora}}_',
  saldo_baixo:      '⚠️ *Alerta de Saldo Baixo — Meta Ads*\n\nOlá, {{cliente}}! O saldo da conta de anúncios está em *{{saldo}}*, abaixo do limite configurado de {{limite}}.\n\nPor favor, recarregue o saldo para evitar a pausa das campanhas. 🔴\n_{{data}} às {{hora}}_',
};

// ─── Variáveis disponíveis ────────────────────────────────────────────────────
const VARS = ['{{cliente}}', '{{card}}', '{{projeto}}', '{{coluna}}', '{{saldo}}', '{{limite}}', '{{data}}', '{{hora}}'];

// ─── helpers ──────────────────────────────────────────────────────────────────
const getClients = () => {
  try { return JSON.parse(localStorage.getItem('venza_clients')) || CLIENTS; } catch { return CLIENTS; }
};

// ─── Garante um slot de alerta de saldo por cliente ──────────────────────────
const seedBalanceAlerts = (list) => {
  const clients = getClients();
  const result  = [...list];
  clients.forEach(c => {
    if (!result.find(a => a.clientId === c.id)) {
      result.push({ clientId: c.id, enabled: false, threshold: 50, lastBalance: null, lastCheck: null, lastError: null, isPrepay: null, currency: 'BRL' });
    }
  });
  return result;
};

// ─── Garante um slot por trigger na lista de automações ───────────────────────
const seedAutomations = (list) => {
  const result = [...list];
  TRIGGERS.forEach(t => {
    if (!result.find(r => r.trigger === t.id)) {
      result.push({ id: `default-${t.id}`, name: t.label, trigger: t.id, message: DEFAULT_MSG[t.id], ativa: false, disparos: 0 });
    }
  });
  return result;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Automacoes = () => {
  const [tab, setTab] = useState('regras'); // 'regras' | 'grupos' | 'api'

  // ── Evolution API config ──
  const [evoConfig, setEvoConfig] = useState(() => loadEvoConfig() || { baseUrl: '', instance: '', apiKey: '' });
  const [evoSaved, setEvoSaved]   = useState(false);
  const [testing,  setTesting]    = useState(false);
  const [testResult, setTestResult] = useState(null);

  // ── Disparo de teste ──
  const [testNumber,  setTestNumber]  = useState('');
  const [testMsg,     setTestMsg]     = useState('✅ Mensagem de teste — Venza CRM funcionando!');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendResult,  setSendResult]  = useState(null);

  // ── Groups ──
  const [groups, setGroups]       = useState(() => loadEvoGroups());
  const [groupSaved, setGroupSaved] = useState(null);
  const clients = getClients();

  // ── Rules ──
  const [automations, setAutomations] = useState(() => seedAutomations(loadAutomations()));
  // draft messages per trigger (keyed by trigger id)

  const [drafts, setDrafts] = useState(() => {
    const seeded = seedAutomations(loadAutomations());
    return Object.fromEntries(seeded.map(r => [r.trigger, r.message]));
  });
  const [savedTrigger, setSavedTrigger] = useState(null);
  const textRefs = useRef({});

  // persist
  useEffect(() => { saveEvoGroups(groups); }, [groups]);
  useEffect(() => { saveAutomations(automations); }, [automations]);

  // ── API handlers ──
  const saveConfig = () => {
    saveEvoConfig(evoConfig);
    setEvoSaved(true);
    setTimeout(() => setEvoSaved(false), 2500);
  };

  const sendTestMessage = async () => {
    setSendingTest(true); setSendResult(null);
    try {
      const { baseUrl, instance, apiKey } = evoConfig;
      const raw    = testNumber.trim();
      const number = raw.includes('@') ? raw : raw.replace(/\D/g, '');
      const url    = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instance}`;

      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body:    JSON.stringify({ number, text: testMsg }),
      });

      const ct   = res.headers.get('content-type') || '';
      const isJson = ct.includes('application/json');
      const body = isJson ? await res.json() : await res.text();

      if (res.ok && isJson && !body.error) {
        setSendResult({ ok: true, msg: 'Mensagem enviada com sucesso! ✅' });
      } else {
        const errMsg = isJson
          ? (body?.message || body?.error?.message || body?.error || body?.response?.message || JSON.stringify(body))
          : String(body).slice(0, 300);
        setSendResult({
          ok:  false,
          msg: `HTTP ${res.status} — ${errMsg}`,
          raw: isJson ? JSON.stringify(body, null, 2) : String(body).slice(0, 600),
        });
      }
    } catch (e) {
      setSendResult({ ok: false, msg: e.message });
    } finally { setSendingTest(false); }
  };

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { baseUrl, instance, apiKey } = evoConfig;
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/instance/fetchInstances`, {
        headers: { apikey: apiKey }
      });
      const data = await res.json();
      if (res.ok) setTestResult({ ok: true, msg: `Conectado! ${Array.isArray(data) ? data.length : ''} instância(s) encontrada(s).` });
      else setTestResult({ ok: false, msg: data?.message || 'Erro na conexão' });
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    } finally { setTesting(false); }
  };

  // ── Group handlers ──
  const updateGroup = (clientId, field, value) => {
    setGroups(prev => ({ ...prev, [clientId]: { ...(prev[clientId] || {}), [field]: value } }));
  };
  const saveGroup = (clientId) => {
    saveEvoGroups(groups);
    setGroupSaved(clientId);
    setTimeout(() => setGroupSaved(null), 2000);
  };

  // ── Rule handlers ──
  const toggleRule = (triggerId) => setAutomations(prev => prev.map(r => r.trigger === triggerId ? { ...r, ativa: !r.ativa } : r));

  const saveRuleMessage = (triggerId) => {
    setAutomations(prev => prev.map(r => r.trigger === triggerId ? { ...r, message: drafts[triggerId] } : r));
    setSavedTrigger(triggerId);
    setTimeout(() => setSavedTrigger(null), 2000);
  };

  const insertVar = (triggerId, v) => {
    const el = textRefs.current[triggerId];
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const next = (drafts[triggerId] || '').slice(0, s) + v + (drafts[triggerId] || '').slice(e);
    setDrafts(d => ({ ...d, [triggerId]: next }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length); });
  };

  const resetToDefault = (triggerId) => setDrafts(d => ({ ...d, [triggerId]: DEFAULT_MSG[triggerId] }));

  // ── Balance alerts ──
  const [balanceAlerts, setBalanceAlerts] = useState(() => seedBalanceAlerts(loadBalanceAlerts()));
  const [checkingId,    setCheckingId]    = useState(null); // clientId being checked
  const [checkingAll,   setCheckingAll]   = useState(false);

  // ── Account config panel (inside Saldo tab) ──
  const [cfgOpenId,          setCfgOpenId]          = useState(null);
  const [cfgBms,             setCfgBms]             = useState([]);
  const [cfgLoadingBms,      setCfgLoadingBms]      = useState(false);
  const [cfgBmId,            setCfgBmId]            = useState('');
  const [cfgBmSearch,        setCfgBmSearch]        = useState('');
  const [cfgAccounts,        setCfgAccounts]        = useState([]);
  const [cfgLoadingAccounts, setCfgLoadingAccounts] = useState(false);
  const [cfgAccountId,       setCfgAccountId]       = useState('');
  const [cfgAccSearch,       setCfgAccSearch]       = useState('');
  const [cfgManual,          setCfgManual]          = useState(false);
  const [cfgManualId,        setCfgManualId]        = useState('');
  const [cfgConfigSaved,     setCfgConfigSaved]     = useState(null);
  const [cfgBmOpen,          setCfgBmOpen]          = useState(false);
  const [cfgAccOpen,         setCfgAccOpen]         = useState(false);

  useEffect(() => { saveBalanceAlerts(balanceAlerts); }, [balanceAlerts]);

  // ── Auto-check config ──
  const [autoCheck, setAutoCheck] = useState(() => loadAutoCheckConfig());
  const [runningAuto, setRunningAuto] = useState(false);

  const saveAutoCheck = (patch) => {
    const updated = { ...autoCheck, ...patch };
    setAutoCheck(updated);
    saveAutoCheckConfig(updated);
  };

  const triggerManualAutoCheck = async () => {
    setRunningAuto(true);
    await runAutoBalanceCheck();
    setAutoCheck(loadAutoCheckConfig()); // reload lastRun
    setRunningAuto(false);
  };

  // Refresh balanceAlerts when background auto-check fires
  useEffect(() => {
    const handler = () => setBalanceAlerts(seedBalanceAlerts(loadBalanceAlerts()));
    window.addEventListener('venza:balance-checked', handler);
    return () => window.removeEventListener('venza:balance-checked', handler);
  }, []);

  // Load ad accounts when a BM is selected in the config panel
  useEffect(() => {
    if (!cfgBmId || cfgManual) { setCfgAccounts([]); return; }
    const token = localStorage.getItem('meta_access_token');
    if (!token) return;
    setCfgLoadingAccounts(true);
    fetch(`https://graph.facebook.com/v25.0/${cfgBmId}/owned_ad_accounts?fields=id,name,account_status&limit=50&access_token=${token}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setCfgAccounts((data.data || []).filter(a => a.account_status === 1)); })
      .catch(() => {})
      .finally(() => setCfgLoadingAccounts(false));
  }, [cfgBmId, cfgManual]);

  const updateAlert = (clientId, patch) =>
    setBalanceAlerts(prev => prev.map(a => a.clientId === clientId ? { ...a, ...patch } : a));

  const runCheck = async (clientId) => {
    const alert = balanceAlerts.find(a => a.clientId === clientId);
    if (!alert) return;
    const token = localStorage.getItem('meta_access_token');
    const saved = (() => { try { return JSON.parse(localStorage.getItem(`meta_defaults_${clientId}`)); } catch { return null; } })();
    if (!token || !saved?.adAccountId) {
      updateAlert(clientId, { lastError: 'Token ou conta Meta não configurados.', lastCheck: new Date().toLocaleString('pt-BR') });
      return;
    }
    setCheckingId(clientId);
    try {
      const result = await checkAccountBalance(saved.adAccountId, token);
      const now    = new Date().toLocaleString('pt-BR');
      // forceMonitor permite monitorar mesmo com tipo não reconhecido
      if (!result.isPrepay && !alert.forceMonitor) {
        updateAlert(clientId, { lastBalance: null, isPrepay: false, fundingType: result.fundingType, lastCheck: now, lastError: null });
        return;
      }
      updateAlert(clientId, { lastBalance: result.balance, currency: result.currency, isPrepay: result.isPrepay || alert.forceMonitor, fundingType: result.fundingType, lastCheck: now, lastError: null });
      if (alert.enabled && result.balance < (alert.threshold || 0)) {
        const saldoFmt  = fmtCurrency(result.balance,          result.currency);
        const limiteFmt = fmtCurrency(alert.threshold || 0,   result.currency);
        await fireAutomation('saldo_baixo', {
          clientId,
          cardName:   saved.adAccountId,
          columnName: 'Meta Ads',
          saldo:      saldoFmt,
          limite:     limiteFmt,
        });
      }
    } catch (e) {
      updateAlert(clientId, { lastError: e.message, lastCheck: new Date().toLocaleString('pt-BR') });
    } finally {
      setCheckingId(null);
    }
  };

  const runCheckAll = async () => {
    setCheckingAll(true);
    for (const a of balanceAlerts.filter(a => a.enabled)) {
      await runCheck(a.clientId);
    }
    setCheckingAll(false);
  };

  const openAccountConfig = async (clientId) => {
    if (cfgOpenId === clientId) { setCfgOpenId(null); return; }
    const saved = (() => { try { return JSON.parse(localStorage.getItem(`meta_defaults_${clientId}`)); } catch { return null; } })();
    const hasBm = !!saved?.bmId;
    setCfgBmId(saved?.bmId || '');
    setCfgAccountId(saved?.adAccountId || '');
    setCfgManual(!hasBm && !!saved?.adAccountId);
    setCfgManualId(saved?.adAccountId || ''); // always pre-fill
    setCfgBmSearch('');
    setCfgAccSearch('');
    setCfgBmOpen(false);
    setCfgAccOpen(false);
    setCfgOpenId(clientId);
    const token = localStorage.getItem('meta_access_token');
    if (cfgBms.length === 0 && token) {
      setCfgLoadingBms(true);
      try {
        const res = await fetch(`https://graph.facebook.com/v25.0/me/businesses?fields=id,name&limit=50&access_token=${token}`);
        const data = await res.json();
        if (!data.error) setCfgBms(data.data || []);
      } catch {} finally { setCfgLoadingBms(false); }
    }
  };

  const saveAccountConfig = (clientId) => {
    const raw = cfgManual ? cfgManualId.trim() : cfgAccountId;
    if (!raw) return;
    const adAccountId = raw.startsWith('act_') ? raw : `act_${raw}`;
    localStorage.setItem(`meta_defaults_${clientId}`, JSON.stringify({ bmId: cfgManual ? null : (cfgBmId || null), adAccountId }));
    setBalanceAlerts(prev => [...prev]); // force re-render to reflect new account
    setCfgConfigSaved(clientId);
    setTimeout(() => { setCfgConfigSaved(null); setCfgOpenId(null); }, 1500);
  };

  const totalDisparos = automations.reduce((s, a) => s + (a.disparos || 0), 0);

  const tabBtn = (id, icon, label) => (
    <button onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', background: tab === id ? 'rgba(139,92,246,0.15)' : 'transparent', color: tab === id ? 'var(--primary)' : 'var(--text-muted)' }}>
      {icon} {label}
    </button>
  );

  return (
    <div className="page-content">
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ paddingTop: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Automações</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Envio automático de mensagens via WhatsApp (Evolution API) ao mover cards.</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
          {tabBtn('regras',  <Zap size={15} />,           'Regras')}
          {tabBtn('grupos',  <Users size={15} />,          'Grupos por Cliente')}
          {tabBtn('saldo',   <TrendingDown size={15} />,   'Saldo Meta')}
          {tabBtn('api',     <Settings size={15} />,       'Config. API')}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Regras Ativas',      value: automations.filter(a => a.ativa).length, color: '#10b981' },
          { label: 'Total de Regras',    value: automations.length,                       color: 'var(--primary)' },
          { label: 'Disparos Totais',    value: totalDisparos,                            color: '#f59e0b' },
          { label: 'Clientes Configurados', value: Object.values(groups).filter(g => g?.jid || g?.numero).length, color: '#38bdf8' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── ABA: REGRAS ── */}
      {tab === 'regras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Configure uma mensagem para cada evento. Ative ou desative individualmente.
          </p>

          {TRIGGER_GROUPS.map(group => (
            <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Section label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{group.label}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
              </div>

              {group.triggers.map(t => {
                const rule    = automations.find(r => r.trigger === t.id);
                const active  = rule?.ativa ?? false;
                const isSaved = savedTrigger === t.id;
                const draft   = drafts[t.id] ?? DEFAULT_MSG[t.id];
                const dirty   = draft !== (rule?.message ?? DEFAULT_MSG[t.id]);
                const isPortal = t.id.startsWith('demanda_');

                return (
                  <div key={t.id} style={{ background: 'var(--bg-surface)', border: `1.5px solid ${active ? t.color + '55' : 'var(--border-light)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s', opacity: active ? 1 : 0.7 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid var(--border-light)', background: active ? t.bg : 'transparent' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {t.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{t.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {isPortal ? 'Evento do Portal' : 'Coluna do Kanban'} → enviar WhatsApp &nbsp;·&nbsp; {rule?.disparos || 0} disparos
                        </div>
                      </div>
                      <button onClick={() => toggleRule(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${active ? t.color + '66' : 'var(--border-main)'}`, background: active ? t.bg : 'var(--bg-app)', color: active ? t.color : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        {active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {active ? 'Ativa' : 'Inativa'}
                      </button>
                    </div>

                    {/* Message editor */}
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {VARS.map(v => (
                          <button key={v} onClick={() => insertVar(t.id, v)}
                            style={{ padding: '3px 9px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: `1px solid ${t.color}55`, background: t.bg, color: t.color, cursor: 'pointer', fontFamily: 'monospace' }}>
                            {v}
                          </button>
                        ))}
                        <button onClick={() => resetToDefault(t.id)}
                          style={{ marginLeft: 'auto', padding: '3px 9px', fontSize: '11px', fontWeight: '600', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          Restaurar padrão
                        </button>
                      </div>

                      <textarea
                        ref={el => { textRefs.current[t.id] = el; }}
                        value={draft}
                        onChange={e => setDrafts(d => ({ ...d, [t.id]: e.target.value }))}
                        rows={4}
                        style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: 'var(--bg-app)', border: `1px solid ${active ? t.color + '44' : 'var(--border-main)'}`, borderRadius: '8px', color: 'var(--text-main)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace', lineHeight: '1.6' }}
                        onFocus={e => e.target.style.borderColor = t.color}
                        onBlur={e => e.target.style.borderColor = active ? t.color + '44' : 'var(--border-main)'}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>*negrito* _itálico_ — formatação WhatsApp</span>
                        <button onClick={() => saveRuleMessage(t.id)} disabled={!dirty && !isSaved}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: 'none', background: isSaved ? '#10b981' : dirty ? t.color : 'var(--border-main)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty || isSaved ? 1 : 0.5, transition: 'all 0.2s' }}>
                          {isSaved ? <><Check size={13} /> Salvo!</> : <><Save size={13} /> Salvar</>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── ABA: GRUPOS ── */}
      {tab === 'grupos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
          <div style={{ padding: '12px 16px', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-main)' }}>Destino por cliente:</strong> escolha entre enviar para um <strong>grupo</strong> (JID <code style={{ background: 'var(--bg-app)', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>@g.us</code>) ou diretamente para o <strong>número</strong> do cliente. Para obter o JID do grupo use <code style={{ background: 'var(--bg-app)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>GET /group/fetchAllGroups/{'{instance}'}</code> na Evolution API.
          </div>
          {clients.map(client => {
            const g       = groups[client.id] || {};
            const tipo    = g.tipo || 'grupo';
            const isSaved = groupSaved === client.id;
            const isOk    = tipo === 'grupo' ? !!g.jid : !!g.numero;
            return (
              <div key={client.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${isOk ? 'rgba(16,185,129,0.25)' : 'var(--border-light)'}`, borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <img src={client.avatarUrl} alt={client.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '10px' }}>{client.name}</p>

                  {/* Tipo toggle */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {[{ v: 'grupo', label: '👥 Grupo' }, { v: 'numero', label: '📱 Número' }].map(opt => (
                      <button key={opt.v} onClick={() => updateGroup(client.id, 'tipo', opt.v)}
                        style={{ padding: '5px 12px', borderRadius: '7px', border: `1.5px solid ${tipo === opt.v ? 'var(--primary)' : 'var(--border-light)'}`, background: tipo === opt.v ? 'rgba(139,92,246,0.1)' : 'transparent', color: tipo === opt.v ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Campo conforme tipo */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {tipo === 'grupo' ? (
                      <input
                        value={g.jid || ''}
                        onChange={e => updateGroup(client.id, 'jid', e.target.value)}
                        placeholder="Ex: 5511999999999-1234567890@g.us"
                        style={{ flex: 1, padding: '9px 12px', fontSize: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontFamily: 'monospace' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                      />
                    ) : (
                      <input
                        value={g.numero || ''}
                        onChange={e => updateGroup(client.id, 'numero', e.target.value)}
                        placeholder="Ex: 5511999999999  (com DDI, só números)"
                        style={{ flex: 1, padding: '9px 12px', fontSize: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontFamily: 'monospace' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                      />
                    )}
                    <button onClick={() => saveGroup(client.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: 'none', background: isSaved ? '#10b981' : 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                      {isSaved ? <><Check size={13} /> Salvo!</> : <><Save size={13} /> Salvar</>}
                    </button>
                  </div>

                  {isOk && (
                    <p style={{ fontSize: '11px', color: '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={10} /> {tipo === 'grupo' ? `Grupo: ${g.jid}` : `Número: ${g.numero}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA: SALDO META ── */}
      {tab === 'saldo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' }}>

          {/* Info */}
          <div style={{ padding: '13px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <strong style={{ color: '#ef4444' }}>⚠️ Apenas contas pré-pagas (saldo).</strong> Contas com cartão de crédito não possuem saldo monitorável e serão sinalizadas como "não monitorável". A conta Meta e o token devem estar configurados em <strong style={{ color: 'var(--text-main)' }}>Configurações → Contas por Cliente</strong>.
          </div>

          {/* ── Verificação Automática ── */}
          {(() => {
            const lastRun  = autoCheck.lastRun ? new Date(autoCheck.lastRun) : null;
            const nextRun  = lastRun ? new Date(lastRun.getTime() + (autoCheck.intervalHours || 6) * 3600000) : null;
            const fmtDt    = (d) => d?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) ?? '—';
            const inBH     = isBusinessHoursBRT();
            return (
              <div style={{ background: 'var(--bg-surface)', border: `1.5px solid ${autoCheck.enabled ? 'rgba(139,92,246,0.3)' : 'var(--border-light)'}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: autoCheck.enabled ? 'rgba(139,92,246,0.04)' : 'transparent' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '3px' }}>
                      Verificação Automática
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Consulta o saldo a cada <strong>{autoCheck.intervalHours || 6}h</strong>.
                      Alertas WhatsApp apenas em horário comercial <strong>09:00–18:00 BRT</strong>.
                      {' '}<span style={{ color: inBH ? '#10b981' : '#f59e0b' }}>{inBH ? '● Dentro do horário agora' : '● Fora do horário agora'}</span>
                    </div>
                  </div>

                  {/* Last / Next run */}
                  {lastRun && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.7', flexShrink: 0 }}>
                      <div>Última execução: <strong style={{ color: 'var(--text-main)' }}>{fmtDt(lastRun)}</strong></div>
                      <div>Próxima execução: <strong style={{ color: 'var(--text-main)' }}>{fmtDt(nextRun)}</strong></div>
                    </div>
                  )}

                  {/* Run now */}
                  <button onClick={triggerManualAutoCheck} disabled={runningAuto}
                    title="Executa a verificação agora (independente do intervalo)"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: runningAuto ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {runningAuto ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <TrendingDown size={13} />}
                    {runningAuto ? 'Verificando...' : 'Executar Agora'}
                  </button>

                  {/* Toggle */}
                  <button onClick={() => saveAutoCheck({ enabled: !autoCheck.enabled })}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: '8px', border: `1px solid ${autoCheck.enabled ? 'rgba(139,92,246,0.4)' : 'var(--border-main)'}`, background: autoCheck.enabled ? 'rgba(139,92,246,0.1)' : 'var(--bg-app)', color: autoCheck.enabled ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}>
                    {autoCheck.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {autoCheck.enabled ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Verificar Todos */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={runCheckAll} disabled={checkingAll || balanceAlerts.every(a => !a.enabled)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', opacity: (checkingAll || balanceAlerts.every(a => !a.enabled)) ? 0.5 : 1 }}>
              {checkingAll
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                : <><TrendingDown size={14} /> Verificar Todos Ativos</>}
            </button>
          </div>

          {/* Per-client cards */}
          {balanceAlerts.map(alert => {
            const client   = clients.find(c => c.id === alert.clientId);
            const saved    = (() => { try { return JSON.parse(localStorage.getItem(`meta_defaults_${alert.clientId}`)); } catch { return null; } })();
            const hasAcct  = !!saved?.adAccountId;
            const isChecking  = checkingId === alert.clientId;
            const notPrepay   = alert.lastCheck && alert.isPrepay === false && !alert.forceMonitor;
            const unknownType = alert.lastCheck && alert.fundingType === null;

            return (
              <div key={alert.clientId} style={{ background: 'var(--bg-surface)', border: `1.5px solid ${alert.enabled && !notPrepay ? 'rgba(239,68,68,0.3)' : 'var(--border-light)'}`, borderRadius: '14px', overflow: 'hidden', opacity: notPrepay ? 0.6 : 1 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid var(--border-light)', background: alert.enabled && !notPrepay ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                  {client?.avatarUrl
                    ? <img src={client.avatarUrl} alt={client.name} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                    : <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-app)', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{client?.name || alert.clientId}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {hasAcct
                        ? <span style={{ fontFamily: 'monospace' }}>{saved.adAccountId}</span>
                        : <span style={{ color: '#f59e0b' }}>⚠ Conta Meta não configurada</span>}
                      {notPrepay && <span style={{ color: '#ef4444', fontWeight: '700' }}>· type {alert.fundingType} — não reconhecido como pré-pago</span>}
                      {unknownType && <span style={{ color: '#f59e0b', fontWeight: '700' }}>· tipo de financiamento não retornado pela API</span>}
                      {(alert.isPrepay === true || alert.forceMonitor) && <span style={{ color: '#10b981', fontWeight: '700' }}>· Pré-pago ✓{alert.forceMonitor && alert.fundingType !== 2 && alert.fundingType !== 4 ? ' (forçado)' : ''}</span>}
                    </div>
                  </div>
                  {/* Configurar conta */}
                  <button onClick={() => openAccountConfig(alert.clientId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '8px', border: `1px solid ${cfgOpenId === alert.clientId ? 'var(--primary)' : 'var(--border-main)'}`, background: cfgOpenId === alert.clientId ? 'rgba(139,92,246,0.08)' : 'var(--bg-app)', color: cfgOpenId === alert.clientId ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                    {cfgOpenId === alert.clientId ? <X size={13} /> : <Pencil size={13} />}
                    {cfgOpenId === alert.clientId ? 'Fechar' : (hasAcct ? 'Editar' : 'Configurar')}
                  </button>
                  {/* Forçar monitoramento quando tipo não reconhecido */}
                  {(notPrepay || unknownType) && (
                    <button onClick={() => updateAlert(alert.clientId, { forceMonitor: !alert.forceMonitor, isPrepay: !alert.forceMonitor || null })}
                      title="A conta não foi detectada como pré-pago. Clique para forçar o monitoramento mesmo assim."
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${alert.forceMonitor ? '#f59e0b66' : 'var(--border-main)'}`, background: alert.forceMonitor ? 'rgba(245,158,11,0.1)' : 'var(--bg-app)', color: alert.forceMonitor ? '#f59e0b' : 'var(--text-muted)', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {alert.forceMonitor ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      Forçar
                    </button>
                  )}
                  {/* Toggle ativo/inativo */}
                  <button onClick={() => updateAlert(alert.clientId, { enabled: !alert.enabled })}
                    disabled={!hasAcct || (notPrepay && !alert.forceMonitor)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${alert.enabled ? 'rgba(239,68,68,0.4)' : 'var(--border-main)'}`, background: alert.enabled ? 'rgba(239,68,68,0.08)' : 'var(--bg-app)', color: alert.enabled ? '#ef4444' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: (!hasAcct || (notPrepay && !alert.forceMonitor)) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', opacity: (!hasAcct || (notPrepay && !alert.forceMonitor)) ? 0.4 : 1 }}>
                    {alert.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {alert.enabled ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* ── Account config panel ── */}
                {cfgOpenId === alert.clientId && (() => {
                  const selBm  = cfgBms.find(b => b.id === cfgBmId);
                  const selAcc = cfgAccounts.find(a => a.id === cfgAccountId);
                  const canSave = cfgManual ? !!cfgManualId.trim() : !!cfgAccountId;
                  return (
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', background: 'rgba(139,92,246,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                      {/* Mode toggle */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setCfgManual(false); setCfgBmId(''); setCfgAccountId(''); setCfgBmOpen(false); setCfgAccOpen(false); }}
                          style={{ flex: 1, padding: '7px', borderRadius: '7px', border: `1.5px solid ${!cfgManual ? 'var(--primary)' : 'var(--border-light)'}`, background: !cfgManual ? 'rgba(139,92,246,0.1)' : 'var(--bg-app)', color: !cfgManual ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <Building2 size={12} /> Via BM
                        </button>
                        <button onClick={() => { setCfgManual(true); setCfgBmId(''); setCfgAccounts([]); setCfgBmOpen(false); setCfgAccOpen(false); }}
                          style={{ flex: 1, padding: '7px', borderRadius: '7px', border: `1.5px solid ${cfgManual ? 'var(--primary)' : 'var(--border-light)'}`, background: cfgManual ? 'rgba(139,92,246,0.1)' : 'var(--bg-app)', color: cfgManual ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <Pencil size={12} /> Sem BM / Manual
                        </button>
                      </div>

                      {!cfgManual ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* BM: filtro + select nativo */}
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Business Manager</label>
                            {cfgLoadingBms ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Carregando BMs...</div>
                            ) : cfgBms.length === 0 ? (
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{localStorage.getItem('meta_access_token') ? 'Nenhuma BM encontrada.' : '⚠ Configure o token Meta em Configurações.'}</p>
                            ) : (
                              <>
                                <div style={{ position: 'relative', marginBottom: '5px' }}>
                                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                  <input value={cfgBmSearch} onChange={e => setCfgBmSearch(e.target.value)} placeholder="Filtrar BM..." style={{ width: '100%', padding: '7px 8px 7px 26px', fontSize: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-main)'} />
                                </div>
                                <select value={cfgBmId} onChange={e => { setCfgBmId(e.target.value); setCfgAccountId(''); setCfgAccSearch(''); }} style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: 'var(--bg-app)', border: `1px solid ${cfgBmId ? 'var(--primary)' : 'var(--border-main)'}`, borderRadius: '6px', color: cfgBmId ? 'var(--text-main)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}>
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
                              <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Conta de Anúncio</label>
                              {cfgLoadingAccounts ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Carregando contas...</div>
                              ) : cfgAccounts.length === 0 ? (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Nenhuma conta ativa nesta BM.</p>
                              ) : (
                                <>
                                  <div style={{ position: 'relative', marginBottom: '5px' }}>
                                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input value={cfgAccSearch} onChange={e => setCfgAccSearch(e.target.value)} placeholder="Filtrar conta..." style={{ width: '100%', padding: '7px 8px 7px 26px', fontSize: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = 'var(--border-main)'} />
                                  </div>
                                  <select value={cfgAccountId} onChange={e => setCfgAccountId(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: 'var(--bg-app)', border: `1px solid ${cfgAccountId ? '#10b981' : 'var(--border-main)'}`, borderRadius: '6px', color: cfgAccountId ? 'var(--text-main)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}>
                                    <option value="">— Selecionar Conta —</option>
                                    {cfgAccounts.filter(a => !cfgAccSearch || a.name?.toLowerCase().includes(cfgAccSearch.toLowerCase()) || a.id.includes(cfgAccSearch)).map(acc => (
                                      <option key={acc.id} value={acc.id}>{acc.name || acc.id} ({acc.id})</option>
                                    ))}
                                  </select>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Manual mode */
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>ID da Conta de Anúncio</label>
                          <input
                            value={cfgManualId}
                            onChange={e => setCfgManualId(e.target.value)}
                            placeholder="Ex: act_123456789  ou apenas  123456789"
                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '7px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                          />
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', margin: '4px 0 0' }}>
                            O prefixo <code style={{ background: 'var(--bg-app)', padding: '1px 4px', borderRadius: '3px' }}>act_</code> é adicionado automaticamente.
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => saveAccountConfig(alert.clientId)} disabled={!canSave}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '7px', border: 'none', background: cfgConfigSaved === alert.clientId ? '#10b981' : 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: !canSave ? 'not-allowed' : 'pointer', opacity: !canSave ? 0.5 : 1, transition: 'background 0.2s' }}>
                          {cfgConfigSaved === alert.clientId ? <><Check size={13} /> Salvo!</> : <><Save size={13} /> Salvar Conta</>}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Config row */}
                <div style={{ padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {/* Threshold */}
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Notificar se saldo abaixo de ({alert.currency || 'BRL'})
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                      <span style={{ padding: '9px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>R$</span>
                      <input
                        type="number" min="0" step="10"
                        value={alert.threshold ?? 50}
                        onChange={e => updateAlert(alert.clientId, { threshold: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100px', padding: '9px 12px', fontSize: '13px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '0 8px 8px 0', color: 'var(--text-main)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Last check info */}
                  <div style={{ flex: 2, minWidth: '200px' }}>
                    {alert.lastCheck && (
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-app)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {alert.lastError
                          ? <span style={{ color: '#ef4444' }}>❌ {alert.lastError}</span>
                          : alert.isPrepay === false
                            ? <span>⚠️ Tipo de financiamento <code style={{ background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>{alert.fundingType ?? 'null'}</code> — não reconhecido como pré-pago. Use "Forçar" se tiver certeza que é saldo.</span>
                            : <span>
                                Saldo atual: <strong style={{ color: alert.lastBalance < (alert.threshold || 0) ? '#ef4444' : '#10b981', fontSize: '13px' }}>
                                  {fmtCurrency(alert.lastBalance ?? 0, alert.currency)}
                                </strong>
                                {alert.lastBalance < (alert.threshold || 0) && <span style={{ color: '#ef4444', marginLeft: '6px' }}>⚠ Abaixo do limite!</span>}
                              </span>}
                        <div style={{ fontSize: '10px', marginTop: '3px' }}>Última verificação: {alert.lastCheck}</div>
                      </div>
                    )}
                  </div>

                  {/* Check button */}
                  <button onClick={() => runCheck(alert.clientId)} disabled={isChecking || !hasAcct}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '700', cursor: (!hasAcct || isChecking) ? 'not-allowed' : 'pointer', opacity: !hasAcct ? 0.4 : 1, whiteSpace: 'nowrap' }}>
                    {isChecking
                      ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                      : <><TrendingDown size={13} /> Verificar</>}
                  </button>
                </div>
              </div>
            );
          })}

          <div style={{ padding: '13px 16px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--primary)' }}>Mensagem de alerta:</strong> Configure o texto da notificação na aba <strong style={{ color: 'var(--text-main)' }}>Regras</strong>, gatilho <em>Saldo baixo na conta (pré-pago)</em>. Use <code style={{ background: 'var(--bg-app)', padding: '1px 5px', borderRadius: '4px' }}>{'{{saldo}}'}</code> e <code style={{ background: 'var(--bg-app)', padding: '1px 5px', borderRadius: '4px' }}>{'{{limite}}'}</code> na mensagem.
          </div>
        </div>
      )}

      {/* ── ABA: CONFIG API ── */}
      {tab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Evolution API</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Conexão para envio de mensagens WhatsApp</p>
              </div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'baseUrl',  label: 'URL da API',          placeholder: 'https://evolution.seudominio.com.br' },
                { key: 'instance', label: 'Nome da Instância',   placeholder: 'minha-instancia' },
                { key: 'apiKey',   label: 'API Key (Global Key)', placeholder: 'sua-api-key-aqui', password: true },
              ].map(({ key, label, placeholder, password }) => (
                <div key={key}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                  <input
                    type={password ? 'password' : 'text'}
                    value={evoConfig[key] || ''}
                    onChange={e => setEvoConfig(c => ({ ...c, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '11px 14px', fontSize: '13px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontFamily: password ? 'monospace' : 'inherit' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={testConnection} disabled={testing || !evoConfig.baseUrl || !evoConfig.apiKey}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', cursor: (!evoConfig.baseUrl || !evoConfig.apiKey) ? 'not-allowed' : 'pointer', opacity: (!evoConfig.baseUrl || !evoConfig.apiKey) ? 0.5 : 1 }}>
                  {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                  Testar Conexão
                </button>
                <button onClick={saveConfig}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {evoSaved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar Config</>}
                </button>
              </div>

              {testResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '8px', background: testResult.ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                  {testResult.ok ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                  <span style={{ fontSize: '13px', color: testResult.ok ? '#10b981' : '#ef4444', fontWeight: '600' }}>{testResult.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Disparo de Teste ── */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <Zap size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Disparo de Teste</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Envie uma mensagem real para confirmar que tudo está funcionando</p>
              </div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Número */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Número ou JID do grupo
                </label>
                <input
                  value={testNumber}
                  onChange={e => { setTestNumber(e.target.value); setSendResult(null); }}
                  placeholder="Ex: 5511999999999  ou  120363xxxxxx@g.us"
                  style={{ width: '100%', padding: '11px 14px', fontSize: '13px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = '#f59e0b'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  Número pessoal: apenas dígitos com DDI (ex: <code style={{ background: 'var(--bg-app)', padding: '1px 5px', borderRadius: '4px' }}>5511999999999</code>).
                  Grupo: cole o JID completo com <code style={{ background: 'var(--bg-app)', padding: '1px 5px', borderRadius: '4px' }}>@g.us</code>.
                </p>
              </div>

              {/* Mensagem */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Mensagem de teste
                </label>
                <textarea
                  value={testMsg}
                  onChange={e => { setTestMsg(e.target.value); setSendResult(null); }}
                  rows={3}
                  style={{ width: '100%', padding: '11px 14px', fontSize: '13px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5' }}
                  onFocus={e => e.target.style.borderColor = '#f59e0b'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                />
              </div>

              <button
                onClick={sendTestMessage}
                disabled={sendingTest || !testNumber.trim() || !testMsg.trim() || !evoConfig.baseUrl || !evoConfig.instance || !evoConfig.apiKey}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '9px', border: 'none', background: '#f59e0b', color: 'white', fontSize: '13px', fontWeight: '700', cursor: (!testNumber.trim() || !evoConfig.baseUrl) ? 'not-allowed' : 'pointer', opacity: (!testNumber.trim() || !evoConfig.baseUrl || !evoConfig.instance || !evoConfig.apiKey) ? 0.5 : 1, transition: 'opacity 0.2s' }}
              >
                {sendingTest
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                  : <><Zap size={15} /> Enviar Mensagem de Teste</>}
              </button>

              {sendResult && (
                <div style={{ borderRadius: '8px', background: sendResult.ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${sendResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
                    {sendResult.ok
                      ? <CheckCircle size={16} color="#10b981" />
                      : <AlertCircle size={16} color="#ef4444" />}
                    <span style={{ fontSize: '13px', fontWeight: '600', color: sendResult.ok ? '#10b981' : '#ef4444', flex: 1 }}>{sendResult.msg}</span>
                  </div>
                  {sendResult.raw && (
                    <pre style={{ margin: 0, padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-app)', borderTop: '1px solid rgba(239,68,68,0.15)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '180px', overflowY: 'auto', fontFamily: 'monospace' }}>{sendResult.raw}</pre>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '14px 18px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--primary)' }}>Como funciona:</strong> Ao mover um card no Kanban para a coluna configurada na regra, o sistema envia automaticamente a mensagem para o grupo WhatsApp vinculado ao cliente daquele card. Configure as regras na aba <strong style={{ color: 'var(--text-main)' }}>Regras</strong> e os grupos na aba <strong style={{ color: 'var(--text-main)' }}>Grupos por Cliente</strong>.
          </div>
        </div>
      )}

    </div>
  );
};

export default Automacoes;
