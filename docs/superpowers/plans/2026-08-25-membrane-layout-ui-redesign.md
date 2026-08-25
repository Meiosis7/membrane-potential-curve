# Membrane Layout and UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/beautified/` as a mechanism-first laboratory workbench with a genuinely different desktop and mobile layout while keeping `/` visually and behaviorally unchanged.

**Architecture:** `MembraneCurveLab` remains the only state owner. The beautified variant adds a layout-only workspace wrapper and a header playback control, while reusing `CurveCanvas`, `MembraneView`, `StageExplanation`, the simulation, and all playback callbacks. Scoped CSS turns the shared child cards into desktop grid areas and a separate mobile fixed-viewport grid; the original route never receives the wrapper or the beautified stylesheet.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Grid/Flexbox, Canvas 2D, Node test runner, ESLint, GitHub Pages.

## Global Constraints

- Preserve `/` DOM ordering, visual layout, animation behavior, and interaction behavior.
- Keep `time`, `snapshot`, `playing`, `intensity`, `speed`, and `compare` as the single shared state source in `MembraneCurveLab`.
- Do not duplicate simulation or playback logic.
- Scope every beautified production selector beneath `.membrane-shell.is-beautified`.
- Do not add dependencies, new particle counts, or costly visual filters.
- Preserve continuous Na⁺/K⁺ drift, real channel crossing, progressive curve drawing, stage-bounded animation, 0 mV neutral polarity, drag-to-review, stimulus selection, speed, reset, and comparison.
- Fit all teaching regions into 1440 × 900 and exact 390 × 844 without document overflow.
- Keep normal text contrast at least 4.5:1 and retain reduced-motion behavior.
- Use test-first RED → GREEN for every production change.

---

## File Responsibility Map

- `models/03-membrane-potential-curve/MembraneCurveLab.tsx`: owns state and renders either the unchanged original composition or the beautified workbench shell.
- `models/03-membrane-potential-curve/StageExplanation.tsx`: adds stable semantic class hooks for compact mobile explanation rows; no content or playback change.
- `models/03-membrane-potential-curve/membrane-beautified.css`: owns the complete beautified workbench layout and visual hierarchy.
- `tests/beautified-variant.test.mjs`: guards layout isolation, desktop/mobile grid contracts, control placement, contrast, and scoped selectors.
- `docs/superpowers/specs/2026-08-25-membrane-layout-ui-redesign.md`: authoritative design requirements.
- `.superpowers/sdd/task-*-report.md`: ignored execution evidence and reviewer handoff files.

---

### Task 1: Add the isolated beautified workbench structure

**Files:**
- Modify: `models/03-membrane-potential-curve/MembraneCurveLab.tsx`
- Modify: `models/03-membrane-potential-curve/StageExplanation.tsx`
- Modify: `tests/beautified-variant.test.mjs`

**Interfaces:**
- Consumes: existing `VisualVariant`, `CurveCanvas`, `MembraneView`, `StageExplanation`, `togglePlayback`, `playStageRange`, and current snapshot state.
- Produces: `data-visual-layout="mechanism-workbench"`, `.membrane-lab-workspace`, `.membrane-header-play`, `.membrane-control-dock`, and stage-detail row hooks consumed by Task 2 and Task 3 CSS.

- [ ] **Step 1: Write the failing layout-structure test**

Append a focused test that requires the beautified-only wrapper and rejects it from the original branch:

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
```

Expected: the new workbench and stage-row assertions fail because those hooks do not exist.

- [ ] **Step 3: Introduce a single `isBeautified` branch without duplicating state**

In `MembraneCurveLab`, derive the variant once:

```tsx
const isBeautified = visualVariant === "beautified";
```

Build the shared teaching panels once so both branches receive identical props and callbacks:

```tsx
const curvePanel = (
  <CurveCanvas
    time={time}
    intensity={intensity}
    snapshot={snapshot}
    compare={compare}
    visualVariant={visualVariant}
    onTimeChange={changeTime}
  />
);

const membranePanel = (
  <MembraneView
    snapshot={snapshot}
    playing={playing}
    time={time}
    intensity={intensity}
  />
);

const stagePanel = (
  <StageExplanation stage={snapshot.stage} onPlayRange={playStageRange} />
);
```

Set the root layout contract and retain the existing class contract:

```tsx
<main
  className={isBeautified ? "membrane-shell is-beautified" : "membrane-shell"}
  data-layout="single-viewport"
  data-visual-layout={isBeautified ? "mechanism-workbench" : "classic"}
  aria-labelledby="membrane-title"
>
```

Add the beautified desktop header control after `.membrane-status-line`:

```tsx
{isBeautified && (
  <button
    type="button"
    className="membrane-header-play"
    aria-label={playing ? "暂停全流程" : "播放全流程"}
    onClick={togglePlayback}
  >
    <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
    {playLabel}
  </button>
)}
```

Render the original pair exactly as before, but place the same children into an extra beautified workspace:

```tsx
{isBeautified ? (
  <section className="membrane-lab-workspace" aria-label="膜电位同步实验台">
    <section className="membrane-process-canvas">
      {curvePanel}
      {membranePanel}
    </section>
    {stagePanel}
  </section>
) : (
  <>
    <section className="membrane-process-canvas">
      {curvePanel}
      {membranePanel}
    </section>
    {stagePanel}
  </>
)}
```

Keep the existing control markup and make only its class conditional:

```tsx
<section
  className={isBeautified ? "membrane-controls membrane-control-dock" : "membrane-controls"}
  aria-label="实验控制台"
>
```

- [ ] **Step 4: Add stage-detail row hooks without changing copy**

Change only the three `<p>` class names in `StageExplanation`:

```tsx
<p className="membrane-stage-voltage"><b>电位变化</b>{detail.voltage}</p>
<p className="membrane-stage-transport"><b>通道与离子</b>{detail.transport}</p>
<p className="membrane-stage-result"><b>阶段结果</b>{detail.result}</p>
```

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
npm test
npm run lint
git diff --check
```

Expected: focused tests and the complete existing suite pass; lint and whitespace checks are clean.

- [ ] **Step 6: Commit the isolated workbench structure**

```bash
git add models/03-membrane-potential-curve/MembraneCurveLab.tsx models/03-membrane-potential-curve/StageExplanation.tsx tests/beautified-variant.test.mjs
git commit -m "feat: add beautified membrane workbench layout"
```

---

### Task 2: Rebuild the desktop view hierarchy and controls

**Files:**
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`
- Modify: `tests/beautified-variant.test.mjs`

**Interfaces:**
- Consumes: Task 1 workbench hooks and all existing card classes.
- Produces: a 1440 × 900 three-column grid with vertical stage rail, membrane hero, curve/detail insight stack, compact status header, and stable control dock.

- [ ] **Step 1: Write the failing desktop layout tests**

Add tests for real grid-area ownership and for main-vs-secondary visual hierarchy:

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
```

Expected: the new desktop grid-area tests fail against the current two-column skin.

- [ ] **Step 3: Replace beautified structural rules with the workbench grid**

Retain useful scoped ion/channel drawing and animation rules, but replace the shell, header, process, stage, and control layout rules with this contract:

```css
.membrane-shell.is-beautified {
  --beauty-shell-gap: 12px;
  grid-template-rows: 72px minmax(0, 1fr) 78px;
  gap: var(--beauty-shell-gap);
  padding: 12px 16px;
  overflow: hidden;
  background: #edf2ef;
}

.membrane-shell.is-beautified .membrane-header {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  min-height: 0;
  padding: 10px 14px;
  border: 1px solid #cbd8d3;
  border-radius: 16px;
  background: #fbfdfb;
  box-shadow: 0 8px 24px rgba(31, 65, 59, .07);
}

.membrane-shell.is-beautified .membrane-header-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 108px;
  min-height: 44px;
}

.membrane-shell.is-beautified .membrane-lab-workspace {
  display: grid;
  grid-template-columns: 112px minmax(420px, 1.45fr) minmax(340px, .92fr);
  grid-template-rows: minmax(0, 1fr) minmax(168px, .42fr);
  grid-template-areas:
    "stages membrane curve"
    "stages membrane detail";
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.membrane-shell.is-beautified .membrane-process-canvas,
.membrane-shell.is-beautified .membrane-stage-guide {
  display: contents;
}

.membrane-shell.is-beautified .membrane-view-card { grid-area: membrane; }
.membrane-shell.is-beautified .membrane-curve-card { grid-area: curve; }
.membrane-shell.is-beautified .membrane-stage-nav { grid-area: stages; }
.membrane-shell.is-beautified .membrane-stage-detail { grid-area: detail; }
```

- [ ] **Step 4: Turn the stage navigation into a vertical learning rail**

Use seven equal rows matching `ACTION_POTENTIAL_STEPS`; keep active/completed states paint-only. The weak-stimulus `local` state is explanatory feedback, not an eighth action-potential step:

```css
.membrane-shell.is-beautified .membrane-stage-nav {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(7, minmax(0, 1fr));
  min-height: 0;
  overflow: hidden;
  border: 1px solid #cbd8d3;
  border-radius: 16px;
  background: #f8fbf9;
}

.membrane-shell.is-beautified .membrane-stage-nav button {
  display: grid;
  grid-template-columns: 24px 1fr 12px;
  align-items: center;
  min-width: 0;
  min-height: 0;
  padding: 6px 8px;
  border: 0;
  border-bottom: 1px solid #dce5e1;
  text-align: left;
}
```

- [ ] **Step 5: Make membrane view the visual hero and compact the insight stack**

Use stronger boundary and scene height for the membrane, while curve/detail use quieter surfaces:

```css
.membrane-shell.is-beautified .membrane-view-card {
  display: grid;
  grid-template-rows: 48px minmax(0, 1fr);
  min-height: 0;
  border: 1px solid #9fbeb6;
  border-radius: 18px;
  background: #fbfdfb;
  box-shadow: 0 12px 30px rgba(28, 74, 67, .10);
}

.membrane-shell.is-beautified .membrane-scene {
  min-height: 0;
  border-radius: 0 0 17px 17px;
}

.membrane-shell.is-beautified .membrane-curve-card,
.membrane-shell.is-beautified .membrane-stage-detail {
  min-width: 0;
  min-height: 0;
  border: 1px solid #cfdbd6;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(31, 65, 59, .055);
}

.membrane-shell.is-beautified .membrane-curve-card {
  display: grid;
  grid-template-rows: 46px minmax(0, 1fr) 24px;
}
```

- [ ] **Step 6: Rebuild the bottom controls as a stable dock**

The desktop header owns the primary playback action; the dock groups all experiment settings:

```css
.membrane-shell.is-beautified .membrane-control-dock {
  display: grid;
  grid-template-columns: minmax(360px, 1.2fr) auto minmax(250px, .8fr);
  align-items: center;
  gap: 14px;
  min-height: 0;
  padding: 10px 14px;
  border: 1px solid #cbd8d3;
  border-radius: 16px;
  background: #fbfdfb;
  box-shadow: 0 -4px 20px rgba(31, 65, 59, .05);
}

.membrane-shell.is-beautified .membrane-control-dock .membrane-play {
  display: none;
}
```

Preserve the tested action-gradient contrast tokens and keep selected states from changing border widths, padding, or dimensions.

- [ ] **Step 7: Run focused and full verification**

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
npm test
npm run lint
npm run build
git diff --check
```

Expected: all checks pass and static export lists `/` and `/beautified`.

- [ ] **Step 8: Commit the desktop workbench**

```bash
git add models/03-membrane-potential-curve/membrane-beautified.css tests/beautified-variant.test.mjs
git commit -m "style: rebuild beautified desktop workbench"
```

---

### Task 3: Build the dedicated one-screen mobile UI

**Files:**
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`
- Modify: `tests/beautified-variant.test.mjs`

**Interfaces:**
- Consumes: Task 1 layout hooks and Task 2 grid areas.
- Produces: a separate 390 × 844 grid with curve, enlarged membrane mechanism, horizontal stage rail, compact cause/result explanation, and a two-row control dock.

- [ ] **Step 1: Write the failing mobile-layout tests**

```js
test("beautified mobile uses a dedicated one-screen teaching grid", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-lab-workspace\s*\{[^}]*grid-template-columns:\s*1fr[^}]*grid-template-areas:\s*"curve"\s*"membrane"\s*"stages"\s*"detail"/s);
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-stage-nav\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\)/s);
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-header-play\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*is-beautified \.membrane-control-dock \.membrane-play\s*\{[^}]*display:\s*inline-flex/s);
});

test("beautified mobile explanation prioritizes cause and result", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /@media \(max-width:\s*800px\)[\s\S]*\.membrane-stage-voltage\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.membrane-stage-transport/);
  assert.match(css, /\.membrane-stage-result/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
```

Expected: the mobile grid and mobile control-placement assertions fail.

- [ ] **Step 3: Add the dedicated mobile shell and workspace rows**

```css
@media (max-width: 800px) {
  .membrane-shell.is-beautified {
    grid-template-rows: 54px minmax(0, 1fr) 82px;
    gap: 6px;
    padding: 6px;
  }

  .membrane-shell.is-beautified .membrane-header {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 12px;
  }

  .membrane-shell.is-beautified .membrane-header-play {
    display: none;
  }

  .membrane-shell.is-beautified .membrane-lab-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 178px minmax(300px, 1fr) 32px 94px;
    grid-template-areas:
      "curve"
      "membrane"
      "stages"
      "detail";
    gap: 5px;
  }
}
```

- [ ] **Step 4: Make the mobile stage rail horizontal and explanation concise**

```css
@media (max-width: 800px) {
  .membrane-shell.is-beautified .membrane-stage-nav {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-template-rows: 1fr;
    border-radius: 10px;
  }

  .membrane-shell.is-beautified .membrane-stage-nav button {
    grid-template-columns: 1fr;
    justify-items: center;
    padding: 2px 1px;
    border-right: 1px solid #dce5e1;
    border-bottom: 0;
  }

  .membrane-shell.is-beautified .membrane-stage-detail {
    display: grid;
    grid-template-columns: minmax(90px, .34fr) 1fr;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 11px;
  }

  .membrane-shell.is-beautified .membrane-stage-detail header p,
  .membrane-shell.is-beautified .membrane-stage-voltage {
    display: none;
  }

  .membrane-shell.is-beautified .membrane-stage-detail > div {
    display: grid;
    grid-template-rows: 1fr 1fr;
    min-width: 0;
  }
}
```

Use line clamping only on summary copy; never hide the transport direction or result.

- [ ] **Step 5: Build the two-row phone control dock and enlarge the mechanism**

```css
@media (max-width: 800px) {
  .membrane-shell.is-beautified .membrane-control-dock {
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-rows: 42px 30px;
    gap: 4px 6px;
    padding: 4px 6px;
    border-radius: 12px;
  }

  .membrane-shell.is-beautified .membrane-intensity-control {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
  }

  .membrane-shell.is-beautified .membrane-transport {
    grid-column: 2 / 4;
    grid-row: 1;
  }

  .membrane-shell.is-beautified .membrane-control-dock .membrane-play {
    display: inline-flex;
  }

  .membrane-shell.is-beautified .membrane-options {
    grid-column: 1 / 4;
    grid-row: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .membrane-shell.is-beautified .membrane-view-card {
    grid-template-rows: 38px minmax(0, 1fr);
    border-radius: 12px;
  }

  .membrane-shell.is-beautified .membrane-channel {
    width: 52px;
  }

  .membrane-shell.is-beautified .membrane-crossing-ion {
    width: 26px;
    height: 26px;
  }
}
```

Keep weak/threshold/strong controls visible as a compact segmented group; speed and comparison occupy the second row. Do not reduce the core control text below 11 px.

- [ ] **Step 6: Preserve short-height and reduced-motion behavior**

Add a narrower height contract without changing information order:

```css
@media (max-width: 800px) and (max-height: 700px) {
  .membrane-shell.is-beautified {
    grid-template-rows: 48px minmax(0, 1fr) 74px;
  }

  .membrane-shell.is-beautified .membrane-lab-workspace {
    grid-template-rows: 150px minmax(250px, 1fr) 28px 78px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .membrane-shell.is-beautified *,
  .membrane-shell.is-beautified *::before,
  .membrane-shell.is-beautified *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
```

- [ ] **Step 7: Run focused and full verification**

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
npm test
npm run lint
npm run build
git diff --check
```

Expected: all checks pass and no original-route contract changes.

- [ ] **Step 8: Commit the mobile UI**

```bash
git add models/03-membrane-potential-curve/membrane-beautified.css tests/beautified-variant.test.mjs
git commit -m "style: add one-screen beautified mobile lab"
```

---

### Task 4: Browser QA, independent review, mirror sync, and publication

**Files:**
- Modify only if QA or review exposes an in-scope defect.
- Sync the completed project non-destructively to `/Users/fushuo/Documents/一生 选必1 交互模型/membrane-potential-curve-standalone/`.

**Interfaces:**
- Original public URL: `https://meiosis7.github.io/membrane-potential-curve/`.
- Beautified public URL: `https://meiosis7.github.io/membrane-potential-curve/beautified/`.

- [ ] **Step 1: Run fresh final automated verification**

```bash
npm test
npm run lint
npm run build
git diff --check
git status --short
```

Expected: zero failures, static routes `/` and `/beautified`, no whitespace errors, and a clean worktree.

- [ ] **Step 2: Browser-QA the original route at 1440 × 900 and exact 390 × 844**

Record DOM metrics and screenshots proving:

- root class is exactly `membrane-shell`;
- `data-visual-layout="classic"` is present;
- no beautified workspace or header-play button exists;
- no document overflow or console warnings/errors;
- full playback and two representative stage-bounded playback paths animate;
- visual comparison against the previous original screenshot shows no layout regression.

- [ ] **Step 3: Browser-QA the beautified desktop workbench**

At 1440 × 900 verify:

- root is `membrane-shell is-beautified` with `data-visual-layout="mechanism-workbench"`;
- vertical stage rail, membrane hero, curve, explanation, header control, and bottom dock occupy their intended grid areas;
- membrane view is larger than the curve panel;
- only the header primary playback button is visible;
- full playback and every stage-bounded playback path advance time and curve;
- Na⁺ crosses inward through open Na⁺ channels and K⁺ crosses outward through open K⁺ channels;
- no overflow, clipping, layout shift, or console errors.

- [ ] **Step 4: Browser-QA the exact 390 × 844 phone lab**

Verify:

- browser reports exactly 390 × 844;
- curve, membrane, stage rail, current explanation, and control dock all end within 844 px;
- phone layout area order is curve → membrane → stages → detail;
- header playback is hidden and bottom dock playback is visible;
- channel proteins and crossing ions remain legible and larger than the previous mobile screenshot;
- stimulus, playback, stage navigation, reset, speed, and comparison controls are operable;
- 0 mV displays `0` on both membrane sides;
- document scroll width/height equals client width/height and console is clean.

- [ ] **Step 5: Request complete-diff independent review**

Review the range from the published baseline `1223bbb` to the new head against:

- `docs/superpowers/specs/2026-08-25-membrane-layout-ui-redesign.md`
- this implementation plan
- screenshots and DOM metrics from Steps 2–4

Fix every verified Critical or Important issue with a fresh RED → GREEN cycle, then rerun Step 1 and the affected browser viewport.

- [ ] **Step 6: Sync the local source mirror without deleting user files**

Use non-deleting synchronization for `app/`, `models/`, `tests/`, `docs/`, `public/`, `.github/`, and root project configuration. Compare checksums for `MembraneCurveLab.tsx`, `StageExplanation.tsx`, `membrane-beautified.css`, and `beautified-variant.test.mjs` between the repository and mirror.

- [ ] **Step 7: Push and wait for GitHub Pages**

```bash
git push origin main
gh run list --repo Meiosis7/membrane-potential-curve --workflow pages.yml --limit 1
```

Wait until the run for the new head has build and deploy conclusion `success`.

- [ ] **Step 8: Verify public route isolation and return both links**

Require HTTP 200 for both cache-busted URLs. Confirm the original HTML excludes `membrane-shell is-beautified` and `mechanism-workbench`; confirm the beautified HTML includes both. Return the original and redesigned public links to the user.
