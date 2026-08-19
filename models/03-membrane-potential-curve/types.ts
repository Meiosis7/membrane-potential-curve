export type CurveIntensity = "weak" | "threshold" | "strong";

export type CurveStage =
  | "resting"
  | "local"
  | "threshold"
  | "depolarization"
  | "peak"
  | "repolarization"
  | "hyperpolarization"
  | "recovery";

export type IonFlow = "none" | "sodium-in" | "potassium-out";

export type InsidePolarity = "negative" | "positive";

export interface CurveAnswer {
  stage: CurveStage;
  ionFlow: IonFlow;
  insidePolarity: InsidePolarity;
}

export interface CurveSnapshot extends CurveAnswer {
  mv: number;
  sodiumOpen: boolean;
  potassiumOpen: boolean;
}

export interface CurveAnswerCheck {
  correct: boolean;
  expected: CurveAnswer;
  explanation: string;
}
