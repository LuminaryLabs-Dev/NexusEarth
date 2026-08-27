import test from "node:test";
import assert from "node:assert/strict";
import { EARTH_LAYERS, getBaseLayers, getOverlayLayers, validateLayerRegistry } from "../lib/earth/layer-registry.js";
import { createInitialLayerState, updateBaseLayer, updateOverlay } from "../lib/earth/layer-state.js";

test("layer registry is complete and has four mutually exclusive bases", () => {
  assert.equal(validateLayerRegistry(EARTH_LAYERS), true);
  assert.deepEqual(getBaseLayers().map(({ id }) => id), ["atlas", "current", "terrain", "night"]);
  assert.equal(getOverlayLayers().length, 6);
});

test("layer state keeps exactly one base and independent overlay opacity", () => {
  const initial = createInitialLayerState();
  const terrain = updateBaseLayer(initial, "terrain");
  const fires = updateOverlay(terrain, "fires", { visible: true, opacity: 0.35 });
  assert.equal(fires.baseId, "terrain");
  assert.deepEqual(fires.overlays.fires, { visible: true, opacity: 0.35 });
  assert.equal(fires.overlays.borders.visible, true);
});
