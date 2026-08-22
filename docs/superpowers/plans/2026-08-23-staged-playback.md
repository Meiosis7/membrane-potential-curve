# 膜电位分阶段动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 放慢全流程教学节奏，并让七个阶段按钮分别自动播放对应区间后暂停。

**Architecture:** 用纯函数统一换算真实经过时间与模型时间，播放器通过可变的停止边界兼容全流程和阶段区间。阶段数据同时保存起止时间，导航按钮只发出播放区间，不再操作单个静态时间点。

**Tech Stack:** Next.js、React、TypeScript、Node.js test runner、CSS

## Global Constraints

- 1× 全流程时长约 14.4 秒，0.5× 和 2× 保持相对倍率。
- 阶段播放必须同步驱动曲线、通道和离子动画，并在区间终点自动暂停。
- 手动拖动、切换刺激强度和重置必须停止阶段播放。
- 手机单屏布局不得因阶段按钮改动产生横向溢出。

---

### Task 1: 播放时间换算与阶段区间

**Files:**
- Create: `models/03-membrane-potential-curve/playback.ts`
- Modify: `models/03-membrane-potential-curve/stage-content.ts`
- Create: `tests/playback.test.mjs`

**Interfaces:**
- Consumes: current model time, elapsed milliseconds, speed, and stop boundary.
- Produces: `advancePlayback(current, elapsedMs, speed, stopAt)` and stage `startTime`/`endTime` values.

- [ ] **Step 1: Write the failing test**

断言 1× 每秒只推进 `1 / 2.4` 个模型时间单位，14.4 秒到达 6；断言推进值不会越过阶段终点；断言七个阶段区间首尾连续且覆盖 0–6。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `playback.ts` and stage ranges do not exist.

- [ ] **Step 3: Write minimal implementation**

新增 `SECONDS_PER_TIME_UNIT = 2.4` 和带终点钳制的 `advancePlayback`；将阶段数据改为 `startTime`、`endTime`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: playback and stage range tests pass.

- [ ] **Step 5: Commit**

Commit message: `test: define staged playback timing`

### Task 2: 阶段按钮自动播放

**Files:**
- Modify: `models/03-membrane-potential-curve/MembraneCurveLab.tsx`
- Modify: `models/03-membrane-potential-curve/StageExplanation.tsx`
- Modify: `models/03-membrane-potential-curve/membrane-curve.css`
- Modify: `tests/pdf-revision-contract.test.mjs`

**Interfaces:**
- Consumes: `advancePlayback` and `ActionPotentialStep.startTime/endTime`.
- Produces: `onPlayRange(startTime, endTime)` stage navigation behavior and visible play affordance.

- [ ] **Step 1: Write the failing contract test**

断言实验台使用阶段停止边界，阶段导航接受 `onPlayRange`，按钮辅助标签以“播放步骤”开头。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because stage buttons still use `onSelectTime` and static timestamps.

- [ ] **Step 3: Write minimal implementation**

在播放器中保存当前停止边界；阶段点击时设置起点、终点并自动播放；全流程播放恢复终点 6；拖动、切换刺激和重置清除阶段边界。阶段按钮显示小型播放符号。

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint exits 0, and static export succeeds.

- [ ] **Step 5: Verify interaction and mobile layout**

在 390×844 视口点击去极化和复极化按钮，确认时间持续推进并在各自终点暂停；确认页面无横向溢出。

- [ ] **Step 6: Commit**

Commit message: `fix: slow playback and animate stage previews`
