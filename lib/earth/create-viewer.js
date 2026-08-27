import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Credit,
  DistanceDisplayCondition,
  EllipsoidTerrainProvider,
  GeoJsonDataSource,
  HeightReference,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  NearFarScalar,
  Rectangle,
  sampleTerrain,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SingleTileImageryProvider,
  Viewer,
  WebMapServiceImageryProvider,
  WebMapTileServiceImageryProvider
} from "cesium";
import { getLayer } from "./layer-registry.js";
import { GibsGeographicTilingScheme } from "./gibs-tiling-scheme.js";
import { createMapterhornTerrainProvider } from "./create-terrain-provider.js";
import { buildGibsTileUrl, isLatestOperation, probeImage, resolveLiveSource } from "./source-health.js";

const matrixLabels = Array.from({ length: 13 }, (_, index) => String(index));

function absoluteAssetUrl(relativePath) {
  return new URL(relativePath, document.baseURI).href;
}

function wmtsProvider(layer, date) {
  return new WebMapTileServiceImageryProvider({
    url: buildGibsTileUrl(layer, date, "{TileMatrix}", "{TileRow}", "{TileCol}"),
    layer: layer.layer,
    style: "default",
    format: `image/${layer.format === "jpg" ? "jpeg" : layer.format}`,
    tileMatrixSetID: layer.tileMatrixSet,
    tileMatrixLabels: matrixLabels,
    tilingScheme: new GibsGeographicTilingScheme(),
    tileWidth: 512,
    tileHeight: 512,
    rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
    minimumLevel: layer.minimumZoom,
    maximumLevel: layer.maximumZoom,
    credit: new Credit(layer.attribution)
  });
}

function wmsProvider(layer, date) {
  return new WebMapServiceImageryProvider({
    url: layer.url,
    layers: layer.layer,
    parameters: {
      transparent: true,
      format: "image/png",
      time: date,
      version: "1.1.1"
    },
    credit: new Credit(layer.attribution),
    minimumLevel: layer.minimumZoom,
    maximumLevel: layer.maximumZoom,
    enablePickFeatures: false
  });
}

function imageryProvider(layer, date) {
  return layer.provider === "gibs-wms" ? wmsProvider(layer, date) : wmtsProvider(layer, date);
}

async function createAtlasLayer() {
  const atlas = getLayer("atlas");
  const provider = await SingleTileImageryProvider.fromUrl(absoluteAssetUrl(atlas.url), {
    rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
    credit: new Credit(atlas.attribution)
  });
  return new ImageryLayer(provider);
}

async function probeTerrain() {
  return probeImage("https://tiles.mapterhorn.com/0/0/0.webp", 6000);
}

export async function createNexusViewer(container, { date, onInspect, onStatus }) {
  window.CESIUM_BASE_URL = absoluteAssetUrl("cesium/");
  const viewer = new Viewer(container, {
    animation: false,
    baseLayer: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    requestRenderMode: false
  });

  viewer.scene.backgroundColor = Color.fromCssColorString("#02060b");
  viewer.scene.globe.baseColor = Color.fromCssColorString("#0a1a2a");
  viewer.scene.globe.enableLighting = true;
  viewer.scene.highDynamicRange = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 350000;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 44000000;

  const atlasLayer = await createAtlasLayer();
  viewer.imageryLayers.add(atlasLayer);
  const runtime = {
    date,
    baseId: "atlas",
    liveBaseLayer: null,
    overlays: new Map(),
    dataSources: new Map(),
    marker: null,
    terrainAvailable: false,
    latestOperation: 0,
    overlayEpoch: 0,
    overlayOperations: new Map()
  };

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(-22, 14, 21500000),
    orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 }
  });

  if (await probeTerrain()) {
    try {
      viewer.terrainProvider = createMapterhornTerrainProvider();
      runtime.terrainAvailable = true;
      onStatus("Atlas · global 30 m terrain ready");
    } catch {
      viewer.terrainProvider = new EllipsoidTerrainProvider();
      onStatus("Atlas · terrain fallback");
    }
  } else {
    viewer.terrainProvider = new EllipsoidTerrainProvider();
    onStatus("Atlas · terrain fallback");
  }

  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(async ({ position }) => {
    const ray = viewer.camera.getPickRay(position);
    const cartesian = ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
    const fallback = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
    const picked = cartesian ?? fallback;
    if (!picked) return;
    const location = Cartographic.fromCartesian(picked);
    let height = viewer.scene.globe.getHeight(location);
    if (!Number.isFinite(height)) height = location.height;
    onInspect({
      lat: CesiumMath.toDegrees(location.latitude),
      lon: CesiumMath.toDegrees(location.longitude),
      height
    });
  }, ScreenSpaceEventType.LEFT_CLICK);

  async function setBaseLayer(id) {
    const operation = ++runtime.latestOperation;
    const requested = getLayer(id) ?? getLayer("atlas");
    runtime.baseId = requested.id;
    if (runtime.liveBaseLayer) {
      viewer.imageryLayers.remove(runtime.liveBaseLayer, true);
      runtime.liveBaseLayer = null;
    }
    viewer.scene.verticalExaggeration = requested.id === "terrain" ? 1.8 : 1;
    atlasLayer.show = true;
    if (requested.provider !== "gibs-wmts") {
      onStatus(requested.id === "terrain"
        ? `Terrain relief · ${runtime.terrainAvailable ? "30 m streamed elevation" : "ellipsoid fallback"}`
        : "Atlas · complete local Earth");
      return { layer: requested, date: null };
    }
    onStatus(`Checking ${requested.title}…`);
    const resolved = await resolveLiveSource(requested, runtime.date, probeImage);
    if (!isLatestOperation(operation, runtime.latestOperation)) return null;
    if (!resolved || resolved.layer.id === "atlas") {
      onStatus(`${requested.title} unavailable · Atlas fallback`);
      return { layer: getLayer("atlas"), date: null };
    }
    const imagery = new ImageryLayer(imageryProvider(resolved.layer, resolved.date), { alpha: requested.opacity });
    runtime.liveBaseLayer = viewer.imageryLayers.add(imagery);
    onStatus(`${requested.title} · ${resolved.layer.attribution} · ${resolved.date ?? "static"}`);
    return resolved;
  }

  async function setOverlay(id, { visible, opacity }) {
    const epoch = runtime.overlayEpoch;
    const operation = (runtime.overlayOperations.get(id) ?? 0) + 1;
    runtime.overlayOperations.set(id, operation);
    const isCurrent = () => epoch === runtime.overlayEpoch && operation === runtime.overlayOperations.get(id);
    const definition = getLayer(id);
    if (!definition) return null;
    if (definition.available === false) {
      onStatus(`${definition.title} unavailable · no versioned analysis published`);
      return null;
    }
    const existing = runtime.overlays.get(id);
    if (existing) {
      existing.show = visible;
      existing.alpha = opacity;
      return { layer: definition, date: runtime.date };
    }
    const existingSource = runtime.dataSources.get(id);
    if (existingSource) {
      existingSource.show = visible;
      for (const entity of existingSource.entities.values) {
        if (entity.polyline) entity.polyline.material = Color.fromCssColorString("#a8d8ff").withAlpha(opacity);
        if (entity.label) entity.label.fillColor = Color.fromCssColorString("#d6efff").withAlpha(opacity);
      }
      return { layer: definition, date: null };
    }
    if (!visible) return null;
    if (definition.provider === "geojson") {
      try {
        const source = await GeoJsonDataSource.load(absoluteAssetUrl(definition.url), {
          clampToGround: true,
          fill: Color.TRANSPARENT,
          stroke: Color.fromCssColorString("#a8d8ff").withAlpha(opacity),
          strokeWidth: 1.2
        });
        for (const entity of [...source.entities.values]) {
          const longitude = Number(entity.properties?.LABEL_X?.getValue());
          const latitude = Number(entity.properties?.LABEL_Y?.getValue());
          const rank = Number(entity.properties?.LABELRANK?.getValue());
          const name = entity.properties?.ADMIN?.getValue();
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || rank > 3 || !name) continue;
          source.entities.add({
            position: Cartesian3.fromDegrees(longitude, latitude),
            label: {
              text: name,
              font: "11px sans-serif",
              fillColor: Color.fromCssColorString("#d6efff").withAlpha(opacity),
              outlineColor: Color.BLACK.withAlpha(0.8),
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              distanceDisplayCondition: new DistanceDisplayCondition(1200000, 14500000),
              scaleByDistance: new NearFarScalar(2000000, 1, 14500000, 0.55),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          });
        }
        viewer.dataSources.add(source);
        if (!isCurrent()) {
          viewer.dataSources.remove(source, true);
          return null;
        }
        runtime.dataSources.set(id, source);
        return { layer: definition, date: null };
      } catch {
        onStatus("Borders unavailable · globe remains active");
        return null;
      }
    }
    const resolved = await resolveLiveSource(definition, runtime.date, probeImage);
    if (!isCurrent()) return null;
    if (!resolved || !resolved.layer.provider.startsWith("gibs-")) {
      onStatus(`${definition.title} unavailable · overlay hidden`);
      return null;
    }
    const imagery = new ImageryLayer(imageryProvider(resolved.layer, resolved.date), { alpha: opacity });
    runtime.overlays.set(id, viewer.imageryLayers.add(imagery));
    onStatus(`${definition.title} · ${resolved.date ?? "static"}`);
    return resolved;
  }

  function flyTo(place) {
    if (runtime.marker) viewer.entities.remove(runtime.marker);
    runtime.marker = viewer.entities.add({
      position: Cartesian3.fromDegrees(place.lon, place.lat),
      point: {
        pixelSize: 10,
        color: Color.fromCssColorString("#76d7ff"),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        scaleByDistance: new NearFarScalar(1000000, 1.4, 18000000, 0.6)
      },
      label: {
        text: place.name,
        font: "14px sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        pixelOffset: new Cartesian2(0, -22),
        scaleByDistance: new NearFarScalar(1000000, 1, 18000000, 0.45)
      }
    });
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(place.lon, place.lat, place.type === "country" ? 5200000 : 1200000),
      duration: 1.6
    });
  }

  return {
    viewer,
    get activeBaseId() { return runtime.baseId; },
    get terrainAvailable() { return runtime.terrainAvailable; },
    setBaseLayer,
    setOverlay,
    setDate(value) {
      runtime.date = value;
      runtime.latestOperation += 1;
      runtime.overlayEpoch += 1;
      runtime.overlayOperations.clear();
      for (const imagery of runtime.overlays.values()) viewer.imageryLayers.remove(imagery, true);
      runtime.overlays.clear();
    },
    flyTo,
    async getHeight(point) {
      const cartographic = Cartographic.fromDegrees(point.lon, point.lat);
      try {
        const [sample] = await sampleTerrain(viewer.terrainProvider, runtime.terrainAvailable ? 10 : 0, [cartographic]);
        return sample.height ?? 0;
      } catch {
        return viewer.scene.globe.getHeight(cartographic) ?? 0;
      }
    },
    destroy() {
      runtime.latestOperation += 1;
      handler.destroy();
      if (!viewer.isDestroyed()) viewer.destroy();
    }
  };
}
