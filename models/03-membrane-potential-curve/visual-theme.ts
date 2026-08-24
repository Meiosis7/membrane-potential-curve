export type VisualVariant = "original" | "beautified";

import type { CurveIntensity } from "./types";

export interface CurveVisualTheme {
  surfaceTop: string;
  surfaceBottom: string;
  surfaceFallback: string;
  grid: string;
  threshold: string;
  thresholdDash: readonly number[];
  stageBand: string;
  cursor: string;
  label: string;
  gridLabel: string;
  thresholdLabel: string;
  axisLabel: string;
  accents: { sodium: string; potassium: string };
  intensities: Record<CurveIntensity, { color: string; dash: readonly number[]; label: string }>;
}

const ORIGINAL: CurveVisualTheme = {
  surfaceTop: "rgba(234, 242, 238, .74)",
  surfaceBottom: "rgba(250, 251, 248, .34)",
  surfaceFallback: "#f8faf7",
  grid: "rgba(95, 119, 114, .16)",
  threshold: "rgba(213, 138, 34, .58)",
  thresholdDash: [6, 5],
  stageBand: "rgba(22, 143, 145, .07)",
  cursor: "rgba(24, 49, 59, .62)",
  label: "#27434c",
  gridLabel: "#71847e",
  thresholdLabel: "#b16f15",
  axisLabel: "#6f817b",
  accents: { sodium: "#168f91", potassium: "#d58a22" },
  intensities: {
    weak: { color: "#7c6bc4", dash: [8, 6], label: "弱刺激" },
    threshold: { color: "#ef6a57", dash: [], label: "阈刺激" },
    strong: { color: "#168f91", dash: [3, 5], label: "强刺激" },
  },
};

const BEAUTIFIED = {
  surfaceTop: "rgba(225, 240, 235, .88)",
  surfaceBottom: "rgba(247, 244, 235, .58)",
  surfaceFallback: "#f7f4eb",
  grid: "rgba(44, 78, 76, .14)",
  threshold: "rgba(237, 157, 56, .66)",
  thresholdDash: [6, 5],
  stageBand: "rgba(22, 166, 173, .09)",
  cursor: "rgba(16, 43, 50, .62)",
  label: "#274a4f",
  gridLabel: "#47656a",
  thresholdLabel: "#9c6418",
  axisLabel: "#5f7675",
  accents: { sodium: "#16a6ad", potassium: "#ed9d38" },
  intensities: {
    weak: { color: "#796cc8", dash: [8, 6], label: "弱刺激" },
    threshold: { color: "#f15f50", dash: [], label: "阈刺激" },
    strong: { color: "#16a6ad", dash: [3, 5], label: "强刺激" },
  },
} as const satisfies CurveVisualTheme;

export function getCurveVisualTheme(variant: VisualVariant): CurveVisualTheme {
  return variant === "beautified" ? BEAUTIFIED : ORIGINAL;
}
