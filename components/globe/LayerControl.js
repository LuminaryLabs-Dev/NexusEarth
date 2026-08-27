"use client";

import { getBaseLayers, getOverlayLayers } from "../../lib/earth/layer-registry.js";

export default function LayerControl({ state, onBaseChange, onOverlayChange }) {
  return (
    <aside className="layer-control" aria-label="Earth layers">
      <div className="panel-heading"><span>Layers</span><small>STREAMED + LOCAL</small></div>
      <fieldset>
        <legend>Base · select one</legend>
        {getBaseLayers().map((layer) => (
          <label className="layer-row" key={layer.id}>
            <input type="radio" name="base-layer" value={layer.id} checked={state.baseId === layer.id} onChange={() => onBaseChange(layer.id)} />
            <span><strong>{layer.title}</strong><small>{layer.attribution}</small></span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Overlays</legend>
        {getOverlayLayers().map((layer) => {
          const value = state.overlays[layer.id];
          return (
            <div className={`overlay-row ${layer.available === false ? "disabled" : ""}`} key={layer.id}>
              <label className="layer-row">
                <input type="checkbox" checked={value.visible} disabled={layer.available === false} onChange={(event) => onOverlayChange(layer.id, { visible: event.target.checked })} />
                <span><strong>{layer.title}</strong><small>{layer.available === false ? "No published analysis tiles" : layer.attribution}</small></span>
              </label>
              {value.visible && layer.available !== false && <input aria-label={`${layer.title} opacity`} type="range" min="0.1" max="1" step="0.05" value={value.opacity} onChange={(event) => onOverlayChange(layer.id, { opacity: Number(event.target.value) })} />}
            </div>
          );
        })}
      </fieldset>
    </aside>
  );
}
