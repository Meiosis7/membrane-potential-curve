import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modelRoot = new URL("../models/03-membrane-potential-curve/", import.meta.url);

async function source(name) {
  return readFile(new URL(name, modelRoot), "utf8");
}

test("header uses the revised independent model title", async () => {
  const lab = await source("MembraneCurveLab.tsx");

  assert.match(lab, /选择性必修1·神经冲动的传导/);
  assert.match(lab, /一生儿高中生物一本通/);
  assert.match(lab, /membrane-series-line/);
  assert.match(lab, /<h1[^>]*>膜电位变化曲线<\/h1>/);
});

test("membrane scene contains a stimulus pulse and labelled crossing ions", async () => {
  const view = await source("MembraneView.tsx");

  assert.match(view, /membrane-stimulus/);
  assert.match(view, /membrane-crossing-ion/);
  assert.match(view, />Na⁺</);
  assert.match(view, />K⁺</);
});

test("stimulus pulse is large enough to remain visually obvious", async () => {
  const css = await source("membrane-curve.css");

  assert.match(css, /\.membrane-stimulus\s*\{[^}]*width:\s*70px/s);
  assert.match(css, /\.membrane-stimulus > i\s*\{[^}]*width:\s*5px/s);
  assert.match(css, /\.membrane-stimulus > b\s*\{[^}]*width:\s*34px/s);
});

test("compartment ion count boards are removed while particles remain", async () => {
  const view = await source("MembraneView.tsx");

  assert.doesNotMatch(view, /membrane-ion-counts/);
  assert.doesNotMatch(view, /膜外 Na⁺ \$\{/);
  assert.doesNotMatch(view, /膜内 Na⁺ \$\{/);
  assert.match(view, /renderParticles/);
});

test("crossing ions are large and continuous without an arrow", async () => {
  const view = await source("MembraneView.tsx");
  const css = await source("membrane-curve.css");

  assert.match(view, /const CROSSING_DELAYS = \[[^\]]*(?:,[^\]]*){3}\]/s);
  assert.match(css, /\.membrane-ion-stream::before/);
  assert.match(css, /\.membrane-crossing-ion\s*\{[^}]*width:\s*38px/s);
  assert.match(
    css,
    /@media \(max-width: 800px\)[\s\S]*?\.membrane-crossing-ion\s*\{[^}]*width:\s*30px/s,
  );
  assert.doesNotMatch(css, /@keyframes sodium-cross-membrane[\s\S]*?scale\(\.82\)/);
  assert.doesNotMatch(css, /@keyframes potassium-cross-membrane[\s\S]*?scale\(\.82\)/);
});

test("large directional arrow is removed from the membrane scene", async () => {
  const view = await source("MembraneView.tsx");
  const css = await source("membrane-curve.css");

  assert.doesNotMatch(view, /membrane-flow-arrow/);
  assert.doesNotMatch(css, /\.membrane-flow-arrow/);
});

test("depolarization copy and compact compartment sizing follow the PDF notes", async () => {
  const stages = await source("stage-content.ts");
  const css = await source("membrane-curve.css");

  assert.match(stages, /Na⁺ 顺电化学浓度梯度大量内流/);
  assert.match(css, /--membrane-compartment-label-size:\s*9px/);
  assert.match(
    css,
    /grid-template-rows:\s*minmax\(0,\s*\.82fr\)\s+62px\s+minmax\(0,\s*\.82fr\)/,
  );
});

test("stage navigation starts bounded animation instead of selecting a static time", async () => {
  const lab = await source("MembraneCurveLab.tsx");
  const stages = await source("StageExplanation.tsx");

  assert.match(lab, /playUntil/);
  assert.match(lab, /advancePlayback/);
  assert.match(lab, /getStagePlaybackEnd/);
  assert.match(stages, /onPlayRange/);
  assert.match(stages, /播放步骤/);
  assert.doesNotMatch(stages, /onSelectTime/);
});

test("duplicate polarity bar and control timeline are removed", async () => {
  const lab = await source("MembraneCurveLab.tsx");
  const view = await source("MembraneView.tsx");

  assert.doesNotMatch(view, /membrane-polarity-bar/);
  assert.doesNotMatch(lab, /membrane-timeline/);
  assert.doesNotMatch(lab, /aria-label="时间轴"/);
  assert.doesNotMatch(lab, /htmlFor="membrane-time"/);
  assert.match(lab, /onTimeChange=\{changeTime\}/);
});

test("stage copy distinguishes depolarization from reversal polarization", async () => {
  const stages = await source("stage-content.ts");

  assert.match(stages, /经阈电位继续上升至 0 mV/);
  assert.match(stages, /title: "反极化"/);
  assert.match(stages, /由 0 mV 上升至约 \+30 mV 的尖峰/);
  assert.doesNotMatch(stages, /维持在约 \+30 mV 的峰值附近/);
});
