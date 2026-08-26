import assert from "node:assert/strict";
import test from "node:test";
import {
  composeEarthTexture,
  featherPolarNoData,
  featherLongitudeEdges,
  isMissingPixel,
  polarBlendWeight
} from "../lib/earth-imagery/compose-earth-texture.js";
import { isLatestTextureResponse } from "../lib/earth-imagery/gibs.js";

function solid(width, height, color) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) data.set(color, offset);
  return data;
}

test("missing and transparent pixels are detected", () => {
  assert.equal(isMissingPixel(Uint8ClampedArray.from([0, 0, 0, 255]), 0), true);
  assert.equal(isMissingPixel(Uint8ClampedArray.from([10, 20, 30, 0]), 0), true);
  assert.equal(isMissingPixel(Uint8ClampedArray.from([10, 20, 30, 255]), 0), false);
});

test("polar blending starts at -55 and is complete by -62", () => {
  assert.equal(polarBlendWeight(-54), 0);
  assert.equal(polarBlendWeight(-55), 0);
  assert.ok(polarBlendWeight(-58.5) > 0 && polarBlendWeight(-58.5) < 1);
  assert.equal(polarBlendWeight(-62), 1);
  assert.equal(polarBlendWeight(-80), 1);
});

test("the polar no-data boundary receives a soft alpha transition", () => {
  const polar = solid(5, 1, [220, 230, 240, 255]);
  polar.set([0, 0, 0, 255], 8);
  polar.set([0, 0, 0, 255], 12);
  polar.set([0, 0, 0, 255], 16);
  const feathered = featherPolarNoData(polar, 5, 1, 1);
  assert.ok(feathered[8 + 3] > 0 && feathered[8 + 3] < 255);
  assert.ok(feathered[8] > 0);
  assert.equal(feathered[0 + 3], 255);
});

test("global imagery, base fallback, and Antarctic replacement compose correctly", () => {
  const width = 8;
  const height = 4;
  const base = solid(width, height, [20, 40, 60, 255]);
  const global = solid(width, height, [80, 100, 120, 255]);
  const polar = solid(2, 2, [220, 230, 240, 255]);
  global.set([0, 0, 0, 255], 0);
  const result = composeEarthTexture({
    base,
    global,
    polar,
    width,
    height,
    polarWidth: 2,
    polarHeight: 2,
    edgeFeatherWidth: 0,
    projectPolarPixel: () => ({ x: 0.5, y: 0.5 })
  });
  assert.deepEqual(Array.from(result.data.slice(0, 4)), [20, 40, 60, 255]);
  assert.deepEqual(Array.from(result.data.slice(4, 8)), [80, 100, 120, 255]);
  const southOffset = ((height - 1) * width + 3) * 4;
  assert.deepEqual(Array.from(result.data.slice(southOffset, southOffset + 4)), [220, 230, 240, 255]);
  assert.equal(result.sourceMode, "complete");
  assert.ok(result.metrics.polarApplied > 0);
});

test("missing polar imagery retains the complete base and global composite", () => {
  const base = solid(4, 2, [20, 40, 60, 255]);
  const global = solid(4, 2, [80, 100, 120, 255]);
  const result = composeEarthTexture({ base, global, width: 4, height: 2, edgeFeatherWidth: 0 });
  assert.equal(result.sourceMode, "global-polar-fallback");
  assert.deepEqual(Array.from(result.data.slice(0, 4)), [80, 100, 120, 255]);
});

test("longitude feathering makes the outermost columns match", () => {
  const data = solid(4, 1, [50, 50, 50, 255]);
  data.set([0, 10, 20, 255], 0);
  data.set([200, 210, 220, 255], 12);
  featherLongitudeEdges(data, 4, 1, 1);
  assert.deepEqual(Array.from(data.slice(0, 4)), Array.from(data.slice(12, 16)));
});

test("only the latest texture response can replace the material", () => {
  assert.equal(isLatestTextureResponse(7, 7), true);
  assert.equal(isLatestTextureResponse(6, 7), false);
});
