const META_API = 'https://graph.facebook.com/v25.0';
const ALERTS_KEY = 'venza_meta_balance_alerts';

// Funding source type 4 = FACEBOOK_PREPAY (pré-pago/saldo)
// Types 1 (credit card), 2, 3, etc. = não monitoráveis
const PREPAY_TYPE = 4;

export const loadBalanceAlerts = () => {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]'); } catch { return []; }
};
export const saveBalanceAlerts = (list) => localStorage.setItem(ALERTS_KEY, JSON.stringify(list));

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
  const isPrepay    = fundingType === PREPAY_TYPE;
  // balance vem em centavos da moeda da conta
  const balance     = parseFloat(data.balance || '0') / 100;
  const currency    = data.currency || 'BRL';

  return { balance, currency, isPrepay, fundingType };
};

/**
 * Formata valor monetário no padrão brasileiro.
 */
export const fmtCurrency = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
