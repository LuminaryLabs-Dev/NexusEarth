const LAYER = "VIIRS_NOAA20_CorrectedReflectance_TrueColor";
const GLOBAL_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const ANTARCTIC_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg3031/best/wms.cgi";

function wmsUrl(endpoint, parameters) {
  const search = new URLSearchParams({
    service: "WMS",
    request: "GetMap",
    version: "1.1.1",
    layers: LAYER,
    styles: "",
    time: parameters.date,
    width: String(parameters.width),
    height: String(parameters.height),
    format: parameters.format,
    transparent: String(parameters.transparent),
    srs: parameters.srs,
    bbox: parameters.bbox
  });
  return `${endpoint}?${search.toString()}`;
}

export function globalObservationUrl(date, width = 2048, height = 1024) {
  return wmsUrl(GLOBAL_WMS, {
    date,
    width,
    height,
    format: "image/jpeg",
    transparent: false,
    srs: "EPSG:4326",
    bbox: "-180,-90,180,90"
  });
}

export function antarcticObservationUrl(date, size = 1024) {
  return wmsUrl(ANTARCTIC_WMS, {
    date,
    width: size,
    height: size,
    format: "image/png",
    transparent: true,
    srs: "EPSG:3031",
    bbox: "-4194304,-4194304,4194304,4194304"
  });
}

export function isLatestTextureResponse(responseId, activeRequestId) {
  return responseId === activeRequestId;
}

export const GIBS_LAYER = LAYER;
