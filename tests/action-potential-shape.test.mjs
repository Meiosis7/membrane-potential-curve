import assert from "node:assert/strict";
import test from "node:test";

import { getCurveSnapshot } from "../models/03-membrane-potential-curve/simulation.ts";

test("upstroke separates depolarization below zero from reversal above zero", () => {
  const belowZero = getCurveSnapshot(2.649, "threshold");
  const atZero = getCurveSnapshot(2.65, "threshold");
  const aboveZero = getCurveSnapshot(2.9, "threshold");

  assert.equal(belowZero.stage, "depolarization");
  assert.ok(belowZero.mv < 0);
  assert.equal(belowZero.ionFlow, "sodium-in");
  assert.equal(atZero.stage, "peak");
  assert.ok(Math.abs(atZero.mv) < 0.01);
  assert.equal(aboveZero.stage, "peak");
  assert.ok(aboveZero.mv > 0 && aboveZero.mv < 30);
  assert.equal(aboveZero.ionFlow, "sodium-in");
  assert.equal(aboveZero.sodiumOpen, true);
});

test("action potential has one peak and immediately repolarizes", () => {
  const peak = getCurveSnapshot(3, "threshold");
  const falling = getCurveSnapshot(3.1, "threshold");
  const later = getCurveSnapshot(4, "threshold");

  assert.equal(peak.stage, "repolarization");
  assert.ok(Math.abs(peak.mv - 30) < 0.01);
  assert.equal(peak.ionFlow, "potassium-out");
  assert.equal(peak.potassiumOpen, true);
  assert.ok(falling.mv < peak.mv);
  assert.ok(later.mv < falling.mv);
});
