import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCurveVisualTheme } from "../models/03-membrane-potential-curve/visual-theme.ts";

const repoRoot = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, repoRoot), "utf8");

function cssHexToken(css, name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `missing --${name} hex token`);
  return match[1];
}

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

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

test("beautified CSS is scoped and defines the bio-lab visual system", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.doesNotMatch(css, /^:root/m);
  assert.doesNotMatch(css, /^\.membrane-(?!shell\.is-beautified)/m);
  assert.match(css, /\.membrane-shell\.is-beautified\s*\{/);
  assert.match(css, /--beauty-sodium:\s*#16a6ad/);
  assert.match(css, /--beauty-potassium:\s*#ed9d38/);
  assert.match(css, /backdrop-filter:\s*blur/);
});

test("beautified membrane and controls expose the required visual states", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /is-beautified \.membrane-particle::after/);
  assert.match(css, /is-beautified \.membrane-channel\.sodium\.is-open/);
  assert.match(css, /is-beautified \.membrane-channel\.potassium\.is-open/);
  assert.match(css, /is-beautified \.membrane-stage-nav button\[aria-pressed="true"\]/);
  assert.match(css, /is-beautified \.membrane-transport \.membrane-play/);
});

test("beautified paint leaves responsive stage sizing to the base stylesheet", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.doesNotMatch(css, /\.membrane-shell\.is-beautified \.membrane-stage-guide\s*\{[^}]*\bgap:/s);
  assert.doesNotMatch(css, /\.membrane-shell\.is-beautified \.membrane-stage-nav\s*\{[^}]*\bheight:/s);
  assert.doesNotMatch(css, /\.membrane-shell\.is-beautified \.membrane-stage-nav button\s*\{[^}]*\bmin-height:/s);
});

test("beautified primary gradients keep white labels at readable contrast", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const white = "#ffffff";
  const actionGradient = [
    cssHexToken(css, "beauty-action-start"),
    cssHexToken(css, "beauty-action-end"),
    cssHexToken(css, "beauty-action-hover-start"),
    cssHexToken(css, "beauty-action-hover-end"),
  ];

  actionGradient.forEach((color) => {
    assert.ok(
      contrastRatio(color, white) >= 4.5,
      `${color} must reach 4.5:1 against white labels`,
    );
  });

  assert.match(
    css,
    /\.membrane-stage-nav button\[aria-pressed="true"\]\s*\{[^}]*background:\s*linear-gradient\(145deg, var\(--beauty-action-start\), var\(--beauty-action-end\)\)/s,
  );
  assert.match(
    css,
    /\.membrane-transport \.membrane-play\s*\{[^}]*background:\s*linear-gradient\(145deg, var\(--beauty-action-start\), var\(--beauty-action-end\)\)/s,
  );
  assert.match(
    css,
    /\.membrane-transport \.membrane-play:hover\s*\{[^}]*background:\s*linear-gradient\(145deg, var\(--beauty-action-hover-start\), var\(--beauty-action-hover-end\)\)/s,
  );
});

test("beautified text inks and canvas focus ring meet contrast thresholds", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const surface = cssHexToken(css, "beauty-paper-solid");
  const textInks = [
    cssHexToken(css, "beauty-sodium-ink"),
    cssHexToken(css, "beauty-curve-ink"),
    cssHexToken(css, "beauty-muted-ink"),
  ];

  textInks.forEach((ink) => {
    assert.ok(
      contrastRatio(ink, surface) >= 4.5,
      `${ink} must reach 4.5:1 against ${surface}`,
    );
  });

  const focus = cssHexToken(css, "beauty-focus");
  assert.ok(
    contrastRatio(focus, surface) >= 3,
    `${focus} must reach 3:1 against ${surface}`,
  );
  assert.match(css, /\.membrane-series-line\s*\{[^}]*color:\s*var\(--beauty-sodium-ink\)/s);
  assert.match(css, /\.membrane-status-line \.membrane-voltage\s*\{[^}]*color:\s*var\(--beauty-curve-ink\)/s);
  assert.match(css, /\.membrane-view-card > header strong\s*\{[^}]*color:\s*var\(--beauty-sodium-ink\)/s);
  assert.match(css, /canvas:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--beauty-focus\)/s);
});
