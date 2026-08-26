# Majority Ion Density Increase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase resting Na⁺ outside the membrane and K⁺ inside the membrane while keeping animated redistribution, total counts, and compact-phone layout correct.

**Architecture:** Keep `getIonVisualState` as the single source of truth for compartment counts, and extend `MembraneView`'s fixed coordinate pools only for the two majority compartments. Lock the behavior with exact unit assertions and production-browser DOM counts so state and rendering cannot drift apart.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, Chrome DevTools Protocol browser regression fixture.

## Global Constraints

- Na⁺ rests at 9 outside and 2 inside; its visible total remains 11.
- K⁺ rests at 2 outside and 8 inside; its visible total remains 10.
- The existing transfer amount remains three ions.
- Existing background and channel-crossing animations remain unchanged.
- The 320 × 568 beautified route remains free of overflow and overlap.
- Add no dependencies, controls, routes, or explanatory copy.

---

### Task 1: Lock exact ion counts in state tests

**Files:**
- Modify: `tests/ion-visual-state.test.mjs`
- Modify: `models/03-membrane-potential-curve/ion-visual-state.ts`

**Interfaces:**
- Consumes: `getIonVisualState(time, intensity, snapshot)`.
- Produces: exact `sodium` and `potassium` compartment counts used by `MembraneView`.

- [ ] **Step 1: Write exact failing assertions**

Replace relational resting assertions with exact objects and update transfer totals:

```js
assert.deepEqual(state.sodium, { outside: 9, inside: 2 });
assert.deepEqual(state.potassium, { outside: 2, inside: 8 });
assert.equal(peak.sodium.inside + peak.sodium.outside, 11);
assert.equal(hyper.potassium.inside + hyper.potassium.outside, 10);
```

- [ ] **Step 2: Run the focused state test and confirm RED**

Run: `node --test --experimental-strip-types tests/ion-visual-state.test.mjs`

Expected: FAIL because the implementation still returns Na⁺ 7/2 and K⁺ 2/6.

- [ ] **Step 3: Increase only the majority-side base counts**

Set the state constants to:

```ts
const BASE_COUNTS = {
  sodium: { outside: 9, inside: 2 },
  potassium: { outside: 2, inside: 8 },
} as const;
```

- [ ] **Step 4: Run the focused state test and confirm GREEN**

Run: `node --test --experimental-strip-types tests/ion-visual-state.test.mjs`

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit state behavior**

```bash
git add tests/ion-visual-state.test.mjs models/03-membrane-potential-curve/ion-visual-state.ts
git commit -m "feat: increase majority ion counts"
```

### Task 2: Render the added ions without crowding

**Files:**
- Modify: `tests/browser-regression.browser.mjs`
- Modify: `models/03-membrane-potential-curve/MembraneView.tsx`

**Interfaces:**
- Consumes: `visual.sodium.outside` and `visual.potassium.inside` from `getIonVisualState`.
- Produces: nine extracellular `.membrane-particle.sodium` elements and eight intracellular `.membrane-particle.potassium` elements at rest.

- [ ] **Step 1: Add failing browser DOM-count assertions**

In the beautified visual test, collect and assert these counts for desktop and phone scenarios:

```js
counts: {
  sodiumOutside: document.querySelectorAll('.membrane-extracellular .membrane-particle.sodium').length,
  sodiumInside: document.querySelectorAll('.membrane-intracellular .membrane-particle.sodium').length,
  potassiumOutside: document.querySelectorAll('.membrane-extracellular .membrane-particle.potassium').length,
  potassiumInside: document.querySelectorAll('.membrane-intracellular .membrane-particle.potassium').length,
}
```

Expected counts are 9, 2, 2, and 8 respectively.

- [ ] **Step 2: Build and run the browser test to confirm RED**

Run: `npm run build && npm run test:browser`

Expected: FAIL because coordinate pools cap the majority compartments at seven Na⁺ and six K⁺.

- [ ] **Step 3: Extend the two coordinate pools**

Append two extracellular Na⁺ positions and two intracellular K⁺ positions:

```ts
sodiumOutside: [
  // existing positions
  { left: "23%", top: "49%" },
  { left: "69%", top: "50%" },
],
potassiumInside: [
  // existing positions
  { left: "21%", top: "52%" },
  { left: "70%", top: "54%" },
],
```

- [ ] **Step 4: Rebuild and run browser regression to confirm GREEN**

Run: `npm run build && npm run test:browser`

Expected: all browser regression tests pass at desktop and mobile sizes, including 320 × 568 layout coverage.

- [ ] **Step 5: Run complete verification**

Run: `npm test && npm run lint && npm run build && npm run test:browser`

Expected: all source tests and browser tests pass, lint reports no errors, and the production export builds successfully.

- [ ] **Step 6: Commit rendering and regression coverage**

```bash
git add tests/browser-regression.browser.mjs models/03-membrane-potential-curve/MembraneView.tsx
git commit -m "feat: render denser majority ion distribution"
```
