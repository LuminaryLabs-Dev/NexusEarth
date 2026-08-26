import assert from "node:assert/strict";
import test from "node:test";
import {
  ANTARCTIC_EXTENT_METERS,
  antarcticPixelForLonLat,
  lonLatToAntarcticMeters
} from "../lib/earth-imagery/antarctic-projection.js";

test("the South Pole maps to the polar image center", () => {
  const point = lonLatToAntarcticMeters(0, -90);
  assert.ok(point);
  assert.ok(Math.abs(point.x) < 0.001);
  assert.ok(Math.abs(point.y) < 0.001);
  const pixel = antarcticPixelForLonLat(0, -90, 1024, 1024);
  assert.ok(Math.abs(pixel.x - 511.5) < 0.01);
  assert.ok(Math.abs(pixel.y - 511.5) < 0.01);
});

test("east and west longitudes remain radially symmetrical", () => {
  const east = lonLatToAntarcticMeters(90, -60);
  const west = lonLatToAntarcticMeters(-90, -60);
  assert.ok(east && west);
  assert.ok(Math.abs(east.x + west.x) < 0.01);
  assert.ok(Math.abs(east.y - west.y) < 0.01);
});

test("coordinates outside the GIBS Antarctic coverage are rejected", () => {
  assert.equal(lonLatToAntarcticMeters(0, -30), null);
  assert.equal(antarcticPixelForLonLat(0, -30, 1024, 1024), null);
  const boundary = lonLatToAntarcticMeters(0, -60);
  assert.ok(boundary);
  assert.ok(Math.abs(boundary.x) <= ANTARCTIC_EXTENT_METERS);
  assert.ok(Math.abs(boundary.y) <= ANTARCTIC_EXTENT_METERS);
});
