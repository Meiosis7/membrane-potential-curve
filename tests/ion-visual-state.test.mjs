import assert from "node:assert/strict";
import test from "node:test";

import { getIonVisualState } from "../models/03-membrane-potential-curve/ion-visual-state.ts";

const restingSnapshot = {
  stage: "resting",
  ionFlow: "none",
  insidePolarity: "negative",
  mv: -70,
  sodiumOpen: false,
  potassiumOpen: false,
};

test("resting distribution shows sodium mainly outside and potassium mainly inside", () => {
  const state = getIonVisualState(0.4, "threshold", restingSnapshot);

  assert.ok(state.sodium.outside > state.sodium.inside);
  assert.ok(state.potassium.inside > state.potassium.outside);
  assert.equal(state.sodiumCrossing, false);
  assert.equal(state.potassiumCrossing, false);
});

test("depolarization moves sodium particles from outside to inside", () => {
  const state = getIonVisualState(2.8, "threshold", {
    ...restingSnapshot,
    stage: "depolarization",
    ionFlow: "sodium-in",
    insidePolarity: "positive",
    mv: 13,
    sodiumOpen: true,
  });

  assert.ok(state.sodium.inside > 2);
  assert.ok(state.sodium.outside < 7);
  assert.equal(state.sodium.inside + state.sodium.outside, 9);
  assert.equal(state.sodiumCrossing, true);
});

test("potassium-out stages move potassium particles from inside to outside", () => {
  const state = getIonVisualState(5.2, "threshold", {
    ...restingSnapshot,
    stage: "hyperpolarization",
    ionFlow: "potassium-out",
    mv: -78,
    potassiumOpen: true,
  });

  assert.ok(state.potassium.outside > 2);
  assert.ok(state.potassium.inside < 6);
  assert.equal(state.potassium.inside + state.potassium.outside, 8);
  assert.equal(state.potassiumCrossing, true);
});

test("stimulus pulse appears only near the onset of voltage change", () => {
  assert.equal(getIonVisualState(1.2, "threshold", restingSnapshot).stimulusActive, true);
  assert.equal(getIonVisualState(2.4, "threshold", restingSnapshot).stimulusActive, false);
  assert.equal(getIonVisualState(1.2, "strong", restingSnapshot).stimulusLevel, "strong");
});
