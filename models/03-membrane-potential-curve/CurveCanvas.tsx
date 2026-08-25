"use client";

import { useEffect, useRef } from "react";
import { getCurveLayout } from "./curve-layout";
import { getCurveSnapshot } from "./simulation";
import type { CurveIntensity, CurveSnapshot } from "./types";
import { getCurveVisualTheme, type VisualVariant } from "./visual-theme";
import { formatMembranePotential } from "./voltage-format";

const DURATION = 6;
const FULL_CURVE_SEGMENTS = 240;

export interface CurveCanvasProps {
  time: number;
  intensity: CurveIntensity;
  snapshot: CurveSnapshot;
  compare: boolean;
  visualVariant?: VisualVariant;
  onTimeChange: (nextTime: number) => void;
}

export function getVisibleCurveTimes(time: number): number[] {
  const visibleTime = Math.min(DURATION, Math.max(0, time));
  if (visibleTime === 0) return [0];

  const segmentCount = Math.ceil(
    (visibleTime / DURATION) * FULL_CURVE_SEGMENTS,
  );
  return Array.from(
    { length: segmentCount + 1 },
    (_, index) => (visibleTime * index) / segmentCount,
  );
}

function stageLabel(stage: CurveSnapshot["stage"]) {
  return ({
    resting: "静息",
    local: "局部电位",
    threshold: "达阈",
    depolarization: "去极化",
    peak: "反极化",
    repolarization: "复极化",
    hyperpolarization: "超极化",
    recovery: "恢复静息",
  })[stage];
}

function stageInterval(time: number, intensity: CurveIntensity, stage: CurveSnapshot["stage"]): [number, number] {
  if (intensity === "weak") {
    if (stage === "local") return [1, 4];
    return time < 1 ? [0, 1] : [4, 6];
  }
  switch (stage) {
    case "threshold": return [1, 2];
    case "depolarization": return [2, 2.65];
    case "peak": return [2.65, 3];
    case "repolarization": return [3, 4.8];
    case "hyperpolarization": return [4.8, 5.3];
    case "recovery": return [5.3, 6];
    default: return time < 1 ? [0, 1] : [6, 6];
  }
}

export function CurveCanvas({
  time,
  intensity,
  snapshot,
  compare,
  visualVariant = "original",
  onTimeChange,
}: CurveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const theme = getCurveVisualTheme(visualVariant);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const width = canvas.clientWidth || 720;
      const height = canvas.clientHeight || 390;
      const layout = getCurveLayout(height, visualVariant);
      const { padding } = layout;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const plotWidth = width - padding.left - padding.right;
      const plotHeight = layout.plotHeight;
      const x = (value: number) => padding.left + (value / DURATION) * plotWidth;
      const y = (mv: number) => padding.top + ((35 - mv) / 125) * plotHeight;

      const gradient = context.createLinearGradient?.(0, padding.top, 0, height - padding.bottom);
      if (gradient) {
        gradient.addColorStop(0, theme.surfaceTop);
        gradient.addColorStop(1, theme.surfaceBottom);
        context.fillStyle = gradient;
      } else {
        context.fillStyle = theme.surfaceFallback;
      }
      context.fillRect(padding.left, padding.top, plotWidth, plotHeight);

      context.font = `${layout.tickFontSize}px Inter, "PingFang SC", sans-serif`;
      [-70, -55, 0, 30].forEach((mv) => {
        context.beginPath();
        context.strokeStyle = mv === -55 ? theme.threshold : theme.grid;
        context.lineWidth = 1;
        context.setLineDash?.(mv === -55 ? [...theme.thresholdDash] : []);
        context.moveTo(padding.left, y(mv));
        context.lineTo(width - padding.right, y(mv));
        context.stroke();
        context.setLineDash?.([]);
        context.fillStyle = mv === -55 ? theme.thresholdLabel : theme.gridLabel;
        context.fillText(`${mv > 0 ? "+" : ""}${mv}`, 20, y(mv) + 4);
      });

      const [start, end] = stageInterval(time, intensity, snapshot.stage);
      context.fillStyle = theme.stageBand;
      context.fillRect(x(start), padding.top, Math.max(2, x(end) - x(start)), plotHeight);

      const intensities: CurveIntensity[] = compare ? ["weak", "threshold", "strong"] : [intensity];
      intensities.forEach((curveIntensity) => {
        const style = theme.intensities[curveIntensity];
        context.beginPath();
        getVisibleCurveTimes(time).forEach((pointTime, index) => {
          const point = getCurveSnapshot(pointTime, curveIntensity);
          if (index === 0) context.moveTo(x(pointTime), y(point.mv));
          else context.lineTo(x(pointTime), y(point.mv));
        });
        context.strokeStyle = style.color;
        context.lineWidth = curveIntensity === intensity ? 3.5 : 2;
        context.setLineDash?.([...style.dash]);
        if (visualVariant === "beautified" && curveIntensity === intensity) {
          context.shadowColor = style.color;
          context.shadowBlur = 6;
        }
        context.stroke();
        if (visualVariant === "beautified" && curveIntensity === intensity) {
          context.shadowBlur = 0;
          context.shadowColor = "transparent";
        }
        context.setLineDash?.([]);
      });

      context.beginPath();
      context.strokeStyle = theme.cursor;
      context.lineWidth = 1;
      context.moveTo(x(time), padding.top);
      context.lineTo(x(time), height - padding.bottom);
      context.stroke();
      context.beginPath();
      context.fillStyle = theme.intensities[intensity].color;
      context.arc?.(x(time), y(snapshot.mv), layout.pointRadius, 0, Math.PI * 2);
      context.fill?.();

      context.fillStyle = theme.label;
      context.font = `700 ${layout.stageFontSize}px Inter, "PingFang SC", sans-serif`;
      context.fillText(stageLabel(snapshot.stage), Math.min(x(time) + 10, width - 88), padding.top + 18);
      context.font = `${layout.axisFontSize}px Inter, "PingFang SC", sans-serif`;
      context.fillStyle = theme.axisLabel;
      for (let tick = 0; tick <= DURATION; tick += 1) {
        context.fillText(String(tick), x(tick) - 3, height - 17);
      }
      context.fillText("mV", 20, padding.top - 12);
      context.fillText("时间", width - 48, height - 17);
    };

    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [compare, intensity, snapshot, theme, time, visualVariant]);

  const updateFromPointer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth || rect.width || 720;
    const height = canvas.clientHeight || rect.height || 390;
    const { padding } = getCurveLayout(height, visualVariant);
    const plotWidth = width - padding.left - padding.right;
    const relativeX = clientX - rect.left - canvas.clientLeft - padding.left;
    onTimeChange((Math.min(plotWidth, Math.max(0, relativeX)) / plotWidth) * DURATION);
  };

  const legendIntensities: CurveIntensity[] = compare ? ["weak", "threshold", "strong"] : [intensity];

  return (
    <figure className="membrane-curve-card">
      <figcaption>
        <div>
          <span>膜电位曲线</span>
          <small>播放形成曲线，也可拖动回看</small>
        </div>
        <strong>{formatMembranePotential(snapshot.mv)}</strong>
      </figcaption>
      <canvas
        ref={canvasRef}
        role="slider"
        tabIndex={0}
        aria-label="在曲线上拖动时间"
        aria-valuemin={0}
        aria-valuemax={DURATION}
        aria-valuenow={Number(time.toFixed(1))}
        aria-valuetext={`${stageLabel(snapshot.stage)}，${formatMembranePotential(snapshot.mv)}`}
        data-interactive="true"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          updateFromPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (dragging.current) updateFromPointer(event.clientX);
        }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            onTimeChange(time - 0.1);
          }
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            onTimeChange(time + 0.1);
          }
          if (event.key === "Home") onTimeChange(0);
          if (event.key === "End") onTimeChange(DURATION);
        }}
      />
      <div className="membrane-legend" aria-label="曲线图例">
        {legendIntensities.map((curveIntensity) => (
          <span key={curveIntensity}>
            <i
              style={{
                borderTopColor: theme.intensities[curveIntensity].color,
                borderTopStyle: theme.intensities[curveIntensity].dash.length ? "dashed" : "solid",
              }}
            />
            {theme.intensities[curveIntensity].label}
          </span>
        ))}
        {compare && (
          <strong className="membrane-compare-result" aria-label="对比结论">
            <b aria-hidden="true">≡</b>
            全或无：阈刺激与强刺激峰值相同
          </strong>
        )}
      </div>
    </figure>
  );
}
