/**
 * businessHours.js
 * Calcula horas úteis entre duas datas.
 * Horário comercial: seg–sex, 09h–18h.
 */

/**
 * @param {string|Date} since  - Data de início
 * @param {Date}        to     - Data de fim (padrão: agora)
 * @returns {number}           - Horas úteis decorridas
 */
export const calcBusinessHours = (since, to = new Date()) => {
  if (!since) return 0;
  const start = new Date(since);
  if (isNaN(start.getTime()) || start >= to) return 0;

  const BH_START = 9;
  const BH_END   = 18;
  let hours = 0;
  const cursor = new Date(start);

  while (cursor < to) {
    const day = cursor.getDay(); // 0=Dom, 6=Sáb

    if (day === 0 || day === 6) {
      // Fim de semana → pula para segunda 9h
      const skip = day === 0 ? 1 : 2;
      cursor.setDate(cursor.getDate() + skip);
      cursor.setHours(BH_START, 0, 0, 0);
      continue;
    }

    const h = cursor.getHours();

    if (h < BH_START) {
      cursor.setHours(BH_START, 0, 0, 0);
      continue;
    }

    if (h >= BH_END) {
      // Fora do horário → pula para próximo dia 9h
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(BH_START, 0, 0, 0);
      continue;
    }

    // Dentro do horário comercial → avança até fim da hora ou até `to`
    const endOfHour = new Date(cursor);
    endOfHour.setHours(h + 1, 0, 0, 0);
    const target = endOfHour < to ? endOfHour : to;
    hours += (target.getTime() - cursor.getTime()) / 3_600_000;
    cursor.setTime(target.getTime());
  }

  return hours;
};
