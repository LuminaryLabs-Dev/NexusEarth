import { execFile } from "node:child_process";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { unzipSync } from "fflate";

const run = promisify(execFile);
const outputPlaces = path.resolve("public/data/search/places.json");
const outputBoundaries = path.resolve("public/data/boundaries/admin.geojson");
const cacheRoot = path.resolve(".cache/earth-data");
const seedRoot = path.resolve("public/data/seed");

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function download(url, timeoutMs = 30000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function buildFullIndex() {
  const [cityArchive, adminData, boundaryData] = await Promise.all([
    download("https://download.geonames.org/export/dump/cities15000.zip"),
    download("https://download.geonames.org/export/dump/admin1CodesASCII.txt"),
    download("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson")
  ]);
  const cityFile = unzipSync(cityArchive)["cities15000.txt"];
  if (!cityFile) throw new Error("GeoNames archive did not contain cities15000.txt");
  await mkdir(cacheRoot, { recursive: true });
  await mkdir(path.dirname(outputPlaces), { recursive: true });
  await mkdir(path.dirname(outputBoundaries), { recursive: true });
  const cityPath = path.join(cacheRoot, "cities15000.txt");
  const adminPath = path.join(cacheRoot, "admin1CodesASCII.txt");
  const boundaryPath = path.join(cacheRoot, "admin.geojson");
  await Promise.all([
    writeFile(cityPath, cityFile),
    writeFile(adminPath, adminData),
    writeFile(boundaryPath, boundaryData),
    writeFile(outputBoundaries, boundaryData)
  ]);
  await run(process.execPath, [
    "scripts/data/build-search-index.mjs",
    "--cities", cityPath,
    "--admin1", adminPath,
    "--boundaries", boundaryPath,
    "--output", outputPlaces
  ]);
}

async function installSeedFallback(error) {
  await mkdir(path.dirname(outputPlaces), { recursive: true });
  await mkdir(path.dirname(outputBoundaries), { recursive: true });
  await Promise.all([
    copyFile(path.join(seedRoot, "places.json"), outputPlaces),
    copyFile(path.join(seedRoot, "admin.geojson"), outputBoundaries)
  ]);
  console.warn(`Full place data unavailable; installed offline seed: ${error.message}`);
}

if (!process.env.FORCE_DATA_REFRESH && await exists(outputPlaces) && await exists(outputBoundaries)) {
  const places = JSON.parse(await readFile(outputPlaces, "utf8"));
  console.log(`Earth runtime data ready (${places.length.toLocaleString()} places)`);
} else {
  try {
    await buildFullIndex();
    const places = JSON.parse(await readFile(outputPlaces, "utf8"));
    console.log(`Prepared full Earth runtime data (${places.length.toLocaleString()} places)`);
  } catch (error) {
    await installSeedFallback(error);
  }
}
