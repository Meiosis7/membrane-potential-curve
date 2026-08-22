# 膜电位变化曲线 PDF 批注修订 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 逐条落实 PDF 批注，使刺激、电位曲线、通道和离子数量变化在单屏实验台中同步呈现。

**Architecture:** 保留现有时间驱动的电位模拟，新增纯函数生成离子视觉状态。React 组件只根据该状态渲染粒子，CSS 负责漂移和跨膜路径，从而让播放、暂停和拖动都得到确定结果。

**Tech Stack:** Next.js 16、React 19、TypeScript 5、Node test runner、CSS animations、GitHub Pages。

## Global Constraints

- 主标题必须为“膜电位变化曲线”。
- Na⁺ 与 K⁺ 必须由标记离子粒子穿过对应通道，不得用大箭头代替。
- 电位变化时必须显示刺激动画。
- 手机端必须保持一个视口内显示曲线、通道信息、步骤解释和控制台。
- 去极化文案必须包含“电化学浓度梯度”。

---

### Task 1: 离子视觉状态

**Files:**
- Create: `models/03-membrane-potential-curve/ion-visual-state.ts`
- Create: `tests/ion-visual-state.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `CurveSnapshot`, `CurveIntensity`, current time.
- Produces: `getIonVisualState(time, intensity, snapshot): IonVisualState`.

- [ ] **Step 1: Write the failing test**

测试静息时 Na⁺ 外多内少、K⁺ 内多外少；去极化时 Na⁺ 内侧数量增加；K⁺ 外流阶段外侧数量增加；刺激期脉冲处于激活状态。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `ion-visual-state.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

实现 `IonVisualState` 及基于阶段进度的确定性数量映射，返回 `sodiumCrossing`、`potassiumCrossing` 和 `stimulusActive`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: all ion visual state assertions pass.

- [ ] **Step 5: Commit**

Commit message: `test: define ion movement visual state`

### Task 2: 粒子跨膜与刺激动画

**Files:**
- Create: `tests/pdf-revision-contract.test.ts`
- Modify: `models/03-membrane-potential-curve/MembraneCurveLab.tsx`
- Modify: `models/03-membrane-potential-curve/MembraneView.tsx`
- Modify: `models/03-membrane-potential-curve/membrane-curve.css`

**Interfaces:**
- Consumes: `getIonVisualState` and existing `CurveSnapshot`.
- Produces: visible stimulus electrode and labelled Na⁺/K⁺ crossing particles.

- [ ] **Step 1: Write the failing test**

断言源码含“膜电位变化曲线”、`membrane-stimulus`、`membrane-crossing-ion`，且不再含 `membrane-flow-arrow`。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL on title, stimulus, crossing ion, and legacy arrow assertions.

- [ ] **Step 3: Write minimal implementation**

向膜场景传入时间与刺激强度；按数量切片渲染常驻粒子；在开放通道中心渲染 3 个错峰的 Na⁺ 或 K⁺ 跨膜粒子；加入刺激电极和扩散光环；删除大箭头。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: all contract assertions pass.

- [ ] **Step 5: Commit**

Commit message: `feat: show ions crossing membrane channels`

### Task 3: 版式与文案收尾

**Files:**
- Modify: `models/03-membrane-potential-curve/stage-content.ts`
- Modify: `models/03-membrane-potential-curve/membrane-curve.css`

**Interfaces:**
- Consumes: existing stage detail UI.
- Produces: corrected copy and compact non-overlapping membrane compartments.

- [ ] **Step 1: Extend the failing contract test**

断言文案包含“Na⁺ 顺电化学浓度梯度大量内流”，标题栏包含系列副标题，CSS 含紧凑膜区和小型标签规则。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL on corrected copy and compact layout selectors.

- [ ] **Step 3: Write minimal implementation**

修正文案，更新标题层级，缩小膜区比例与标签字号，确保底部极性条不被覆盖。

- [ ] **Step 4: Run all verification**

Run: `npm test && npm run lint && npm run build`

Expected: tests pass, ESLint exits 0, Next.js static export succeeds.

- [ ] **Step 5: Commit**

Commit message: `style: align membrane lab with revision notes`

### Task 4: 发布与线上核验

**Files:**
- Modify: none.

**Interfaces:**
- Consumes: verified `main` branch.
- Produces: updated `https://meiosis7.github.io/membrane-potential-curve/`.

- [ ] **Step 1: Push the dedicated repository**

Run: `git push origin main`

Expected: remote `main` advances to the verified commit.

- [ ] **Step 2: Wait for GitHub Pages workflow**

Run: `gh run watch --exit-status`

Expected: Pages workflow concludes `success`.

- [ ] **Step 3: Verify public output**

Run: fetch the public HTML and referenced CSS/JS assets.

Expected: HTTP 200, title is “膜电位动态实验台”, and all sampled assets return HTTP 200.

