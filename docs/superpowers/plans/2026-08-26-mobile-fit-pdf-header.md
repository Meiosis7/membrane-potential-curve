# Membrane Mobile Fit and PDF Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the beautified membrane-potential model fit completely in one mobile viewport and apply every actionable annotation from the 8.26 PDF.

**Architecture:** Keep the existing React component hierarchy and desktop layout. Add the mobile-only current-state presentation to `CurveCanvas`, then replace fixed mobile minimum heights with viewport-aware grid tracks in the beautified stylesheet. Extend source-contract and browser-regression tests so short-phone clipping cannot recur.

**Tech Stack:** React, TypeScript, CSS Grid, Node.js test runner, Playwright browser regression harness, Next.js static export.

## Global Constraints

- The page must remain a one-screen experience with no document scrolling.
- Verify 320×568, 360×640, 375×667, 390×844, and 412×915 viewports.
- Header, curve, membrane/channel scene, stage navigation, stage explanation, and controls must all be visible and non-overlapping.
- Mobile header must show “选择性必修1· 神经冲动的传导” on the left, “膜电位变化曲线” centered, and “一生儿 高中生物一本通” on the right.
- Current stage and membrane potential must appear in the curve caption on mobile, not in the header.
- Desktop behavior and existing animation logic must remain unchanged.

---

### Task 1: Add responsive and PDF-annotation regression coverage

**Files:**
- Modify: `tests/beautified-variant.test.mjs`
- Modify: `tests/browser-regression.browser.mjs`

**Interfaces:**
- Consumes: existing `.membrane-series-line`, `.membrane-title-row`, `.membrane-status-line`, `.membrane-workspace`, and main-region selectors.
- Produces: browser assertions for all five mobile viewports and a new `.membrane-curve-state` selector contract.

- [ ] **Step 1: Update the source-contract test**

Replace the old assertions that require the mobile series line to be hidden and fixed short-screen tracks. Assert that the mobile stylesheet displays the series line as a two-column grid, centers the title, hides `.membrane-status-line`, uses `clamp()` tracks with `minmax(0, 1fr)`, and styles `.membrane-curve-state` for mobile.

- [ ] **Step 2: Add short-phone browser scenarios**

Add beautified-route scenarios for 320×568, 360×640, 375×667, 390×844, and 412×915. In each scenario, collect bounding boxes for header, curve, membrane scene, stages, detail, and controls; assert every box is inside the viewport and each box ends before the next begins. Assert `documentElement.scrollWidth/scrollHeight` do not exceed the viewport, both series labels are visible, the title is horizontally centered, the header status is hidden, and `.membrane-curve-state` is visible.

- [ ] **Step 3: Run tests and confirm the regression fails**

Run: `node --test tests/beautified-variant.test.mjs`

Expected: FAIL because the current mobile CSS hides the fixed series labels and has no curve-state mobile presentation.

Run: `npm run build && node tests/browser-regression.browser.mjs`

Expected: FAIL at 320×568 or 360×640 because the current fixed minimum rows push the lower regions outside the viewport.

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/beautified-variant.test.mjs tests/browser-regression.browser.mjs
git commit -m "test: cover short mobile membrane layouts"
```

### Task 2: Move mobile state into the curve caption

**Files:**
- Modify: `models/03-membrane-potential-curve/CurveCanvas.tsx`
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`

**Interfaces:**
- Consumes: `snapshot.stage`, `snapshot.mv`, existing `stageLabel()` and `formatMembranePotential()`.
- Produces: `.membrane-curve-state` containing `.membrane-curve-stage` and the formatted potential.

- [ ] **Step 1: Add semantic curve-state markup**

In the curve `figcaption`, retain the left-side curve title and hint, then replace the standalone voltage with:

```tsx
<div className="membrane-curve-state" aria-label="当前膜电位状态">
  <span className="membrane-curve-stage">{stageLabel(snapshot.stage)}</span>
  <strong>{formatMembranePotential(snapshot.mv)}</strong>
</div>
```

- [ ] **Step 2: Style the state without changing desktop behavior**

Give `.membrane-curve-state` the existing right-aligned caption appearance. Keep `.membrane-curve-stage` hidden on desktop, then display it as a compact status pill on mobile while hiding the header `.membrane-status-line`.

- [ ] **Step 3: Run the focused source test**

Run: `node --test tests/beautified-variant.test.mjs`

Expected: the curve-state and PDF header assertions pass; responsive row assertions may remain failing until Task 3.

- [ ] **Step 4: Commit the state relocation**

```bash
git add models/03-membrane-potential-curve/CurveCanvas.tsx models/03-membrane-potential-curve/membrane-beautified.css
git commit -m "feat: move mobile status into curve caption"
```

### Task 3: Implement adaptive one-screen mobile layout

**Files:**
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`

**Interfaces:**
- Consumes: the existing shell, header, workspace, detail-card, and control-dock grid structure.
- Produces: viewport-aware grid tracks that keep all required regions in one screen down to 320×568.

- [ ] **Step 1: Replace fixed mobile rows with adaptive tracks**

Set the mobile shell to safe-area-aware padding and rows equivalent to:

```css
grid-template-rows: clamp(48px, 9svh, 56px) minmax(0, 1fr) clamp(64px, 10svh, 82px);
```

Set the mobile workspace to tracks equivalent to:

```css
grid-template-rows:
  clamp(128px, 23svh, 196px)
  minmax(0, 1fr)
  clamp(25px, 4svh, 32px)
  clamp(68px, 11svh, 94px);
```

Remove the short-screen `minmax(200px, 1fr)` and other fixed row combinations that exceed the viewport.

- [ ] **Step 2: Build the fixed PDF header**

Display `.membrane-series-line` as two columns, align the first label left and the second right, keep both on one line at a size that fits 320px, and center `.membrane-title-row` independently of either label. Apply `text-size-adjust: 100%` so mobile browsers cannot unexpectedly enlarge the header into adjacent content.

- [ ] **Step 3: Compact only non-essential spacing on short screens**

Under `max-height: 700px`, reduce gaps, card padding, chart caption padding, control-dock padding, and secondary hint sizes. Do not hide any of the six required regions or any playback controls.

- [ ] **Step 4: Run source and browser tests**

Run: `node --test tests/*.test.mjs`

Expected: all source tests pass.

Run: `npm run build && node tests/browser-regression.browser.mjs`

Expected: all desktop and five mobile-size browser scenarios pass with no overflow or overlaps.

- [ ] **Step 5: Commit the responsive implementation**

```bash
git add models/03-membrane-potential-curve/membrane-beautified.css
git commit -m "fix: fit membrane model on short phones"
```

### Task 4: Visual QA, publish, and public verification

**Files:**
- Modify if needed: `models/03-membrane-potential-curve/membrane-beautified.css`

**Interfaces:**
- Consumes: production static export and the GitHub Pages publication workflow.
- Produces: a public beautified URL verified at the smallest and common mobile viewports.

- [ ] **Step 1: Capture visual checks**

Open the production export at 320×568 and 390×844. Confirm the two series labels, centered title, curve status, curve trace, membrane/channel animation, all stage buttons, full explanation, and both control rows are readable and usable.

- [ ] **Step 2: Correct any visual-only regression**

If a label wraps, a control clips, or the membrane scene becomes unreadable, adjust only spacing and `clamp()` bounds, then rerun both automated suites.

- [ ] **Step 3: Run final verification**

Run: `node --test tests/*.test.mjs && npm run build && node tests/browser-regression.browser.mjs`

Expected: every test and every browser scenario passes.

- [ ] **Step 4: Publish the verified tree**

Publish the beautified static export to the repository's existing GitHub Pages branch/workflow without replacing the original variant.

- [ ] **Step 5: Verify the public deployment**

Open `https://meiosis7.github.io/membrane-potential-curve/beautified/` with a cache-busting query. Confirm the public response contains the new build and repeat the 320×568 visibility check.

