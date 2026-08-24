export type DisplayedPolarity = "negative" | "neutral" | "positive";

function roundDisplayedPotential(mv: number) {
  const rounded = Math.abs(mv) < 0.5 ? 0 : Math.round(mv);
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function getDisplayedPolarity(mv: number): DisplayedPolarity {
  const rounded = roundDisplayedPotential(mv);
  if (rounded === 0) return "neutral";
  return rounded > 0 ? "positive" : "negative";
}

export function formatMembranePotential(mv: number) {
  const rounded = roundDisplayedPotential(mv);
  return `${rounded > 0 ? "+" : ""}${rounded} mV`;
}
