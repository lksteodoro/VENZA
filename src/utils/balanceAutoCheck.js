import {
  checkAccountBalance, loadBalanceAlerts, saveBalanceAlerts,
  fmtCurrency, loadAutoCheckConfig, saveAutoCheckConfig, isBusinessHoursBRT,
} from './metaBalance';
import { fireAutomation } from './automations';

/**
 * Roda a verificação de saldo para todos os clientes com alerta ativo.
 * Lê/salva direto no localStorage (pode ser chamado fora de componentes React).
 * Ao terminar, dispara o evento 'venza:balance-checked' para atualizar a UI.
 */
export const runAutoBalanceCheck = async () => {
  const token = localStorage.getItem('meta_access_token');
  if (!token) return;

  const alerts = loadBalanceAlerts();
  const enabled = alerts.filter(a => a.enabled);
  if (!enabled.length) return;

  for (const alert of enabled) {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(`meta_defaults_${alert.clientId}`)); }
      catch { return null; }
    })();
    if (!saved?.adAccountId) continue;

    const now = new Date().toLocaleString('pt-BR');
    try {
      const result = await checkAccountBalance(saved.adAccountId, token);

      if (!result.isPrepay && !alert.forceMonitor) {
        // Atualiza sem disparar alerta
        const fresh = loadBalanceAlerts();
        saveBalanceAlerts(fresh.map(a =>
          a.clientId === alert.clientId
            ? { ...a, lastBalance: null, isPrepay: false, fundingType: result.fundingType, lastCheck: now, lastError: null }
            : a
        ));
        continue;
      }

      const fresh = loadBalanceAlerts();
      saveBalanceAlerts(fresh.map(a =>
        a.clientId === alert.clientId
          ? { ...a, lastBalance: result.balance, currency: result.currency, isPrepay: true, fundingType: result.fundingType, lastCheck: now, lastError: null }
          : a
      ));

      // Dispara WhatsApp apenas em horário comercial BRT (09–18)
      if (result.balance < (alert.threshold || 0) && isBusinessHoursBRT()) {
        await fireAutomation('saldo_baixo', {
          clientId:   alert.clientId,
          cardName:   saved.adAccountId,
          columnName: 'Meta Ads',
          saldo:      fmtCurrency(result.balance,         result.currency),
          limite:     fmtCurrency(alert.threshold || 0,  result.currency),
        });
      }
    } catch (e) {
      const fresh = loadBalanceAlerts();
      saveBalanceAlerts(fresh.map(a =>
        a.clientId === alert.clientId
          ? { ...a, lastError: e.message, lastCheck: now }
          : a
      ));
    }
  }

  // Registra o horário da última execução automática
  const cfg = loadAutoCheckConfig();
  saveAutoCheckConfig({ ...cfg, lastRun: new Date().toISOString() });

  // Notifica componentes React para re-ler o localStorage
  window.dispatchEvent(new CustomEvent('venza:balance-checked'));
};

/**
 * Verifica se já passou o intervalo configurado desde a última execução.
 * Se sim, roda o check.
 */
export const maybeRunAutoCheck = async () => {
  const cfg = loadAutoCheckConfig();
  if (!cfg.enabled) return;
  const intervalMs = (cfg.intervalHours || 6) * 60 * 60 * 1000;
  const last = cfg.lastRun ? new Date(cfg.lastRun).getTime() : 0;
  if (Date.now() - last >= intervalMs) {
    await runAutoBalanceCheck();
  }
};
