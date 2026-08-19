"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CurveCanvas } from "./CurveCanvas";
import { MembraneView } from "./MembraneView";
import { StageExplanation } from "./StageExplanation";
import { getCurveSnapshot } from "./simulation";
import type { CurveIntensity, CurveStage } from "./types";

const DURATION = 6;

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

export function MembraneCurveLab() {
  const [intensity, setIntensity] = useState<CurveIntensity>("threshold");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [compare, setCompare] = useState(false);
  const lastFrame = useRef<number | null>(null);
  const snapshot = useMemo(() => getCurveSnapshot(time, intensity), [intensity, time]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      const previous = lastFrame.current ?? now;
      lastFrame.current = now;
      setTime((current) => {
        const next = clamp(current + ((now - previous) / 1000) * speed);
        if (next >= DURATION) setPlaying(false);
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
    setPlaying(false);
    setHasStarted(true);
    setTime(clamp(nextTime));
  };

  const selectIntensity = (nextIntensity: CurveIntensity) => {
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
    if (!hasStarted || time >= DURATION) setTime(0);
    setHasStarted(true);
    setPlaying(true);
  };

  const reset = () => {
    setPlaying(false);
    setHasStarted(false);
    setTime(0);
    setIntensity("threshold");
    setSpeed(1);
    setCompare(false);
  };

  const selectStageTime = (nextTime: number) => {
    if (intensity === "weak") setIntensity("threshold");
    changeTime(nextTime);
  };

  const playLabel = playing ? "暂停" : hasStarted ? "继续" : "开始";

  return (
    <main
      className="membrane-shell"
      data-layout="single-viewport"
      aria-labelledby="membrane-title"
    >
      <header className="membrane-header">
        <div className="membrane-brand">
          <p className="membrane-eyebrow">神经纤维</p>
          <h1 id="membrane-title">膜电位变化</h1>
        </div>
        <div className="membrane-live-state" aria-live="polite">
          <span className={playing ? "is-running" : ""} aria-hidden="true" />
          {playing ? "正在运行" : "已暂停"}
        </div>
        <div className="membrane-status-line" aria-live="polite">
          <strong aria-label="当前阶段">{STAGE_LABEL[snapshot.stage]}</strong>
          <span aria-label="当前膜电位" className="membrane-voltage">
            {snapshot.mv > 0 ? "+" : ""}{snapshot.mv.toFixed(0)} mV
          </span>
          <span aria-label="主要离子运动">{ION_LABEL[snapshot.ionFlow]}</span>
        </div>
      </header>

      <section className="membrane-process-canvas">
        <CurveCanvas
          time={time}
          intensity={intensity}
          snapshot={snapshot}
          compare={compare}
          onTimeChange={changeTime}
        />
        <MembraneView snapshot={snapshot} playing={playing} />
      </section>

      <StageExplanation stage={snapshot.stage} onSelectTime={selectStageTime} />

      <section className="membrane-controls" aria-label="实验控制台">
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

        <div className="membrane-timeline">
          <span>
            <label htmlFor="membrane-time">时间轴</label>
            <output>{time.toFixed(1)}</output>
          </span>
          <input
            id="membrane-time"
            aria-label="时间轴"
            aria-valuetext={`${time.toFixed(1)} 时间单位`}
            type="range"
            min="0"
            max={DURATION}
            step="0.1"
            value={time}
            onChange={(event) => changeTime(Number(event.target.value))}
          />
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
