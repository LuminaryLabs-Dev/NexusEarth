"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LayerControl from "./globe/LayerControl.js";
import LocationInspector from "./globe/LocationInspector.js";
import NexusGlobe from "./globe/NexusGlobe.js";
import SearchControl from "./globe/SearchControl.js";
import { describeLocation } from "../lib/earth/inspect-location.js";
import { getLayer } from "../lib/earth/layer-registry.js";
import { createInitialLayerState, updateBaseLayer, updateOverlay } from "../lib/earth/layer-state.js";

function utcDate(daysAgo = 1) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - daysAgo);
  return value.toISOString().slice(0, 10);
}

const assetUrl = (path) => new URL(path, document.baseURI).href;

export default function EarthExplorer() {
  const controllerRef = useRef(null);
  const dataRef = useRef({ places: [], boundaries: { features: [] } });
  const activeSourceRef = useRef(getLayer("atlas"));
  const [date, setDate] = useState(utcDate());
  const [status, setStatus] = useState("Loading terrain globe…");
  const [places, setPlaces] = useState([]);
  const [inspection, setInspection] = useState(null);
  const [layerState, setLayerState] = useState(createInitialLayerState);

  useEffect(() => {
    setInspection((current) => current ? {
      ...current,
      observationDate: activeSourceRef.current.dateSupport ? date : null
    } : current);
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(assetUrl("data/search/places.json")).then((response) => response.ok ? response.json() : []),
      fetch(assetUrl("data/boundaries/admin.geojson")).then((response) => response.ok ? response.json() : { features: [] })
    ]).then(([placeData, boundaries]) => {
      if (cancelled) return;
      dataRef.current = { places: placeData, boundaries };
      setPlaces(placeData);
    }).catch(() => setStatus("Atlas ready · local search index unavailable"));
    return () => { cancelled = true; };
  }, []);

  const inspectPoint = useCallback((point) => {
    setInspection(describeLocation({
      point,
      height: point.height,
      ...dataRef.current,
      layer: activeSourceRef.current,
      date
    }));
  }, [date]);

  const handleReady = useCallback(async (controller) => {
    controllerRef.current = controller;
    await controller.setOverlay("borders", layerState.overlays.borders);
  }, []);

  const changeBase = async (id) => {
    setLayerState((state) => updateBaseLayer(state, id));
    const result = await controllerRef.current?.setBaseLayer(id);
    activeSourceRef.current = result?.layer ?? getLayer("atlas");
    if (inspection) inspectPoint(inspection);
  };

  const changeOverlay = (id, patch) => {
    setLayerState((state) => {
      const next = updateOverlay(state, id, patch);
      controllerRef.current?.setOverlay(id, next.overlays[id]);
      return next;
    });
  };

  const changeDate = (value) => {
    setDate(value);
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setDate(value);
    if (layerState.baseId === "current") {
      controller.setBaseLayer("current").then((result) => {
        activeSourceRef.current = result?.layer ?? getLayer("atlas");
      });
    }
    Object.entries(layerState.overlays).forEach(([id, overlay]) => {
      if (overlay.visible && id !== "borders") controller.setOverlay(id, { ...overlay, visible: false }).then(() => controller.setOverlay(id, overlay));
    });
  };

  const selectPlace = async (place) => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.flyTo(place);
    const height = await controller.getHeight(place);
    inspectPoint({ lat: place.lat, lon: place.lon, height });
  };

  const activeLayers = [getLayer(layerState.baseId), ...Object.entries(layerState.overlays)
    .filter(([, value]) => value.visible)
    .map(([id]) => getLayer(id))].filter(Boolean);

  return (
    <section className="explorer">
      <header className="masthead">
        <div><p className="eyebrow">OPEN EARTH DATA EXPLORER</p><h1>Nexus Earth</h1></div>
        <div className="status" aria-live="polite"><span />{status}</div>
      </header>
      <div className="workspace">
        <div className="globe-panel">
          <NexusGlobe date={date} onInspect={inspectPoint} onReady={handleReady} onStatus={setStatus} />
          <SearchControl places={places} onSelect={selectPlace} />
          <LayerControl state={layerState} onBaseChange={changeBase} onOverlayChange={changeOverlay} />
          <div className="date-control">
            <label htmlFor="observation-date">Observation date</label>
            <input id="observation-date" type="date" value={date} max={utcDate()} onChange={(event) => changeDate(event.target.value)} />
          </div>
          <div className="globe-caption">Drag to orbit · Scroll to zoom · Click to inspect</div>
        </div>
        <LocationInspector inspection={inspection} />
      </div>
      <footer className="source-strip">
        <span>Active sources</span>
        {activeLayers.map((layer) => <small key={layer.id}>{layer.attribution}</small>)}
      </footer>
    </section>
  );
}
