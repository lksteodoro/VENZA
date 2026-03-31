import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, MessageSquare, Settings, Users,
  ToggleLeft, ToggleRight, Check, Save, Loader2,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import {
  loadEvoConfig, saveEvoConfig,
  loadEvoGroups, saveEvoGroups,
  loadAutomations, saveAutomations,
} from '../utils/automations';

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
};

// ─── Variáveis disponíveis ────────────────────────────────────────────────────
const VARS = ['{{cliente}}', '{{card}}', '{{projeto}}', '{{coluna}}', '{{data}}', '{{hora}}'];

// ─── helpers ──────────────────────────────────────────────────────────────────
const getClients = () => {
  try { return JSON.parse(localStorage.getItem('venza_clients')) || CLIENTS; } catch { return CLIENTS; }
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
          {tabBtn('regras',  <Zap size={15} />,         'Regras')}
          {tabBtn('grupos',  <Users size={15} />,        'Grupos por Cliente')}
          {tabBtn('api',     <Settings size={15} />,     'Config. API')}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Regras Ativas',      value: automations.filter(a => a.ativa).length, color: '#10b981' },
          { label: 'Total de Regras',    value: automations.length,                       color: 'var(--primary)' },
          { label: 'Disparos Totais',    value: totalDisparos,                            color: '#f59e0b' },
          { label: 'Clientes com Grupo', value: Object.values(groups).filter(g => g?.jid).length, color: '#38bdf8' },
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
            <strong style={{ color: 'var(--text-main)' }}>Como obter o JID do grupo:</strong> No WhatsApp Web, abra o grupo → clique em informações → a URL mostrará o ID do grupo. No Evolution API, use <code style={{ background: 'var(--bg-app)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>GET /group/fetchAllGroups/{'{instance}'}</code> para listar todos os grupos com seus JIDs.
          </div>
          {clients.map(client => {
            const g = groups[client.id] || {};
            const isSaved = groupSaved === client.id;
            return (
              <div key={client.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <img src={client.avatarUrl} alt={client.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '10px' }}>{client.name}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={g.jid || ''}
                      onChange={e => updateGroup(client.id, 'jid', e.target.value)}
                      placeholder="Ex: 5511999999999-1234567890@g.us"
                      style={{ flex: 1, padding: '9px 12px', fontSize: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontFamily: 'monospace' }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                    />
                    <button onClick={() => saveGroup(client.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: 'none', background: isSaved ? '#10b981' : 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                      {isSaved ? <><Check size={13} /> Salvo!</> : <><Save size={13} /> Salvar</>}
                    </button>
                  </div>
                  {g.jid && (
                    <p style={{ fontSize: '11px', color: '#10b981', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={10} /> Grupo configurado
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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
