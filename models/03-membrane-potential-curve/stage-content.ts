import type { CurveStage } from "./types";

export interface StageDetail {
  title: string;
  shortTitle: string;
  summary: string;
  voltage: string;
  transport: string;
  result: string;
}

export interface ActionPotentialStep {
  stage: Exclude<CurveStage, "local">;
  time: number;
}

export const ACTION_POTENTIAL_STEPS: ReadonlyArray<ActionPotentialStep> = [
  { stage: "resting", time: 0.4 },
  { stage: "threshold", time: 1.5 },
  { stage: "depolarization", time: 2.5 },
  { stage: "peak", time: 3.3 },
  { stage: "repolarization", time: 4.35 },
  { stage: "hyperpolarization", time: 5.15 },
  { stage: "recovery", time: 5.65 },
];

export const STAGE_DETAILS: Record<CurveStage, StageDetail> = {
  resting: {
    title: "静息状态",
    shortTitle: "静息",
    summary: "神经纤维尚未兴奋，膜内保持相对负电位。",
    voltage: "稳定在约 −70 mV",
    transport: "电压门控 Na⁺、K⁺ 通道关闭，无引起动作电位的主要净离子流",
    result: "离子梯度已建立，细胞处于可兴奋状态",
  },
  local: {
    title: "阈下局部电位",
    shortTitle: "局部电位",
    summary: "刺激引起局部去极化，但强度不足以触发动作电位。",
    voltage: "升高但未达到 −55 mV 阈值",
    transport: "电压门控 Na⁺ 通道没有大量开放",
    result: "局部变化随后衰减，膜电位回到静息水平",
  },
  threshold: {
    title: "达到阈值",
    shortTitle: "达阈",
    summary: "刺激使膜电位达到触发动作电位的临界水平。",
    voltage: "由约 −70 mV 升至约 −55 mV",
    transport: "达到阈值后，电压门控 Na⁺ 通道迅速大量开放",
    result: "Na⁺ 内流形成正反馈，进入快速去极化",
  },
  depolarization: {
    title: "去极化",
    shortTitle: "去极化",
    summary: "膜内电位快速升高，并由负值转为正值。",
    voltage: "由约 −55 mV 快速升至约 +30 mV",
    transport: "Na⁺ 通道开放，Na⁺ 顺电化学梯度大量内流",
    result: "膜内外电性发生反转，动作电位到达峰值",
  },
  peak: {
    title: "峰值 / 反极化",
    shortTitle: "峰值",
    summary: "膜内达到动作电位最高点，离子通道状态开始转换。",
    voltage: "维持在约 +30 mV 的峰值附近",
    transport: "Na⁺ 通道失活；延迟开放的 K⁺ 通道开始成为主要通道",
    result: "Na⁺ 内流停止，膜电位转而进入下降阶段",
  },
  repolarization: {
    title: "复极化",
    shortTitle: "复极化",
    summary: "膜内电位从正值快速下降，重新变为负值。",
    voltage: "由约 +30 mV 下降至约 −70 mV",
    transport: "K⁺ 通道开放，K⁺ 持续外流",
    result: "膜内恢复相对负电性，但 K⁺ 通道尚未及时关闭",
  },
  hyperpolarization: {
    title: "超极化",
    shortTitle: "超极化",
    summary: "K⁺ 通道关闭较慢，膜内电位短暂低于静息水平。",
    voltage: "由约 −70 mV 继续下降至约 −80 mV",
    transport: "K⁺ 通道仍开放，K⁺ 继续外流",
    result: "膜电位低于静息电位，神经纤维的兴奋性暂时降低",
  },
  recovery: {
    title: "恢复静息",
    shortTitle: "恢复",
    summary: "K⁺ 通道逐渐关闭，膜电位由超极化水平返回静息水平。",
    voltage: "由约 −80 mV 回升至约 −70 mV",
    transport: "K⁺ 外流逐渐减弱；漏通道和钠钾泵维持离子梯度",
    result: "恢复稳定的静息电位，准备接受下一次刺激",
  },
};
