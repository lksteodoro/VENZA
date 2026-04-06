import { CLIENTS } from '../data/mockData';

const STORAGE_KEYS = {
  config:      'venza_evo_config',      // { baseUrl, instance, apiKey }
  groups:      'venza_evo_groups',      // { [clientId]: { jid, name } }
  automations: 'venza_automations_v2',  // automation rules array
};

const getClients = () => {
  try { return JSON.parse(localStorage.getItem('venza_clients')) || CLIENTS; }
  catch { return CLIENTS; }
};

export const loadEvoConfig  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.config)  || 'null'); } catch { return null; } };
export const loadEvoGroups  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.groups)  || '{}');  } catch { return {}; } };
export const loadAutomations = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.automations) || '[]'); } catch { return []; } };

export const saveEvoConfig   = (cfg)  => localStorage.setItem(STORAGE_KEYS.config,      JSON.stringify(cfg));
export const saveEvoGroups   = (grps) => localStorage.setItem(STORAGE_KEYS.groups,      JSON.stringify(grps));
export const saveAutomations = (list) => localStorage.setItem(STORAGE_KEYS.automations, JSON.stringify(list));

/** Substitui variáveis na mensagem */
export const processTemplate = (template, { clientName, cardName, columnName, projectName, saldo, limite, atividades, resumo, semana, comentario }) => {
  const now   = new Date();
  const data  = now.toLocaleDateString('pt-BR');
  const hora  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const comentarioText = comentario ? `\n\n💬 *Obs:* ${comentario}` : '';
  return template
    .replace(/\{\{cliente\}\}/g,    clientName   || '')
    .replace(/\{\{card\}\}/g,       cardName     || '')
    .replace(/\{\{coluna\}\}/g,     columnName   || '')
    .replace(/\{\{projeto\}\}/g,    projectName  || '')
    .replace(/\{\{saldo\}\}/g,      saldo        || '')
    .replace(/\{\{limite\}\}/g,     limite       || '')
    .replace(/\{\{atividades\}\}/g, atividades   || '')
    .replace(/\{\{resumo\}\}/g,     resumo       || '')
    .replace(/\{\{semana\}\}/g,     semana       || '')
    .replace(/\{\{comentario\}\}/g, comentarioText)
    .replace(/\{\{data\}\}/g,       data)
    .replace(/\{\{hora\}\}/g,       hora);
};

/**
 * Dispara automações ativas para um trigger específico.
 * @param {string} trigger   - ID do gatilho (ex: 'concluido', 'aprovacao')
 * @param {object} context   - { clientId, cardName, columnName }
 */
/**
 * Verifica e dispara automações agendadas (diário/semanal/mensal) que devem rodar agora.
 * Deve ser chamado a cada minuto enquanto o app estiver aberto.
 */
export const checkAndFireScheduled = async () => {
  const automations = loadAutomations();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const todayStr = now.toDateString();
  let changed = false;

  for (const auto of automations) {
    if (!auto.ativa) continue;
    const s = auto.schedule;
    if (!s || s.type === 'event' || !s.time) continue;
    if (auto.trigger === 'resumo_semanal') continue; // tratado em checkAndFireWeeklySummary
    if (s.time !== hhmm) continue;

    // Verificar se já disparou nesse mesmo minuto/dia
    if (s.lastFired && new Date(s.lastFired).toDateString() === todayStr) continue;

    // Verificar condição do tipo
    let shouldFire = false;
    if (s.type === 'daily') {
      shouldFire = true;
    } else if (s.type === 'weekly') {
      shouldFire = (s.days || []).includes(now.getDay());
    } else if (s.type === 'monthly') {
      shouldFire = now.getDate() === (s.dayOfMonth || 1);
    }
    if (!shouldFire) continue;

    // Disparar para os grupos configurados (respeitando filtro de clientes)
    const groups   = loadEvoGroups();
    const filter   = auto.clientFilter || [];
    const allIds   = Object.keys(groups);
    const clientIds = filter.length > 0 ? allIds.filter(id => filter.includes(id)) : allIds;
    for (const clientId of clientIds) {
      await fireAutomation(auto.trigger, { clientId, cardName: '', columnName: '', projectName: '' });
    }

    // Atualizar lastFired
    auto.schedule = { ...s, lastFired: now.toISOString() };
    changed = true;
  }

  if (changed) saveAutomations(automations);
};

export const fireAutomation = async (trigger, { clientId, cardName, columnName, projectName, saldo, limite, atividades, resumo, semana, comentario }) => {
  try {
    const automations = loadAutomations();
    const matching    = automations.filter(a => a.ativa && a.trigger === trigger);
    if (!matching.length) return;

    const config = loadEvoConfig();
    if (!config?.baseUrl || !config?.instance || !config?.apiKey) return;

    const groups = loadEvoGroups();
    const group  = groups[clientId];

    // Destino: grupo (JID @g.us) ou número pessoal (@s.whatsapp.net)
    const tipo = group?.tipo || 'grupo';
    let jid;
    if (tipo === 'numero') {
      if (!group?.numero) return;
      const digits = group.numero.replace(/\D/g, '');
      jid = digits.includes('@') ? digits : `${digits}@s.whatsapp.net`;
    } else {
      if (!group?.jid) return;
      jid = group.jid.includes('@') ? group.jid : `${group.jid}@g.us`;
    }

    const clients    = getClients();
    const clientName = clients.find(c => c.id === clientId)?.name || clientId;
    const url        = `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${config.instance}`;

    let updated = [...automations];
    for (const auto of matching) {
      const text = processTemplate(auto.message, { clientName, cardName, columnName, projectName, saldo, limite, atividades, resumo, semana, comentario });
      await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
        body:    JSON.stringify({ number: jid, text }),
      });
      updated = updated.map(a => a.id === auto.id ? { ...a, disparos: (a.disparos || 0) + 1 } : a);
    }
    saveAutomations(updated);
  } catch (err) {
    console.error('[Automação] Erro ao disparar:', err);
  }
};
