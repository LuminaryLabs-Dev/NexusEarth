import test from "node:test";
import assert from "node:assert/strict";
import { describeLocation, findAdminFeature, nearestPlace, pointInGeometry } from "../lib/earth/inspect-location.js";

const square = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };

test("finds points inside administrative polygons", () => {
  assert.equal(pointInGeometry({ lat: 5, lon: 5 }, square), true);
  assert.equal(pointInGeometry({ lat: -1, lon: 5 }, square), false);
  const feature = { properties: { ADMIN: "Example" }, geometry: square };
  assert.equal(findAdminFeature([feature], { lat: 5, lon: 5 }), feature);
});

test("nearest place and inspector preserve source truth", () => {
  const places = [{ id: "city", type: "city", name: "Nearby", lat: 1, lon: 1, country: "Example", region: "Region" }];
  assert.equal(nearestPlace(places, { lat: 1.1, lon: 1.1 }).name, "Nearby");
  const result = describeLocation({
    point: { lat: 1.1, lon: 1.1 },
    height: 120,
    places,
    boundaries: { features: [{ properties: { ADMIN: "Example" }, geometry: square }] },
    layer: { attribution: "NASA GIBS", dateSupport: true, legend: "Browse imagery" },
    date: "2026-08-26"
  });
  assert.equal(result.country, "Example");
  assert.equal(result.source, "NASA GIBS");
  assert.equal(result.observationDate, "2026-08-26");
});
