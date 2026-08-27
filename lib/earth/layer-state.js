import { getBaseLayers, getOverlayLayers } from "./layer-registry.js";

export function createInitialLayerState() {
  return {
    baseId: "atlas",
    overlays: Object.fromEntries(getOverlayLayers().map((layer) => [layer.id, {
      visible: layer.id === "borders",
      opacity: layer.opacity
    }]))
  };
}

export function updateBaseLayer(state, baseId) {
  if (!getBaseLayers().some((layer) => layer.id === baseId)) return state;
  return { ...state, baseId };
}

export function updateOverlay(state, id, patch) {
  if (!getOverlayLayers().some((layer) => layer.id === id)) return state;
  return {
    ...state,
    overlays: { ...state.overlays, [id]: { ...state.overlays[id], ...patch } }
  };
}
