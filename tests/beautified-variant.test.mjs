import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCurveVisualTheme } from "../models/03-membrane-potential-curve/visual-theme.ts";

const repoRoot = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, repoRoot), "utf8");

function cssMediaRules(css, query) {
  const start = css.indexOf(`@media (${query}) {`);
  assert.notEqual(start, -1, `missing @media (${query})`);
  const next = css.indexOf("\n@media ", start + 1);
  return css.slice(start, next === -1 ? undefined : next);
}

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
  assert.match(lab, /className=\{isBeautified \? "membrane-shell is-beautified" : "membrane-shell"\}/);
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

test("curve canvas and beautified mobile CSS share a compact layout contract", async () => {
  const canvas = await source("models/03-membrane-potential-curve/CurveCanvas.tsx");
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const mobile = cssMediaRules(css, "max-width: 800px");
  const shortMobile = cssMediaRules(css, "max-width: 800px) and (max-height: 700px");

  assert.match(canvas, /import \{ getCurveLayout \} from "\.\/curve-layout";/);
  assert.match(canvas, /getCurveLayout\(height, visualVariant\)/);
  assert.match(canvas, /const width = canvas\.clientWidth \|\| rect\.width \|\| 720;/);
  assert.match(canvas, /const height = canvas\.clientHeight \|\| rect\.height \|\| 390;/);
  assert.match(canvas, /clientX - rect\.left - canvas\.clientLeft - padding\.left/);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-rows:\s*196px minmax\(282px, 1fr\) 32px 94px/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-curve-card\s*\{[^}]*grid-template-rows:\s*30px minmax\(0, 1fr\) 16px[^}]*gap:\s*4px[^}]*padding:\s*4px/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-curve-card figcaption small\s*\{[^}]*display:\s*none/s);
  assert.match(shortMobile, /\.membrane-shell\.is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-rows:\s*196px minmax\(200px, 1fr\) 28px 78px/s);
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

test("beautified desktop stage sizing stays intrinsic", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.doesNotMatch(css, /\.membrane-shell\.is-beautified \.membrane-stage-guide\s*\{[^}]*\bgap:/s);
  assert.doesNotMatch(css, /\.membrane-shell\.is-beautified \.membrane-stage-nav\s*\{[^}]*(?<!min-)height:/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-stage-nav\s*\{[^}]*grid-template-rows:\s*repeat\(7, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-stage-nav button\s*\{[^}]*\bmin-height:\s*0/s);
});

test("beautified stage progress keeps the active segment white", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(
    css,
    /\.membrane-stage-nav button\[aria-pressed="true"\]::after\s*\{[^}]*background:\s*rgba\(255, 255, 255, \.82\)/s,
  );

  const cumulativeSelectors = [...css.matchAll(
    /\.membrane-stage-nav:has\(button:nth-child\((\d)\)\[aria-pressed="true"\]\) button:nth-child\(-n \+ \1\):not\(\[aria-pressed="true"\]\)::after/g,
  )];
  assert.equal(cumulativeSelectors.length, 7);
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

test("beautified variant owns a mechanism-first workbench without changing the original composition", async () => {
  const lab = await source("models/03-membrane-potential-curve/MembraneCurveLab.tsx");

  assert.match(lab, /const isBeautified = visualVariant === "beautified";/);
  assert.match(lab, /data-visual-layout=\{isBeautified \? "mechanism-workbench" : "classic"\}/);
  assert.match(lab, /isBeautified \? \([\s\S]*className="membrane-lab-workspace"/);
  assert.match(lab, /className="membrane-header-play"/);
  assert.match(lab, /className=\{isBeautified \? "membrane-controls membrane-control-dock" : "membrane-controls"\}/);
});

test("stage explanation exposes stable rows for compact UI layout", async () => {
  const stage = await source("models/03-membrane-potential-curve/StageExplanation.tsx");
  assert.match(stage, /className="membrane-stage-voltage"/);
  assert.match(stage, /className="membrane-stage-transport"/);
  assert.match(stage, /className="membrane-stage-result"/);
});

test("beautified desktop uses a mechanism-first three-column workbench", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-areas:\s*"stages membrane curve"\s*"stages membrane detail"/s);
  assert.match(css, /is-beautified \.membrane-process-canvas,[\s\S]*is-beautified \.membrane-stage-guide\s*\{[^}]*display:\s*contents/s);
  assert.match(css, /is-beautified \.membrane-view-card\s*\{[^}]*grid-area:\s*membrane/s);
  assert.match(css, /is-beautified \.membrane-curve-card\s*\{[^}]*grid-area:\s*curve/s);
  assert.match(css, /is-beautified \.membrane-stage-nav\s*\{[^}]*grid-area:\s*stages/s);
  assert.match(css, /is-beautified \.membrane-stage-detail\s*\{[^}]*grid-area:\s*detail/s);
});

test("beautified desktop has one visible primary playback location per breakpoint", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /is-beautified \.membrane-header-play\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(css, /is-beautified \.membrane-control-dock \.membrane-play\s*\{[^}]*display:\s*none/s);
});

test("beautified mobile uses a dedicated one-screen teaching grid", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-columns:\s*1fr[^}]*grid-template-areas:\s*"curve"\s*"membrane"\s*"stages"\s*"detail"/s);
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-stage-nav\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\)/s);
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-header-play\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-control-dock \.membrane-play\s*\{[^}]*display:\s*inline-flex/s);
});

test("beautified mobile header keeps a readable compact status bar inside its grid row", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const mobile = cssMediaRules(css, "max-width: 800px");

  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-header\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto[^}]*height:\s*100%[^}]*box-sizing:\s*border-box[^}]*max-height:\s*54px[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-brand\s*\{[^}]*min-width:\s*0[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-series-line\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-title-row\s*\{[^}]*min-width:\s*0[^}]*min-height:\s*0[^}]*height:\s*40px[^}]*overflow:\s*hidden/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-header h1\s*\{[^}]*overflow:\s*hidden[^}]*font-size:\s*18px[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-live-state\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-status-line\s*\{[^}]*grid-template-columns:\s*max-content max-content[^}]*width:\s*auto[^}]*min-height:\s*32px[^}]*overflow:\s*hidden/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-status-line strong,\s*\.membrane-shell\.is-beautified \.membrane-status-line span\s*\{[^}]*min-height:\s*32px[^}]*font-size:\s*11px[^}]*white-space:\s*nowrap/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-status-line span:last-child\s*\{[^}]*display:\s*none/s);
});

test("beautified short phone keeps the compact header's 54px grid row", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const shortMobile = cssMediaRules(css, "max-width: 800px) and (max-height: 700px");

  assert.match(shortMobile, /\.membrane-shell\.is-beautified\s*\{[^}]*grid-template-rows:\s*54px minmax\(0, 1fr\) 74px/s);
});

test("beautified short phone reserves a 196px compact curve row", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const shortMobile = cssMediaRules(css, "max-width: 800px) and (max-height: 700px");

  assert.match(shortMobile, /\.membrane-shell\.is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-rows:\s*196px minmax\(200px, 1fr\) 28px 78px/s);
});

test("beautified mobile explanation prioritizes cause and result", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*\.membrane-stage-voltage\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.membrane-stage-transport/);
  assert.match(css, /\.membrane-stage-result/);
});

test("beautified mobile keeps every visible teaching label readable", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const mobile = cssMediaRules(css, "max-width: 800px");
  const stageLabel = mobile.match(/\.membrane-shell\.is-beautified \.membrane-stage-nav button span\s*\{[^}]*font-size:\s*([0-9.]+)px/s);
  const detailTitle = mobile.match(/\.membrane-shell\.is-beautified \.membrane-stage-detail header strong\s*\{[^}]*font-size:\s*([0-9.]+)px/s);
  const explanation = mobile.match(/\.membrane-shell\.is-beautified \.membrane-stage-transport,\s*\.membrane-shell\.is-beautified \.membrane-stage-result\s*\{[^}]*display:\s*grid[^}]*font-size:\s*([0-9.]+)px[^}]*line-height:\s*1\.15/s);
  const explanationLabels = mobile.match(/\.membrane-shell\.is-beautified \.membrane-stage-transport b,\s*\.membrane-shell\.is-beautified \.membrane-stage-result b\s*\{[^}]*font-size:\s*([0-9.]+)px/s);

  assert.ok(stageLabel && Number(stageLabel[1]) >= 11, "mobile stage labels must be at least 11px");
  assert.ok(detailTitle && Number(detailTitle[1]) >= 11, "mobile detail title must be at least 11px");
  assert.ok(explanation && Number(explanation[1]) >= 11, "mobile transport and result text must be visible and at least 11px");
  assert.ok(explanationLabels && Number(explanationLabels[1]) >= 11, "mobile explanation labels must be at least 11px");
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-stage-nav button i\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-stage-detail header > span\s*\{[^}]*display:\s*none/s);
});

test("beautified mobile control dock tracks fit their shell rows", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const mobile = cssMediaRules(css, "max-width: 800px");
  const shortMobile = cssMediaRules(css, "max-width: 800px) and (max-height: 700px");

  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-control-dock\s*\{[^}]*grid-template-rows:\s*40px 28px[^}]*gap:\s*4px 6px[^}]*padding:\s*3px 6px/s);
  assert.match(shortMobile, /\.membrane-shell\.is-beautified \.membrane-control-dock\s*\{[^}]*grid-template-rows:\s*36px 28px[^}]*gap:\s*2px 6px[^}]*padding:\s*2px 5px/s);
});

test("beautified tablet uses a mechanism-first two-column workbench at 801, 900, and 927px", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const tablet = cssMediaRules(css, "min-width: 801px) and (max-width: 927px");

  assert.match(tablet, /\.membrane-shell\.is-beautified\s*\{[^}]*grid-template-rows:\s*60px minmax\(0, 1fr\) 68px[^}]*gap:\s*8px[^}]*padding:\s*8px 10px/s);
  assert.match(tablet, /\.membrane-shell\.is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1\.25fr\) minmax\(280px, \.85fr\)[^}]*grid-template-areas:\s*"stages stages"\s*"membrane curve"\s*"membrane detail"[^}]*gap:\s*8px/s);
  assert.match(tablet, /\.membrane-shell\.is-beautified \.membrane-stage-nav\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\)[^}]*grid-template-rows:\s*1fr/s);
  assert.match(tablet, /\.membrane-shell\.is-beautified \.membrane-header\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto auto[^}]*padding:\s*5px 10px/s);
  assert.match(tablet, /\.membrane-shell\.is-beautified \.membrane-control-dock\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(210px, \.8fr\)[^}]*padding:\s*5px 8px/s);

  for (const viewportWidth of [801, 900, 927]) {
    const workspaceWidth = viewportWidth - 20;
    const widthAfterGapAndFixedColumn = workspaceWidth - 8 - 280;
    assert.ok(widthAfterGapAndFixedColumn > 0, `${viewportWidth}px must leave usable membrane-column space`);
  }
});

test("beautified desktop stage detail keeps body text and field labels at 12px without clipping", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");

  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-stage-detail\s*\{[^}]*overflow:\s*auto/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-stage-detail header p,\s*\.membrane-shell\.is-beautified \.membrane-stage-detail > div p\s*\{[^}]*font-size:\s*12px[^}]*line-height:\s*1\.3/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-stage-detail > div b\s*\{[^}]*font-size:\s*12px/s);

  const mobile = cssMediaRules(css, "max-width: 800px");
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-stage-transport,\s*\.membrane-shell\.is-beautified \.membrane-stage-result\s*\{[^}]*font-size:\s*11px/s);
  assert.match(mobile, /\.membrane-shell\.is-beautified \.membrane-stage-transport b,\s*\.membrane-shell\.is-beautified \.membrane-stage-result b\s*\{[^}]*font-size:\s*11px/s);
});

test("beautified sodium and potassium particle labels meet 4.5:1 against every gradient endpoint", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  const palettes = [
    {
      ion: "sodium",
      label: cssHexToken(css, "beauty-sodium-particle-label"),
      endpoints: [
        cssHexToken(css, "beauty-sodium-particle-light"),
        cssHexToken(css, "beauty-sodium-particle-dark"),
      ],
    },
    {
      ion: "potassium",
      label: cssHexToken(css, "beauty-potassium-particle-label"),
      endpoints: [
        cssHexToken(css, "beauty-potassium-particle-light"),
        cssHexToken(css, "beauty-potassium-particle-dark"),
      ],
    },
  ];

  assert.deepEqual(palettes[0].endpoints, ["#4ccbd0", "#3fb0b7"]);
  assert.deepEqual(palettes[1].endpoints, ["#ffc163", "#d67e18"]);
  for (const { ion, label, endpoints } of palettes) {
    for (const endpoint of endpoints) {
      assert.ok(
        contrastRatio(label, endpoint) >= 4.5,
        `${ion} label ${label} must reach 4.5:1 against ${endpoint}`,
      );
    }
  }

  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-particle\.sodium\s*\{[^}]*color:\s*var\(--beauty-sodium-particle-label\)[^}]*background:\s*linear-gradient\(145deg, var\(--beauty-sodium-particle-light\), var\(--beauty-sodium-particle-dark\)\)/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-particle\.potassium\s*\{[^}]*color:\s*var\(--beauty-potassium-particle-label\)[^}]*background:\s*linear-gradient\(145deg, var\(--beauty-potassium-particle-light\), var\(--beauty-potassium-particle-dark\)\)/s);
});

test("beautified live regions avoid streaming voltage updates while the original keeps its aria contract", async () => {
  const lab = await source("models/03-membrane-potential-curve/MembraneCurveLab.tsx");
  const stage = await source("models/03-membrane-potential-curve/StageExplanation.tsx");

  assert.match(lab, /aria-label=\{getFullPlaybackAriaLabel\(playing, hasStarted\)\}/);
  assert.match(lab, /className="membrane-live-state" aria-live="polite"/);
  assert.match(lab, /className="membrane-status-line"\s+aria-live=\{isBeautified \? undefined : "polite"\}/s);
  assert.match(stage, /className="membrane-stage-detail" aria-label="当前步骤解释" aria-live="polite"/);
});
