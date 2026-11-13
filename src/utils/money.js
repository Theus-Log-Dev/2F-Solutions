// Todos os valores são inteiros em centavos.
export function toCents(v) {
  let s = String(v ?? '').trim().replace(/[^\d.,-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : 0;
}
export const fromCents = (c) => (c / 100).toFixed(2).replace('.', ',');
export const fmt = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
