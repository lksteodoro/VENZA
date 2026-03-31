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
const processTemplate = (template, { clientName, cardName, columnName, projectName, saldo, limite }) => {
  const now   = new Date();
  const data  = now.toLocaleDateString('pt-BR');
  const hora  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return template
    .replace(/\{\{cliente\}\}/g,  clientName   || '')
    .replace(/\{\{card\}\}/g,     cardName     || '')
    .replace(/\{\{coluna\}\}/g,   columnName   || '')
    .replace(/\{\{projeto\}\}/g,  projectName  || '')
    .replace(/\{\{saldo\}\}/g,    saldo        || '')
    .replace(/\{\{limite\}\}/g,   limite       || '')
    .replace(/\{\{data\}\}/g,     data)
    .replace(/\{\{hora\}\}/g,     hora);
};

/**
 * Dispara automações ativas para um trigger específico.
 * @param {string} trigger   - ID do gatilho (ex: 'concluido', 'aprovacao')
 * @param {object} context   - { clientId, cardName, columnName }
 */
export const fireAutomation = async (trigger, { clientId, cardName, columnName, projectName, saldo, limite }) => {
  try {
    const automations = loadAutomations();
    const matching    = automations.filter(a => a.ativa && a.trigger === trigger);
    if (!matching.length) return;

    const config = loadEvoConfig();
    if (!config?.baseUrl || !config?.instance || !config?.apiKey) return;

    const groups = loadEvoGroups();
    const group  = groups[clientId];
    if (!group?.jid) return;

    const clients    = getClients();
    const clientName = clients.find(c => c.id === clientId)?.name || clientId;
    const jid        = group.jid.includes('@') ? group.jid : `${group.jid}@g.us`;
    const url        = `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${config.instance}`;

    let updated = [...automations];
    for (const auto of matching) {
      const text = processTemplate(auto.message, { clientName, cardName, columnName, projectName, saldo, limite });
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
