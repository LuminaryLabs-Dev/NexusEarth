import test from "node:test";
import assert from "node:assert/strict";
import { GibsGeographicTilingScheme } from "../lib/earth/gibs-tiling-scheme.js";

test("matches NASA GIBS non-power-of-two geographic tile matrices", () => {
  const scheme = new GibsGeographicTilingScheme();
  assert.deepEqual([0, 1, 2, 3, 8].map((level) => [
    scheme.getNumberOfXTilesAtLevel(level),
    scheme.getNumberOfYTilesAtLevel(level)
  ]), [[2, 1], [3, 2], [5, 3], [10, 5], [320, 160]]);
  const levelOneLastTile = scheme.tileXYToRectangle(2, 1, 1);
  assert.equal(levelOneLastTile.east, Math.PI);
  assert.equal(levelOneLastTile.south, -Math.PI / 2);
});
