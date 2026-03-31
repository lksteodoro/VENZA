import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CLIENTS } from '../data/mockData';
import {
  BarChart2, RefreshCw, Loader2, AlertCircle, ChevronDown,
  Eye, MousePointer, DollarSign, Play, Image as ImageIcon,
  TrendingUp, Users, Instagram, Settings
} from 'lucide-react';

const META_API = 'https://graph.facebook.com/v25.0';

// ─── Converte ID numérico do Instagram para shortcode (base64 Instagram) ───────
const toIgShortcode = (mediaId) => {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let num = BigInt(mediaId);
  let code = '';
  while (num > 0n) {
    code = ALPHA[Number(num % 64n)] + code;
    num = num / 64n;
  }
  return code;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) =>
  Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const OBJECTIVE_LABEL = {
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_APP_PROMOTION: 'App',
  OUTCOME_AWARENESS: 'Awareness',
};

const OPT_LABEL = {
  OFFSITE_CONVERSIONS: 'Conversões',
  CONVERSATIONS: 'Conversas',
  LINK_CLICKS: 'Cliques',
  LEAD_GENERATION: 'Leads',
  LANDING_PAGE_VIEWS: 'LPV',
  POST_ENGAGEMENT: 'Engajamento',
  REACH: 'Alcance',
  IMPRESSIONS: 'Impressões',
};

// ─── Select customizado ────────────────────────────────────────────────────────
const StyledSelect = ({ value, onChange, disabled, placeholder, options }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '220px' }}>
      <button
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        disabled={disabled}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px', padding: '0 14px', height: '40px', borderRadius: '10px',
          background: 'var(--bg-surface)', border: `1px solid ${open ? 'var(--primary)' : 'var(--border-main)'}`,
          color: selected ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '14px', fontWeight: '500',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
          boxShadow: open ? '0 0 0 2px rgba(139,92,246,0.2)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-surface)', border: '1px solid var(--border-main)',
          borderRadius: '10px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '260px', overflowY: 'auto'
        }}>
          {options.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum item</div>
          ) : options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500',
                background: opt.value === value ? 'var(--primary-light)' : 'transparent',
                color: opt.value === value ? 'var(--primary)' : 'var(--text-main)',
                borderBottom: '1px solid var(--border-light)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Texto expansível ─────────────────────────────────────────────────────────
const COLLAPSED_LINES = 3;

const ExpandableText = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = React.useRef();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div style={{ borderLeft: '2px solid var(--border-main)', paddingLeft: '8px' }}>
      <p
        ref={ref}
        style={{
          fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.55',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
          ...(!expanded && {
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: COLLAPSED_LINES,
            WebkitBoxOrient: 'vertical',
          }),
        }}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded(o => !o)}
          style={{
            marginTop: '4px', fontSize: '11px', fontWeight: '700',
            color: 'var(--primary)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', gap: '3px',
          }}
        >
          {expanded ? <>Ver menos <ChevronDown size={11} style={{ transform: 'rotate(180deg)' }} /></> : <>Ver mais <ChevronDown size={11} /></>}
        </button>
      )}
    </div>
  );
};

// ─── Card de criativo (agrupado) ──────────────────────────────────────────────
const AdCard = ({ group, token }) => {
  const [imgStage, setImgStage] = useState(0); // 0=hq, 1=fallback, 2=erro
  const [expanded, setExpanded] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);

  const { name, firstAd, instances, campaigns, adsets, metrics } = group;
  const creative = firstAd.creative || {};
  const isGrouped = instances.length > 1;

  const { spend, impressions, clicks, reach } = metrics;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  const cpm = impressions > 0 ? ((spend / impressions) * 1000).toFixed(2) : '0.00';

  const isVideo = !!creative.video_id;
  const spec = creative.object_story_spec || {};

  // Alta qualidade → fallback confiável (thumbnail_url é menor mas sempre carrega)
  const hqThumb = spec.link_data?.picture || spec.photo_data?.image_url || creative.image_url;
  const lqThumb = creative.thumbnail_url || spec.video_data?.image_url;
  const thumbSrc = imgStage === 0 ? (hqThumb || lqThumb) : imgStage === 1 ? lqThumb : null;
  const handleThumbError = () => {
    if (imgStage === 0 && lqThumb) setImgStage(1);
    else setImgStage(2);
  };

  const firstCampaign = instances[0]?.campaign || {};
  const firstAdset = instances[0]?.adset || {};
  const objLabel = OBJECTIVE_LABEL[firstCampaign.objective] || firstCampaign.objective || '—';
  const optLabel = OPT_LABEL[firstAdset.optimization_goal] || firstAdset.optimization_goal || '—';

  // Link Instagram: usa o effective_instagram_story_id se disponível,
  // caso contrário busca via API de preview do Meta
  const igStoryId = creative.effective_instagram_story_id;
  const instagramUrl = igStoryId
    ? `https://www.instagram.com/p/${toIgShortcode(igStoryId)}/#advertiser`
    : null;

  const openPreview = async (e) => {
    e.stopPropagation();
    if (instagramUrl) { window.open(instagramUrl, '_blank'); return; }
    setLoadingLink(true);
    try {
      const res = await fetch(`${META_API}/${firstAd.id}/previews?ad_format=INSTAGRAM_STANDARD&access_token=${token}`);
      const data = await res.json();
      const body = data.data?.[0]?.body || '';
      // Extrai o src do iframe retornado pela API
      const match = body.match(/src="([^"]+)"/);
      if (match?.[1]) {
        window.open(match[1].replace(/&amp;/g, '&'), '_blank');
      }
    } catch (_) { /* silencioso */ } finally {
      setLoadingLink(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${isGrouped ? 'rgba(139,92,246,0.3)' : 'var(--border-light)'}`,
      borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = isGrouped ? 'var(--primary)' : 'var(--border-main)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isGrouped ? 'rgba(139,92,246,0.3)' : 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', background: 'var(--bg-app)', flexShrink: 0 }}>
        {thumbSrc ? (
          <img
            key={thumbSrc}
            src={thumbSrc}
            alt={name}
            onError={handleThumbError}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px', color: 'var(--border-main)' }}>
            {isVideo ? <Play size={32} /> : <ImageIcon size={32} />}
            <span style={{ fontSize: '11px' }}>{isVideo ? 'Vídeo' : 'Imagem'}</span>
          </div>
        )}
        {/* Badges */}
        <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {isVideo && (
            <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(4px)' }}>
              <Play size={9} fill="white" /> VÍDEO
            </span>
          )}
          <span style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '800', backdropFilter: 'blur(4px)' }}>
            ATIVO
          </span>
          {isGrouped && (
            <span style={{ background: 'rgba(139,92,246,0.85)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '800', backdropFilter: 'blur(4px)' }}>
              {instances.length}× rodando
            </span>
          )}
        </div>
        {/* Preview Instagram */}
        <button
          onClick={openPreview}
          disabled={loadingLink}
          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: '6px', padding: '5px', display: 'flex', backdropFilter: 'blur(4px)', border: 'none', cursor: loadingLink ? 'wait' : 'pointer', transition: 'background 0.15s' }}
          title="Ver no Instagram"
          onMouseEnter={e => { if (!loadingLink) e.currentTarget.style.background = 'rgba(225,48,108,0.85)'; }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
        >
          {loadingLink ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Instagram size={13} />}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {/* Nome + badges de objetivo */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.35', marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {name}
          </p>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '5px', background: 'rgba(139,92,246,0.12)', color: 'var(--primary)' }}>{objLabel}</span>
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '5px', background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>{optLabel}</span>
          </div>
        </div>

        {/* Texto principal */}
        {(creative.body || spec.link_data?.message) && (
          <ExpandableText text={creative.body || spec.link_data.message} />
        )}

        {/* Campanhas & Conjuntos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Resumo clicável quando agrupado */}
          {isGrouped ? (
            <button
              onClick={() => setExpanded(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)',
                background: 'rgba(139,92,246,0.06)', cursor: 'pointer', width: '100%',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>
                {campaigns.size} {campaigns.size === 1 ? 'campanha' : 'campanhas'} · {adsets.size} {adsets.size === 1 ? 'conjunto' : 'conjuntos'}
              </span>
              <ChevronDown size={13} color="var(--primary)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {firstCampaign.name || '—'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎯 {firstAdset.name || '—'}</span>
            </div>
          )}

          {/* Lista expandida de instâncias */}
          {isGrouped && expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              {instances.map((inst, i) => (
                <div key={inst.id} style={{ padding: '7px 10px', borderRadius: '7px', background: 'var(--bg-app)', border: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {inst.campaign?.name || '—'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎯 {inst.adset?.name || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Métricas agregadas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { icon: <DollarSign size={12} />, label: 'Gasto', value: fmtMoney(spend), color: '#f59e0b' },
            { icon: <Eye size={12} />, label: 'Impressões', value: fmt(impressions), color: 'var(--primary)' },
            { icon: <MousePointer size={12} />, label: 'Cliques', value: fmt(clicks), color: '#10b981' },
            { icon: <TrendingUp size={12} />, label: 'CTR', value: `${ctr}%`, color: '#38bdf8' },
            { icon: <Users size={12} />, label: 'Alcance', value: fmt(reach), color: '#a78bfa' },
            { icon: <BarChart2 size={12} />, label: 'CPM', value: fmtMoney(cpm), color: '#fb923c' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-app)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color, marginBottom: '2px' }}>
                {icon}
                <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton loading ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
    <div style={{ width: '100%', paddingTop: '100%', background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--bg-app) 25%, var(--bg-surface-hover) 50%, var(--bg-app) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
    </div>
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[80, 60, 100].map(w => (
        <div key={w} style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-app)', width: `${w}%`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 25%, var(--bg-surface-hover) 50%, transparent 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </div>
      ))}
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const Metricas = () => {
  const token = localStorage.getItem('meta_access_token') || '';

  // Carrega clientes do localStorage (mesma fonte que a página Clientes)
  const clients = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('venza_clients')) || CLIENTS; }
    catch { return CLIENTS; }
  }, []);

  const [selectedClientId, setSelectedClientId] = useState('');
  const pendingAccountRef = useRef('');

  const [bms, setBms] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedBm, setSelectedBm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [ads, setAds] = useState([]);

  const [loadingBms, setLoadingBms] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingAds, setLoadingAds] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Aplica config salva ao selecionar cliente ─────────────────────────────
  const applyClientDefaults = useCallback((clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`meta_defaults_${clientId}`) || 'null');
      if (!saved?.bmId) return;
      pendingAccountRef.current = saved.adAccountId || '';
      if (saved.bmId === selectedBm) {
        // BM já selecionada — aplica conta direto se já carregada
        setAccounts(prev => {
          const match = prev.find(a => a.id === saved.adAccountId);
          if (match) { setSelectedAccount(match.id); pendingAccountRef.current = ''; }
          return prev;
        });
      } else {
        setSelectedBm(saved.bmId);
      }
    } catch {}
  }, [selectedBm]);

  // ── Carregar BMs ──────────────────────────────────────────────────────────
  const loadBms = useCallback(async () => {
    if (!token) return;
    setLoadingBms(true);
    setError(null);
    try {
      const res = await fetch(`${META_API}/me/businesses?fields=id,name&limit=25&access_token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const list = data.data || [];
      setBms(list);
      if (list.length === 1) setSelectedBm(list[0].id);
    } catch (e) {
      setError(`Erro ao carregar BMs: ${e.message}`);
    } finally {
      setLoadingBms(false);
    }
  }, [token]);

  useEffect(() => { loadBms(); }, [loadBms]);

  // ── Carregar contas quando BM muda ────────────────────────────────────────
  useEffect(() => {
    if (!selectedBm || !token) { setAccounts([]); setAds([]); return; }
    setSelectedAccount('');
    setAds([]);
    (async () => {
      setLoadingAccounts(true);
      setError(null);
      try {
        const res = await fetch(`${META_API}/${selectedBm}/owned_ad_accounts?fields=id,name,account_status&limit=50&access_token=${token}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const list = (data.data || []).filter(a => a.account_status === 1);
        setAccounts(list);
        if (pendingAccountRef.current) {
          const match = list.find(a => a.id === pendingAccountRef.current);
          if (match) { setSelectedAccount(match.id); pendingAccountRef.current = ''; return; }
          pendingAccountRef.current = '';
        }
        if (list.length === 1) setSelectedAccount(list[0].id);
      } catch (e) {
        setError(`Erro ao carregar contas: ${e.message}`);
      } finally {
        setLoadingAccounts(false);
      }
    })();
  }, [selectedBm, token]);

  // ── Carregar anúncios ativos ───────────────────────────────────────────────
  const loadAds = useCallback(async (accountId) => {
    if (!accountId || !token) return;
    setLoadingAds(true);
    setError(null);
    setAds([]);
    try {
      const fields = [
        'id', 'name', 'status', 'effective_status', 'account_id',
        'creative{id,name,title,body,image_url,thumbnail_url,video_id,effective_object_story_id,effective_instagram_story_id,object_story_spec{link_data{message,picture,image_hash},photo_data{image_url,image_hash},video_data{image_url,video_id}}}',
        'adset{id,name,daily_budget,optimization_goal,status}',
        'campaign{id,name,objective,status}',
        'insights{spend,impressions,clicks,ctr,cpm,reach}',
      ].join(',');

      const filtering = encodeURIComponent(JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }
      ]));

      const res = await fetch(
        `${META_API}/${accountId}/ads?fields=${fields}&filtering=${filtering}&limit=100&access_token=${token}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setAds((data.data || []).filter(ad => ad.effective_status === 'ACTIVE'));
      setLastUpdated(new Date());
    } catch (e) {
      setError(`Erro ao carregar anúncios: ${e.message}`);
    } finally {
      setLoadingAds(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedAccount) loadAds(selectedAccount);
  }, [selectedAccount, loadAds]);

  // ── Agrupamento por nome ──────────────────────────────────────────────────
  const groupedAds = useMemo(() => {
    const map = {};
    for (const ad of ads) {
      const key = ad.name.trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: ad.name,
          firstAd: ad,
          instances: [],
          campaigns: new Map(),
          adsets: new Map(),
          metrics: { spend: 0, impressions: 0, clicks: 0, reach: 0 },
        };
      }
      const g = map[key];
      g.instances.push(ad);
      if (ad.campaign?.id) g.campaigns.set(ad.campaign.id, ad.campaign.name);
      if (ad.adset?.id)    g.adsets.set(ad.adset.id, ad.adset.name);
      const ins = ad.insights?.data?.[0] || {};
      g.metrics.spend       += parseFloat(ins.spend || 0);
      g.metrics.impressions += parseInt(ins.impressions || 0);
      g.metrics.clicks      += parseInt(ins.clicks || 0);
      g.metrics.reach       += parseInt(ins.reach || 0);
    }
    return Object.values(map);
  }, [ads]);

  // ── Totais ────────────────────────────────────────────────────────────────
  const totals = ads.reduce((acc, ad) => {
    const ins = ad.insights?.data?.[0] || {};
    acc.spend += parseFloat(ins.spend || 0);
    acc.impressions += parseInt(ins.impressions || 0);
    acc.clicks += parseInt(ins.clicks || 0);
    acc.reach += parseInt(ins.reach || 0);
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, reach: 0 });

  const avgCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';

  const bmOptions = bms.map(b => ({ value: b.id, label: b.name }));
  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));

  // ── Render: sem token ─────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="page-content">
        <div style={{ paddingTop: '8px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Métricas de Criativos</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Visualize todos os anúncios ativos por conta de anúncio.</p>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '16px', padding: '80px 24px', background: 'var(--bg-surface)',
          border: '1px dashed var(--border-main)', borderRadius: '16px', textAlign: 'center'
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <AlertCircle size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Token da Meta não configurado</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: '1.6' }}>
              Para visualizar os criativos ativos, configure seu Access Token em <strong style={{ color: 'var(--text-main)' }}>Configurações → Integrações (APIs)</strong>.
            </p>
          </div>
          <a href="#/configuracoes" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
            <Settings size={14} /> Ir para Configurações
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ paddingTop: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Métricas de Criativos</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Todos os anúncios <strong style={{ color: '#10b981' }}>ativos</strong> da conta selecionada em tempo real.
            {lastUpdated && (
              <span style={{ marginLeft: '8px', opacity: 0.6 }}>
                · Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => selectedAccount && loadAds(selectedAccount)}
          disabled={!selectedAccount || loadingAds}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px',
            borderRadius: '9px', border: '1px solid var(--border-main)', background: 'var(--bg-surface)',
            color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', cursor: !selectedAccount || loadingAds ? 'not-allowed' : 'pointer',
            opacity: !selectedAccount ? 0.45 : 1, transition: 'all 0.2s'
          }}
          onMouseEnter={e => { if (selectedAccount && !loadingAds) e.currentTarget.style.borderColor = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-main)'; }}
        >
          <RefreshCw size={14} style={loadingAds ? { animation: 'spin 1s linear infinite' } : {}} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
        borderRadius: '12px', padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', marginRight: '4px' }}>
          <BarChart2 size={15} color="var(--primary)" />
          Filtrar por:
        </div>

        {/* Cliente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '2px' }}>Cliente</span>
          <StyledSelect
            value={selectedClientId}
            onChange={applyClientDefaults}
            placeholder="Selecionar cliente"
            options={clients.map(c => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div style={{ width: '1px', height: '36px', background: 'var(--border-light)', alignSelf: 'flex-end', marginBottom: '2px' }} />

        {/* BM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '2px' }}>Business Manager</span>
          {loadingBms ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 14px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando...
            </div>
          ) : (
            <StyledSelect
              value={selectedBm}
              onChange={setSelectedBm}
              placeholder="Selecionar BM"
              options={bmOptions}
            />
          )}
        </div>

        {/* Conta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '2px' }}>Conta de Anúncio</span>
          {loadingAccounts ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 14px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando...
            </div>
          ) : (
            <StyledSelect
              value={selectedAccount}
              onChange={setSelectedAccount}
              placeholder="Selecionar Conta"
              options={accountOptions}
              disabled={!selectedBm}
            />
          )}
        </div>

        {/* Contagem */}
        {ads.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{ads.length} anúncios · {groupedAds.length} criativos únicos</span>
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 18px',
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px'
        }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '13px', color: '#ef4444', lineHeight: '1.5' }}>{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      {ads.length > 0 && !loadingAds && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {[
            { icon: <DollarSign size={18} />, label: 'Gasto Total', value: fmtMoney(totals.spend), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { icon: <Eye size={18} />, label: 'Impressões', value: fmt(totals.impressions), color: 'var(--primary)', bg: 'var(--primary-light)' },
            { icon: <MousePointer size={18} />, label: 'Cliques', value: fmt(totals.clicks), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { icon: <TrendingUp size={18} />, label: 'CTR Médio', value: `${avgCtr}%`, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
            { icon: <Users size={18} />, label: 'Alcance', value: fmt(totals.reach), color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Estados: loading / vazio / grid */}
      {loadingAds ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !selectedAccount ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '80px 24px', background: 'var(--bg-surface)',
          border: '1px dashed var(--border-light)', borderRadius: '16px', textAlign: 'center'
        }}>
          <BarChart2 size={40} style={{ opacity: 0.15 }} />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Selecione uma <strong style={{ color: 'var(--text-main)' }}>BM</strong> e uma <strong style={{ color: 'var(--text-main)' }}>conta de anúncio</strong> para visualizar os criativos ativos.
          </p>
        </div>
      ) : ads.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '80px 24px', background: 'var(--bg-surface)',
          border: '1px dashed var(--border-light)', borderRadius: '16px', textAlign: 'center'
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <BarChart2 size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '5px' }}>Nenhum anúncio ativo</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Esta conta não possui anúncios com status <strong style={{ color: '#10b981' }}>ATIVO</strong> no momento.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {groupedAds.map(group => <AdCard key={group.name} group={group} token={token} />)}
        </div>
      )}
    </div>
  );
};

export default Metricas;
