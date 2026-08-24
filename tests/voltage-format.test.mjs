import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMembranePotential,
  getDisplayedPolarity,
} from "../models/03-membrane-potential-curve/voltage-format.ts";

test("near-zero negative voltage is displayed as zero", () => {
  assert.equal(formatMembranePotential(-0.0846), "0 mV");
});

test("positive and negative voltages retain their signs", () => {
  assert.equal(formatMembranePotential(22.4), "+22 mV");
  assert.equal(formatMembranePotential(-69.6), "-70 mV");
});

test("the displayed polarity is neutral whenever the displayed voltage is zero", () => {
  assert.equal(getDisplayedPolarity(-0.0846), "neutral");
  assert.equal(getDisplayedPolarity(0), "neutral");
  assert.equal(getDisplayedPolarity(0.49), "neutral");
  assert.equal(getDisplayedPolarity(-0.5), "neutral");
  assert.equal(getDisplayedPolarity(-0.51), "negative");
  assert.equal(getDisplayedPolarity(0.5), "positive");
});
