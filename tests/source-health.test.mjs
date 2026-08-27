import test from "node:test";
import assert from "node:assert/strict";
import { getLayer } from "../lib/earth/layer-registry.js";
import { buildGibsProbeUrl, buildGibsTileUrl, isLatestOperation, resolveLiveSource, sourceCandidates } from "../lib/earth/source-health.js";

test("GIBS URLs are tiled and dated", () => {
  const current = getLayer("current");
  assert.equal(buildGibsTileUrl(current, "2026-08-26", 3, 2, 1), "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-08-26/250m/3/2/1.jpg");
});

test("vector fire data has a tiled raster WMS probe", () => {
  const url = buildGibsProbeUrl(getLayer("fires"), "2026-08-26");
  assert.match(url, /request=GetMap/);
  assert.match(url, /VIIRS_NOAA20_Thermal_Anomalies_375m_All/);
});

test("current imagery tries sensor, date, alternate sensor, then atlas", () => {
  const candidates = sourceCandidates(getLayer("current"), "2026-08-26");
  assert.deepEqual(candidates.slice(0, 3).map(({ layer, date }) => [layer.id, date]), [
    ["current", "2026-08-26"], ["current", "2026-08-25"], ["current", "2026-08-24"]
  ]);
  assert.equal(candidates.at(-1).layer.id, "atlas");
});

test("failed live probes resolve to guaranteed Atlas fallback", async () => {
  const result = await resolveLiveSource(getLayer("current"), "2026-08-26", async () => false);
  assert.equal(result.layer.id, "atlas");
});

test("stale operations cannot replace newer selections", () => {
  assert.equal(isLatestOperation(4, 5), false);
  assert.equal(isLatestOperation(5, 5), true);
});
