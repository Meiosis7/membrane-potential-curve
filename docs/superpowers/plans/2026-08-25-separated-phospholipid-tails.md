# Separated Phospholipid Tails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw each bilayer unit as two independent phospholipids with one circular head and two separate tails each.

**Architecture:** Keep the existing DOM and render one complete upper phospholipid with `i::before` and one complete lower phospholipid with `i::after`. CSS gradients provide one circular head plus two spatially separated tail lines per pseudo-element, while browser tests verify the two molecules do not touch.

**Tech Stack:** CSS, Node.js test runner, Playwright browser regression tests

## Global Constraints

- Modify only the beautified membrane presentation and its tests.
- Preserve all curve, playback, channel, ion, and original-route behavior.
- Maintain clear rendering at 390px and 1440px widths.

---

### Task 1: Separate the two phospholipid molecules

**Files:**
- Modify: `tests/beautified-variant.test.mjs`
- Modify: `tests/browser-regression.browser.mjs`
- Modify: `models/03-membrane-potential-curve/membrane-beautified.css`

**Interfaces:**
- Consumes: Existing `.membrane-lipid-field i`, `i::before`, and `i::after` elements.
- Produces: Two independently rendered phospholipids per `i`, each with one head and two tails.

- [ ] **Step 1: Write the failing source and browser assertions**

Assert that the base `i` no longer draws both heads, each pseudo-element draws a radial head plus two linear tails, and computed geometry leaves a positive center gap.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `node --test tests/beautified-variant.test.mjs`

Expected: FAIL because the current base element draws the heads and the opposed tails intersect.

- [ ] **Step 3: Implement the minimal CSS drawing change**

Move the head gradients into the corresponding pseudo-elements, give each pseudo-element two separated tail gradients, position the lower molecule independently, and shorten both tail pairs enough to preserve a center gap.

- [ ] **Step 4: Run focused and complete verification**

Run: `npm test && npm run lint && npm run build && npm run test:browser`

Expected: 64 or more unit tests pass, lint and build exit 0, and all browser tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-25-separated-phospholipid-tails-design.md docs/superpowers/plans/2026-08-25-separated-phospholipid-tails.md tests/beautified-variant.test.mjs tests/browser-regression.browser.mjs models/03-membrane-potential-curve/membrane-beautified.css
git commit -m "style: separate phospholipid heads and tails"
```

