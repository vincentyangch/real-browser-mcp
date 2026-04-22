import test from "node:test";
import assert from "node:assert/strict";

import {
  computeScrollDelta,
  normalizeScrollPages,
} from "../src/connectors/chrome-extension/page-scroll.js";

test("normalizeScrollPages defaults to one page for missing or invalid values", () => {
  assert.equal(normalizeScrollPages(undefined), 1);
  assert.equal(normalizeScrollPages(0), 1);
  assert.equal(normalizeScrollPages(-2), 1);
});

test("normalizeScrollPages preserves positive fractional page counts", () => {
  assert.equal(normalizeScrollPages(1.5), 1.5);
});

test("computeScrollDelta returns a positive delta for down scrolls", () => {
  assert.equal(computeScrollDelta("down", 2, 900), 1800);
});

test("computeScrollDelta returns a negative delta for up scrolls", () => {
  assert.equal(computeScrollDelta("up", 0.5, 1000), -500);
});
