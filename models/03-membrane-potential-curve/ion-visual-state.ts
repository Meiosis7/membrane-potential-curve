import type { CurveIntensity, CurveSnapshot } from "./types";

export interface IonCounts {
  outside: number;
  inside: number;
}

export interface IonVisualState {
  sodium: IonCounts;
  potassium: IonCounts;
  sodiumCrossing: boolean;
  potassiumCrossing: boolean;
  stimulusActive: boolean;
  stimulusLevel: CurveIntensity;
}

const BASE_COUNTS = {
  sodium: { outside: 7, inside: 2 },
  potassium: { outside: 2, inside: 6 },
} as const;

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function sodiumTransferred(time: number) {
  if (time < 2 || time >= 6) return 0;
  return Math.round(clampUnit(time - 2) * 3);
}

function potassiumTransferred(time: number) {
  if (time < 4 || time >= 6) return 0;
  return Math.round(clampUnit((time - 4) / 2) * 3);
}

export function getIonVisualState(
  time: number,
  intensity: CurveIntensity,
  snapshot: CurveSnapshot,
): IonVisualState {
  const sodiumMoved = intensity === "weak" ? 0 : sodiumTransferred(time);
  const potassiumMoved = intensity === "weak" ? 0 : potassiumTransferred(time);

  return {
    sodium: {
      outside: BASE_COUNTS.sodium.outside - sodiumMoved,
      inside: BASE_COUNTS.sodium.inside + sodiumMoved,
    },
    potassium: {
      outside: BASE_COUNTS.potassium.outside + potassiumMoved,
      inside: BASE_COUNTS.potassium.inside - potassiumMoved,
    },
    sodiumCrossing: snapshot.ionFlow === "sodium-in" && snapshot.sodiumOpen,
    potassiumCrossing: snapshot.ionFlow === "potassium-out" && snapshot.potassiumOpen,
    stimulusActive: time >= 1 && time < 2,
    stimulusLevel: intensity,
  };
}
