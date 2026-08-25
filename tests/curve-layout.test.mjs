import assert from "node:assert/strict";
import test from "node:test";
import { getCurveLayout } from "../models/03-membrane-potential-curve/curve-layout.ts";

const BEAUTIFIED_COMPACT_HEIGHT = 180;

const ORIGINAL_METRICS = {
  padding: { top: 42, right: 22, bottom: 42, left: 62 },
  tickFontSize: 12,
  axisFontSize: 11,
  stageFontSize: 12,
  pointRadius: 7,
};

function metricsWithoutPlotHeight(layout) {
  const { plotHeight, ...metrics } = layout;
  void plotHeight;
  return metrics;
}

test("beautified compact curve keeps at least 90px of plot at the phone target height", () => {
  const layout = getCurveLayout(130, "beautified");

  assert.deepEqual(layout.padding, { top: 16, right: 14, bottom: 24, left: 44 });
  assert.equal(layout.tickFontSize, 10);
  assert.equal(layout.axisFontSize, 9);
  assert.equal(layout.stageFontSize, 10);
  assert.equal(layout.pointRadius, 5);
  assert.ok(layout.plotHeight >= 90, `expected at least 90px, received ${layout.plotHeight}px`);
  assert.equal(layout.plotHeight, 90);
});

test("compact metrics apply only below a clear beautified height threshold", () => {
  assert.equal(getCurveLayout(BEAUTIFIED_COMPACT_HEIGHT - 1, "beautified").padding.top, 16);
  assert.deepEqual(
    metricsWithoutPlotHeight(getCurveLayout(BEAUTIFIED_COMPACT_HEIGHT, "beautified")),
    ORIGINAL_METRICS,
  );
});

test("original and non-compact curve metrics remain exactly unchanged", () => {
  const compactOriginal = getCurveLayout(130, "original");
  const nonCompactBeautified = getCurveLayout(390, "beautified");

  assert.deepEqual(metricsWithoutPlotHeight(compactOriginal), ORIGINAL_METRICS);
  assert.equal(compactOriginal.plotHeight, 46);
  assert.deepEqual(metricsWithoutPlotHeight(nonCompactBeautified), ORIGINAL_METRICS);
  assert.equal(nonCompactBeautified.plotHeight, 306);
});
