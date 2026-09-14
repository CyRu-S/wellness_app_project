export function formatNutrition(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0.0';
  return number.toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0');
}
