import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePlayback,
  getStagePlaybackEnd,
  SECONDS_PER_TIME_UNIT,
} from "../models/03-membrane-potential-curve/playback.ts";
import * as playback from "../models/03-membrane-potential-curve/playback.ts";
import { ACTION_POTENTIAL_STEPS } from "../models/03-membrane-potential-curve/stage-content.ts";

test("1x playback uses a readable teaching pace", () => {
  assert.equal(SECONDS_PER_TIME_UNIT, 2.4);
  assert.equal(advancePlayback(0, 1_000, 1, 6), 1 / 2.4);
  assert.equal(advancePlayback(0, 14_400, 1, 6), 6);
});

test("playback stops exactly at the selected stage boundary", () => {
  assert.equal(advancePlayback(2.9, 1_000, 1, 3), 3);
  assert.equal(advancePlayback(3, 1_000, 2, 3), 3);
});

test("stage endpoint stays inside the selected stage while displaying the boundary", () => {
  assert.ok(getStagePlaybackEnd(3) < 3);
  assert.equal(getStagePlaybackEnd(3).toFixed(1), "3.0");
  assert.ok(getStagePlaybackEnd(6) < 6);
  assert.equal(getStagePlaybackEnd(6).toFixed(1), "6.0");
});

test("stage ranges are continuous and cover the full action potential", () => {
  assert.deepEqual(
    ACTION_POTENTIAL_STEPS.map(({ stage, startTime, endTime }) => [stage, startTime, endTime]),
    [
      ["resting", 0, 1],
      ["threshold", 1, 2],
      ["depolarization", 2, 2.65],
      ["peak", 2.65, 3],
      ["repolarization", 3, 4.8],
      ["hyperpolarization", 4.8, 5.3],
      ["recovery", 5.3, 6],
    ],
  );
});

test("full playback control distinguishes initial play, resume, and pause labels", () => {
  const labeler = playback.getFullPlaybackAriaLabel;
  assert.equal(typeof labeler, "function");
  assert.equal(labeler(false, false), "播放全流程");
  assert.equal(labeler(false, true), "继续全流程");
  assert.equal(labeler(true, true), "暂停全流程");
});
