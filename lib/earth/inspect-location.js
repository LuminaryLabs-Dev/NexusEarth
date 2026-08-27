const radians = (degrees) => degrees * Math.PI / 180;

export function haversineKm(a, b) {
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function nearestPlace(places, point, maxKm = 350) {
  let best = null;
  let bestDistance = Infinity;
  for (const place of places) {
    if (place.type !== "city" && place.type !== "feature") continue;
    const distanceKm = haversineKm(point, place);
    if (distanceKm < bestDistance) {
      bestDistance = distanceKm;
      best = place;
    }
  }
  return best && bestDistance <= maxKm ? { ...best, distanceKm: bestDistance } : null;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > point.lat) !== (yj > point.lat) && point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(point, geometry) {
  if (!geometry) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.some((polygon) => pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole)));
}

export function findAdminFeature(features, point) {
  return features.find((feature) => pointInGeometry(point, feature.geometry)) ?? null;
}

export function describeLocation({ point, height, places, boundaries, layer, date }) {
  const nearest = nearestPlace(places, point);
  const admin = findAdminFeature(boundaries?.features ?? [], point);
  const nearbyCountry = nearest?.distanceKm <= 50 ? nearest.country : null;
  const country = admin?.properties?.ADMIN ?? admin?.properties?.NAME ?? nearbyCountry ?? (point.lat < -60 ? "Antarctica" : "Open ocean");
  return {
    ...point,
    height: Number.isFinite(height) ? height : null,
    country,
    region: nearest?.region ?? null,
    nearest,
    source: layer.attribution,
    observationDate: layer.dateSupport ? date : null,
    legend: layer.legend
  };
}
