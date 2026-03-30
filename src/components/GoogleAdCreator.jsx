import React, { useState, useEffect } from 'react';
import { X, PlayCircle, Loader2, AlertCircle, CheckCircle, Plus, Trash2, Info } from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';

const delay = ms => new Promise(res => setTimeout(res, ms));

const MOCK_API = {
  fetchCampaigns: async () => { await delay(600); return [{ id: 'g-111', name: 'Search - Sempre Ativo' }, { id: 'g-222', name: 'PMax - Conversão' }]; },
  fetchAdGroups: async () => { await delay(400); return [{ id: 'ag-1', name: 'Grupo 1 - Produto Principal' }, { id: 'ag-2', name: 'Grupo 2 - Concorrência' }]; },
};

const BIDDING_STRATEGIES = [
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximizar Conversões' },
  { value: 'TARGET_CPA', label: 'CPA Alvo' },
  { value: 'TARGET_ROAS', label: 'ROAS Alvo' },
  { value: 'MAXIMIZE_CLICKS', label: 'Maximizar Cliques' },
  { value: 'MANUAL_CPC', label: 'CPC Manual' },
];

const CAMPAIGN_TYPES = [
  { value: 'SEARCH', label: 'Search (Pesquisa)' },
  { value: 'PMAX', label: 'Performance Max' },
  { value: 'DISPLAY', label: 'Display' },
  { value: 'SHOPPING', label: 'Shopping' },
];

const MATCH_TYPES = [
  { value: 'exact', label: 'Exata', example: '[produto]', color: '#10b981' },
  { value: 'phrase', label: 'Frase', example: '"produto perto"', color: '#8b5cf6' },
  { value: 'broad', label: 'Ampla', example: 'produto', color: '#f59e0b' },
];

const HEADLINE_LIMIT = 15;
const DESC_LIMIT = 4;

const GoogleAdCreator = ({ card, onClose, onComplete }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const isDemoMode = !localStorage.getItem('google_ads_token');
  const clientInfo = CLIENTS.find(c => c.id === card.clientId) || {};

  const [apiData, setApiData] = useState({ campaigns: [], adGroups: [] });
  const [loadingApi, setLoadingApi] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [camps, groups] = await Promise.all([MOCK_API.fetchCampaigns(), MOCK_API.fetchAdGroups()]);
        setApiData({ campaigns: camps, adGroups: groups });
      } catch (e) { console.error(e); } finally { setLoadingApi(false); }
    }
    load();
  }, []);

  // ─── Tab 1: Campanha ──────────────────────────────────────────────────────────
  const [campAction, setCampAction] = useState('new');
  const [campData, setCampData] = useState({
    existingId: '',
    name: `[Google] ${card.title || 'Nova Campanha'}`,
    type: 'SEARCH',
    bidding: 'MAXIMIZE_CONVERSIONS',
    targetCpa: '',
    targetRoas: '',
    budget: parseInt((card.demandaOrcamento || '50').replace(/\D/g, ''), 10) || 50,
    location: card.demandaPublico || 'Brasil',
  });

  // ─── Tab 2: Grupo de Anúncios ─────────────────────────────────────────────────
  const [groupAction, setGroupAction] = useState('new');
  const [groupData, setGroupData] = useState({
    existingId: '',
    name: `Grupo 01 — ${card.demandaObjetivo || 'Principal'}`,
    bid: 2.50,
  });
  const [keywords, setKeywords] = useState([
    { id: uuidv4(), text: '', matchType: 'exact' },
  ]);
  const [negKeywords, setNegKeywords] = useState([]);

  const addKeyword = () => setKeywords(prev => [...prev, { id: uuidv4(), text: '', matchType: 'exact' }]);
  const removeKeyword = (id) => setKeywords(prev => prev.filter(k => k.id !== id));
  const updateKeyword = (id, field, value) => setKeywords(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));

  const addNegKeyword = () => setNegKeywords(prev => [...prev, { id: uuidv4(), text: '' }]);
  const removeNegKeyword = (id) => setNegKeywords(prev => prev.filter(k => k.id !== id));

  // ─── Tab 3: RSA (Anúncio Responsivo) ─────────────────────────────────────────
  const [rsaData, setRsaData] = useState({
    finalUrl: card.linkComplete || '',
    displayPath1: '',
    displayPath2: '',
    headlines: ['', '', ''],
    descriptions: ['', ''],
    callouts: '',
    sitelinks: '',
  });

  const addHeadline = () => {
    if (rsaData.headlines.length >= HEADLINE_LIMIT) return;
    setRsaData(prev => ({ ...prev, headlines: [...prev.headlines, ''] }));
  };
  const removeHeadline = (i) => setRsaData(prev => ({ ...prev, headlines: prev.headlines.filter((_, idx) => idx !== i) }));
  const updateHeadline = (i, v) => setRsaData(prev => { const h = [...prev.headlines]; h[i] = v; return { ...prev, headlines: h }; });

  const addDesc = () => {
    if (rsaData.descriptions.length >= DESC_LIMIT) return;
    setRsaData(prev => ({ ...prev, descriptions: [...prev.descriptions, ''] }));
  };
  const removeDesc = (i) => setRsaData(prev => ({ ...prev, descriptions: prev.descriptions.filter((_, idx) => idx !== i) }));
  const updateDesc = (i, v) => setRsaData(prev => { const d = [...prev.descriptions]; d[i] = v; return { ...prev, descriptions: d }; });

  // ─── Validação ────────────────────────────────────────────────────────────────
  const tabErrors = {
    0: campAction === 'existing' && !campData.existingId ? 'Selecione uma campanha existente.' :
       campAction === 'new' && !campData.name.trim() ? 'Informe o nome da campanha.' : null,
    1: groupAction === 'existing' && !groupData.existingId ? 'Selecione um grupo existente.' :
       keywords.filter(k => k.text.trim()).length === 0 ? 'Adicione pelo menos 1 palavra-chave.' : null,
    2: !rsaData.finalUrl.trim() ? 'Informe a URL de destino.' :
       rsaData.headlines.filter(h => h.trim()).length < 3 ? 'Adicione pelo menos 3 títulos.' :
       rsaData.descriptions.filter(d => d.trim()).length < 2 ? 'Adicione pelo menos 2 descrições.' : null,
  };

  const goNext = () => {
    const err = tabErrors[activeTab];
    if (err) { setError(err); return; }
    setError(null);
    setActiveTab(a => a + 1);
  };

  // ─── Publicação ───────────────────────────────────────────────────────────────
  const pushLog = (msg, status = 'loading') => setLogs(prev => [...prev, { id: Date.now() + Math.random(), msg, status }]);
  const updateLastLog = (status) => setLogs(prev => { const c = [...prev]; if (c.length) c[c.length - 1].status = status; return c; });

  const handlePublish = async () => {
    const err = tabErrors[2];
    if (err) { setError(err); return; }

    setIsPublishing(true);
    setPublishDone(false);
    setError(null);
    setActiveTab(3);
    setLogs([]);

    try {
      if (campAction === 'new') {
        pushLog(`Criando Campanha: "${campData.name}" (${CAMPAIGN_TYPES.find(t => t.value === campData.type)?.label})...`);
        await delay(900); updateLastLog('success');
      } else {
        pushLog(`Vinculando à Campanha: "${apiData.campaigns.find(c => c.id === campData.existingId)?.name || campData.existingId}"`);
        await delay(500); updateLastLog('success');
      }

      if (groupAction === 'new') {
        pushLog(`Criando Grupo de Anúncios: "${groupData.name}"...`);
        await delay(800); updateLastLog('success');
      }

      const validKws = keywords.filter(k => k.text.trim());
      pushLog(`Adicionando ${validKws.length} palavra(s)-chave${negKeywords.length ? ` + ${negKeywords.length} negativas` : ''}...`);
      await delay(700); updateLastLog('success');

      pushLog(`Criando Anúncio Responsivo (${rsaData.headlines.filter(h => h.trim()).length} títulos, ${rsaData.descriptions.filter(d => d.trim()).length} descrições)...`);
      await delay(1000); updateLastLog('success');

      pushLog('Anúncio enviado para revisão do Google Ads.', 'success');
      if (isDemoMode) {
        pushLog('MODO DEMO — Configure o token em Configurações para publicar de verdade.', 'success');
      }
      pushLog('Status: EM REVISÃO — Será ativado após aprovação automática (~1h). ✨', 'success');

      setPublishDone(true);
    } catch (err) {
      updateLastLog('error');
      setError('Erro na Google Ads API: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Tela de Logs ─────────────────────────────────────────────────────────────
  if (activeTab === 3) {
    return (
      <div className="modal-overlay" style={{ zIndex: 9999 }}>
        <div style={{ width: '520px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isPublishing
              ? <Loader2 size={20} color="#34a853" style={{ animation: 'spin 1s linear infinite' }} />
              : <CheckCircle size={20} color="#10b981" />}
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              {isPublishing ? 'Enviando para o Google Ads...' : 'Campanha Google Enviada!'}
            </h2>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '260px' }}>
            {error && (
              <div style={{ color: '#ef4444', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>{error}</div>
            )}
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', fontWeight: '600' }}>
                {log.status === 'loading' && <Loader2 size={16} color="#34a853" style={{ animation: 'spin 1s linear infinite', flexShrink: 0, marginTop: '2px' }} />}
                {log.status === 'success' && <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />}
                {log.status === 'error' && <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />}
                <span style={{ color: log.status === 'error' ? '#ef4444' : log.msg.includes('DEMO') ? '#f59e0b' : 'var(--text-main)' }}>{log.msg}</span>
              </div>
            ))}
          </div>

          {publishDone && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                Fechar
              </button>
              <button
                onClick={onComplete}
                style={{ padding: '10px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #34a853, #0f9d58)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(52,168,83,0.3)' }}
              >
                ✓ Mover para Em Andamento
              </button>
            </div>
          )}
          {!publishDone && !isPublishing && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
              <button onClick={() => setActiveTab(2)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                ← Voltar
              </button>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const Field = ({ label, value, onChange, placeholder, type = 'text', width = '100%', hint }) => (
    <div style={{ width }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
      {hint && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</p>}
    </div>
  );

  const GSelect = ({ label, value, onChange, children }) => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <select value={value} onChange={onChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}>
        {children}
      </select>
    </div>
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div style={{ width: '840px', maxWidth: '96vw', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', height: '88vh' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #34a853, #0f9d58)', padding: '8px', borderRadius: '10px', color: 'white', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" opacity="0.9"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" opacity="0.7"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="white" opacity="0.5"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.2 }}>Google Ad Creator</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {clientInfo.name || 'Cliente'} · {card.title}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDemoMode && (
              <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.3)' }}>
                MODO DEMO
              </span>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {isDemoMode && (
          <div style={{ padding: '10px 24px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} color="#f59e0b" />
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
              Modo demonstração — configure o token em <strong>Configurações → Integrações</strong> para publicar de verdade.
            </span>
          </div>
        )}

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Sidebar */}
          <div style={{ width: '210px', flexShrink: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-light)', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['1. Campanha', '2. Grupo & Palavras-chave', '3. Anúncio RSA'].map((t, i) => (
              <button
                key={i}
                onClick={() => { setError(null); setActiveTab(i); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                  background: activeTab === i ? 'rgba(52,168,83,0.1)' : 'transparent',
                  color: activeTab === i ? '#34a853' : 'var(--text-muted)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <span>{t}</span>
                {activeTab > i && !tabErrors[i] && <CheckCircle size={14} color="#10b981" />}
              </button>
            ))}

            {/* Quality Score preview */}
            {activeTab === 2 && (
              <div style={{ marginTop: 'auto', padding: '14px', background: 'var(--bg-app)', border: '1px solid #34a853', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>RSA</div>
                <div style={{ fontSize: '22px', color: '#34a853', fontWeight: '800' }}>
                  {rsaData.headlines.filter(h => h.trim()).length}/{HEADLINE_LIMIT}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '2px' }}>títulos</div>
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
            {loadingApi ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-muted)', gap: '12px' }}>
                <Loader2 size={32} color="#34a853" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '13px', fontWeight: '600' }}>Conectando à Google Ads API...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                {/* ── Tab 1: Campanha ── */}
                {activeTab === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Setup da Campanha</h3>

                    <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
                      {[['new', 'Criar Nova'], ['existing', 'Usar Existente']].map(([v, l]) => (
                        <button key={v} onClick={() => setCampAction(v)} style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', background: campAction === v ? 'var(--bg-app)' : 'transparent', color: campAction === v ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: campAction === v ? '0 2px 6px rgba(0,0,0,0.12)' : 'none' }}>
                          {l}
                        </button>
                      ))}
                    </div>

                    {campAction === 'existing' ? (
                      <GSelect label="Campanha Ativa (Google Ads API)" value={campData.existingId} onChange={e => setCampData({ ...campData, existingId: e.target.value })}>
                        <option value="">— Escolha uma Campanha —</option>
                        {apiData.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </GSelect>
                    ) : (
                      <>
                        <Field label="Nome da Campanha" value={campData.name} onChange={e => setCampData({ ...campData, name: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <GSelect label="Tipo de Campanha" value={campData.type} onChange={e => setCampData({ ...campData, type: e.target.value })}>
                            {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </GSelect>
                          <GSelect label="Estratégia de Lances" value={campData.bidding} onChange={e => setCampData({ ...campData, bidding: e.target.value })}>
                            {BIDDING_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </GSelect>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <Field
                            label="Orçamento Diário (R$)" type="number"
                            value={campData.budget}
                            onChange={e => setCampData({ ...campData, budget: Number(e.target.value) })}
                            width="100%"
                          />
                          {campData.bidding === 'TARGET_CPA' && (
                            <Field label="CPA Alvo (R$)" type="number" value={campData.targetCpa} onChange={e => setCampData({ ...campData, targetCpa: e.target.value })} placeholder="Ex: 25" />
                          )}
                          {campData.bidding === 'TARGET_ROAS' && (
                            <Field label="ROAS Alvo (Ex: 400 = 4x)" type="number" value={campData.targetRoas} onChange={e => setCampData({ ...campData, targetRoas: e.target.value })} placeholder="Ex: 400" />
                          )}
                        </div>
                        <Field label="Localização / Segmentação" value={campData.location} onChange={e => setCampData({ ...campData, location: e.target.value })} placeholder="Ex: Brasil, São Paulo" />
                      </>
                    )}
                  </div>
                )}

                {/* ── Tab 2: Grupo + Palavras-chave ── */}
                {activeTab === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Grupo de Anúncios & Palavras-chave</h3>

                    <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
                      {[['new', 'Novo Grupo'], ['existing', 'Grupo Existente']].map(([v, l]) => (
                        <button key={v} onClick={() => setGroupAction(v)} style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', background: groupAction === v ? 'var(--bg-app)' : 'transparent', color: groupAction === v ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: groupAction === v ? '0 2px 6px rgba(0,0,0,0.12)' : 'none' }}>
                          {l}
                        </button>
                      ))}
                    </div>

                    {groupAction === 'existing' ? (
                      <GSelect label="Grupo Existente" value={groupData.existingId} onChange={e => setGroupData({ ...groupData, existingId: e.target.value })}>
                        <option value="">— Escolha um Grupo —</option>
                        {apiData.adGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </GSelect>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                        <Field label="Nome do Grupo" value={groupData.name} onChange={e => setGroupData({ ...groupData, name: e.target.value })} />
                        <Field label="Lance Padrão (R$)" type="number" value={groupData.bid} onChange={e => setGroupData({ ...groupData, bid: Number(e.target.value) })} />
                      </div>
                    )}

                    {/* Palavras-chave positivas */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Palavras-chave ({keywords.length})
                        </label>
                        <button onClick={addKeyword} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#34a853', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                          <Plus size={14} /> Adicionar
                        </button>
                      </div>

                      {/* Match type legend */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                        {MATCH_TYPES.map(mt => (
                          <span key={mt.value} style={{ fontSize: '11px', color: mt.color, fontWeight: '600' }}>
                            {mt.label}: <code style={{ background: 'var(--bg-surface)', padding: '1px 5px', borderRadius: '4px' }}>{mt.example}</code>
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {keywords.map((kw) => (
                          <div key={kw.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={kw.matchType}
                              onChange={e => updateKeyword(kw.id, 'matchType', e.target.value)}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-surface)', color: MATCH_TYPES.find(m => m.value === kw.matchType)?.color || 'var(--text-main)', fontSize: '12px', fontWeight: '700', outline: 'none', flexShrink: 0, width: '90px' }}
                            >
                              {MATCH_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <input
                              value={kw.text}
                              onChange={e => updateKeyword(kw.id, 'text', e.target.value)}
                              placeholder="palavra-chave"
                              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                            />
                            <button onClick={() => removeKeyword(kw.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Negativas */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Palavras-chave Negativas ({negKeywords.length})
                        </label>
                        <button onClick={addNegKeyword} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                          <Plus size={14} /> Adicionar Negativa
                        </button>
                      </div>
                      {negKeywords.map((kw) => (
                        <div key={kw.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', flexShrink: 0 }}>-</span>
                          <input
                            value={kw.text}
                            onChange={e => setNegKeywords(prev => prev.map(k => k.id === kw.id ? { ...k, text: e.target.value } : k))}
                            placeholder="palavra a excluir"
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '13px', outline: 'none' }}
                          />
                          <button onClick={() => removeNegKeyword(kw.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Tab 3: RSA ── */}
                {activeTab === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Anúncio Responsivo de Pesquisa (RSA)</h3>

                    {/* URL */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                      <Field label="URL de Destino *" value={rsaData.finalUrl} onChange={e => setRsaData({ ...rsaData, finalUrl: e.target.value })} placeholder="https://seudominio.com" />
                      <Field label="Caminho de exibição 1" value={rsaData.displayPath1} onChange={e => setRsaData({ ...rsaData, displayPath1: e.target.value })} placeholder="produtos" hint="Até 15 chars" />
                      <Field label="Caminho de exibição 2" value={rsaData.displayPath2} onChange={e => setRsaData({ ...rsaData, displayPath2: e.target.value })} placeholder="oferta" hint="Até 15 chars" />
                    </div>

                    {/* URL Preview */}
                    <div style={{ fontSize: '12px', color: '#34a853', background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.2)', borderRadius: '8px', padding: '8px 12px', fontWeight: '600' }}>
                      {rsaData.finalUrl || 'seudominio.com'}{rsaData.displayPath1 ? `/${rsaData.displayPath1}` : ''}{rsaData.displayPath2 ? `/${rsaData.displayPath2}` : ''}
                    </div>

                    {/* Títulos */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Títulos — {rsaData.headlines.filter(h => h.trim()).length}/{HEADLINE_LIMIT}
                          <span style={{ color: '#f59e0b', marginLeft: '6px' }}>mín. 3</span>
                        </label>
                        {rsaData.headlines.length < HEADLINE_LIMIT && (
                          <button onClick={addHeadline} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#34a853', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                            <Plus size={14} /> Adicionar
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rsaData.headlines.map((h, i) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', width: '24px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                            <input
                              value={h}
                              onChange={e => updateHeadline(i, e.target.value)}
                              maxLength={30}
                              placeholder={`Título ${i + 1} (até 30 chars)`}
                              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${h.length > 28 ? '#f59e0b' : 'var(--border-main)'}`, background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                            />
                            <span style={{ fontSize: '11px', color: h.length > 28 ? '#f59e0b' : 'var(--text-muted)', width: '32px', textAlign: 'right', flexShrink: 0 }}>{h.length}/30</span>
                            {rsaData.headlines.length > 3 && (
                              <button onClick={() => removeHeadline(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Descrições */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Descrições — {rsaData.descriptions.filter(d => d.trim()).length}/{DESC_LIMIT}
                          <span style={{ color: '#f59e0b', marginLeft: '6px' }}>mín. 2</span>
                        </label>
                        {rsaData.descriptions.length < DESC_LIMIT && (
                          <button onClick={addDesc} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#34a853', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                            <Plus size={14} /> Adicionar
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rsaData.descriptions.map((d, i) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', width: '24px', flexShrink: 0, textAlign: 'right', paddingTop: '10px' }}>{i + 1}</span>
                            <textarea
                              value={d}
                              onChange={e => updateDesc(i, e.target.value)}
                              maxLength={90}
                              rows={2}
                              placeholder={`Descrição ${i + 1} (até 90 chars)`}
                              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${d.length > 85 ? '#f59e0b' : 'var(--border-main)'}`, background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', resize: 'none' }}
                            />
                            <span style={{ fontSize: '11px', color: d.length > 85 ? '#f59e0b' : 'var(--text-muted)', width: '32px', textAlign: 'right', paddingTop: '10px', flexShrink: 0 }}>{d.length}/90</span>
                            {rsaData.descriptions.length > 2 && (
                              <button onClick={() => removeDesc(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', paddingTop: '10px', flexShrink: 0 }}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Extensões */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Callouts (opcional)</label>
                      <input value={rsaData.callouts} onChange={e => setRsaData({ ...rsaData, callouts: e.target.value })} placeholder="Frete Grátis, Entrega em 24h, Garantia 1 Ano" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Separe por vírgula. Cada callout: até 25 chars.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {activeTab > 0 ? (
            <button onClick={() => { setError(null); setActiveTab(a => a - 1); }} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
              ← Voltar
            </button>
          ) : <div />}

          {activeTab < 2 ? (
            <button onClick={goNext} style={{ padding: '10px 28px', borderRadius: '8px', background: 'linear-gradient(135deg, #34a853, #0f9d58)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(52,168,83,0.25)' }}>
              Próximo →
            </button>
          ) : (
            <button
              onClick={handlePublish}
              style={{ padding: '10px 28px', borderRadius: '8px', fontWeight: '800', fontSize: '14px', background: 'linear-gradient(135deg, #34a853, #0f9d58)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 16px rgba(52,168,83,0.3)', transition: 'all 0.2s' }}
            >
              <PlayCircle size={17} /> Publicar no Google Ads
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default GoogleAdCreator;
