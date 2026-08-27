const COORDINATE_PATTERN = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

export function normalizeSearchText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function parseCoordinates(value) {
  const match = String(value).match(COORDINATE_PATTERN);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { id: `coordinates:${lat},${lon}`, name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, type: "coordinates", lat, lon, country: null };
}

function scorePlace(place, query) {
  const name = normalizeSearchText(place.name);
  const alternate = normalizeSearchText((place.alternateNames ?? []).join(" "));
  if (name === query) return 1000000 + (place.population ?? 0);
  if (name.startsWith(query)) return 800000 + (place.population ?? 0);
  if (name.includes(query)) return 600000 + (place.population ?? 0);
  if (alternate.includes(query)) return 400000 + (place.population ?? 0);
  return -1;
}

export function searchPlaces(places, value, limit = 5) {
  const coordinate = parseCoordinates(value);
  if (coordinate) return [coordinate];
  const query = normalizeSearchText(value);
  if (query.length < 2) return [];
  return places
    .map((place) => ({ place, score: scorePlace(place, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map(({ place }) => place);
}
