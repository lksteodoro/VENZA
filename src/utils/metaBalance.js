const META_API   = 'https://graph.facebook.com/v25.0';
const ALERTS_KEY = 'venza_meta_balance_alerts';
const AUTO_KEY   = 'venza_balance_auto_check'; // { enabled, intervalHours, lastRun }

// Tipos pré-pago conhecidos da Meta:
//   2 = FACEBOOK_PREPAY (contas antigas / alguns mercados)
//   4 = FACEBOOK_PREPAY (padrão atual)
// Tipo 1 = cartão de crédito → não monitorável
// null = funding_source_details ausente (token sem permissão ou conta recém-criada)
const PREPAY_TYPES = new Set([2, 4]);

export const loadBalanceAlerts  = () => { try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]'); } catch { return []; } };
export const saveBalanceAlerts  = (list) => localStorage.setItem(ALERTS_KEY, JSON.stringify(list));

export const loadAutoCheckConfig = () => {
  try { return JSON.parse(localStorage.getItem(AUTO_KEY) || 'null') || { enabled: false, intervalHours: 6, lastRun: null }; }
  catch { return { enabled: false, intervalHours: 6, lastRun: null }; }
};
export const saveAutoCheckConfig = (cfg) => localStorage.setItem(AUTO_KEY, JSON.stringify(cfg));

/** Retorna true se o horário atual em BRT (UTC-3) estiver entre 09:00 e 18:00. */
export const isBusinessHoursBRT = () => {
  const brtHour = (new Date().getUTCHours() - 3 + 24) % 24;
  return brtHour >= 9 && brtHour < 18;
};

/**
 * Consulta saldo e tipo de financiamento de uma conta de anúncios.
 * @param {string} adAccountId  ex: "act_123456789"
 * @param {string} token        Meta access token
 * @returns {{ balance: number, currency: string, isPrepay: boolean, fundingType: number|null }}
 */
export const checkAccountBalance = async (adAccountId, token) => {
  const url = `${META_API}/${adAccountId}?fields=balance,currency,funding_source_details&access_token=${token}`;
  const res  = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(data.error.message || 'Erro na API do Meta');

  const fundingType = data.funding_source_details?.type ?? null;
  const isPrepay    = fundingType !== null && PREPAY_TYPES.has(fundingType);

  // Para contas pré-pagas, funding_source_details.balance é o saldo bruto
  // exibido no painel do Meta Ads ("Saldo disponível").
  // O campo top-level balance é o saldo líquido após reservas de campanhas.
  const fsdBalance  = data.funding_source_details?.balance;
  const rawBalance  = fsdBalance != null ? fsdBalance : data.balance;
  const balance     = parseFloat(rawBalance || '0') / 100;
  const currency    = data.currency || 'BRL';

  return { balance, currency, isPrepay, fundingType };
};

/**
 * Formata valor monetário no padrão brasileiro.
 */
export const fmtCurrency = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
