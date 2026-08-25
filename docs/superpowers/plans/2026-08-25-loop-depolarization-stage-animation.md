# Loop Depolarization Stage Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the beautified depolarization and reversal-polarization stage animations looping until the learner pauses, resets, or chooses another stage.

**Architecture:** Add a pure looping-time helper beside the existing bounded playback helper. `MembraneCurveLab` stores an optional loop start in a ref; the animation frame uses looping advancement only for the two sodium stages and retains bounded playback everywhere else.

**Tech Stack:** React 19, TypeScript, Node.js test runner, browser regression harness

## Global Constraints

- Only depolarization (`2`–`2.65`) and peak/reversal polarization (`2.65`–`3`) loop during stage-button playback.
- The retained original variant keeps bounded playback for every stage.
- Full playback must continue through peak into repolarization.
- Pause, curve dragging, intensity changes, other stage buttons, and reset must not leave a stale loop active.
- Do not modify ion counts, channel state rules, animation speed, copy, or layout.

---

### Task 1: Looping playback primitive and stage integration

**Files:**
- Modify: `tests/playback.test.mjs`
- Modify: `tests/browser-regression.browser.mjs`
- Modify: `models/03-membrane-potential-curve/playback.ts`
- Modify: `models/03-membrane-potential-curve/MembraneCurveLab.tsx`

**Interfaces:**
- Consumes: `PlaybackSpeed`, `getStagePlaybackEnd()`, stage button ranges from `ACTION_POTENTIAL_STEPS`.
- Produces: `advanceLoopingPlayback(current, elapsedMs, speed, loopStart, loopEnd): number` and looping stage-button behavior.

- [ ] **Step 1: Write the failing pure playback test**

Add assertions that `advanceLoopingPlayback(2.6, 240, 1, 2, 2.649)` wraps into the same interval and that values advanced without crossing the end continue forward.

- [ ] **Step 2: Update the browser contract before implementation**

For stage buttons 3 and 4, wait past the first stage duration and assert that the scene remains `is-playing`, the active stage is unchanged, and curve time returns toward the stage start. Retain automatic-stop assertions for the other five stages, then verify full playback advances from peak to repolarization.

- [ ] **Step 3: Run tests to verify the new behavior fails**

Run: `node --test --experimental-strip-types tests/playback.test.mjs`

Expected: FAIL because `advanceLoopingPlayback` is not exported.

After the production build, run: `npm run test:browser`

Expected: FAIL because the current stage controller sets `playing=false` at each selected boundary.

- [ ] **Step 4: Add the minimal pure helper**

Implement `advanceLoopingPlayback` using the existing teaching-time conversion. Normalize an out-of-range current time to `loopStart`, add elapsed time, and use modulo by `loopEnd - loopStart` so large elapsed frames also remain within the interval.

- [ ] **Step 5: Integrate the two loop ranges**

Add `loopStart = useRef<number | null>(null)`. In the frame callback, call `advanceLoopingPlayback` while that ref is non-null and do not set `playing=false`. Set the ref to `startTime` only when `startTime` is `2` or `2.65`; otherwise clear it. Clear it on curve changes, intensity changes, reset, and normal full playback initialization; retain it across pause/resume of an active stage loop.

- [ ] **Step 6: Run complete verification**

Run: `npm test && npm run lint && npm run build && npm run test:browser`

Expected: unit tests, lint, build, and all browser tests pass; the browser console remains clean.

- [ ] **Step 7: Commit**

```bash
git add models/03-membrane-potential-curve/playback.ts models/03-membrane-potential-curve/MembraneCurveLab.tsx tests/playback.test.mjs tests/browser-regression.browser.mjs docs/superpowers/plans/2026-08-25-loop-depolarization-stage-animation.md
git commit -m "fix: loop sodium stage animations"
```
