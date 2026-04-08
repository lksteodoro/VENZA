/**
 * weeklySummary.js
 * ────────────────
 * Rastreia atividades concluídas durante a semana e gera um
 * resumo de fechamento toda sexta-feira no horário configurado.
 *
 * localStorage: venza_weekly_log
 * {
 *   [clientId]: {
 *     weekKey:   string   ← "2026-W14"
 *     clientName: string
 *     completed: [{ title, projectName, at }]
 *   }
 * }
 */

import { loadAutomations, saveAutomations, loadEvoGroups, loadEvoConfig, processTemplate } from './automations';
import { CLIENTS } from '../data/mockData';

const getClients = () => {
  try { return JSON.parse(localStorage.getItem('venza_clients')) || CLIENTS; }
  catch { return CLIENTS; }
};

/** Envia o resumo de UM cliente para o grupo DESSE cliente */
export const sendResumoToClient = async (clientId, resumo, semana, auto) => {
  const config = loadEvoConfig();
  if (!config?.baseUrl || !config?.instance || !config?.apiKey) return;

  const groups = loadEvoGroups();
  const group  = groups[String(clientId)];
  if (!group) return;

  const tipo = group.tipo || 'grupo';
  let jid;
  if (tipo === 'numero') {
    if (!group.numero) return;
    const digits = group.numero.replace(/\D/g, '');
    jid = digits.includes('@') ? digits : `${digits}@s.whatsapp.net`;
  } else {
    if (!group.jid) return;
    jid = group.jid.includes('@') ? group.jid : `${group.jid}@g.us`;
  }

  const clients    = getClients();
  const clientName = clients.find(c => String(c.id) === String(clientId))?.name || clientId;
  const text       = processTemplate(auto.message, { clientName, resumo, semana, cardName: '', columnName: '', projectName: '' });
  const url        = `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${config.instance}`;

  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
    body:    JSON.stringify({ number: jid, text }),
  });
};

const WEEKLY_LOG_KEY = 'venza_weekly_log';

// ── Helpers de data ──────────────────────────────────────────────────────────

/** Retorna a chave ISO da semana, ex: "2026-W14" */
const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - yearStart) / 86400000 - 3 + (yearStart.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

/** Retorna o intervalo da semana, ex: "31/03 a 04/04" */
export const getWeekLabel = (date = new Date()) => {
  const d    = new Date(date);
  const day  = d.getDay();
  const mon  = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const fri  = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (dt) => dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${fmt(mon)} a ${fmt(fri)}`;
};

// ── Persistência ─────────────────────────────────────────────────────────────
const loadLog = () => { try { return JSON.parse(localStorage.getItem(WEEKLY_LOG_KEY) || '{}'); } catch { return {}; } };
const saveLog = (log) => localStorage.setItem(WEEKLY_LOG_KEY, JSON.stringify(log));

// ── Registrar conclusão ───────────────────────────────────────────────────────
/**
 * Chamado pelo KanbanBoard quando um card é movido para a coluna "concluido".
 */
export const logCardCompleted = ({ clientId, clientName, title, projectName }) => {
  const log     = loadLog();
  const weekKey = getWeekKey();

  // Reseta se mudou de semana
  if (!log[clientId] || log[clientId].weekKey !== weekKey) {
    log[clientId] = { weekKey, clientName, completed: [] };
  }

  // Deduplicação por título
  if (!log[clientId].completed.some(c => c.title === title)) {
    log[clientId].completed.push({
      title,
      projectName: projectName || '',
      at: new Date().toLocaleDateString('pt-BR'),
      registeredAt: new Date().toISOString(),
    });
  }

  saveLog(log);
};

// ── Construir texto do {{resumo}} ────────────────────────────────────────────
export const buildWeeklyText = (clientId, cutoffDate = null) => {
  if (!clientId) return 'Cliente não identificado.';
  const idStr   = String(clientId); // garante comparação por string

  const log     = loadLog();
  const entry   = log[idStr];
  const weekKey = getWeekKey();
  const allCompleted = entry?.weekKey === weekKey ? entry.completed : [];

  // Filtra atividades registradas até o cutoff (30 min antes do envio)
  const completed = cutoffDate
    ? allCompleted.filter(c => !c.registeredAt || new Date(c.registeredAt) <= cutoffDate)
    : allCompleted;

  let allCards = [];
  try { allCards = JSON.parse(localStorage.getItem('venza_kanban_cards') || '[]'); } catch {}

  // Filtra SOMENTE cards deste cliente (comparação string estrita)
  const cards      = allCards.filter(c => String(c.clientId) === idStr);
  const pending    = cards.filter(c => c.columnId === 'pendente');
  const inProgress = cards.filter(c => c.columnId === 'andamento');
  const approval   = cards.filter(c => c.columnId === 'aprovacao');

  // Agrupa por projeto
  const groupByProject = (items, getProj) => {
    const map = {};
    items.forEach(c => {
      const proj = getProj(c) || 'Sem projeto';
      if (!map[proj]) map[proj] = [];
      map[proj].push(c);
    });
    return map;
  };

  const active = [...inProgress, ...approval];
  const allItems = [...completed, ...active, ...pending];

  if (!allItems.length) return 'Nenhuma atividade registrada para esta semana.';

  // Coleta todos os projetos presentes
  const allProjects = [...new Set([
    ...completed.map(c => c.projectName || 'Sem projeto'),
    ...active.map(c => c.projectName || c.tag || 'Sem projeto'),
    ...pending.map(c => c.projectName || c.tag || 'Sem projeto'),
  ])];

  const completedByProj = groupByProject(completed, c => c.projectName);
  const activeByProj    = groupByProject(active,    c => c.projectName || c.tag);
  const pendingByProj   = groupByProject(pending,   c => c.projectName || c.tag);

  const lines = [];

  allProjects.forEach((proj, i) => {
    if (i > 0) lines.push('');
    lines.push(`📁 *${proj}*`);

    const done = completedByProj[proj] || [];
    const act  = activeByProj[proj]    || [];
    const pend = pendingByProj[proj]   || [];

    if (done.length) {
      lines.push(`  ✅ Concluídos (${done.length}):`);
      done.forEach(c => lines.push(`    • ${c.title}`));
    }
    if (act.length) {
      lines.push(`  🚀 Em andamento / aprovação (${act.length}):`);
      act.forEach(c => lines.push(`    • ${c.title}`));
    }
    if (pend.length) {
      lines.push(`  ⏳ Pendentes (${pend.length}):`);
      pend.forEach(c => lines.push(`    • ${c.title}`));
    }
  });

  return lines.join('\n').trim();
};

// ── Verificar e disparar na sexta ────────────────────────────────────────────
/**
 * Deve ser chamado a cada 60s pelo App.jsx.
 * Só dispara às sextas, no horário configurado na automação.
 */
export const checkAndFireWeeklySummary = async () => {
  const now = new Date();
  if (now.getDay() !== 5) return; // 5 = sexta-feira

  const hhmm    = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayStr = now.toDateString();

  const automations   = loadAutomations();
  const summaryAutos  = automations.filter(a => a.ativa && a.trigger === 'resumo_semanal');
  if (!summaryAutos.length) return;

  const groups   = loadEvoGroups();
  const allIds   = Object.keys(groups).filter(id => groups[id]?.jid || groups[id]?.numero);
  if (!allIds.length) return;

  let updated = [...automations];
  let changed = false;
  const semana = getWeekLabel(now);

  for (const auto of summaryAutos) {
    const s = auto.schedule;
    if (!s?.time) continue;

    // Janela de ±1 minuto para não depender do timing exato do setInterval
    const [sh, sm] = s.time.split(':').map(Number);
    const configuredMin = sh * 60 + sm;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (Math.abs(nowMin - configuredMin) > 1) continue;

    if (s.lastFired && new Date(s.lastFired).toDateString() === todayStr) continue;

    // Cutoff: atividades registradas até 30 min antes do horário de envio
    const cutoff   = new Date(now.getTime() - 30 * 60 * 1000);
    const filter   = auto.clientFilter || [];
    const clientIds = filter.length > 0 ? allIds.filter(id => filter.includes(id)) : allIds;

    for (const clientId of clientIds) {
      // Cada cliente recebe APENAS o próprio resumo no PRÓPRIO grupo
      const resumo = buildWeeklyText(clientId, cutoff);
      await sendResumoToClient(clientId, resumo, semana, auto);
    }

    updated = updated.map(a =>
      a.id === auto.id
        ? { ...a, schedule: { ...a.schedule, lastFired: now.toISOString() }, disparos: (a.disparos || 0) + clientIds.length }
        : a
    );
    changed = true;
  }

  if (changed) saveAutomations(updated);
};
