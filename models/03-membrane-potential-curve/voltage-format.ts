export function formatMembranePotential(mv: number) {
  const rounded = Math.abs(mv) < 0.5 ? 0 : Math.round(mv);
  return `${rounded > 0 ? "+" : ""}${rounded} mV`;
}
