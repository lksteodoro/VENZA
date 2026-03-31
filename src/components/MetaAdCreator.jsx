import { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, PlayCircle, Loader2, AlertCircle, CheckCircle, Database, Info, ChevronDown } from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';

const delay = ms => new Promise(res => setTimeout(res, ms));

const META_API = 'https://graph.facebook.com/v25.0';
const VIDEO_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB por chunk

const MOCK_BM_DATA = {
  bms: [
    { id: 'bm_001', name: 'Venza Assessoria — Principal' },
    { id: 'bm_002', name: 'Venza Assessoria — Clientes' },
  ],
  accounts: {
    bm_001: [
      { id: 'act_111111111', name: 'Venza — Tráfego Pago', status: 1 },
      { id: 'act_222222222', name: 'Venza — Leads', status: 1 },
    ],
    bm_002: [
      { id: 'act_333333333', name: 'Cliente A — Conversão', status: 1 },
      { id: 'act_444444444', name: 'Cliente B — Tráfego', status: 2 },
    ],
  },
};

const MOCK_API = {
  fetchCampaigns: async () => { await delay(600); return [{ id: '111', name: 'Campanha Black Friday' }, { id: '222', name: 'Sempre Ativa - Conversão' }]; },
  fetchPages: async () => { await delay(400); return [{ id: '999', name: 'Página Venza Oficial' }, { id: '888', name: 'Filial São Paulo' }]; },
  fetchIg: async () => { await delay(400); return [{ id: '777', name: '@venza_oficial' }]; },
  fetchPixels: async () => { await delay(500); return [{ id: 'px_1', name: 'Pixel Principal (Sales)' }, { id: 'px_2', name: 'Pixel Landing Page Leads' }]; },
};

const OBJECTIVES = [
  { value: 'OUTCOME_LEADS', label: 'LEADS' },
  { value: 'OUTCOME_SALES', label: 'VENDAS' },
  { value: 'OUTCOME_TRAFFIC', label: 'TRAFEGO' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'ENGAJAMENTO' },
];

const OBJECTIVE_LABEL = (obj) => OBJECTIVES.find(o => o.value === obj)?.label || 'TRAFEGO';

const OPTIMIZATION_GOALS = {
  OUTCOME_SALES: [
    { value: 'OFFSITE_CONVERSIONS', label: 'Conversões' },
    { value: 'CONVERSATIONS',       label: 'Conversas (WhatsApp/Messenger)' },
    { value: 'LINK_CLICKS',         label: 'Cliques no Link' },
    { value: 'LANDING_PAGE_VIEWS',  label: 'Visualizações da Landing Page' },
  ],
  OUTCOME_LEADS: [
    { value: 'LEAD_GENERATION',     label: 'Geração de Leads (Formulário)' },
    { value: 'CONVERSATIONS',       label: 'Conversas (WhatsApp/Messenger)' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Conversões no Site' },
    { value: 'LINK_CLICKS',         label: 'Cliques no Link' },
  ],
  OUTCOME_TRAFFIC: [
    { value: 'LINK_CLICKS',         label: 'Cliques no Link' },
    { value: 'LANDING_PAGE_VIEWS',  label: 'Visualizações da Landing Page' },
    { value: 'CONVERSATIONS',       label: 'Conversas (WhatsApp/Messenger)' },
  ],
  OUTCOME_ENGAGEMENT: [
    { value: 'CONVERSATIONS',       label: 'Conversas (WhatsApp/Messenger)' },
    { value: 'POST_ENGAGEMENT',     label: 'Engajamento no Post' },
    { value: 'LINK_CLICKS',         label: 'Cliques no Link' },
  ],
};

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Compre Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'BUY_NOW', label: 'Compre Já' },
  { value: 'GET_OFFER', label: 'Ver Oferta' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'WATCH_MORE', label: 'Ver Mais' },
];

const DEFAULT_UTM = '?utm_campaign=trafego&utm_source=[TD-PAGO]-facebookads-{{placement}}&utm_medium={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}&campaign-id={{campaign.id}}&adset-id={{adset.id}}&ad-id={{ad.id}}';

const OBJECTIVE_ADSET_CONFIG = {
  OUTCOME_TRAFFIC:    { optimization_goal: 'LINK_CLICKS',         destination_type: 'WEBSITE', needs_pixel: false, valid_goals: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS'] },
  OUTCOME_LEADS:      { optimization_goal: 'LEAD_GENERATION',     destination_type: 'ON_AD',   needs_pixel: false, valid_goals: ['LEAD_GENERATION', 'OFFSITE_CONVERSIONS', 'LINK_CLICKS'] },
  OUTCOME_SALES:      { optimization_goal: 'OFFSITE_CONVERSIONS', destination_type: 'WEBSITE', needs_pixel: true,  valid_goals: ['OFFSITE_CONVERSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS'] },
  OUTCOME_ENGAGEMENT: { optimization_goal: 'POST_ENGAGEMENT',     destination_type: 'WEBSITE', needs_pixel: false, valid_goals: ['POST_ENGAGEMENT', 'LINK_CLICKS'] },
};

const objFromDemanda = () => 'OUTCOME_TRAFFIC';

const MetaAdCreator = ({ card, onClose, onComplete, projectId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const isDemoMode = !localStorage.getItem('meta_access_token');
  const clientInfo = CLIENTS.find(c => c.id === card.clientId) || {};

  // ─── Step 0: Seleção de BM e Conta de Anúncios ────────────────────────────────
  const [bms, setBms] = useState([]);
  const [loadingBms, setLoadingBms] = useState(true);
  const metaStorageKey = projectId
    ? `meta_defaults_proj_${projectId}`
    : `meta_defaults_${card.clientId}`;
  const [accountData, setAccountData] = useState(() => {
    try {
      const projSaved = projectId && localStorage.getItem(`meta_defaults_proj_${projectId}`);
      const clientSaved = localStorage.getItem(`meta_defaults_${card.clientId}`);
      const saved = projSaved || clientSaved;
      return saved ? JSON.parse(saved) : { bmId: '', adAccountId: '', pageId: '' };
    } catch { return { bmId: '', adAccountId: '', pageId: '' }; }
  });
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const saveMetaDefaults = () => {
    localStorage.setItem(metaStorageKey, JSON.stringify(accountData));
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 2000);
  };

  // ─── Presets de configuração (BM + Conta + Página) ────────────────────────────
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('meta_account_presets')) || []; } catch { return []; }
  });
  const [savePresetName, setSavePresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const pendingPresetRef = useRef(null);

  const applyPreset = (preset) => {
    if (accountData.bmId === preset.bmId) {
      setAccountData(a => ({ ...a, adAccountId: preset.adAccountId, pageId: preset.pageId }));
    } else {
      pendingPresetRef.current = preset;
      setAccountData({ bmId: preset.bmId, adAccountId: '', pageId: '' });
    }
  };

  const savePreset = () => {
    if (!savePresetName.trim()) return;
    const bmName = bms.find(b => b.id === accountData.bmId)?.name || accountData.bmId;
    const adAccountName = adAccounts.find(a => a.id === accountData.adAccountId)?.name || accountData.adAccountId;
    const pageName = apiData.pages.find(p => p.id === accountData.pageId)?.name || accountData.pageId;
    const newPreset = { id: uuidv4(), name: savePresetName.trim(), bmId: accountData.bmId, bmName, adAccountId: accountData.adAccountId, adAccountName, pageId: accountData.pageId, pageName };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('meta_account_presets', JSON.stringify(updated));
    setSavePresetName('');
    setShowSavePreset(false);
  };

  const deletePreset = (id) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('meta_account_presets', JSON.stringify(updated));
  };

  const [adAccounts, setAdAccounts] = useState([]);
  const [allRawAccounts, setAllRawAccounts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('meta_access_token');
    if (!token) {
      setBms(MOCK_BM_DATA.bms);
      setLoadingBms(false);
      return;
    }
    // Single call: fetch all accounts with business info — no business_management permission needed
    fetch(`${META_API}/me/adaccounts?fields=id,name,account_status,business{id,name}&limit=100&access_token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message);
        const accounts = data.data || [];
        setAllRawAccounts(accounts);
        const bmMap = new Map();
        accounts.forEach(acc => {
          if (acc.business) bmMap.set(acc.business.id, acc.business.name);
        });
        const bmList = Array.from(bmMap, ([id, name]) => ({ id, name }));
        const hasPersonal = accounts.some(acc => !acc.business);
        if (hasPersonal) bmList.push({ id: '__direct__', name: 'Contas Pessoais (sem BM)' });
        setBms(bmList);
        if (bmList.length === 1) setAccountData(a => ({ ...a, bmId: bmList[0].id }));
      })
      .catch(err => {
        console.error('fetchBMs:', err);
        setBms([{ id: '__direct__', name: 'Contas Diretas' }]);
        setAccountData(a => ({ ...a, bmId: '__direct__' }));
      })
      .finally(() => setLoadingBms(false));
  }, []);

  useEffect(() => {
    const bmId = accountData.bmId;
    if (!bmId) { setAdAccounts([]); return; }
    const pending = pendingPresetRef.current;
    const isApplyingPreset = pending && pending.bmId === bmId;
    if (!isApplyingPreset) {
      setAccountData(a => ({ ...a, adAccountId: '', pageId: '' }));
    }
    const token = localStorage.getItem('meta_access_token');
    if (!token) {
      setAdAccounts(MOCK_BM_DATA.accounts[bmId] || []);
      if (isApplyingPreset) {
        setAccountData(a => ({ ...a, adAccountId: pending.adAccountId, pageId: pending.pageId }));
        pendingPresetRef.current = null;
      }
      return;
    }
    const filtered = allRawAccounts
      .filter(acc => bmId === '__direct__' ? !acc.business : acc.business?.id === bmId)
      .map(acc => ({ id: acc.id, name: acc.name, status: acc.account_status }));
    setAdAccounts(filtered);
    if (isApplyingPreset) {
      setAccountData(a => ({ ...a, adAccountId: pending.adAccountId, pageId: pending.pageId }));
      pendingPresetRef.current = null;
    }
  }, [accountData.bmId, allRawAccounts]);

  const [apiData, setApiData] = useState({ campaigns: [], pages: [], igs: [], pixels: [] });
  const [loadingApi, setLoadingApi] = useState(false);

  useEffect(() => {
    const adAccountId = accountData.adAccountId;
    if (!adAccountId) return;
    const token = localStorage.getItem('meta_access_token');
    setLoadingApi(true);
    async function load() {
      try {
        if (!token) {
          const [camps, pgs, igs, pixs] = await Promise.all([
            MOCK_API.fetchCampaigns(), MOCK_API.fetchPages(), MOCK_API.fetchIg(), MOCK_API.fetchPixels()
          ]);
          setApiData({ campaigns: camps, pages: pgs, igs: igs, pixels: pixs });
        } else {
          const [campsRes, pgsRes, pixsRes] = await Promise.all([
            fetch(`${META_API}/${adAccountId}/campaigns?fields=id,name,status&limit=100&access_token=${token}`).then(r => r.json()),
            fetch(`${META_API}/me/accounts?fields=id,name,instagram_business_account{id,username}&limit=50&access_token=${token}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`${META_API}/${adAccountId}/adspixels?fields=id,name&limit=25&access_token=${token}`).then(r => r.json()).catch(() => ({ data: [] })),
          ]);
          if (campsRes.error) throw new Error(campsRes.error.message);
          const pagesData = pgsRes.data || [];
          const igAccounts = pagesData
            .filter(p => p.instagram_business_account)
            .map(p => ({ id: p.instagram_business_account.id, name: `@${p.instagram_business_account.username}` }));
          const DELETED_STATUSES = [3, 4, 'DELETED', 'ARCHIVED'];
          const allCampaigns = (campsRes.data || [])
            .filter(c => !DELETED_STATUSES.includes(c.status))
            .map(c => {
              const isPaused = c.status === 2 || c.status === 'PAUSED';
              return { id: c.id, name: isPaused ? `${c.name} (Pausada)` : c.name };
            });
          setApiData({
            campaigns: allCampaigns,
            pages: pagesData.map(p => ({ id: p.id, name: p.name })),
            igs: igAccounts,
            pixels: pixsRes.data || [],
          });
        }
      } catch (e) { console.error('loadApiData:', e); } finally { setLoadingApi(false); }
    }
    load();
  }, [accountData.adAccountId]);

  // AdSets existentes (carregados ao selecionar campanha existente)
  const [existingAdSets, setExistingAdSets] = useState([]);
  const [loadingAdSets, setLoadingAdSets] = useState(false);

  // ─── Tab 1: Campanha ──────────────────────────────────────────────────────────
  const [campAction, setCampAction] = useState('new');
  const todayDDMMYYYY = (() => {
    const d = new Date();
    return String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + String(d.getFullYear());
  })();

  const [campData, setCampData] = useState({
    existingId: '',
    name: `[VENZA] [${OBJECTIVE_LABEL(objFromDemanda(card.demandaObjetivo))}] [${todayDDMMYYYY}]`,
    objective: objFromDemanda(card.demandaObjetivo),
    budgetType: 'ABO',
    budget: parseInt((card.demandaOrcamento || '50').replace(/\D/g, ''), 10) || 50,
    status: 'PAUSED',
  });

  // ─── Carregamento de AdSets de campanha existente ────────────────────────────
  const [adSetAction, setAdSetAction] = useState('new'); // 'new' | 'existing'
  const [selectedAdSetIds, setSelectedAdSetIds] = useState([]);       // multi-select
  const [campaignObjective, setCampaignObjective] = useState(null);   // objetivo da campanha existente
  const [loadingObjective, setLoadingObjective] = useState(false);

  const toggleAdSet = (id) => setSelectedAdSetIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const [adSetFetchError, setAdSetFetchError] = useState(null);
  const [adSetRetryKey, setAdSetRetryKey] = useState(0);

  useEffect(() => {
    const campId = campAction === 'existing' ? campData.existingId : null;
    if (!campId) { setExistingAdSets([]); setAdSetFetchError(null); return; }
    const token = localStorage.getItem('meta_access_token');
    if (!token) return;
    setLoadingAdSets(true);
    setSelectedAdSetIds([]);
    setAdSetFetchError(null);

    const RATE_CODES = new Set([4, 17, 32, 80004]);
    const fetchWithRetry = async (url, tries = 4) => {
      for (let i = 0; i <= tries; i++) {
        const json = await fetch(url).then(r => r.json());
        if (json.error && RATE_CODES.has(json.error.code)) {
          if (i === tries) throw new Error(`Erro ${json.error.code}: ${json.error.message}`);
          const waitSec = Math.min(15 * 2 ** i, 120);
          setAdSetFetchError(`⏳ Rate limit — aguardando ${waitSec}s...`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
          setAdSetFetchError(null);
          continue;
        }
        return json;
      }
    };

    const url = `${META_API}/${campId}/adsets?fields=id,name,status,destination_type&limit=100&access_token=${token}`;
    fetchWithRetry(url)
      .then(json => {
        if (json?.error) {
          setAdSetFetchError(`Erro ${json.error.code}: ${json.error.message}`);
          setExistingAdSets([]);
        } else {
          const filtered = (json.data || []).filter(a => a.status !== 'DELETED' && a.status !== 'ARCHIVED');
          setExistingAdSets(filtered);
        }
      })
      .catch(err => { setAdSetFetchError(`Falha: ${err.message}`); setExistingAdSets([]); })
      .finally(() => setLoadingAdSets(false));
  }, [campData.existingId, campAction, adSetRetryKey]);

  // ─── Fetch objetivo da campanha existente ─────────────────────────────────────
  useEffect(() => {
    if (campAction !== 'existing' || !campData.existingId) {
      setCampaignObjective(null);
      return;
    }
    const token = localStorage.getItem('meta_access_token');
    if (!token) return;
    setLoadingObjective(true);
    fetch(`${META_API}/${campData.existingId}?fields=objective&access_token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.objective) {
          setCampaignObjective(data.objective);
          const config = OBJECTIVE_ADSET_CONFIG[data.objective];
          if (config) setAdSetData(a => ({ ...a, optimizationGoal: config.optimization_goal }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingObjective(false));
  }, [campData.existingId, campAction]);

  // ─── Tab 2: Conjunto (AdSet) ──────────────────────────────────────────────────
  const [adSetData, setAdSetData] = useState({
    name: `[BROAD] ${card.demandaPublico || '18-65 BR'}`,
    pixelId: '',
    pageId: clientInfo.metaPageId || '',
    igId: '',
    audience: card.demandaPublico || 'Brasil, 18–65 anos, sem segmentação (broad)',
    budget: 20,
    optimizationGoal: 'LINK_CLICKS', // Sem otimização restrita (Tudo aberto)
    placements: 'ADVANTAGE_PLUS',
  });

  // ─── Tab 3: Anúncios (lote) ───────────────────────────────────────────────────
  const todayDDMM = (() => {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
  })();

  // Padrão: AD01_2703, AD02_2703, etc.
  const resolveAdName = (pattern, idx) =>
    pattern.replace(/{index}/g, String(idx).padStart(2, '0')).replace(/{date}/g, todayDDMM);

  const [adsData, setAdsData] = useState({
    namingPattern: 'AD{index}_{date}', // {date} = DDMM dinamico na hora de publicar
    primaryText: card.demandaDescricao || 'Aproveite essa oportunidade!',
    description: '',
    title: card.title || 'Clique e saiba mais',
    cta: 'LEARN_MORE',
    link: card.linkComplete || '',
    utmTags: DEFAULT_UTM,
    leadFormId: '',
    whatsappWelcomeMsg: 'Olá! Gostaria de mais informações.',
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [forceMessagesDest, setForceMessagesDest] = useState(false);
  const [leadDestType, setLeadDestType] = useState('INSTANT_FORM');
  const [saleConversionEvent, setSaleConversionEvent] = useState('PURCHASE');
  const [individualCopyMode, setIndividualCopyMode] = useState(false);
  const [adCopyOverrides, setAdCopyOverrides] = useState({});   // { [fileId]: { primaryText?, title?, ... } }
  const [activeCopyFileId, setActiveCopyFileId] = useState(null);

  // ─── Searchable Dropdown Customizado ──────────────────────────────────────────
  const SearchableSelect = ({ items: rawItems, options, value, onChange, placeholder, disabled, highlight }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    // Normalize: options [{value, label}] → [{id, name}]; raw items passam direto
    const items = options ? options.map(o => ({ id: o.value, name: o.label })) : (rawItems || []);
    // Ocultar campo de busca em listas pequenas/estáticas
    const showSearch = !options || items.length > 6;

    useEffect(() => {
      const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
      document.addEventListener('mousedown', clickOut);
      return () => document.removeEventListener('mousedown', clickOut);
    }, []);

    const filtered = showSearch
      ? items.filter(i => (i.name || '').toLowerCase().includes(search.toLowerCase()) || (i.id || '').includes(search))
      : items;
    const selected = items.find(i => i.id === value);

    const handleSelect = (id) => { onChange(id); setIsOpen(false); setSearch(''); };

    const accentColor = highlight ? '#10b981' : '#1877F2';
    const borderStyle = isOpen
      ? `2px solid ${accentColor}`
      : highlight && value
        ? '1px solid #10b981'
        : '1px solid var(--border-main)';
    const bgStyle = highlight && value ? 'rgba(16,185,129,0.05)' : 'var(--bg-surface)';

    return (
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ padding: '12px 16px', borderRadius: '10px', border: borderStyle, background: bgStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
        >
          <span style={{ fontSize: '13px', color: selected && selected.id !== '' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: selected && selected.id !== '' ? '700' : '500' }}>
            {selected ? selected.name : (placeholder || 'Selecione...')}
          </span>
          <ChevronDown size={16} color={isOpen ? accentColor : highlight && value ? '#10b981' : 'var(--text-muted)'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
        </div>

        {isOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', zIndex: 50, overflow: 'hidden' }}>
            {showSearch && (
              <div style={{ padding: '8px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
                <input
                  type="text" autoFocus
                  placeholder="Filtrar..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${accentColor}`, background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {filtered.map(item => {
                const isItemSel = value === item.id;
                const isDisabled = item.status === 2 || item.status === 3 || item.status === 4 ||
                  item.status === 'DELETED' || item.status === 'ARCHIVED';
                return (
                  <div
                    key={item.id}
                    onClick={() => !isDisabled && handleSelect(item.id)}
                    style={{ padding: options ? '10px 16px' : '12px 16px', cursor: isDisabled ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: '2px', background: isItemSel ? `rgba(${highlight ? '16,185,129' : '24,119,242'},0.1)` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.02)', opacity: isDisabled ? 0.4 : 1 }}
                    onMouseEnter={e => !isDisabled && (e.currentTarget.style.background = isItemSel ? `rgba(${highlight ? '16,185,129' : '24,119,242'},0.1)` : 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => !isDisabled && (e.currentTarget.style.background = isItemSel ? `rgba(${highlight ? '16,185,129' : '24,119,242'},0.1)` : 'transparent')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: isItemSel ? accentColor : item.id === '' ? 'var(--text-muted)' : 'var(--text-main)' }}>{item.name}</span>
                      {isDisabled && <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>INATIVA</span>}
                    </div>
                    {!options && item.id !== '' && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {item.id}</span>}
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma correspondência encontrada.</div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const usingExistingAdSet = campAction === 'existing' && adSetAction === 'existing' && selectedAdSetIds.length > 0;

  // Objetivo ativo (detectado da campanha existente ou selecionado na nova)
  const activeObjective = campaignObjective || campData.objective;

  const MSG_DEST_TYPES = ['MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT'];
  const MSG_OBJECTIVES  = ['OUTCOME_ENGAGEMENT'];

  // Destino do conjunto selecionado (apenas quando usando existente)
  const detectedDestType = usingExistingAdSet
    ? (existingAdSets.find(a => a.id === selectedAdSetIds[0])?.destination_type || 'WEBSITE')
    : 'WEBSITE';

  // Campanha de mensagens: por objetivo (ENGAGEMENT), por destino detectado, ou toggle manual
  const isAutoMsgDest =
    MSG_OBJECTIVES.includes(activeObjective) ||
    MSG_DEST_TYPES.includes(detectedDestType) ||
    forceMessagesDest;

  // URL necessária apenas nestas condições:
  const needsUrl = !isAutoMsgDest && (
    activeObjective === 'OUTCOME_TRAFFIC' ||
    activeObjective === 'OUTCOME_SALES'   ||
    (activeObjective === 'OUTCOME_LEADS' && leadDestType === 'WEBSITE')
  );

  const isLeadFormDest = activeObjective === 'OUTCOME_LEADS' && leadDestType === 'INSTANT_FORM';

  // ─── Validação por aba ────────────────────────────────────────────────────────
  const tabErrors = {
    0: !accountData.bmId ? 'Selecione uma Business Manager.' :
       !accountData.adAccountId ? 'Selecione uma Conta de Anúncios.' :
       !accountData.pageId ? 'Selecione uma Página do Facebook.' : null,
    1: campAction === 'existing' && !campData.existingId ? 'Selecione uma campanha existente.' :
       campAction === 'existing' && adSetAction === 'existing' && selectedAdSetIds.length === 0 ? 'Selecione pelo menos um conjunto de anúncios.' :
       campAction === 'new' && !campData.name.trim() ? 'Informe o nome da campanha.' : null,
    2: (campAction === 'existing' && adSetAction === 'existing' && selectedAdSetIds.length > 0) ? null :
       !adSetData.name.trim() ? 'Informe o nome do conjunto.' : null,
    3: mediaFiles.length === 0 ? 'Adicione pelo menos 1 mídia.' :
       (needsUrl && !adsData.link.trim()) ? 'Informe a URL de destino.' : null,
  };

  const goNext = () => {
    const err = tabErrors[activeTab];
    if (err) { setError(err); return; }
    setError(null);
    // Pular Tab 2 quando campanha + conjunto já existentes foram selecionados
    if (activeTab === 1 && usingExistingAdSet) {
      setActiveTab(3);
    } else {
      setActiveTab(a => a + 1);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const allowed = files.slice(0, 20 - mediaFiles.length);
    const newMedias = allowed.map((file, idx) => ({
      id: uuidv4(), file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      index: mediaFiles.length + idx + 1,
    }));
    setMediaFiles(prev => [...prev, ...newMedias]);
    setError(null);
  };

  const removeMedia = (id) => setMediaFiles(prev => prev.filter(m => m.id !== id));

  const pushLog = (msg, status = 'loading') => setLogs(prev => [...prev, { id: Date.now() + Math.random(), msg, status }]);
  const updateLastLog = (status) => setLogs(prev => { const c = [...prev]; if (c.length) c[c.length - 1].status = status; return c; });
  const updateLogById = (id, status) => setLogs(prev => prev.map(l => l.id === id ? { ...l, status } : l));

  const handlePublishBatch = async () => {
    const err = tabErrors[3];
    if (err) { setError(err); return; }

    setIsPublishing(true);
    setPublishDone(false);
    setError(null);
    setActiveTab(4);
    setLogs([]);
    setProgress(0);

    const token = localStorage.getItem('meta_access_token');
    const adAccountId = accountData.adAccountId;
    const selectedBm = bms.find(b => b.id === accountData.bmId);
    const selectedAccount = adAccounts.find(a => a.id === accountData.adAccountId);

    // ── Cache SHA-256 ────────────────────────────────────────────────────────
    const UPLOAD_CACHE_KEY = `meta_uploaded_${adAccountId}`;
    const uploadCache = (() => {
      try { return JSON.parse(localStorage.getItem(UPLOAD_CACHE_KEY)) || {}; } catch { return {}; }
    })();
    const saveCache = () => localStorage.setItem(UPLOAD_CACHE_KEY, JSON.stringify(uploadCache));

    const fileHash = async (file) => {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // ── Semáforo (máx 5 uploads paralelos) ──────────────────────────────────
    const makeSem = (n) => {
      let active = 0;
      const q = [];
      const run = () => {
        if (active >= n || !q.length) return;
        active++;
        const { fn, res, rej } = q.shift();
        fn().then(res).catch(rej).finally(() => { active--; run(); });
      };
      return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); run(); });
    };
    const sem = makeSem(5);

    // ── Fetch com retry em rate-limit ────────────────────────────────────────
    const RATE_CODES = new Set([4, 17, 32, 80004]);
    const fetchRetry = async (url, opts, tries = 4) => {
      for (let i = 0; i <= tries; i++) {
        const r = await fetch(url, opts);
        const j = await r.json();
        if (j.error && RATE_CODES.has(j.error.code)) {
          if (i === tries) throw new Error(`Rate limit Meta (${j.error.code}). Aguarde e tente novamente.`);
          const wait = Math.min(15 * 2 ** i, 120);
          pushLog(`⏳ Rate limit (${j.error.code}) — aguardando ${wait}s...`, 'loading');
          await new Promise(r => setTimeout(r, wait * 1000));
          continue;
        }
        return j;
      }
    };

    // ── POST simples na Graph API ────────────────────────────────────────────
    const apiPost = async (endpoint, params) => {
      const body = new URLSearchParams({ ...params, access_token: token });
      const j = await fetchRetry(`${META_API}/${endpoint}`, { method: 'POST', body });
      if (j?.error) throw new Error(`[${j.error.code}] ${j.error.error_user_msg || j.error.message}`);
      return j;
    };

    // ── Upload de IMAGEM ─────────────────────────────────────────────────────
    const uploadImage = async (file) => {
      const form = new FormData();
      form.append('access_token', token);
      form.append('filename', file);
      const j = await fetchRetry(`${META_API}/${adAccountId}/adimages`, { method: 'POST', body: form });
      if (j?.error) throw new Error(`[IMG] ${j.error.message}`);
      const img = Object.values(j.images || {})[0];
      if (!img?.hash) throw new Error('Upload de imagem não retornou hash.');
      return { type: 'IMAGE', hash: img.hash };
    };

    // ── Upload de VÍDEO (chunked via graph.facebook.com) ────────────────────
    // graph.facebook.com tem CORS correto para uso no browser (rupload não tem)
    const uploadVideo = async (file, logPrefix) => {
      const totalChunks = Math.ceil(file.size / VIDEO_CHUNK_SIZE);
      pushLog(`${logPrefix} Enviando vídeo em ${totalChunks} parte(s)...`, 'loading');

      // PASSO 1: start
      const startForm = new FormData();
      startForm.append('access_token', token);
      startForm.append('upload_phase', 'start');
      startForm.append('file_size', file.size);
      const startRes = await fetchRetry(`${META_API}/${adAccountId}/advideos`, { method: 'POST', body: startForm });
      if (startRes?.error) throw new Error(`[VIDEO-START] ${startRes.error.message}`);
      const { upload_session_id, video_id: videoId } = startRes;
      let { start_offset: startOffset, end_offset: endOffset } = startRes;

      // PASSO 2: transfer chunks
      for (let idx = 0; idx < totalChunks; idx++) {
        const chunkStart = parseInt(startOffset, 10);
        const chunkEnd = parseInt(endOffset, 10);
        const chunkForm = new FormData();
        chunkForm.append('access_token', token);
        chunkForm.append('upload_phase', 'transfer');
        chunkForm.append('upload_session_id', upload_session_id);
        chunkForm.append('start_offset', startOffset);
        chunkForm.append('end_offset', endOffset);
        chunkForm.append('video_file_chunk', file.slice(chunkStart, chunkEnd), file.name);
        const chunkRes = await fetchRetry(`${META_API}/${adAccountId}/advideos`, { method: 'POST', body: chunkForm });
        if (chunkRes?.error) throw new Error(`[VIDEO-CHUNK ${idx + 1}] ${chunkRes.error.message}`);
        startOffset = chunkRes.start_offset;
        endOffset = chunkRes.end_offset;
        const pct = Math.round(((idx + 1) / totalChunks) * 100);
        pushLog(`${logPrefix} Upload ${pct}% (${idx + 1}/${totalChunks})`, 'loading');
      }

      // PASSO 3: finish — video_id pode ser usado imediatamente no criativo
      // (Meta processa async; anúncio fica PAUSED até vídeo ficar ready)
      const finishForm = new FormData();
      finishForm.append('access_token', token);
      finishForm.append('upload_phase', 'finish');
      finishForm.append('upload_session_id', upload_session_id);
      finishForm.append('title', file.name);
      const finishRes = await fetchRetry(`${META_API}/${adAccountId}/advideos`, { method: 'POST', body: finishForm });
      if (finishRes?.error) throw new Error(`[VIDEO-FINISH] ${finishRes.error.message}`);
      return { type: 'VIDEO', id: finishRes.video_id || videoId };
    };

    // ── Thumbnail (captura frame 0.5s do vídeo) ──────────────────────────────
    const captureThumbnail = (file) => new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadeddata = () => { video.currentTime = 0.5; };
      video.onseeked = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          canvas.getContext('2d').drawImage(video, 0, 0);
          URL.revokeObjectURL(url);
          canvas.toBlob(async (blob) => {
            try {
              const form = new FormData();
              form.append('access_token', token);
              form.append('filename', blob, 'thumb.jpg');
              const j = await fetchRetry(`${META_API}/${adAccountId}/adimages`, { method: 'POST', body: form });
              resolve(Object.values(j?.images || {})[0]?.hash || null);
            } catch { resolve(null); }
          }, 'image/jpeg', 0.85);
        } catch { URL.revokeObjectURL(url); resolve(null); }
      };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    });

    // ── Batch item com encoding correto ──────────────────────────────────────
    // CORREÇÃO: body deve ser string URL-encoded manualmente (não URLSearchParams)
    // para garantir que JSON strings dentro dos values sejam encodados corretamente
    const buildBatchItem = (relativeUrl, params) => ({
      method: 'POST',
      relative_url: relativeUrl,
      body: Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v)}`)
        .join('&'),
    });

    // ── object_story_spec por tipo de mídia ──────────────────────────────────
    const buildStorySpec = ({ uploaded, thumbHash, isMsgDest, isWhatsApp, isMessenger, isLeadForm, isMultiDest, finalUrl, pageId, igId, copy }) => {

      // ── page_welcome_message: obrigatório para Click to WhatsApp direto ───────
      const pageWelcomeMessage = (isWhatsApp && !isMultiDest) ? {
        type: 'VISUAL_EDITOR',
        version: 2,
        landing_screen_type: 'welcome_message',
        media_type: 'text',
        text_format: {
          customer_action_type: 'autofill_message',
          message: {
            autofill_message: { content: copy.whatsappWelcomeMsg || 'Olá! Gostaria de mais informações.' },
            text: copy.primaryText || 'Olá! Como posso ajudar?',
          },
        },
      } : undefined;

      // ── CTA por destino ──────────────────────────────────────────────────────
      let cta;
      if (isMultiDest && isMsgDest) {
        cta = { type: 'MESSAGE_PAGE', value: {} };
      } else if (isWhatsApp) {
        cta = { type: 'WHATSAPP_MESSAGE', value: { app_destination: 'WHATSAPP' } };
      } else if (isMessenger) {
        cta = { type: 'MESSAGE_PAGE', value: { app_destination: 'MESSENGER' } };
      } else if (isLeadForm) {
        const ctaVal = copy.leadFormId ? { lead_gen_form_id: copy.leadFormId } : {};
        cta = { type: 'SIGN_UP', value: ctaVal };
      } else {
        cta = { type: copy.cta, value: { link: finalUrl } };
      }

      const spec = { page_id: pageId };
      if (igId) spec.instagram_user_id = igId;

      if (uploaded.type === 'VIDEO') {
        spec.video_data = {
          video_id: uploaded.id,
          message: copy.primaryText,
          title: copy.title,
          call_to_action: cta,
          ...(thumbHash ? { image_hash: thumbHash } : {}),
          ...(pageWelcomeMessage ? { page_welcome_message: JSON.stringify(pageWelcomeMessage) } : {}),
        };
      } else {
        spec.link_data = {
          image_hash: uploaded.hash,
          link: (isWhatsApp || isMessenger || isLeadForm) ? `https://www.facebook.com/${pageId}` : finalUrl,
          message: copy.primaryText,
          name: copy.title,
          ...(copy.description ? { description: copy.description } : {}),
          call_to_action: cta,
          ...(pageWelcomeMessage ? { page_welcome_message: JSON.stringify(pageWelcomeMessage) } : {}),
        };
      }
      return spec;
    };

    try {
      pushLog(`BM: ${selectedBm?.name || accountData.bmId} · Conta: ${selectedAccount?.name || adAccountId}`, 'success');
      setProgress(5);

      if (!token) {
        pushLog('MODO DEMO — configure o token Meta em Configurações.', 'error');
        setIsPublishing(false);
        return;
      }

      // ── 1. Campanha ──────────────────────────────────────────────────────────
      let campaignId;
      if (campAction === 'existing') {
        campaignId = campData.existingId;
        pushLog(`Usando campanha: "${apiData.campaigns.find(c => c.id === campaignId)?.name || campaignId}"`, 'success');
        setProgress(15);
      } else {
        pushLog(`Criando campanha: "${campData.name}"...`);
        const payload = {
          name: campData.name,
          objective: campData.objective,
          status: 'PAUSED',
          special_ad_categories: '[]',
        };
        if (campData.budgetType === 'CBO') {
          payload.daily_budget = String(campData.budget * 100);
        } else {
          payload.is_adset_budget_sharing_enabled = 'false';
        }
        const r = await apiPost(`${adAccountId}/campaigns`, payload);
        campaignId = r.id;
        updateLastLog('success');
        pushLog(`Campanha criada · ID: ${campaignId}`, 'success');
        setProgress(15);
      }

      // ── 2. Conjunto de anúncios ──────────────────────────────────────────────
      // allAdSetIds: multi-select existentes OU array com ID do conjunto novo/único
      let allAdSetIds;
      if (campAction === 'existing' && adSetAction === 'existing' && selectedAdSetIds.length > 0) {
        allAdSetIds = selectedAdSetIds;
        const names = selectedAdSetIds.map(id => existingAdSets.find(a => a.id === id)?.name || id).join(', ');
        pushLog(`Usando ${selectedAdSetIds.length} conjunto(s): ${names}`, 'success');
        setProgress(25);
      } else {
        const effectiveObjective = campaignObjective || campData.objective;
        if (effectiveObjective === 'OUTCOME_SALES' && !adSetData.pixelId) {
          pushLog('⚠️ Sem pixel — conjunto será otimizado por Cliques no Link.', 'success');
        }

        pushLog(`Criando conjunto: "${adSetData.name}"...`);
        const targeting = adSetData.placements === 'ADVANTAGE_PLUS'
          ? { geo_locations: { countries: ['BR'] } }
          : { geo_locations: { countries: ['BR'] }, publisher_platforms: ['facebook', 'instagram'], facebook_positions: ['feed', 'story', 'facebook_reels'], instagram_positions: ['stream', 'story', 'reels'] };

        const adSetPayload = {
          name: adSetData.name,
          campaign_id: campaignId,
          optimization_goal: adSetData.optimizationGoal,
          billing_event: 'IMPRESSIONS',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          status: 'PAUSED',
          targeting: JSON.stringify(targeting),
        };
        if (campData.budgetType !== 'CBO') adSetPayload.daily_budget = String(adSetData.budget * 100);

        if (effectiveObjective === 'OUTCOME_SALES') {
          if (adSetData.pixelId) {
            adSetPayload.promoted_object = JSON.stringify({ pixel_id: adSetData.pixelId, custom_event_type: saleConversionEvent });
            adSetPayload.destination_type  = 'WEBSITE';
            adSetPayload.optimization_goal = 'OFFSITE_CONVERSIONS';
          } else {
            // Sem pixel: fallback para cliques (evita erro de promoted_object vazio)
            adSetPayload.optimization_goal = 'LINK_CLICKS';
            adSetPayload.destination_type  = 'WEBSITE';
          }
        } else if (effectiveObjective === 'OUTCOME_LEADS') {
          if (leadDestType === 'INSTANT_FORM') {
            adSetPayload.destination_type   = 'ON_AD';
            adSetPayload.optimization_goal  = 'LEAD_GENERATION';
            adSetPayload.promoted_object    = JSON.stringify({ page_id: accountData.pageId });
          } else if (leadDestType === 'WEBSITE') {
            // LEAD_GENERATION é inválido para WEBSITE — usar goal selecionado pelo usuário
            // com fallback para LINK_CLICKS se ainda estiver no default de formulário
            const VALID_WEBSITE_GOALS = ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'OFFSITE_CONVERSIONS'];
            const websiteGoal = VALID_WEBSITE_GOALS.includes(adSetData.optimizationGoal)
              ? adSetData.optimizationGoal
              : 'LINK_CLICKS';
            adSetPayload.destination_type   = 'WEBSITE';
            adSetPayload.optimization_goal  = websiteGoal;
            if (websiteGoal === 'OFFSITE_CONVERSIONS' && adSetData.pixelId) {
              adSetPayload.promoted_object = JSON.stringify({ pixel_id: adSetData.pixelId, custom_event_type: 'LEAD' });
            } else {
              adSetPayload.promoted_object = JSON.stringify({ page_id: accountData.pageId });
            }
          } else if (leadDestType === 'WHATSAPP') {
            adSetPayload.destination_type   = 'WHATSAPP';
            adSetPayload.optimization_goal  = 'CONVERSATIONS';
            adSetPayload.promoted_object    = JSON.stringify({ page_id: accountData.pageId });
          } else if (leadDestType === 'MESSENGER') {
            adSetPayload.destination_type   = 'MESSENGER';
            adSetPayload.optimization_goal  = 'CONVERSATIONS';
            adSetPayload.promoted_object    = JSON.stringify({ page_id: accountData.pageId });
          }
        } else if (effectiveObjective === 'OUTCOME_TRAFFIC') {
          adSetPayload.destination_type = 'WEBSITE';
        } else if (effectiveObjective === 'OUTCOME_ENGAGEMENT') {
          adSetPayload.destination_type = 'WEBSITE';
        }

        const r = await apiPost(`${adAccountId}/adsets`, adSetPayload);
        allAdSetIds = [r.id];
        updateLastLog('success');
        pushLog(`Conjunto criado · ID: ${r.id}`, 'success');
        setProgress(25);
      }

      // ── Resolver destination_type + promoted_object do conjunto ─────────────
      const KNOWN_DEST_TYPES = ['WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM_DIRECT', 'ON_AD', 'APP', 'FACEBOOK'];
      let resolvedDestType = 'WEBSITE';
      let adSetPromotedObject = null;
      let isMultiDestAdSet = false; // adsets de múltiplos destinos exigem degrees_of_freedom_spec no criativo
      if (campAction === 'existing' && adSetAction === 'existing' && allAdSetIds.length > 0) {
        const cached = existingAdSets.find(a => a.id === allAdSetIds[0]);
        const cachedDestType = cached?.destination_type;
        if (cachedDestType && KNOWN_DEST_TYPES.includes(cachedDestType)) {
          resolvedDestType = cachedDestType;
        } else {
          // destination_type indefinido ('UNDEFINED', null, etc.) → adset multi-destino
          isMultiDestAdSet = true;
          if (cachedDestType && !KNOWN_DEST_TYPES.includes(cachedDestType)) {
            pushLog(`⚠️ destination_type "${cachedDestType}" — tratando como multi-destino`, 'loading');
          }
          const dtRes = await fetch(`${META_API}/${allAdSetIds[0]}?fields=destination_type,promoted_object,optimization_goal&access_token=${token}`)
            .then(r => r.json()).catch(() => ({}));
          const apiDest = dtRes.destination_type;
          if (apiDest && KNOWN_DEST_TYPES.includes(apiDest)) {
            resolvedDestType = apiDest;
            isMultiDestAdSet = false; // API confirmou destino único
          } else if (dtRes.optimization_goal === 'CONVERSATIONS') {
            resolvedDestType = 'WHATSAPP';
            pushLog(`⚠️ destination_type indefinido — inferido como WHATSAPP por optimization_goal=CONVERSATIONS`, 'loading');
          } else {
            resolvedDestType = 'WEBSITE';
          }
          adSetPromotedObject = dtRes.promoted_object || null;
        }
        pushLog(`Destino do conjunto: ${resolvedDestType}${isMultiDestAdSet ? ' (multi-destino)' : ''}`, 'success');
        // Buscar promoted_object se ainda não foi obtido
        if (!adSetPromotedObject) {
          const poRes = await fetch(`${META_API}/${allAdSetIds[0]}?fields=promoted_object,optimization_goal&access_token=${token}`)
            .then(r => r.json()).catch(() => ({}));
          adSetPromotedObject = poRes.promoted_object || null;
        }
      }

      // ── 3. Upload de mídias em paralelo ──────────────────────────────────────
      const isWhatsApp  = resolvedDestType === 'WHATSAPP'  || (forceMessagesDest && resolvedDestType !== 'MESSENGER' && resolvedDestType !== 'INSTAGRAM_DIRECT');
      const isMessenger = resolvedDestType === 'MESSENGER' || (forceMessagesDest && resolvedDestType === 'MESSENGER');
      const isMsgDest   = isWhatsApp || isMessenger || resolvedDestType === 'INSTAGRAM_DIRECT' || forceMessagesDest;
      const effectiveObjPub = campaignObjective || campData.objective;
      const isLeadForm  = (effectiveObjPub === 'OUTCOME_LEADS' && leadDestType === 'INSTANT_FORM')
                        || resolvedDestType === 'ON_AD';
      const finalUrl = (isMsgDest || !needsUrl) ? '' : (adsData.link + (adsData.utmTags || ''));

      if (isMsgDest) {
        const destLabel = { WHATSAPP: 'WhatsApp', MESSENGER: 'Messenger', INSTAGRAM_DIRECT: 'Instagram Direct' }[resolvedDestType] || resolvedDestType;
        pushLog(`📱 Destino: ${destLabel} — criativo sem URL externa`, 'success');
      } else if (isLeadForm) {
        pushLog(`📋 Destino: Formulário Instantâneo (Lead Form)`, 'success');
      } else {
        const objLabels = { OUTCOME_TRAFFIC: '🚦 Tráfego', OUTCOME_LEADS: '📋 Leads', OUTCOME_SALES: '🛒 Vendas', OUTCOME_ENGAGEMENT: '💬 Engajamento' };
        pushLog(`Objetivo: ${objLabels[effectiveObjPub] || effectiveObjPub} | Destino: ${resolvedDestType}`, 'success');
      }

      pushLog(`Enviando ${mediaFiles.length} mídia(s) em paralelo (máx 5)...`);

      const uploadResults = await Promise.all(mediaFiles.map(async (media, i) => {
        const logPrefix = `[${i + 1}/${mediaFiles.length}]`;
        const adName = resolveAdName(adsData.namingPattern, i + 1);
        const logId = `up-${i}`;
        setLogs(prev => [...prev, { id: logId, msg: `${logPrefix} Enviando: ${media.file.name}...`, status: 'loading' }]);
        try {
          const hash = await fileHash(media.file);
          const thumbCacheKey = `${hash}_thumb`;
          if (uploadCache[hash]) {
            // Thumbnail também pode estar em cache; se não, recaptura agora
            let thumbHash = uploadCache[thumbCacheKey] || null;
            if (media.type === 'VIDEO' && !thumbHash) {
              thumbHash = await sem(() => captureThumbnail(media.file));
              if (thumbHash) { uploadCache[thumbCacheKey] = thumbHash; saveCache(); }
            }
            if (media.type === 'VIDEO' && !thumbHash) throw new Error(`Thumbnail do vídeo não pôde ser capturada: ${media.file.name}`);
            updateLogById(logId, 'success');
            pushLog(`${logPrefix} ♻️ Reutilizando (${media.file.name})`, 'success');
            return { uploaded: uploadCache[hash], thumbHash, adName };
          }
          const [uploaded, thumbHash] = await Promise.all([
            sem(() => media.type === 'IMAGE' ? uploadImage(media.file) : uploadVideo(media.file, logPrefix)),
            media.type === 'VIDEO' ? sem(() => captureThumbnail(media.file)) : Promise.resolve(null),
          ]);
          if (media.type === 'VIDEO' && !thumbHash) throw new Error(`Thumbnail do vídeo não pôde ser capturada: ${media.file.name}`);
          uploadCache[hash] = uploaded;
          if (thumbHash) uploadCache[thumbCacheKey] = thumbHash;
          saveCache();
          updateLogById(logId, 'success');
          setProgress(prev => Math.min(prev + Math.round(55 / mediaFiles.length), 80));
          return { uploaded, thumbHash, adName, fileId: media.id };
        } catch (e) {
          updateLogById(logId, 'error');
          throw e;
        }
      }));

      // ── 4. Batch: criativos ──────────────────────────────────────────────────
      pushLog(`Criando ${uploadResults.length} criativo(s) via Batch API...`);
      const resolveCopy = (fileId) => individualCopyMode ? {
        primaryText:      adCopyOverrides[fileId]?.primaryText      ?? adsData.primaryText,
        title:            adCopyOverrides[fileId]?.title             ?? adsData.title,
        description:      adCopyOverrides[fileId]?.description       ?? adsData.description,
        cta:              adCopyOverrides[fileId]?.cta               ?? adsData.cta,
        link:             adCopyOverrides[fileId]?.link              ?? adsData.link,
        utmTags:          adCopyOverrides[fileId]?.utmTags           ?? adsData.utmTags,
        whatsappWelcomeMsg: adCopyOverrides[fileId]?.whatsappWelcomeMsg ?? adsData.whatsappWelcomeMsg,
        leadFormId:       adCopyOverrides[fileId]?.leadFormId        ?? adsData.leadFormId,
      } : adsData;

      const creativeBatch = uploadResults.map(({ uploaded, thumbHash, adName, fileId }) => {
        const copy = resolveCopy(fileId);
        const perFileFinalUrl = (isMsgDest || !needsUrl) ? '' : (copy.link + (copy.utmTags || ''));
        const isMultiDest = isMultiDestAdSet;
        const storySpec = JSON.stringify(buildStorySpec({
          uploaded, thumbHash, isMsgDest, isWhatsApp, isMessenger, isLeadForm,
          isMultiDest, finalUrl: perFileFinalUrl, pageId: accountData.pageId,
          igId: adSetData.igId || '', copy,
        }));
        const creativeParams = isMultiDest ? {
          name: `Creative - ${adName}`,
          object_story_spec: storySpec,
          degrees_of_freedom_spec: JSON.stringify({ creative_features_spec: {} }),
          access_token: token,
        } : {
          name: `Creative - ${adName}`,
          object_story_spec: storySpec,
          access_token: token,
        };
        return buildBatchItem(`${adAccountId}/adcreatives`, creativeParams);
      });

      const batchCreativeRes = await fetchRetry(`${META_API}/`, {
        method: 'POST',
        body: new URLSearchParams({ access_token: token, batch: JSON.stringify(creativeBatch) }),
      });
      const creativeIds = [];
      for (let i = 0; i < batchCreativeRes.length; i++) {
        let body;
        try { body = JSON.parse(batchCreativeRes[i].body || '{}'); } catch { body = {}; }
        if (batchCreativeRes[i].code !== 200 || body.error) {
          throw new Error(`Criativo [${i + 1}]: ${body.error?.message || `HTTP ${batchCreativeRes[i].code}`} | Subcode: ${body.error?.error_subcode || 'N/A'}`);
        }
        creativeIds.push(body.id);
      }
      updateLastLog('success');
      setProgress(90);

      // ── 5. Batch: anúncios (loop por AdSet) ──────────────────────────────────
      let totalCreated = 0;
      for (let si = 0; si < allAdSetIds.length; si++) {
        const currentAdSetId = allAdSetIds[si];
        const currentAdSetName = existingAdSets.find(a => a.id === currentAdSetId)?.name || currentAdSetId;
        const adsLogId = `ads-batch-${si}`;
        setLogs(prev => [...prev, { id: adsLogId, msg: `Criando ${creativeIds.length} anúncio(s) no conjunto "${currentAdSetName}" (${si + 1}/${allAdSetIds.length})...`, status: 'loading' }]);

        // tracking_specs obrigatório quando o conjunto usa pixel (evita erro 2446493)
        const pixelId = adSetPromotedObject?.pixel_id;
        const trackingSpecs = pixelId
          ? JSON.stringify([{ 'action.type': ['offsite_conversion'], fb_pixel: [pixelId] }])
          : null;

        const adsBatch = uploadResults.map(({ adName }, idx) =>
          buildBatchItem(`${adAccountId}/ads`, {
            name: adName,
            adset_id: currentAdSetId,
            creative: JSON.stringify({ creative_id: creativeIds[idx] }),
            status: 'PAUSED',
            ...(trackingSpecs ? { tracking_specs: trackingSpecs } : {}),
            access_token: token,
          })
        );

        const batchAdsRes = await fetchRetry(`${META_API}/`, {
          method: 'POST',
          body: new URLSearchParams({ access_token: token, batch: JSON.stringify(adsBatch) }),
        });

        // Validar que a resposta é um array (se for objeto com .error, a API falhou)
        if (!Array.isArray(batchAdsRes)) {
          const apiErr = batchAdsRes?.error;
          throw new Error(`Batch de anúncios falhou: [${apiErr?.code}] ${apiErr?.message || JSON.stringify(batchAdsRes)}`);
        }

        let okCount = 0;
        for (const item of batchAdsRes) {
          let body;
          try { body = JSON.parse(item.body || '{}'); } catch { body = {}; }
          if (item.code !== 200 || body.error) {
            const errDetail = body.error?.error_user_msg || body.error?.message || 'sem detalhe';
            const errSub = body.error?.error_subcode || 'N/A';
            pushLog(`Anúncio falhou [HTTP ${item.code}]: ${errDetail} (sub: ${errSub})`, 'error');
          } else { okCount++; }
        }
        updateLogById(adsLogId, okCount > 0 ? 'success' : 'error');
        pushLog(`${okCount > 0 ? '✅' : '❌'} ${okCount}/${creativeIds.length} anúncio(s) criado(s) em "${currentAdSetName}"`, okCount > 0 ? 'success' : 'error');
        totalCreated += okCount;
      }

      setProgress(100);
      if (totalCreated === 0) {
        throw new Error(`Nenhum anúncio foi criado (0/${creativeIds.length * allAdSetIds.length}). Veja os erros acima para detalhes.`);
      }
      if (adsData.utmTags) pushLog('UTM tags aplicadas em todos os anúncios.', 'success');
      pushLog(`✅ ${totalCreated} anúncio(s) no total (${allAdSetIds.length} conjunto(s)) — todos PAUSADOS.`, 'success');
      pushLog('Revise e ative no Gerenciador de Anúncios quando pronto.', 'success');
      setPublishDone(true);

    } catch (err) {
      updateLastLog('error');
      const msg = err.message || 'Erro desconhecido na Graph API.';
      pushLog(`ERRO: ${msg}`, 'error');
      setError(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Tela de Publicação (Logs) ────────────────────────────────────────────────
  if (activeTab === 4) {
    const currentLog = [...logs].reverse().find(l => l.status === 'loading') || logs[logs.length - 1];
    const barColor = error ? '#ef4444' : progress === 100 ? '#10b981' : 'linear-gradient(90deg, #1877F2, #8b5cf6)';

    return (
      <div className="modal-overlay" style={{ zIndex: 9999 }}>
        <div style={{ width: '520px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isPublishing
              ? <Loader2 size={20} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
              : error ? <AlertCircle size={20} color="#ef4444" />
              : <CheckCircle size={20} color="#10b981" />}
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              {isPublishing ? 'Publicando...' : error ? 'Erro na publicação' : 'Campanha Enviada!'}
            </h2>
            <span style={{ marginLeft: 'auto', fontSize: '15px', fontWeight: '800', color: error ? '#ef4444' : progress === 100 ? '#10b981' : 'var(--primary)' }}>
              {progress}%
            </span>
          </div>

          {/* Barra de progresso */}
          <div style={{ height: '5px', background: 'var(--border-light)' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: barColor,
              transition: 'width 0.5s ease',
              borderRadius: '0 3px 3px 0',
            }} />
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px' }}>
            {/* Etapa atual */}
            {isPublishing && currentLog && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(24,119,242,0.06)', borderRadius: '8px', border: '1px solid rgba(24,119,242,0.15)' }}>
                <Loader2 size={15} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{currentLog.msg}</span>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#ef4444', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                {error}
              </div>
            )}

            {/* Log compacto (só sucesso/erro) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
              {logs.filter(l => l.status === 'success' || l.status === 'error').map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                  {log.status === 'success'
                    ? <CheckCircle size={13} color="#10b981" style={{ flexShrink: 0, marginTop: '1px' }} />
                    : <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />}
                  <span style={{ color: log.status === 'error' ? '#ef4444' : 'var(--text-muted)', fontWeight: '500' }}>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {publishDone && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                Fechar
              </button>
              <button onClick={onComplete} style={{ padding: '10px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #1877F2, #0056d6)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(24,119,242,0.3)' }}>
                ✓ Mover para Em Andamento
              </button>
            </div>
          )}
          {!publishDone && !isPublishing && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
              <button onClick={() => setActiveTab(3)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                ← Voltar
              </button>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Input helper ─────────────────────────────────────────────────────────────
  const Field = ({ label, value, onChange, placeholder, type = 'text', width = '100%', required }) => (
    <div style={{ width }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );

  const SelectField = ({ label, value, onChange, required, highlight, options, items, placeholder }) => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: '700', color: highlight ? '#10b981' : 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
      </label>
      <SearchableSelect
        items={items}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder || 'Selecione...'}
        highlight={highlight}
      />
    </div>
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div style={{ width: '820px', maxWidth: '96vw', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', height: '88vh' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #1877F2, #0056d6)', padding: '8px', borderRadius: '10px', color: 'white', flexShrink: 0 }}>
              <Database size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.2 }}>Meta Ad Creator</h2>
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
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Demo banner */}
        {isDemoMode && (
          <div style={{ padding: '10px 24px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} color="#f59e0b" />
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
              Modo demonstração — vá em <strong>Configurações → Integrações</strong> para configurar o token da Meta API e publicar de verdade.
            </span>
          </div>
        )}

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Sidebar de abas */}
          <div style={{ width: '210px', flexShrink: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-light)', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['0. Conta & BM', '1. Campanha', '2. Conjunto de Anúncios', '3. Criativos (Lote)'].map((t, i) => (
              <button
                key={i}
                onClick={() => { setError(null); setActiveTab(i); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                  background: activeTab === i ? 'rgba(139,92,246,0.1)' : 'transparent',
                  color: activeTab === i ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <span>{t}</span>
                {activeTab > i && !tabErrors[i] && <CheckCircle size={14} color="#10b981" />}
              </button>
            ))}

            {activeTab === 3 && mediaFiles.length > 0 && (
              <div style={{ marginTop: 'auto', padding: '14px', background: 'var(--bg-app)', border: '1px solid var(--primary)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Resumo</div>
                <div style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: '800' }}>{mediaFiles.length} ad{mediaFiles.length > 1 ? 's' : ''}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '2px' }}>prontos para publicar</div>
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
            {loadingApi ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-muted)', gap: '12px' }}>
                <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '13px', fontWeight: '600' }}>Sincronizando com a Business Manager...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                {/* ── ABA 0: Conta & BM ── */}
                {activeTab === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

                    {/* ── Carregar por cliente ── */}
                    {(() => {
                      const configured = CLIENTS.filter(c => {
                        try { return !!JSON.parse(localStorage.getItem(`meta_defaults_${c.id}`))?.bmId; } catch { return false; }
                      });
                      if (configured.length === 0) return null;
                      return (
                        <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                            Carregar conta por cliente
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {configured.map(client => {
                              try {
                                const saved = JSON.parse(localStorage.getItem(`meta_defaults_${client.id}`));
                                const isActive = accountData.bmId === saved.bmId && accountData.adAccountId === saved.adAccountId;
                                return (
                                  <button
                                    key={client.id}
                                    onClick={() => applyPreset({ bmId: saved.bmId, adAccountId: saved.adAccountId, pageId: saved.pageId || '', bmName: '', adAccountName: '', pageName: '' })}
                                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 13px', borderRadius: '8px', border: `1px solid ${isActive ? '#10b981' : 'var(--border-main)'}`, background: isActive ? 'rgba(16,185,129,0.08)' : 'var(--bg-app)', color: isActive ? '#10b981' : 'var(--text-main)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-main)'; }}
                                  >
                                    <img src={client.avatarUrl} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                    {client.name}
                                    {isActive && <CheckCircle size={12} />}
                                  </button>
                                );
                              } catch { return null; }
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Presets salvos ── */}
                    {presets.length > 0 && (
                      <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                          ★ Configurações Salvas
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {presets.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px' }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.bmName} → {p.adAccountName} → {p.pageName}
                                </div>
                              </div>
                              <button
                                onClick={() => applyPreset(p)}
                                style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(24,119,242,0.4)', background: 'rgba(24,119,242,0.08)', color: '#1877F2', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >Aplicar</button>
                              <button
                                onClick={() => deletePreset(p.id)}
                                style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              ><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── ETAPA 1: Business Manager ── */}
                    {(() => {
                      const done = !!accountData.bmId;
                      return (
                        <div style={{ paddingBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? '#10b981' : '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                              {done ? <CheckCircle size={14} /> : '1'}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business Manager</span>
                            {done && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>— {bms.find(b => b.id === accountData.bmId)?.name}</span>}
                          </div>
                          {loadingBms ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', paddingLeft: '36px' }}>
                              <Loader2 size={14} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} /> Carregando...
                            </div>
                          ) : (
                            <div style={{ paddingLeft: '36px', maxWidth: '400px' }}>
                              <SearchableSelect 
                                items={bms} 
                                value={accountData.bmId} 
                                onChange={(id) => setAccountData({ bmId: id, adAccountId: '', pageId: '' })} 
                                placeholder="Selecione a Business Manager..." 
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── ETAPA 2: Conta de Anúncios ── */}
                    {accountData.bmId && (() => {
                      const done = !!accountData.adAccountId;
                      return (
                        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', paddingBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? '#10b981' : '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                              {done ? <CheckCircle size={14} /> : '2'}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conta de Anúncios</span>
                          </div>
                          {adAccounts.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '36px' }}>Nenhuma conta encontrada nesta BM.</div>
                          ) : (
                            <div style={{ paddingLeft: '36px', maxWidth: '400px' }}>
                              <SearchableSelect 
                                items={adAccounts} 
                                value={accountData.adAccountId} 
                                onChange={(id) => setAccountData(a => ({ ...a, adAccountId: id, pageId: '' }))} 
                                placeholder="Selecione a Conta..." 
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── ETAPA 3: Página do Facebook ── */}
                    {accountData.adAccountId && (() => {
                      const done = !!accountData.pageId;
                      return (
                        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', paddingBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? '#10b981' : '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                              {done ? <CheckCircle size={14} /> : '3'}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Página do Facebook</span>
                          </div>
                          <div style={{ paddingLeft: '36px', maxWidth: '400px' }}>
                            {loadingApi ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                <Loader2 size={14} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} /> Carregando páginas...
                              </div>
                            ) : apiData.pages.length > 0 ? (
                              <SearchableSelect 
                                items={apiData.pages} 
                                value={accountData.pageId} 
                                onChange={(id) => setAccountData(a => ({ ...a, pageId: id }))} 
                                placeholder="Busque a Página..." 
                              />
                            ) : (
                              <div>
                                <input type="text" placeholder="Cole o ID da Página do Facebook" value={accountData.pageId} onChange={e => setAccountData(a => ({ ...a, pageId: e.target.value }))}
                                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                <p style={{ fontSize: '10px', color: '#f59e0b', marginTop: '5px' }}>Token sem permissão <strong>pages_show_list</strong>. Digite o ID da página manualmente.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Confirmação final ── */}
                    {accountData.bmId && accountData.adAccountId && accountData.pageId && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>
                            <strong style={{ color: '#10b981' }}>Destino confirmado · </strong>
                            {accountData.bmId !== '__direct__' && <><strong style={{ color: 'var(--text-main)' }}>{bms.find(b => b.id === accountData.bmId)?.name}</strong>{' → '}</>}
                            <strong style={{ color: 'var(--text-main)' }}>{adAccounts.find(a => a.id === accountData.adAccountId)?.name}</strong>
                            {' → '}
                            <strong style={{ color: 'var(--text-main)' }}>{apiData.pages.find(p => p.id === accountData.pageId)?.name || accountData.pageId}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button
                              onClick={saveMetaDefaults}
                              title={`Salvar como padrão (${metaStorageKey})`}
                              style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${defaultsSaved ? 'rgba(16,185,129,0.8)' : 'rgba(16,185,129,0.4)'}`, background: defaultsSaved ? 'rgba(16,185,129,0.12)' : 'transparent', color: '#10b981', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                            >
                              {defaultsSaved ? '✓ Salvo!' : '★ Padrão'}
                            </button>
                            <button
                              onClick={() => setShowSavePreset(v => !v)}
                              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.4)', background: showSavePreset ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', color: 'var(--primary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              + Config
                            </button>
                          </div>
                        </div>
                        {showSavePreset && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <input
                              type="text"
                              placeholder="Nome da configuração (ex: Instituto NTA — Principal)"
                              value={savePresetName}
                              onChange={e => setSavePresetName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && savePreset()}
                              autoFocus
                              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <button onClick={savePreset} disabled={!savePresetName.trim()} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: savePresetName.trim() ? 'var(--primary)' : 'var(--border-main)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: savePresetName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>Salvar</button>
                            <button onClick={() => { setShowSavePreset(false); setSavePresetName(''); }} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── ABA 1: Campanha ── */}
                {activeTab === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Setup da Campanha</h3>

                    <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
                      {[['new', 'Criar Nova'], ['existing', 'Usar Existente']].map(([v, l]) => (
                        <button key={v} onClick={() => setCampAction(v)} style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', background: campAction === v ? 'var(--bg-app)' : 'transparent', color: campAction === v ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: campAction === v ? '0 2px 6px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s' }}>
                          {l}
                        </button>
                      ))}
                    </div>

                    {campAction === 'existing' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Campanha Ativa <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          {apiData.campaigns.length === 0 ? (
                            <div style={{ fontSize: '13px', color: '#f59e0b', padding: '12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px' }}>
                              Nenhuma campanha ativa encontrada nesta conta.
                            </div>
                          ) : (
                            <SearchableSelect
                              items={apiData.campaigns}
                              value={campData.existingId}
                              onChange={id => { setCampData({ ...campData, existingId: id }); setAdSetAction('new'); }}
                              placeholder="Busque pelo nome da campanha..."
                            />
                          )}
                        </div>

                        {campData.existingId && (
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Conjunto de Anúncios
                            </label>
                            <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '4px', width: 'fit-content', marginBottom: '10px' }}>
                              {[['new', '+ Criar Novo'], ['existing', 'Usar Existente']].map(([v, l]) => (
                                <button key={v} onClick={() => setAdSetAction(v)} style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: 'none', background: adSetAction === v ? 'var(--bg-app)' : 'transparent', color: adSetAction === v ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: adSetAction === v ? '0 2px 6px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s' }}>
                                  {l}
                                </button>
                              ))}
                            </div>
                            {adSetAction === 'existing' && (
                              loadingAdSets ? (
                                <div style={{ fontSize: '13px', color: adSetFetchError ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Loader2 size={14} color={adSetFetchError ? '#f59e0b' : 'var(--primary)'} style={{ animation: 'spin 1s linear infinite' }} />
                                  {adSetFetchError || 'Carregando conjuntos...'}
                                </div>
                              ) : existingAdSets.length > 0 ? (
                                <div>
                                  {/* Toolbar: selecionar todos / limpar */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => setSelectedAdSetIds(existingAdSets.filter(a => a.status !== 'DELETED' && a.status !== 'ARCHIVED').map(a => a.id))}
                                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >Selecionar todos</button>
                                    <button
                                      onClick={() => setSelectedAdSetIds([])}
                                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >Limpar</button>
                                    {selectedAdSetIds.length > 0 && (
                                      <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(139,92,246,0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px' }}>
                                        {selectedAdSetIds.length} selecionado(s)
                                      </span>
                                    )}
                                  </div>
                                  {/* Lista de checkboxes */}
                                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-surface)' }}>
                                    {existingAdSets.map(adSet => {
                                      const isDisabled = adSet.status === 'DELETED' || adSet.status === 'ARCHIVED';
                                      const isChecked = selectedAdSetIds.includes(adSet.id);
                                      return (
                                        <label
                                          key={adSet.id}
                                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.4 : 1, borderBottom: '1px solid var(--border-light)', background: isChecked ? 'rgba(139,92,246,0.06)' : 'transparent' }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={isDisabled}
                                            onChange={() => toggleAdSet(adSet.id)}
                                            style={{ flexShrink: 0, accentColor: 'var(--primary)' }}
                                          />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: isChecked ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adSet.name}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {adSet.id}</div>
                                          </div>
                                          {isDisabled && <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>INATIVA</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : adSetFetchError ? (
                                <div style={{ fontSize: '12px', color: '#ef4444', padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                  <span>{adSetFetchError}</span>
                                  <button onClick={() => setAdSetRetryKey(k => k + 1)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tentar novamente</button>
                                </div>
                              ) : (
                                <div style={{ fontSize: '12px', color: '#f59e0b' }}>Nenhum conjunto ativo encontrado nesta campanha.</div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ) : (

                      <>
                        <Field label="Nome da Campanha" required value={campData.name} onChange={e => setCampData({ ...campData, name: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <SelectField label="Objetivo Meta" value={campData.objective} onChange={(newObj) => {
                            const newLabel = OBJECTIVE_LABEL(newObj);
                            const oldLabel = OBJECTIVE_LABEL(campData.objective);
                            const updatedName = campData.name.includes(`[${oldLabel}]`)
                              ? campData.name.replace(`[${oldLabel}]`, `[${newLabel}]`)
                              : campData.name;
                            setCampData({ ...campData, objective: newObj, name: updatedName });
                            setAdSetData(a => ({ ...a, optimizationGoal: OPTIMIZATION_GOALS[newObj]?.[0]?.value || 'LINK_CLICKS' }));
                          }} options={OBJECTIVES} />
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orçamento</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-main)' }}>
                                <input type="checkbox" checked={campData.budgetType === 'CBO'} onChange={e => setCampData({ ...campData, budgetType: e.target.checked ? 'CBO' : 'ABO' })} />
                                CBO (Advantage+)
                              </label>
                            </div>
                          </div>
                        </div>
                        {campData.budgetType === 'CBO' && (
                          <Field label="Orçamento Diário CBO (R$)" type="number" value={campData.budget} onChange={e => setCampData({ ...campData, budget: Number(e.target.value) })} width="48%" />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px' }}>
                          <CheckCircle size={15} color="#10b981" />
                          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>
                            Status: PAUSADA — revise no Ads Manager antes de ativar
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── ABA 2: Conjunto ── */}
                {activeTab === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Conjunto de Anúncios (Ad Set)</h3>

                    {/* Badge: objetivo detectado da campanha existente */}
                    {campAction === 'existing' && (
                      loadingObjective ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <Loader2 size={13} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                          Detectando objetivo da campanha...
                        </div>
                      ) : campaignObjective ? (
                        <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '8px', fontSize: '12px', color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          ⚡ Objetivo detectado: {OBJECTIVE_LABEL(campaignObjective)} — parâmetros ajustados automaticamente
                        </div>
                      ) : null
                    )}

                    <Field label="Nome do Conjunto" required value={adSetData.name} onChange={e => setAdSetData({ ...adSetData, name: e.target.value })} />

                    <div style={{ padding: '10px 14px', background: 'rgba(24,119,242,0.05)', border: '1px solid rgba(24,119,242,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <CheckCircle size={13} color="#1877F2" />
                      <span style={{ color: 'var(--text-muted)' }}>Página: <strong style={{ color: 'var(--text-main)' }}>{apiData.pages.find(p => p.id === accountData.pageId)?.name || accountData.pageId}</strong></span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <SelectField label="Conta Instagram (opcional)" value={adSetData.igId}
                        onChange={val => setAdSetData({ ...adSetData, igId: val })}
                        items={[{ id: '', name: '— Nenhuma —' }, ...apiData.igs]}
                        placeholder="— Nenhuma —" />
                      <div />
                    </div>

                    {(() => {
                      const effectiveObj = campaignObjective || campData.objective;
                      const goalsForSelect = OPTIMIZATION_GOALS[effectiveObj] || OPTIMIZATION_GOALS.OUTCOME_TRAFFIC;
                      const showPixel = effectiveObj === 'OUTCOME_SALES' || effectiveObj === 'OUTCOME_LEADS';
                      return (
                        <>
                          {/* Tipo de captação — Leads */}
                          {effectiveObj === 'OUTCOME_LEADS' && (
                            <SelectField label="Tipo de Captação de Lead" value={leadDestType}
                              onChange={val => setLeadDestType(val)} highlight
                              options={[
                                { value: 'INSTANT_FORM', label: 'Formulário Instantâneo (nativo Meta)' },
                                { value: 'WEBSITE',      label: 'Site / Landing Page' },
                                { value: 'WHATSAPP',     label: 'WhatsApp' },
                                { value: 'MESSENGER',    label: 'Messenger' },
                              ]} />
                          )}
                          {/* Evento de conversão — Vendas */}
                          {effectiveObj === 'OUTCOME_SALES' && (
                            <SelectField label="Evento de Conversão" value={saleConversionEvent}
                              onChange={val => setSaleConversionEvent(val)} highlight
                              options={[
                                { value: 'PURCHASE',              label: 'Compra (Purchase)' },
                                { value: 'ADD_TO_CART',           label: 'Adicionar ao Carrinho' },
                                { value: 'INITIATE_CHECKOUT',     label: 'Iniciar Checkout' },
                                { value: 'COMPLETE_REGISTRATION', label: 'Cadastro Completo' },
                                { value: 'LEAD',                  label: 'Lead' },
                                { value: 'VIEW_CONTENT',          label: 'Ver Conteúdo' },
                              ]} />
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <SelectField label="Otimização" value={adSetData.optimizationGoal}
                              onChange={val => setAdSetData({ ...adSetData, optimizationGoal: val })}
                              options={goalsForSelect} />
                            <SelectField label="Posicionamentos" value={adSetData.placements}
                              onChange={val => setAdSetData({ ...adSetData, placements: val })}
                              options={[
                                { value: 'ADVANTAGE_PLUS', label: 'Advantage+ (Automático)' },
                                { value: 'MANUAL',         label: 'Manual' },
                              ]} />
                          </div>
                          {showPixel && (
                            <SelectField label="📍 Pixel de Conversão" value={adSetData.pixelId}
                              onChange={val => setAdSetData({ ...adSetData, pixelId: val })} highlight
                              items={[{ id: '', name: '— Selecione o Pixel —' }, ...apiData.pixels.map(p => ({ id: p.id, name: `${p.name} (ID: ${p.id})` }))]}
                              placeholder="— Selecione o Pixel —" />
                          )}
                          {/* Aviso sem pixel — Vendas */}
                          {effectiveObj === 'OUTCOME_SALES' && !adSetData.pixelId && (
                            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', fontSize: '12px', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              ⚠️ Sem pixel — conjunto otimizado por Cliques no Link. Selecione um Pixel para otimizar por Conversão.
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {campData.budgetType === 'ABO' && (
                      <Field label="Orçamento Diário ABO (R$)" type="number" value={adSetData.budget} onChange={e => setAdSetData({ ...adSetData, budget: Number(e.target.value) })} width="48%" />
                    )}

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Direcionamento Detalhado</label>
                      <textarea rows={3} value={adSetData.audience} onChange={e => setAdSetData({ ...adSetData, audience: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}

                {/* ── ABA 3: Anúncios (lote) ── */}
                {activeTab === 3 && (
                  <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
                    {/* Esquerda: Upload */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Criativos — até 20 mídias</h3>

                      <label style={{ background: 'var(--bg-surface)', border: '2px dashed rgba(139,92,246,0.3)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                        <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                        <UploadCloud size={30} color="var(--primary)" style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>Upload Múltiplo</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Imagens JPG/PNG ou Vídeos MP4</span>
                      </label>

                      {mediaFiles.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', overflowY: 'auto', maxHeight: '200px' }}>
                          {mediaFiles.map((m, idx) => (
                            <div key={m.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-main)', background: '#000', aspectRatio: '1/1' }}>
                              {m.type === 'IMAGE'
                                ? <img src={m.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                                : <video src={m.preview} muted preload="metadata" playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />}
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '5px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
                                <span style={{ color: 'white', fontSize: '10px', fontWeight: '800' }}>#{idx + 1}</span>
                              </div>
                              <button onClick={() => removeMedia(m.id)} style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Direita: Copy */}
                    <div style={{ width: '320px', flexShrink: 0, borderLeft: '1px solid var(--border-light)', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                      <Field label="Nomenclatura do Anúncio" value={adsData.namingPattern} onChange={e => setAdsData({ ...adsData, namingPattern: e.target.value })} placeholder="AD{index}_DDMM_{index}" />
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-8px', lineHeight: '1.4' }}>
                        <strong style={{ color: 'var(--text-main)' }}>{'{index}'}</strong> → 01, 02... &nbsp;|&nbsp; <strong style={{ color: 'var(--text-main)' }}>{'{date}'}</strong> → {todayDDMM}
                      </p>
                      {adsData.namingPattern && (
                        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Preview</div>
                          {[1, 2, 3].map(i => (
                            <div key={i} style={{ fontSize: '12px', fontFamily: 'monospace', color: i === 1 ? 'var(--primary)' : 'var(--text-muted)', padding: '1px 0' }}>
                              {resolveAdName(adsData.namingPattern, i)}
                            </div>
                          ))}
                          {mediaFiles.length > 3 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>+{mediaFiles.length - 3} mais...</div>
                          )}
                        </div>
                      )}
                      <div style={{ height: '1px', background: 'var(--border-light)' }} />

                      {/* ── Toggle copy global / individual ── */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Copy dos Anúncios</span>
                        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '2px' }}>
                          {[['global', 'Global'], ['individual', 'Por Anúncio']].map(([v, l]) => (
                            <button key={v} onClick={() => {
                              const toIndividual = v === 'individual';
                              setIndividualCopyMode(toIndividual);
                              if (toIndividual && !activeCopyFileId && mediaFiles.length > 0) setActiveCopyFileId(mediaFiles[0].id);
                            }} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', border: 'none', background: (v === 'individual') === individualCopyMode ? 'var(--bg-app)' : 'transparent', color: (v === 'individual') === individualCopyMode ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: (v === 'individual') === individualCopyMode ? '0 1px 4px rgba(0,0,0,0.15)' : 'none', transition: 'all 0.15s' }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Seletor de anúncio (modo individual) ── */}
                      {individualCopyMode && mediaFiles.length > 0 && (() => {
                        const activeId = activeCopyFileId || mediaFiles[0].id;
                        const activeIdx = mediaFiles.findIndex(m => m.id === activeId);
                        const overrides = adCopyOverrides[activeId] || {};
                        const hasOverride = (f) => overrides[f] !== undefined;
                        const getVal = (f) => hasOverride(f) ? overrides[f] : adsData[f];
                        const setVal = (f, v) => setAdCopyOverrides(prev => ({ ...prev, [activeId]: { ...prev[activeId], [f]: v } }));
                        const clearVal = (f) => setAdCopyOverrides(prev => { const c = { ...prev[activeId] }; delete c[f]; return { ...prev, [activeId]: c }; });

                        return (
                          <>
                            {/* Tabs de seleção */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {mediaFiles.map((m, idx) => {
                                const isActive = m.id === activeId;
                                const hasAny = Object.keys(adCopyOverrides[m.id] || {}).length > 0;
                                return (
                                  <button key={m.id} onClick={() => setActiveCopyFileId(m.id)} style={{ position: 'relative', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}`, background: isActive ? 'rgba(139,92,246,0.12)' : 'var(--bg-surface)', color: isActive ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                                    AD{String(idx + 1).padStart(2, '0')}
                                    {hasAny && <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', border: '1px solid var(--bg-app)' }} />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Label do ad ativo */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                                {resolveAdName(adsData.namingPattern, activeIdx + 1)} — {mediaFiles[activeIdx]?.file?.name}
                              </span>
                              {Object.keys(overrides).length > 0 && (
                                <button onClick={() => setAdCopyOverrides(prev => ({ ...prev, [activeId]: {} }))} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  Resetar
                                </button>
                              )}
                            </div>

                            {/* Campos com override */}
                            {[
                              { key: 'primaryText', label: 'Texto Principal', multiline: true },
                              { key: 'title', label: 'Título', multiline: false },
                              { key: 'description', label: 'Descrição', multiline: false },
                            ].map(({ key, label, multiline }) => (
                              <div key={key}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: '700', color: hasOverride(key) ? '#10b981' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                                  {hasOverride(key) && (
                                    <button onClick={() => clearVal(key)} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(16,185,129,0.3)', background: 'transparent', color: '#10b981', cursor: 'pointer' }}>← global</button>
                                  )}
                                </div>
                                {multiline ? (
                                  <textarea rows={3} value={getVal(key)} onChange={e => setVal(key, e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${hasOverride(key) ? '#10b981' : 'var(--border-main)'}`, background: hasOverride(key) ? 'rgba(16,185,129,0.04)' : 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                                ) : (
                                  <input type="text" value={getVal(key)} onChange={e => setVal(key, e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${hasOverride(key) ? '#10b981' : 'var(--border-main)'}`, background: hasOverride(key) ? 'rgba(16,185,129,0.04)' : 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                )}
                              </div>
                            ))}
                            <SelectField label="CTA" value={getVal('cta')} onChange={val => setVal('cta', val)} highlight={hasOverride('cta')} options={CTA_OPTIONS} />
                            {needsUrl && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: '700', color: hasOverride('link') ? '#10b981' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URL</label>
                                  {hasOverride('link') && <button onClick={() => clearVal('link')} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(16,185,129,0.3)', background: 'transparent', color: '#10b981', cursor: 'pointer' }}>← global</button>}
                                </div>
                                <input type="text" value={getVal('link')} onChange={e => setVal('link', e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${hasOverride('link') ? '#10b981' : 'var(--border-main)'}`, background: hasOverride('link') ? 'rgba(16,185,129,0.04)' : 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* ── Copy global (visível no modo global) ── */}
                      {!individualCopyMode && <>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Texto Principal
                        </label>
                        <textarea rows={3} value={adsData.primaryText} onChange={e => setAdsData({ ...adsData, primaryText: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <Field label="Título" value={adsData.title} onChange={e => setAdsData({ ...adsData, title: e.target.value })} />
                      <Field label="Descrição" value={adsData.description} onChange={e => setAdsData({ ...adsData, description: e.target.value })} placeholder="Descrição curta (opcional)" />
                      <SelectField label="CTA (Call to Action)" value={adsData.cta} onChange={val => setAdsData({ ...adsData, cta: val })} options={CTA_OPTIONS} />
                      </>}
                      {/* ── Bloco inteligente: URL / WhatsApp / formulário ── */}
                      {isAutoMsgDest ? (
                        <div style={{ padding: '12px 14px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '8px', fontSize: '12px', color: '#25d366', fontWeight: '600', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📱</span>
                            <span>
                              {MSG_OBJECTIVES.includes(activeObjective)
                                ? `Objetivo ${OBJECTIVE_LABEL(activeObjective)} detectado`
                                : `Destino ${detectedDestType} detectado`
                              } — URL desativada automaticamente
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                            O criativo usará o link da página do Facebook e abrirá o WhatsApp/Messenger diretamente.
                          </span>
                          <div style={{ marginTop: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#25d366', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              💬 Mensagem pré-preenchida no WhatsApp
                            </label>
                            <input
                              type="text"
                              value={adsData.whatsappWelcomeMsg || ''}
                              onChange={e => setAdsData({ ...adsData, whatsappWelcomeMsg: e.target.value })}
                              placeholder="Olá! Gostaria de mais informações."
                              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.04)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                              Texto pré-preenchido quando o usuário clica no anúncio e abre o WhatsApp.
                            </p>
                          </div>
                        </div>
                      ) : needsUrl ? (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              URL de Destino <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                              type="text"
                              value={adsData.link}
                              onChange={e => setAdsData({ ...adsData, link: e.target.value })}
                              placeholder="https://..."
                              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${!adsData.link.trim() ? 'rgba(239,68,68,0.5)' : 'var(--border-main)'}`, background: 'transparent', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            {!adsData.link.trim() && (
                              <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                                Obrigatório para campanha de {OBJECTIVE_LABEL(activeObjective)}.
                              </p>
                            )}
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              UTM Tags (url_tags)
                            </label>
                            <textarea rows={3} value={adsData.utmTags} onChange={e => setAdsData({ ...adsData, utmTags: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'transparent', color: 'var(--text-main)', fontSize: '11px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                              Variáveis Meta: {'{{placement}}'}, {'{{campaign.name}}'}, {'{{ad.id}}'}, etc.
                            </p>
                          </div>
                        </>
                      ) : isLeadFormDest ? (
                        <>
                          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '12px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📋 Formulário Instantâneo — URL não necessária
                          </div>
                          <Field label="ID do Formulário de Lead (opcional)" value={adsData.leadFormId} onChange={e => setAdsData({ ...adsData, leadFormId: e.target.value })} placeholder="Ex: 1234567890123456" />
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-8px', lineHeight: '1.4' }}>
                            Deixe em branco para criar o anúncio sem formulário vinculado.
                          </p>
                        </>
                      ) : null}

                      {/* Toggle manual — desabilitado quando detectado automaticamente */}
                      <div
                        onClick={() => !isAutoMsgDest && setForceMessagesDest(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isAutoMsgDest ? 'default' : 'pointer', userSelect: 'none', padding: '8px 0', opacity: isAutoMsgDest ? 0.45 : 1 }}
                        title={isAutoMsgDest ? 'Desativado — destino detectado automaticamente' : ''}
                      >
                        <div style={{ width: '32px', height: '18px', borderRadius: '9px', background: isAutoMsgDest ? 'var(--primary)' : 'var(--border-main)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: '2px', left: isAutoMsgDest ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Campanha de WhatsApp / Mensagens
                          {isAutoMsgDest && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#25d366', fontWeight: '700' }}>(detectado automaticamente)</span>}
                        </span>
                      </div>
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
            <button onClick={() => {
              setError(null);
              // Pular Tab 2 ao voltar quando conjunto existente selecionado
              if (activeTab === 3 && usingExistingAdSet) setActiveTab(1);
              else setActiveTab(a => a - 1);
            }} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
              ← Voltar
            </button>
          ) : <div />}

          {activeTab < 3 ? (
            <button onClick={goNext} className="btn-primary" style={{ padding: '10px 28px', borderRadius: '8px', fontWeight: '700' }}>
              Próximo →
            </button>
          ) : (
            <button
              onClick={handlePublishBatch}
              disabled={mediaFiles.length === 0}
              style={{
                padding: '10px 28px', borderRadius: '8px', fontWeight: '800', fontSize: '14px',
                background: mediaFiles.length === 0 ? 'var(--border-main)' : 'linear-gradient(135deg, #1877F2, #0056d6)',
                color: mediaFiles.length === 0 ? 'var(--text-muted)' : 'white', border: 'none',
                cursor: mediaFiles.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: mediaFiles.length > 0 ? '0 6px 16px rgba(24,119,242,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <PlayCircle size={17} />
              Publicar {mediaFiles.length > 0 ? `${mediaFiles.length} ad${mediaFiles.length > 1 ? 's' : ''}` : 'Lote'} na Meta
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
};

export default MetaAdCreator;
