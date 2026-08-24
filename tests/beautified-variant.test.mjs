import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCurveVisualTheme } from "../models/03-membrane-potential-curve/visual-theme.ts";

const repoRoot = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, repoRoot), "utf8");

test("the original route keeps the default visual variant", async () => {
  const original = await source("app/page.tsx");
  assert.match(original, /<MembraneCurveLab\s*\/>/);
  assert.doesNotMatch(original, /beautified|membrane-beautified/);
});

test("the beautified route is explicit and isolated", async () => {
  const beautified = await source("app/beautified/page.tsx");
  assert.match(beautified, /membrane-beautified\.css/);
  assert.match(beautified, /visualVariant="beautified"/);
});

test("the shared lab defaults to the original root class", async () => {
  const lab = await source("models/03-membrane-potential-curve/MembraneCurveLab.tsx");
  assert.match(lab, /visualVariant = "original"/);
  assert.match(lab, /visualVariant === "beautified" \? "membrane-shell is-beautified" : "membrane-shell"/);
});

test("the original canvas palette is preserved and beautified palette is distinct", () => {
  const original = getCurveVisualTheme("original");
  const beautified = getCurveVisualTheme("beautified");
  assert.equal(original.intensities.threshold.color, "#ef6a57");
  assert.equal(original.intensities.strong.color, "#168f91");
  assert.notEqual(beautified.surfaceTop, original.surfaceTop);
  assert.equal(beautified.accents.sodium, "#16a6ad");
});

test("the original canvas threshold dash is preserved", () => {
  assert.deepEqual(getCurveVisualTheme("original").thresholdDash, [6, 5]);
});

test("the canvas clears its beautified curve shadow color after stroking", async () => {
  const canvas = await source("models/03-membrane-potential-curve/CurveCanvas.tsx");
  assert.match(canvas, /context\.shadowColor = "transparent";/);
});
