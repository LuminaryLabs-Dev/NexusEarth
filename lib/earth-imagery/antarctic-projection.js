import proj4 from "proj4";

export const ANTARCTIC_EXTENT_METERS = 4194304;
export const ANTARCTIC_NORTH_LIMIT = -38.941373;

const WGS84 = "EPSG:4326";
const EPSG3031 = "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs";
const toAntarctic = proj4(WGS84, EPSG3031);

export function lonLatToAntarcticMeters(longitude, latitude) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (latitude < -90 || latitude > ANTARCTIC_NORTH_LIMIT) return null;
  const [x, y] = toAntarctic.forward([longitude, latitude]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x) > ANTARCTIC_EXTENT_METERS || Math.abs(y) > ANTARCTIC_EXTENT_METERS) return null;
  return { x, y };
}

export function antarcticPixelForLonLat(longitude, latitude, width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  const projected = lonLatToAntarcticMeters(longitude, latitude);
  if (!projected) return null;
  const span = ANTARCTIC_EXTENT_METERS * 2;
  return {
    x: ((projected.x + ANTARCTIC_EXTENT_METERS) / span) * (width - 1),
    y: ((ANTARCTIC_EXTENT_METERS - projected.y) / span) * (height - 1)
  };
}
