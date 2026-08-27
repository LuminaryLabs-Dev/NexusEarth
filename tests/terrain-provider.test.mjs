import test from "node:test";
import assert from "node:assert/strict";
import { createMapterhornTerrainProvider, decodeTerrariumGrid, decodeTerrariumHeight, PolarSafeWebMercatorTilingScheme } from "../lib/earth/create-terrain-provider.js";

test("decodes Terrarium RGB elevation exactly", () => {
  assert.equal(decodeTerrariumHeight(128, 0, 0), 0);
  assert.equal(decodeTerrariumHeight(128, 3, 128), 3.5);
  assert.equal(decodeTerrariumHeight(127, 252, 0), -4);
});

test("samples terrain grids without interpolating encoded pixels", () => {
  const pixels = new Uint8ClampedArray(2 * 2 * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = 128;
    pixels[offset + 1] = offset / 4;
    pixels[offset + 2] = 0;
    pixels[offset + 3] = 255;
  }
  assert.deepEqual([...decodeTerrariumGrid(pixels, 2, 2)], [0, 1, 2, 3]);
});

test("stretches Web Mercator edge tiles to both poles", () => {
  const scheme = new PolarSafeWebMercatorTilingScheme();
  assert.equal(scheme.tileXYToRectangle(0, 0, 0).north, Math.PI / 2);
  assert.equal(scheme.tileXYToRectangle(0, 0, 0).south, -Math.PI / 2);
});

test("terrain provider stops at the published maximum zoom", () => {
  const provider = createMapterhornTerrainProvider();
  assert.equal(provider.getTileDataAvailable(0, 0, 12), true);
  assert.equal(provider.getTileDataAvailable(0, 0, 13), false);
});
