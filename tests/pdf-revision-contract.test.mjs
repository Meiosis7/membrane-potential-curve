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

test("large directional arrow is removed from the membrane scene", async () => {
  const view = await source("MembraneView.tsx");
  const css = await source("membrane-curve.css");

  assert.doesNotMatch(view, /membrane-flow-arrow/);
  assert.doesNotMatch(css, /\.membrane-flow-arrow/);
});
