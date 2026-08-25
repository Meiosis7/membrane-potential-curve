"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CurveCanvas } from "./CurveCanvas";
import { MembraneView } from "./MembraneView";
import { StageExplanation } from "./StageExplanation";
import { advanceLoopingPlayback, advancePlayback, getFullPlaybackAriaLabel, getStagePlaybackEnd } from "./playback";
import { getCurveSnapshot } from "./simulation";
import { formatMembranePotential } from "./voltage-format";
import type { PlaybackSpeed } from "./playback";
import type { CurveIntensity, CurveStage } from "./types";
import type { VisualVariant } from "./visual-theme";

const DURATION = 6;
const LOOPING_STAGE_STARTS = new Set([2, 2.65]);

const STAGE_LABEL: Record<CurveStage, string> = {
  resting: "静息状态",
  local: "局部电位",
  threshold: "接近阈电位",
  depolarization: "去极化",
  peak: "反极化",
  repolarization: "复极化",
  hyperpolarization: "超极化",
  recovery: "恢复静息",
};

const ION_LABEL = {
  none: "无主要离子跨膜流动",
  "sodium-in": "Na⁺ 内流",
  "potassium-out": "K⁺ 外流",
} as const;

const INTENSITIES: ReadonlyArray<{ value: CurveIntensity; label: string; note: string }> = [
  { value: "weak", label: "弱刺激", note: "阈下" },
  { value: "threshold", label: "阈刺激", note: "达阈" },
  { value: "strong", label: "强刺激", note: "超阈" },
];

function clamp(value: number) {
  return Math.min(DURATION, Math.max(0, value));
}

export interface MembraneCurveLabProps {
  visualVariant?: VisualVariant;
}

export function MembraneCurveLab({ visualVariant = "original" }: MembraneCurveLabProps) {
  const isBeautified = visualVariant === "beautified";
  const [intensity, setIntensity] = useState<CurveIntensity>("threshold");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [compare, setCompare] = useState(false);
  const lastFrame = useRef<number | null>(null);
  const playUntil = useRef(DURATION);
  const loopStart = useRef<number | null>(null);
  const snapshot = useMemo(() => getCurveSnapshot(time, intensity), [intensity, time]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      const previous = lastFrame.current ?? now;
      lastFrame.current = now;
      setTime((current) => {
        if (loopStart.current !== null) {
          return advanceLoopingPlayback(current, now - previous, speed, loopStart.current, playUntil.current);
        }
        const next = advancePlayback(current, now - previous, speed, playUntil.current);
        if (next >= playUntil.current) setPlaying(false);
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      lastFrame.current = null;
    };
  }, [playing, speed]);

  const changeTime = (nextTime: number) => {
    loopStart.current = null;
    playUntil.current = DURATION;
    lastFrame.current = null;
    setPlaying(false);
    setHasStarted(true);
    setTime(clamp(nextTime));
  };

  const selectIntensity = (nextIntensity: CurveIntensity) => {
    loopStart.current = null;
    playUntil.current = DURATION;
    lastFrame.current = null;
    setIntensity(nextIntensity);
    setTime(0);
    setPlaying(false);
    setHasStarted(false);
  };

  const togglePlayback = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (loopStart.current === null) playUntil.current = DURATION;
    lastFrame.current = null;
    if (!hasStarted || time >= DURATION) setTime(0);
    setHasStarted(true);
    setPlaying(true);
  };

  const reset = () => {
    loopStart.current = null;
    playUntil.current = DURATION;
    lastFrame.current = null;
    setPlaying(false);
    setHasStarted(false);
    setTime(0);
    setIntensity("threshold");
    setSpeed(1);
    setCompare(false);
  };

  const playStageRange = (startTime: number, endTime: number) => {
    if (intensity === "weak") setIntensity("threshold");
    loopStart.current = isBeautified && LOOPING_STAGE_STARTS.has(startTime) ? clamp(startTime) : null;
    playUntil.current = clamp(getStagePlaybackEnd(endTime));
    lastFrame.current = null;
    setTime(clamp(startTime));
    setHasStarted(true);
    setPlaying(true);
  };

  const playLabel = playing ? "暂停" : hasStarted ? "继续" : "开始";
  const curvePanel = (
    <CurveCanvas
      time={time}
      intensity={intensity}
      snapshot={snapshot}
      compare={compare}
      visualVariant={visualVariant}
      onTimeChange={changeTime}
    />
  );
  const membranePanel = (
    <MembraneView
      snapshot={snapshot}
      playing={playing}
      time={time}
      intensity={intensity}
    />
  );
  const stagePanel = (
    <StageExplanation stage={snapshot.stage} onPlayRange={playStageRange} />
  );

  return (
    <main
      className={isBeautified ? "membrane-shell is-beautified" : "membrane-shell"}
      data-layout="single-viewport"
      data-visual-layout={isBeautified ? "mechanism-workbench" : "classic"}
      aria-labelledby="membrane-title"
    >
      <header className="membrane-header">
        <div className="membrane-brand">
          <div className="membrane-series-line">
            <span>选择性必修1·神经冲动的传导</span>
            <b>一生儿高中生物一本通</b>
          </div>
          <div className="membrane-title-row">
            <h1 id="membrane-title">膜电位变化曲线</h1>
            <div className="membrane-live-state" aria-live="polite">
              <span className={playing ? "is-running" : ""} aria-hidden="true" />
              {playing ? "正在运行" : "已暂停"}
            </div>
          </div>
        </div>
        <div
          className="membrane-status-line"
          aria-live={isBeautified ? undefined : "polite"}
        >
          <strong aria-label="当前阶段">{STAGE_LABEL[snapshot.stage]}</strong>
          <span aria-label="当前膜电位" className="membrane-voltage">
            {formatMembranePotential(snapshot.mv)}
          </span>
          <span aria-label="主要离子运动">{ION_LABEL[snapshot.ionFlow]}</span>
        </div>
        {isBeautified && (
          <button
            type="button"
            className="membrane-header-play"
            aria-label={getFullPlaybackAriaLabel(playing, hasStarted)}
            onClick={togglePlayback}
          >
            <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
            {playLabel}
          </button>
        )}
      </header>

      {isBeautified ? (
        <section className="membrane-lab-workspace" aria-label="膜电位同步实验台">
          <section className="membrane-process-canvas">
            {curvePanel}
            {membranePanel}
          </section>
          {stagePanel}
        </section>
      ) : (
        <>
          <section className="membrane-process-canvas">
            {curvePanel}
            {membranePanel}
          </section>
          {stagePanel}
        </>
      )}

      <section
        className={isBeautified ? "membrane-controls membrane-control-dock" : "membrane-controls"}
        aria-label="实验控制台"
      >
        <fieldset className="membrane-intensity-control">
          <legend>刺激强度</legend>
          <div>
            {INTENSITIES.map((option) => (
              <button
                type="button"
                key={option.value}
                aria-label={option.label}
                aria-pressed={intensity === option.value}
                onClick={() => selectIntensity(option.value)}
              >
                <span>{option.label}</span>
                <small>{option.note}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="membrane-transport">
          <button type="button" className="membrane-play" onClick={togglePlayback}>
            <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
            {playLabel}
          </button>
          <button type="button" className="membrane-reset" onClick={reset}>重置</button>
        </div>

        <div className="membrane-options">
          <div className="membrane-speed" aria-label="播放速度">
            {([0.5, 1, 2] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-label={`${value} 倍速`}
                aria-pressed={speed === value}
                onClick={() => setSpeed(value)}
              >
                {value}×
              </button>
            ))}
          </div>
          <label className="membrane-compare-toggle">
            <input
              type="checkbox"
              aria-label="对比曲线"
              checked={compare}
              onChange={(event) => setCompare(event.target.checked)}
            />
            <span aria-hidden="true" />
            对比曲线
          </label>
        </div>
      </section>
    </main>
  );
}
