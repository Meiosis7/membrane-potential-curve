# Membrane Lab Beautified Variant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current membrane-potential lab at `/` and publish a visually upgraded, functionally identical version at `/beautified/`.

**Architecture:** Keep simulation, playback, stage content, ion distribution, and component structure shared. Add an explicit visual-variant input whose default reproduces the current page, load a strictly scoped CSS override only from the beautified route, and isolate Canvas colors in a small theme module.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Canvas 2D, CSS, Node test runner, ESLint, GitHub Pages.

## Global Constraints

- The existing `/` route, colors, layout, animation behavior, and public URL remain unchanged.
- The new route is exactly `/beautified/`.
- Both routes share the same simulation, stage content, playback, and ion visual-state modules.
- Every beautified CSS selector is scoped below `.membrane-shell.is-beautified`.
- Both desktop and 390 × 844 mobile layouts remain inside one `100svh` viewport with no page overflow.
- Do not add dependencies, controls, knowledge copy, audio, storage, or replacement image assets.
- Preserve `prefers-reduced-motion` behavior and existing keyboard/focus support.

---

### Task 1: Add the independent beautified route and variant boundary

**Files:**
- Create: `app/beautified/page.tsx`
- Create: `models/03-membrane-potential-curve/visual-theme.ts`
- Create: `tests/beautified-variant.test.mjs`
- Modify: `models/03-membrane-potential-curve/MembraneCurveLab.tsx`
- Modify: `models/03-membrane-potential-curve/CurveCanvas.tsx`

**Interfaces:**
- Produces: `VisualVariant = "original" | "beautified"`.
- Produces: `MembraneCurveLabProps.visualVariant?: VisualVariant`, defaulting to `"original"`.
- Produces: `CurveCanvasProps.visualVariant?: VisualVariant`, defaulting to `"original"`.
- The original route continues to call `<MembraneCurveLab />`; the new route calls `<MembraneCurveLab visualVariant="beautified" />`.

- [ ] **Step 1: Write the failing route and isolation contract tests**

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types tests/beautified-variant.test.mjs`

Expected: FAIL because the beautified route, variant type, and themed props do not exist.

- [ ] **Step 3: Add the minimal variant plumbing and route**

```ts
// visual-theme.ts
export type VisualVariant = "original" | "beautified";
```

```tsx
// app/beautified/page.tsx
import { MembraneCurveLab } from "../../models/03-membrane-potential-curve/MembraneCurveLab";
import "../../models/03-membrane-potential-curve/membrane-curve.css";
import "../../models/03-membrane-potential-curve/membrane-beautified.css";

export default function BeautifiedPage() {
  return <MembraneCurveLab visualVariant="beautified" />;
}
```

In `MembraneCurveLab`, add the optional prop, keep the original class literal unchanged for the default branch, and pass the variant to `CurveCanvas`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test --experimental-strip-types tests/beautified-variant.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the route boundary**

```bash
git add app/beautified/page.tsx models/03-membrane-potential-curve/visual-theme.ts models/03-membrane-potential-curve/MembraneCurveLab.tsx models/03-membrane-potential-curve/CurveCanvas.tsx tests/beautified-variant.test.mjs
git commit -m "feat: add isolated beautified lab route"
```

---

### Task 2: Add Canvas palettes without changing original rendering

**Files:**
- Modify: `models/03-membrane-potential-curve/visual-theme.ts`
- Modify: `models/03-membrane-potential-curve/CurveCanvas.tsx`
- Modify: `tests/beautified-variant.test.mjs`

**Interfaces:**
- Produces: `getCurveVisualTheme(variant: VisualVariant): CurveVisualTheme`.
- `CurveVisualTheme` supplies surface gradient, grid, threshold, stage band, cursor, label, and three intensity line styles.
- `CurveCanvas` consumes only this theme object; curve geometry remains untouched.

- [ ] **Step 1: Write the failing palette-preservation test**

```js
test("the original canvas palette is preserved and beautified palette is distinct", () => {
  const original = getCurveVisualTheme("original");
  const beautified = getCurveVisualTheme("beautified");
  assert.equal(original.intensities.threshold.color, "#ef6a57");
  assert.equal(original.intensities.strong.color, "#168f91");
  assert.notEqual(beautified.surfaceTop, original.surfaceTop);
  assert.equal(beautified.accents.sodium, "#16a6ad");
});
```

- [ ] **Step 2: Run the palette test and verify RED**

Run: `node --test --experimental-strip-types tests/beautified-variant.test.mjs`

Expected: FAIL because `getCurveVisualTheme` is missing.

- [ ] **Step 3: Implement both explicit palettes**

Use the current hard-coded Canvas values verbatim for `original`. Use these beautified anchors:

```ts
const BEAUTIFIED = {
  surfaceTop: "rgba(225, 240, 235, .88)",
  surfaceBottom: "rgba(247, 244, 235, .58)",
  grid: "rgba(44, 78, 76, .14)",
  threshold: "rgba(237, 157, 56, .66)",
  stageBand: "rgba(22, 166, 173, .09)",
  cursor: "rgba(16, 43, 50, .62)",
  label: "#274a4f",
  accents: { sodium: "#16a6ad", potassium: "#ed9d38" },
  intensities: {
    weak: { color: "#796cc8", dash: [8, 6], label: "弱刺激" },
    threshold: { color: "#f15f50", dash: [], label: "阈刺激" },
    strong: { color: "#16a6ad", dash: [3, 5], label: "强刺激" },
  },
} as const;
```

Add a restrained `shadowBlur` only for the active beautified curve and reset the Canvas shadow state immediately after the stroke.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test`

Expected: all tests PASS, including the existing curve-shape and playback tests.

- [ ] **Step 5: Commit Canvas theming**

```bash
git add models/03-membrane-potential-curve/visual-theme.ts models/03-membrane-potential-curve/CurveCanvas.tsx tests/beautified-variant.test.mjs
git commit -m "feat: theme the beautified curve canvas"
```

---

### Task 3: Build the scoped modern bio-lab surface system

**Files:**
- Create: `models/03-membrane-potential-curve/membrane-beautified.css`
- Modify: `tests/beautified-variant.test.mjs`

**Interfaces:**
- The stylesheet consumes existing component class names only beneath `.membrane-shell.is-beautified`.
- It does not require new DOM nodes or change layout state.

- [ ] **Step 1: Write the failing CSS scope and visual-token tests**

```js
test("beautified CSS is scoped and defines the bio-lab visual system", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.doesNotMatch(css, /^:root/m);
  assert.doesNotMatch(css, /^\.membrane-(?!shell\.is-beautified)/m);
  assert.match(css, /\.membrane-shell\.is-beautified\s*\{/);
  assert.match(css, /--beauty-sodium:\s*#16a6ad/);
  assert.match(css, /--beauty-potassium:\s*#ed9d38/);
  assert.match(css, /backdrop-filter:\s*blur/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types tests/beautified-variant.test.mjs`

Expected: FAIL because the beautified stylesheet does not exist.

- [ ] **Step 3: Implement shell, header, status, and primary panel styling**

Create scoped tokens on `.membrane-shell.is-beautified` and style:

- atmospheric warm-mist background using layered radial and linear gradients;
- title and series line hierarchy;
- translucent live-state and status data capsule;
- elevated process canvas with inner highlight and softened division;
- curve and membrane card headers with consistent typography;
- curve canvas border, surface, and focus ring.

All pseudo-elements must remain below interactive content using explicit `z-index` and `pointer-events: none`.

- [ ] **Step 4: Run the focused CSS contract test**

Run: `node --test --experimental-strip-types tests/beautified-variant.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the surface system**

```bash
git add models/03-membrane-potential-curve/membrane-beautified.css tests/beautified-variant.test.mjs
git commit -m "style: add beautified bio-lab surfaces"
```

---

### Task 4: Polish membrane, particles, channels, stages, and controls

**Files:**
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`
- Modify: `tests/beautified-variant.test.mjs`

**Interfaces:**
- Consumes the existing membrane scene, particles, channel art, stage navigation, and control classes.
- Produces only scoped visual overrides; no simulation or playback interfaces change.

- [ ] **Step 1: Write failing visual-detail contracts**

```js
test("beautified membrane and controls expose the required visual states", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /is-beautified \.membrane-particle::after/);
  assert.match(css, /is-beautified \.membrane-channel\.sodium\.is-open/);
  assert.match(css, /is-beautified \.membrane-channel\.potassium\.is-open/);
  assert.match(css, /is-beautified \.membrane-stage-nav button\[aria-pressed="true"\]/);
  assert.match(css, /is-beautified \.membrane-transport \.membrane-play/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types tests/beautified-variant.test.mjs`

Expected: FAIL because the visual-detail selectors are missing.

- [ ] **Step 3: Implement the membrane and ion polish**

Add scoped styles for:

- cold extracellular and warm intracellular environment layers;
- refined gold bilayer and lipid heads;
- ion glass highlights using `::after`, preserving particle counts and animation names;
- low-saturation closed channels and Na⁺/K⁺-colored open glows;
- thinner ion stream with direction still clearly visible;
- stimulus pulse consistent with the coral curve accent.

- [ ] **Step 4: Implement stage and control polish**

Add scoped styles for:

- connected seven-step navigation and active-stage progress highlight;
- layered stage detail card;
- floating control dock;
- one primary play button, refined intensity buttons, speed segmented control, and compare toggle;
- hover, active, and focus-visible states without layout movement.

- [ ] **Step 5: Add responsive and reduced-motion overrides**

Under scoped media queries:

- preserve the existing one-screen mobile grid;
- reduce shadows, blur, glow, and decorative grid density at `max-width: 800px`;
- preserve 44 px desktop controls and current compact mobile controls;
- keep all nonessential motion disabled under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run focused and full tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit detailed visual polish**

```bash
git add models/03-membrane-potential-curve/membrane-beautified.css tests/beautified-variant.test.mjs
git commit -m "style: polish the beautified membrane lab"
```

---

### Task 5: Verify both versions and publish two public links

**Files:**
- Modify only if QA reveals an in-scope defect.
- Sync final project files to `/Users/fushuo/Documents/一生 选必1 交互模型/membrane-potential-curve-standalone/` without deleting unrelated user files.

**Interfaces:**
- Original public route: `/membrane-potential-curve/`.
- Beautified public route: `/membrane-potential-curve/beautified/`.

- [ ] **Step 1: Run fresh automated verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: zero test failures, zero lint errors, successful static export including `/beautified/`, and no whitespace errors.

- [ ] **Step 2: Browser-QA the original route**

Verify at desktop and 390 × 844:

- root class is exactly `membrane-shell`;
- no beautified stylesheet effects are visible;
- no page overflow or console errors;
- full and stage-bounded playback still animate.

- [ ] **Step 3: Browser-QA the beautified route**

Verify at desktop and 390 × 844:

- root class is `membrane-shell is-beautified`;
- all four teaching regions fit in one viewport;
- Na⁺ and K⁺ particles continuously move and cross open channels;
- depolarization, reversal polarization, repolarization, hyperpolarization, and recovery animate;
- 0 mV shows neutral `0` on both sides;
- no overflow, clipping, or console errors.

- [ ] **Step 4: Request code review and resolve Critical/Important findings**

Review the complete diff from the current published baseline. Re-run the full verification command after every required fix.

- [ ] **Step 5: Sync the source mirror and publish**

Use non-deleting synchronization for `app/`, `models/`, `tests/`, and `docs/`. Push `main`, wait for the GitHub Pages workflow to complete successfully, and verify both public URLs return HTTP 200.

- [ ] **Step 6: Final public content verification**

Confirm the original HTML excludes `is-beautified`; confirm the beautified HTML includes the route and themed bundle. Return both cache-busted public links to the user.
