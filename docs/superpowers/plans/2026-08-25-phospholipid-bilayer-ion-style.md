# Phospholipid Bilayer and Ion Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the beautified membrane visibly read as a phospholipid bilayer and remove the filled yellow pedestal appearance from all Na⁺/K⁺ particles without changing simulation behavior or the original route.

**Architecture:** Keep the existing shared `MembraneView` particle and lipid DOM so the original route remains byte-for-byte behaviorally compatible. Reinterpret each existing lipid `<i>` only inside the beautified CSS scope as one upper/lower phospholipid pair, and replace beautified particle fills/highlights with transparent, ion-colored outlines. Extend fast CSS contracts and the production-export Chrome suite so both structure and computed styles are guarded.

**Tech Stack:** React 19, TypeScript, scoped CSS, Node test runner, headless Chrome CDP, Next.js static export.

## Global Constraints

- Change only the `/beautified/` visual presentation; `/` must remain visually and behaviorally unchanged.
- Show two opposed phospholipid leaflets: hydrophilic heads face the extracellular/intracellular compartments and paired hydrophobic tails face the membrane center.
- Remove filled yellow particle backgrounds, texture sprites, glossy highlights, and pedestal shadows.
- Preserve Na⁺ blue and K⁺ warm-orange identification with transparent backgrounds and readable outline/text colors.
- Preserve particle counts, drift, channel state, crossing direction, crossing timing, controls, and responsive layout.
- Do not add images, dependencies, or particles.

---

### Task 1: Replace the beautified membrane band and filled ions

**Files:**
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`
- Modify: `tests/beautified-variant.test.mjs`
- Modify: `tests/browser-regression.browser.mjs`

**Interfaces:**
- Consumes: existing `.membrane-lipid-field > i`, `.membrane-particle.sodium`, `.membrane-particle.potassium`, and `.membrane-crossing-ion` elements.
- Produces: scoped computed styles in which each lipid `<i>` draws two opposed phospholipids and all beautified ions have transparent backgrounds with ion-colored outlines.

- [ ] **Step 1: Write failing fast contracts for bilayer anatomy and transparent ions**

Append source-level assertions that require neutral membrane backing, two radial head groups, two tail pseudo-elements, transparent particle backgrounds, and hidden sprite/highlight pseudo-elements:

```js
test("beautified membrane draws two opposed phospholipid leaflets", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-bilayer\s*\{[^}]*background:\s*rgba\(255, 255, 255, \.34\)/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-lipid-field i\s*\{[^}]*radial-gradient\([^}]*radial-gradient\(/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-lipid-field i::before,[\s\S]*\.membrane-shell\.is-beautified \.membrane-lipid-field i::after\s*\{/s);
});

test("beautified ions have no filled pedestal or decorative sprite", async () => {
  const css = await source("models/03-membrane-potential-curve/membrane-beautified.css");
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-particle\s*\{[^}]*background:\s*transparent[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-particle::before,[\s\S]*\.membrane-shell\.is-beautified \.membrane-particle::after\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.membrane-shell\.is-beautified \.membrane-particle\.potassium\s*\{[^}]*background:\s*transparent/s);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
```

Expected: the new bilayer and transparent-ion assertions fail against the yellow membrane gradient and filled ion gradients.

- [ ] **Step 3: Draw the bilayer from the existing lipid elements**

Replace only the beautified membrane/lipid declarations. Use a neutral translucent membrane backing. Each lipid `<i>` uses two radial gradients for the outer and inner hydrophilic heads; `::before` draws the upper paired tails downward and `::after` draws the lower paired tails upward. The two pseudo-elements must meet visually near the center without forming a solid yellow slab:

```css
.membrane-shell.is-beautified .membrane-bilayer {
  border-block-color: rgba(61, 126, 119, .34);
  background: rgba(255, 255, 255, .34);
}

.membrane-shell.is-beautified .membrane-lipid-field i {
  height: 46px;
  border: 0;
  background:
    radial-gradient(circle at 50% 5px, #dff3ef 0 3px, #3f968e 3.5px 5px, transparent 5.5px),
    radial-gradient(circle at 50% calc(100% - 5px), #dff3ef 0 3px, #3f968e 3.5px 5px, transparent 5.5px);
}

.membrane-shell.is-beautified .membrane-lipid-field i::before,
.membrane-shell.is-beautified .membrane-lipid-field i::after {
  position: absolute;
  left: 50%;
  width: 10px;
  height: 15px;
  content: "";
  background:
    linear-gradient(82deg, transparent 42%, #9c7d50 44% 54%, transparent 56%) left / 50% 100% no-repeat,
    linear-gradient(98deg, transparent 42%, #9c7d50 44% 54%, transparent 56%) right / 50% 100% no-repeat;
}

.membrane-shell.is-beautified .membrane-lipid-field i::before { top: 10px; }
.membrane-shell.is-beautified .membrane-lipid-field i::after { bottom: 10px; transform: rotate(180deg); }
```

Adjust sizes under the existing `max-width: 800px` rule so heads and tails remain distinct on 390 px phones.

- [ ] **Step 4: Remove filled particle bases while retaining ion identity**

Use dark blue/amber tokens that remain readable on both compartment backgrounds. Remove texture/highlight pseudo-elements and all pedestal shadows:

```css
.membrane-shell.is-beautified {
  --beauty-sodium-particle-label: #05636a;
  --beauty-potassium-particle-label: #754000;
}

.membrane-shell.is-beautified .membrane-particle {
  border: 2px solid currentColor;
  background: transparent;
  box-shadow: none;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .92);
}

.membrane-shell.is-beautified .membrane-particle.sodium,
.membrane-shell.is-beautified .membrane-particle.potassium {
  background: transparent;
}

.membrane-shell.is-beautified .membrane-particle::before,
.membrane-shell.is-beautified .membrane-particle::after {
  display: none;
}
```

Keep crossing-ion dimensions and animation declarations unchanged.

- [ ] **Step 5: Extend the real browser test with computed-style checks**

In the beautified mobile/desktop route checks, evaluate representative sodium, potassium, and lipid elements:

```js
const visuals = await evaluate(tab, `(() => {
  const sodium = document.querySelector('.membrane-particle.sodium');
  const potassium = document.querySelector('.membrane-particle.potassium');
  const lipid = document.querySelector('.membrane-lipid-field i');
  return {
    sodiumBackground: getComputedStyle(sodium).backgroundColor,
    potassiumBackground: getComputedStyle(potassium).backgroundColor,
    spriteDisplay: getComputedStyle(potassium, '::before').display,
    headBackgrounds: getComputedStyle(lipid).backgroundImage,
    upperTailContent: getComputedStyle(lipid, '::before').content,
    lowerTailContent: getComputedStyle(lipid, '::after').content,
  };
})()`);
assert.equal(visuals.sodiumBackground, 'rgba(0, 0, 0, 0)');
assert.equal(visuals.potassiumBackground, 'rgba(0, 0, 0, 0)');
assert.equal(visuals.spriteDisplay, 'none');
assert.match(visuals.headBackgrounds, /radial-gradient/);
assert.equal(visuals.upperTailContent, '\"\"');
assert.equal(visuals.lowerTailContent, '\"\"');
```

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
node --test --experimental-strip-types tests/beautified-variant.test.mjs
npm test
npm run lint
npm run build
npm run test:browser
git diff --check
```

Expected: all commands exit 0; browser checks confirm transparent ion backgrounds and computed bilayer heads/tails.

- [ ] **Step 7: Commit the visual implementation**

```bash
git add models/03-membrane-potential-curve/membrane-beautified.css tests/beautified-variant.test.mjs tests/browser-regression.browser.mjs
git commit -m "style: clarify phospholipid bilayer and ions"
```

---

### Task 2: Visual QA, mirror sync, and publication

**Files:**
- Verify: production export for `/` and `/beautified/`
- Sync: `/Users/fushuo/Documents/一生 选必1 交互模型/membrane-potential-curve-standalone`

**Interfaces:**
- Consumes: Task 1 production export.
- Produces: verified public GitHub Pages routes with cache-busted URLs.

- [ ] **Step 1: Perform browser visual QA at all representative breakpoints**

Verify `/beautified/` at 390×700, 390×844, 900×900, and 1440×900. Confirm two head rows, inward-facing tails, transparent Na⁺/K⁺ particles, visible drift/crossing, no clipping, and no console warnings. Verify `/` at 390×844 and 1440×900 remains unchanged.

- [ ] **Step 2: Request a final read-only code review**

Review the Task 1 commit against the design spec. Fix every Critical or Important finding before publication.

- [ ] **Step 3: Re-run the complete release gate**

Run `npm test`, `npm run lint`, `npm run build`, `npm run test:browser`, and `git diff --check` from `main`; require zero failures.

- [ ] **Step 4: Sync the standalone local mirror and verify hashes**

Copy tracked files without deleting unrelated user files, then compare SHA-1 hashes for the beautified CSS and both changed test files.

- [ ] **Step 5: Publish and verify GitHub Pages**

Update GitHub `main`, wait for the Pages workflow to succeed, and verify both public routes return HTTP 200 with the beautified route containing `mechanism-workbench`.
