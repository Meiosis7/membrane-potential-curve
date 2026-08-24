# 膜电位变化曲线第二轮 PDF 修订 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将第二轮 PDF 的六项批注完整落实到独立网页，并保持曲线、阶段、通道和离子动画同步。

**Architecture:** `simulation.ts` 统一定义新的尖峰动作电位阶段与膜电位，阶段导航和曲线画布共享相同边界。React 组件只负责删除批注要求移除的视觉元素并重排页首与控制台，CSS 保持单屏响应式布局。

**Tech Stack:** Next.js 16、React 19、TypeScript、Canvas 2D、Node.js test runner、CSS

## Global Constraints

- 动作电位在 `time=3` 只出现一个约 `+30 mV` 尖峰，不得包含平台期。
- 去极化到 `0 mV` 结束，反极化从 `0 mV` 上升至约 `+30 mV`。
- 控制台时间轴、离子数量牌和底部极性说明条全部删除。
- 曲线画布继续支持拖动和键盘回看。
- 手机端同一视角显示曲线、膜场景、阶段解释和控制台，且无横向溢出。

---

### Task 1: 尖峰曲线与阶段同步

**Files:**
- Modify: `models/03-membrane-potential-curve/simulation.ts`
- Modify: `models/03-membrane-potential-curve/stage-content.ts`
- Modify: `models/03-membrane-potential-curve/CurveCanvas.tsx`
- Modify: `models/03-membrane-potential-curve/ion-visual-state.ts`
- Modify: `tests/playback.test.mjs`
- Create: `tests/action-potential-shape.test.mjs`

**Interfaces:**
- Consumes: `getCurveSnapshot(time, intensity)` and `ACTION_POTENTIAL_STEPS`.
- Produces: stage ranges `[0,1]`, `[1,2]`, `[2,2.65]`, `[2.65,3]`, `[3,4.8]`, `[4.8,5.3]`, `[5.3,6]` and a single-peaked curve.

- [ ] **Step 1: Write the failing stage and shape tests**

断言 `2.649` 为去极化且电位低于 0，`2.65` 为反极化且约为 0，`2.9` 为反极化且介于 0 与 +30，`3` 为复极化起点且约为 +30，`3.1` 已低于 +30。断言反极化阶段仍有 Na⁺ 内流并开放 Na⁺ 通道，复极化改为 K⁺ 外流并开放 K⁺ 通道。

```js
const beforeZero = getCurveSnapshot(2.649, "threshold");
const atZero = getCurveSnapshot(2.65, "threshold");
const risingPositive = getCurveSnapshot(2.9, "threshold");
const peak = getCurveSnapshot(3, "threshold");
const falling = getCurveSnapshot(3.1, "threshold");
assert.equal(beforeZero.stage, "depolarization");
assert.ok(beforeZero.mv < 0);
assert.equal(atZero.stage, "peak");
assert.ok(Math.abs(atZero.mv) < 0.01);
assert.equal(risingPositive.ionFlow, "sodium-in");
assert.equal(risingPositive.sodiumOpen, true);
assert.ok(risingPositive.mv > 0 && risingPositive.mv < 30);
assert.equal(peak.stage, "repolarization");
assert.ok(Math.abs(peak.mv - 30) < 0.01);
assert.equal(peak.ionFlow, "potassium-out");
assert.ok(falling.mv < 30);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL because the old curve has a `[3,4)` plateau and stage ranges do not split at `2.65`.

- [ ] **Step 3: Implement the unified stage boundaries**

在 `simulation.ts` 中把阶段边界改为 `2.65`、`3`、`4.8`；去极化插值到 `0 mV`，反极化插值到 `+30 mV`，复极化从 `time=3` 立即下降。把 `peak` 的离子流改为 `sodium-in`、Na⁺ 通道保持开放；同步更新阶段按钮区间、画布背景区间和 K⁺ 转移起点。

```ts
if (time < 2.65) return "depolarization";
if (time < 3) return "peak";
if (time < 4.8) return "repolarization";

case "depolarization": return interpolate(time, 2, 2.65, -55, 0);
case "peak": return interpolate(time, 2.65, 3, 0, 30);
case "repolarization": return interpolate(time, 3, 4.8, 30, -70);
```

- [ ] **Step 4: Update teaching copy**

将阶段 3 电位说明改为“从约 −70 mV 开始，经阈电位继续上升至 0 mV”；阶段 4 的标题与短标题改为“反极化”，说明改为“由 0 mV 上升至约 +30 mV 的尖峰”。

```ts
depolarization: {
  title: "去极化",
  shortTitle: "去极化",
  voltage: "从约 −70 mV 开始，经阈电位继续上升至 0 mV",
},
peak: {
  title: "反极化",
  shortTitle: "反极化",
  voltage: "由 0 mV 上升至约 +30 mV 的尖峰",
},
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Expected: all shape, stage, ion and playback tests pass.

Commit message: `fix: replace plateau with action potential peak`

### Task 2: 删除批注标记的界面元素

**Files:**
- Modify: `models/03-membrane-potential-curve/MembraneCurveLab.tsx`
- Modify: `models/03-membrane-potential-curve/MembraneView.tsx`
- Modify: `models/03-membrane-potential-curve/membrane-curve.css`
- Modify: `tests/pdf-revision-contract.test.mjs`

**Interfaces:**
- Consumes: current `time`, `intensity`, `snapshot`, and playback controls.
- Produces: series header, count-free membrane scene, polarity-bar-free membrane scene, and slider-free control console.

- [ ] **Step 1: Write failing source contract tests**

断言页首含“选择性必修1·神经冲动的传导”和“一生儿高中生物一本通”；断言源码不含 `membrane-ion-counts`、`membrane-polarity-bar`、`membrane-timeline` 和 `aria-label="时间轴"`。

```js
assert.match(lab, /选择性必修1·神经冲动的传导/);
assert.match(lab, /一生儿高中生物一本通/);
assert.doesNotMatch(lab, /membrane-timeline|aria-label="时间轴"/);
assert.doesNotMatch(view, /membrane-ion-counts|membrane-polarity-bar/);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL on the missing series brand and all three still-rendered legacy UI elements.

- [ ] **Step 3: Remove legacy elements**

从 `MembraneView.tsx` 删除两侧数量牌和底部极性条；从 `MembraneCurveLab.tsx` 删除控制台时间滑块，但保留 `changeTime` 给画布拖动使用。

```tsx
<CurveCanvas
  time={time}
  intensity={intensity}
  snapshot={snapshot}
  compare={compare}
  onTimeChange={changeTime}
/>
```

- [ ] **Step 4: Implement the series header and compact controls**

页首增加系列信息行，主标题居中；控制台桌面端改为“刺激强度 / 播放与重置 / 倍速与对比”三列，手机端改为“刺激强度 / 播放与重置”一行。删除对应数量牌、极性条和时间轴 CSS。

```tsx
<div className="membrane-series-line">
  <span>选择性必修1·神经冲动的传导</span>
  <b>一生儿高中生物一本通</b>
</div>
<h1 id="membrane-title">膜电位变化曲线</h1>
```

```css
.membrane-controls { grid-template-columns: auto auto minmax(0, 1fr); }
.membrane-options { justify-self: end; }
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint exits 0, and static export succeeds.

Commit message: `style: apply second PDF interface revisions`

### Task 3: 手机交互与视觉验收

**Files:**
- Modify: files from Tasks 1–2 only if visual verification exposes a defect.

**Interfaces:**
- Consumes: local development build.
- Produces: verified responsive interaction at 390×844 and desktop interaction at 1440×900.

- [ ] **Step 1: Verify the curve stages**

在手机视口依次播放去极化、反极化、复极化，确认时间持续推进，曲线无平台期，Na⁺/K⁺ 通道与阶段一致，阶段结束后保持选中阶段。

- [ ] **Step 2: Verify the layout**

确认系列标题、曲线、膜场景、阶段说明和控制台均在同一视角，无离子数量牌、无底部时间滑块、无极性文字遮挡，且 `scrollWidth === innerWidth`。

- [ ] **Step 3: Verify errors and build**

确认浏览器控制台无错误，再运行 `npm test && npm run lint && npm run build && git diff --check`。

Expected: zero browser errors, all tests pass, and build succeeds.

### Task 4: 发布独立网页

**Files:**
- Modify: none.

**Interfaces:**
- Consumes: verified `main` branch.
- Produces: updated `https://meiosis7.github.io/membrane-potential-curve/`.

- [ ] **Step 1: Push the dedicated repository**

Run: `git push origin main`

Expected: remote `main` advances to the final verified commit.

- [ ] **Step 2: Wait for GitHub Pages**

Run: `gh run watch --exit-status`

Expected: build and deploy jobs conclude `success`.

- [ ] **Step 3: Verify public assets**

请求公开 HTML 及其 JavaScript/CSS 资源，确认 HTTP 200、系列标题存在、旧数量牌和时间轴文案不存在，并使用新提交号作为缓存参数交付链接。
