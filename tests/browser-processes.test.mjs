import assert from "node:assert/strict";
import test from "node:test";

import {
  nextStableEmptyCount,
  parseProfileProcessIds,
} from "./browser-processes.mjs";

test("Chrome cleanup matches only the exact temporary profile argument", () => {
  const profile = "/tmp/membrane-browser-regression-AbC123";
  const processList = [
    ` 101 /opt/google/chrome --user-data-dir=${profile} --headless=new`,
    ` 102 /opt/google/chrome --user-data-dir=${profile}-other --headless=new`,
    ` 103 /opt/google/chrome --user-data-dir=/tmp/unrelated --headless=new`,
    ` 104 /opt/google/chrome --headless=new --user-data-dir=${profile}`,
  ].join("\n");

  assert.deepEqual(parseProfileProcessIds(processList, profile), [101, 104]);
});

test("stable cleanup sampling resets whenever a matching process reappears", () => {
  assert.equal(nextStableEmptyCount(0, []), 1);
  assert.equal(nextStableEmptyCount(9, []), 10);
  assert.equal(nextStableEmptyCount(9, [321]), 0);
});
