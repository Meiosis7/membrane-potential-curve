import type { VisualVariant } from "./visual-theme";

export interface CurveLayout {
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  tickFontSize: number;
  axisFontSize: number;
  stageFontSize: number;
  pointRadius: number;
  plotHeight: number;
}

const ORIGINAL_METRICS = {
  padding: { top: 42, right: 22, bottom: 42, left: 62 },
  tickFontSize: 12,
  axisFontSize: 11,
  stageFontSize: 12,
  pointRadius: 7,
} as const;

const COMPACT_METRICS = {
  padding: { top: 16, right: 14, bottom: 24, left: 44 },
  tickFontSize: 10,
  axisFontSize: 9,
  stageFontSize: 10,
  pointRadius: 5,
} as const;

const BEAUTIFIED_COMPACT_HEIGHT = 180;

export function getCurveLayout(
  height: number,
  visualVariant: VisualVariant,
): CurveLayout {
  const metrics = visualVariant === "beautified" && height < BEAUTIFIED_COMPACT_HEIGHT
    ? COMPACT_METRICS
    : ORIGINAL_METRICS;

  return {
    ...metrics,
    plotHeight: Math.max(
      0,
      height - metrics.padding.top - metrics.padding.bottom,
    ),
  };
}
