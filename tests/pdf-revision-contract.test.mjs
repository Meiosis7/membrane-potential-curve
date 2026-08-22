import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modelRoot = new URL("../models/03-membrane-potential-curve/", import.meta.url);

async function source(name) {
  return readFile(new URL(name, modelRoot), "utf8");
}

test("header uses the revised independent model title", async () => {
  const lab = await source("MembraneCurveLab.tsx");

  assert.match(lab, /选择性必修1 · 神经冲动的传导/);
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

test("compartment ion counts are numerically visible", async () => {
  const view = await source("MembraneView.tsx");

  assert.match(view, /membrane-ion-counts/);
  assert.match(view, /膜外 Na⁺/);
  assert.match(view, /膜内 Na⁺/);
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
