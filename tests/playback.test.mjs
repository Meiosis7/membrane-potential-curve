import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePlayback,
  SECONDS_PER_TIME_UNIT,
} from "../models/03-membrane-potential-curve/playback.ts";
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

test("stage ranges are continuous and cover the full action potential", () => {
  assert.deepEqual(
    ACTION_POTENTIAL_STEPS.map(({ stage, startTime, endTime }) => [stage, startTime, endTime]),
    [
      ["resting", 0, 1],
      ["threshold", 1, 2],
      ["depolarization", 2, 3],
      ["peak", 3, 4],
      ["repolarization", 4, 4.8],
      ["hyperpolarization", 4.8, 5.3],
      ["recovery", 5.3, 6],
    ],
  );
});
