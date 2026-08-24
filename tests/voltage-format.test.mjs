import assert from "node:assert/strict";
import test from "node:test";

import { formatMembranePotential } from "../models/03-membrane-potential-curve/voltage-format.ts";

test("near-zero negative voltage is displayed as zero", () => {
  assert.equal(formatMembranePotential(-0.0846), "0 mV");
});

test("positive and negative voltages retain their signs", () => {
  assert.equal(formatMembranePotential(22.4), "+22 mV");
  assert.equal(formatMembranePotential(-69.6), "-70 mV");
});
