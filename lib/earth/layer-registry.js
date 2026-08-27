const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best";

export const EARTH_LAYERS = [
  {
    id: "atlas",
    title: "Atlas",
    group: "base",
    provider: "single-tile",
    url: "textures/earth-base-2048.jpg",
    dateSupport: false,
    opacity: 1,
    attribution: "NASA Blue Marble",
    legend: null,
    inspectMethod: "visualization-only",
    fallbackChain: [],
    minimumZoom: 0,
    maximumZoom: 3
  },
  {
    id: "current",
    title: "Current satellite",
    group: "base",
    provider: "gibs-wmts",
    layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    url: GIBS_ROOT,
    format: "jpg",
    tileMatrixSet: "250m",
    dateSupport: true,
    opacity: 1,
    attribution: "NASA GIBS · VIIRS NOAA-20",
    legend: null,
    inspectMethod: "source-and-date",
    fallbackChain: ["current-noaa21", "current-snpp", "current-modis", "atlas"],
    minimumZoom: 0,
    maximumZoom: 8
  },
  {
    id: "terrain",
    title: "Terrain relief",
    group: "base",
    provider: "terrain-style",
    url: "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp",
    dateSupport: false,
    opacity: 1,
    attribution: "Mapterhorn · Copernicus DEM GLO-30",
    legend: "Elevation and bathymetric relief",
    inspectMethod: "terrain-height",
    fallbackChain: ["atlas"],
    minimumZoom: 0,
    maximumZoom: 12
  },
  {
    id: "night",
    title: "Night Earth",
    group: "base",
    provider: "gibs-wmts",
    layer: "VIIRS_CityLights_2012",
    url: GIBS_ROOT,
    format: "jpg",
    tileMatrixSet: "500m",
    dateSupport: false,
    opacity: 1,
    attribution: "NASA Earth Observatory · VIIRS city lights",
    legend: "Visible night-light intensity",
    inspectMethod: "visualization-only",
    fallbackChain: ["atlas"],
    minimumZoom: 0,
    maximumZoom: 7
  },
  {
    id: "borders",
    title: "Borders and labels",
    group: "overlay",
    provider: "geojson",
    url: "data/boundaries/admin.geojson",
    dateSupport: false,
    opacity: 0.72,
    attribution: "Natural Earth · public domain",
    legend: null,
    inspectMethod: "country-boundary",
    fallbackChain: [],
    minimumZoom: 0,
    maximumZoom: 20
  },
  {
    id: "clouds",
    title: "Cloud fraction",
    group: "overlay",
    provider: "gibs-wmts",
    layer: "MODIS_Terra_Cloud_Fraction_Day",
    url: GIBS_ROOT,
    format: "png",
    tileMatrixSet: "2km",
    dateSupport: true,
    opacity: 0.55,
    attribution: "NASA GIBS · MODIS Terra",
    legend: "Cloud fraction (browse visualization)",
    inspectMethod: "source-date-and-legend",
    fallbackChain: [],
    minimumZoom: 0,
    maximumZoom: 5
  },
  {
    id: "fires",
    title: "Active fires",
    group: "overlay",
    provider: "gibs-wms",
    layer: "VIIRS_NOAA20_Thermal_Anomalies_375m_All",
    url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
    format: "png",
    tileMatrixSet: "500m",
    dateSupport: true,
    opacity: 0.9,
    attribution: "NASA FIRMS/GIBS · VIIRS NOAA-20",
    legend: "Thermal anomalies; not a fire perimeter",
    inspectMethod: "source-date-and-legend",
    fallbackChain: ["fires-noaa21", "fires-snpp"],
    minimumZoom: 0,
    maximumZoom: 7
  },
  {
    id: "snow-ice",
    title: "Snow and sea ice",
    group: "overlay",
    provider: "gibs-wmts",
    layer: "VIIRS_NOAA20_NDSI_Snow_Cover",
    url: GIBS_ROOT,
    format: "png",
    tileMatrixSet: "500m",
    dateSupport: true,
    opacity: 0.68,
    attribution: "NASA GIBS · VIIRS NOAA-20",
    legend: "NDSI snow cover",
    inspectMethod: "source-date-and-legend",
    fallbackChain: ["snow-modis"],
    minimumZoom: 0,
    maximumZoom: 7
  },
  {
    id: "land-cover",
    title: "Land cover",
    group: "overlay",
    provider: "gibs-wmts",
    layer: "MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual",
    url: GIBS_ROOT,
    format: "png",
    tileMatrixSet: "500m",
    dateSupport: false,
    opacity: 0.64,
    attribution: "NASA GIBS · MODIS IGBP",
    legend: "IGBP land-cover classes",
    inspectMethod: "source-and-legend",
    fallbackChain: [],
    minimumZoom: 0,
    maximumZoom: 7
  },
  {
    id: "ai-observations",
    title: "AI observations",
    group: "overlay",
    provider: "offline-tiles",
    url: null,
    dateSupport: true,
    opacity: 0.7,
    attribution: "No analysis tiles published",
    legend: "Experimental; model, confidence, and dates required",
    inspectMethod: "model-metadata",
    fallbackChain: [],
    minimumZoom: 0,
    maximumZoom: 14,
    available: false
  }
];

export const INTERNAL_FALLBACKS = [
  ["current-noaa21", "VIIRS_NOAA21_CorrectedReflectance_TrueColor", "250m", "jpg"],
  ["current-snpp", "VIIRS_SNPP_CorrectedReflectance_TrueColor", "250m", "jpg"],
  ["current-modis", "MODIS_Terra_CorrectedReflectance_TrueColor", "250m", "jpg"],
  ["fires-noaa21", "VIIRS_NOAA21_Thermal_Anomalies_375m_All", "500m", "png"],
  ["fires-snpp", "VIIRS_SNPP_Thermal_Anomalies_375m_All", "500m", "png"],
  ["snow-modis", "MODIS_Terra_L3_NDSI_Snow_Cover_Daily", "500m", "png"]
].map(([id, layer, tileMatrixSet, format]) => ({
  id,
  title: id,
  group: "internal",
  provider: id.startsWith("fires-") ? "gibs-wms" : "gibs-wmts",
  layer,
  url: id.startsWith("fires-") ? "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi" : GIBS_ROOT,
  format,
  tileMatrixSet,
  dateSupport: true,
  attribution: "NASA GIBS",
  minimumZoom: 0,
  maximumZoom: tileMatrixSet === "250m" ? 8 : 7,
  fallbackChain: []
}));

export const ALL_LAYER_DEFINITIONS = [...EARTH_LAYERS, ...INTERNAL_FALLBACKS];
export const getLayer = (id) => ALL_LAYER_DEFINITIONS.find((layer) => layer.id === id);
export const getBaseLayers = () => EARTH_LAYERS.filter((layer) => layer.group === "base");
export const getOverlayLayers = () => EARTH_LAYERS.filter((layer) => layer.group === "overlay");

export function validateLayerRegistry(layers = EARTH_LAYERS) {
  const required = ["id", "title", "group", "provider", "dateSupport", "attribution", "inspectMethod", "fallbackChain", "minimumZoom", "maximumZoom"];
  const ids = new Set();
  for (const layer of layers) {
    for (const field of required) if (!(field in layer)) throw new Error(`${layer.id ?? "layer"} is missing ${field}`);
    if (ids.has(layer.id)) throw new Error(`Duplicate layer id: ${layer.id}`);
    ids.add(layer.id);
  }
  return true;
}
