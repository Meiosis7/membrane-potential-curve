"use client";

import { ACTION_POTENTIAL_STEPS, STAGE_DETAILS } from "./stage-content";
import type { CurveStage } from "./types";

export interface StageExplanationProps {
  stage: CurveStage;
  onPlayRange: (startTime: number, endTime: number) => void;
}

export function StageExplanation({ stage, onPlayRange }: StageExplanationProps) {
  const detail = STAGE_DETAILS[stage];
  const activeStep = ACTION_POTENTIAL_STEPS.findIndex((step) => step.stage === stage);

  return (
    <section className="membrane-stage-guide" aria-label="分步过程解释">
      <nav className="membrane-stage-nav" aria-label="膜电位阶段导航">
        {ACTION_POTENTIAL_STEPS.map((step, index) => {
          const stepDetail = STAGE_DETAILS[step.stage];
          const active = step.stage === stage;
          return (
            <button
              type="button"
              key={step.stage}
              aria-label={`播放步骤 ${index + 1} ${stepDetail.title}`}
              aria-pressed={active}
              onClick={() => onPlayRange(step.startTime, step.endTime)}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{stepDetail.shortTitle}</span>
              <i aria-hidden="true">▶</i>
            </button>
          );
        })}
      </nav>

      <article className="membrane-stage-detail" aria-label="当前步骤解释" aria-live="polite">
        <header>
          <span>{activeStep >= 0 ? `第 ${activeStep + 1} 步` : "阈下反应"}</span>
          <strong>{detail.title}</strong>
          <p>{detail.summary}</p>
        </header>
        <div>
          <p className="membrane-stage-voltage"><b>电位变化</b>{detail.voltage}</p>
          <p className="membrane-stage-transport"><b>通道与离子</b>{detail.transport}</p>
          <p className="membrane-stage-result"><b>阶段结果</b>{detail.result}</p>
        </div>
      </article>
    </section>
  );
}
