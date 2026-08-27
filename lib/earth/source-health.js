import { getLayer } from "./layer-registry.js";

export function subtractUtcDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function isLatestOperation(operation, latestOperation) {
  return operation === latestOperation;
}

export function buildGibsTileUrl(layer, date, tileMatrix = 0, tileRow = 0, tileCol = 0) {
  const timeSegment = layer.dateSupport ? `/${date}` : "";
  return `${layer.url}/${layer.layer}/default${timeSegment}/${layer.tileMatrixSet}/${tileMatrix}/${tileRow}/${tileCol}.${layer.format}`;
}

export function buildGibsProbeUrl(layer, date) {
  if (layer.provider === "gibs-wms") {
    const parameters = new URLSearchParams({
      service: "WMS",
      request: "GetMap",
      version: "1.1.1",
      layers: layer.layer,
      styles: "",
      format: "image/png",
      transparent: "true",
      width: "256",
      height: "256",
      srs: "EPSG:4326",
      bbox: "-180,-90,180,90",
      time: date
    });
    return `${layer.url}?${parameters}`;
  }
  return buildGibsTileUrl(layer, date);
}

export function sourceCandidates(layer, date) {
  const definitions = [layer, ...(layer.fallbackChain ?? []).map(getLayer).filter(Boolean)];
  const attempts = [];
  for (const definition of definitions) {
    if (!definition.provider.startsWith("gibs-")) {
      attempts.push({ layer: definition, date: null });
      continue;
    }
    const dates = definition.dateSupport ? [date, subtractUtcDays(date, 1), subtractUtcDays(date, 2)] : [date];
    for (const attemptDate of dates) attempts.push({ layer: definition, date: attemptDate });
  }
  return attempts;
}

export async function resolveLiveSource(layer, date, probe) {
  const candidates = sourceCandidates(layer, date);
  try {
    const cached = JSON.parse(sessionStorage.getItem(`nexus-earth:source:${layer.id}`));
    const cachedLayer = cached?.layerId ? getLayer(cached.layerId) : null;
    const atlasIndex = candidates.findIndex((candidate) => candidate.layer.id === "atlas");
    if (cachedLayer?.provider?.startsWith("gibs-") && atlasIndex >= 0) {
      candidates.splice(atlasIndex, 0, { layer: cachedLayer, date: cached.date });
    }
  } catch { /* Session storage can be unavailable in private browsing. */ }
  for (const candidate of candidates) {
    if (!candidate.layer.provider.startsWith("gibs-")) return candidate;
    if (await probe(buildGibsProbeUrl(candidate.layer, candidate.date))) {
      try {
        sessionStorage.setItem(`nexus-earth:source:${layer.id}`, JSON.stringify({ layerId: candidate.layer.id, date: candidate.date }));
      } catch { /* Runtime cache is optional. */ }
      return candidate;
    }
  }
  return null;
}

export function probeImage(url, timeoutMs = 6500) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(value);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    image.onload = () => finish(image.naturalWidth > 0);
    image.onerror = () => finish(false);
    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}
