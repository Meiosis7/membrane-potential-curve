import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
