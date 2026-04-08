/**
 * taskNotificationBatcher.js
 * ──────────────────────────
 * Agrupa atividades adicionadas ao longo de 5 minutos por cliente
 * e dispara UMA única mensagem WhatsApp via o trigger 'atividades_adicionadas'
 * (configurável na página de Automações).
 *
 * Estrutura no localStorage (venza_task_notif_queue):
 * {
 *   [clientId]: {
 *     clientName:  string,
 *     firstAt:     number  ← timestamp (ms) do primeiro item adicionado
 *     items: [
 *       { projectName: string, taskText: string }
 *     ]
 *   }
 * }
 */

import { fireAutomation } from './automations';

const QUEUE_KEY = 'venza_task_notif_queue';
const DELAY_MS  = 5 * 60 * 1000; // 5 minutos

// ── Persistência ──────────────────────────────────────────────────────────────
const loadQueue = () => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}'); }
  catch { return {}; }
};

const saveQueue = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

// ── Adicionar ao batch ────────────────────────────────────────────────────────
export const queueTaskNotification = ({ clientId, clientName, projectName, taskText }) => {
  const queue = loadQueue();
  const now   = Date.now();

  if (!queue[clientId]) {
    queue[clientId] = { clientName, firstAt: now, items: [] };
  }

  queue[clientId].items.push({ projectName, taskText });
  saveQueue(queue);
};

// ── Formatar o bloco {{atividades}} ──────────────────────────────────────────
const buildAtividades = (items) => {
  const byProject = {};
  for (const item of items) {
    const key = item.projectName || 'Geral';
    if (!byProject[key]) byProject[key] = [];
    byProject[key].push(item.taskText);
  }

  const lines = [];
  for (const [proj, tasks] of Object.entries(byProject)) {
    lines.push(`📁 *${proj}*`);
    for (const t of tasks) lines.push(`  • ${t}`);
    lines.push('');
  }

  return lines.join('\n').trim();
};

// ── Flush: verificar e disparar notificações prontas ─────────────────────────
/**
 * Deve ser chamado periodicamente (ex: a cada 60s).
 * Processa apenas clientes cujo timer de 5 min já expirou.
 */
export const flushPendingNotifications = async () => {
  const queue   = loadQueue();
  const now     = Date.now();
  const flushed = [];

  for (const [clientId, entry] of Object.entries(queue)) {
    if (now - entry.firstAt < DELAY_MS) continue; // ainda dentro dos 5 min

    if (!entry.items?.length) {
      delete queue[clientId];
      continue;
    }

    const atividades = buildAtividades(entry.items);
    await fireAutomation('atividades_adicionadas', { clientId, atividades });

    delete queue[clientId];
    flushed.push(clientId);
  }

  saveQueue(queue);
  return flushed;
};

// ── Status: clientes aguardando + tempo restante ──────────────────────────────
export const getBatchStatus = () => {
  const queue = loadQueue();
  const now   = Date.now();
  return Object.entries(queue).map(([clientId, entry]) => ({
    clientId,
    clientName:   entry.clientName,
    count:        entry.items?.length || 0,
    remainingSec: Math.max(0, Math.ceil((entry.firstAt + DELAY_MS - now) / 1000)),
  }));
};
