import type {
  CurveAnswer,
  CurveAnswerCheck,
  CurveIntensity,
  CurveSnapshot,
  CurveStage,
  InsidePolarity,
} from "./types";

const STAGE_ANSWERS: Record<CurveStage, CurveAnswer> = {
  resting: {
    stage: "resting",
    ionFlow: "none",
    insidePolarity: "negative",
  },
  local: {
    stage: "local",
    ionFlow: "none",
    insidePolarity: "negative",
  },
  threshold: {
    stage: "threshold",
    ionFlow: "none",
    insidePolarity: "negative",
  },
  depolarization: {
    stage: "depolarization",
    ionFlow: "sodium-in",
    insidePolarity: "positive",
  },
  peak: {
    stage: "peak",
    ionFlow: "none",
    insidePolarity: "positive",
  },
  repolarization: {
    stage: "repolarization",
    ionFlow: "potassium-out",
    insidePolarity: "negative",
  },
  hyperpolarization: {
    stage: "hyperpolarization",
    ionFlow: "potassium-out",
    insidePolarity: "negative",
  },
  recovery: {
    stage: "recovery",
    ionFlow: "potassium-out",
    insidePolarity: "negative",
  },
};

const STAGE_EXPLANATIONS: Record<CurveStage, string> = {
  resting: "静息期：无主要离子跨膜流动，膜内相对为负、膜外相对为正。",
  local: "局部电位期：刺激未达阈值，无主要离子跨膜流动，膜内仍相对为负、膜外相对为正。",
  threshold: "阈电位：膜内仍相对为负、膜外相对为正，达到阈值后将触发Na⁺内流。",
  depolarization: "去极化期：Na⁺大量内流，膜内由负变正、膜外相对为负。",
  peak: "峰值期：Na⁺内流已停止且K⁺外流尚未成为主要运动，膜内相对为正、膜外相对为负。",
  repolarization: "复极化期：K⁺外流，膜内恢复为相对负、膜外相对正。",
  hyperpolarization: "超极化期：K⁺通道关闭较慢，K⁺继续外流，膜电位短暂低于静息电位。",
  recovery: "恢复静息期：K⁺通道逐渐关闭，膜电位由约−80 mV回到约−70 mV。",
};

const ZERO_MV_TOLERANCE = 1e-9;

function getInsidePolarity(mv: number): InsidePolarity {
  return mv >= -ZERO_MV_TOLERANCE ? "positive" : "negative";
}

function getSnapshotAnswer(snapshot: CurveSnapshot): CurveAnswer {
  return {
    stage: snapshot.stage,
    ionFlow: snapshot.ionFlow,
    insidePolarity: snapshot.insidePolarity,
  };
}

function getSnapshotExplanation(expected: CurveAnswer): string {
  const ionMovement =
    expected.ionFlow === "sodium-in"
      ? "Na⁺内流"
      : expected.ionFlow === "potassium-out"
        ? "K⁺外流"
        : "无主要离子跨膜流动";
  const outsidePolarity =
    expected.insidePolarity === "positive" ? "负" : "正";

  return `${expected.stage}：${ionMovement}，当前膜内相对为${expected.insidePolarity === "positive" ? "正" : "负"}、膜外相对为${outsidePolarity}。`;
}

function interpolate(
  time: number,
  startTime: number,
  endTime: number,
  startMv: number,
  endMv: number,
): number {
  return startMv + ((time - startTime) / (endTime - startTime)) * (endMv - startMv);
}

function getActionPotentialStage(time: number): CurveStage {
  if (time < 1) return "resting";
  if (time < 2) return "threshold";
  if (time < 3) return "depolarization";
  if (time < 4) return "peak";
  if (time < 4.8) return "repolarization";
  if (time < 5.3) return "hyperpolarization";
  if (time < 6) return "recovery";
  return "resting";
}

function getActionPotentialMv(time: number, stage: CurveStage): number {
  switch (stage) {
    case "threshold":
      return interpolate(time, 1, 2, -70, -55);
    case "depolarization":
      return interpolate(time, 2, 3, -55, 30);
    case "peak":
      return 30;
    case "repolarization":
      return interpolate(time, 4, 4.8, 30, -70);
    case "hyperpolarization":
      return interpolate(time, 4.8, 5.3, -70, -80);
    case "recovery":
      return interpolate(time, 5.3, 6, -80, -70);
    default:
      return -70;
  }
}

function getWeakSnapshot(time: number): CurveSnapshot {
  const stage: CurveStage = time >= 1 && time < 4 ? "local" : "resting";
  const answer = STAGE_ANSWERS[stage];
  const mv = stage === "local" ? -60 : -70;

  return {
    ...answer,
    mv,
    insidePolarity: getInsidePolarity(mv),
    sodiumOpen: false,
    potassiumOpen: false,
  };
}

export function getCurveSnapshot(
  time: number,
  intensity: CurveIntensity,
): CurveSnapshot {
  if (intensity === "weak") return getWeakSnapshot(time);

  const stage = getActionPotentialStage(time);
  const answer = STAGE_ANSWERS[stage];
  const mv = getActionPotentialMv(time, stage);

  return {
    ...answer,
    mv,
    insidePolarity: getInsidePolarity(mv),
    sodiumOpen: stage === "depolarization",
    potassiumOpen:
      stage === "repolarization" ||
      stage === "hyperpolarization" ||
      stage === "recovery",
  };
}

export function checkCurveAnswer(
  stage: CurveStage,
  answer: CurveAnswer,
): CurveAnswerCheck;
export function checkCurveAnswer(
  snapshot: CurveSnapshot,
  answer: CurveAnswer,
): CurveAnswerCheck;
export function checkCurveAnswer(
  stageOrSnapshot: CurveStage | CurveSnapshot,
  answer: CurveAnswer,
): CurveAnswerCheck {
  const expected =
    typeof stageOrSnapshot === "string"
      ? STAGE_ANSWERS[stageOrSnapshot]
      : getSnapshotAnswer(stageOrSnapshot);
  const explanation =
    typeof stageOrSnapshot === "string"
      ? STAGE_EXPLANATIONS[stageOrSnapshot]
      : getSnapshotExplanation(expected);

  return {
    correct:
      answer.stage === expected.stage &&
      answer.ionFlow === expected.ionFlow &&
      answer.insidePolarity === expected.insidePolarity,
    expected: { ...expected },
    explanation,
  };
}

export type {
  CurveAnswer,
  CurveAnswerCheck,
  CurveIntensity,
  CurveSnapshot,
  CurveStage,
  InsidePolarity,
  IonFlow,
} from "./types";
