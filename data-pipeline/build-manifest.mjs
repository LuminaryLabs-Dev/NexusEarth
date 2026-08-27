import { writeFile } from "node:fs/promises";
import { EARTH_LAYERS, validateLayerRegistry } from "../lib/earth/layer-registry.js";

validateLayerRegistry(EARTH_LAYERS);
await writeFile("public/data/earth-layer-manifest.json", `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), layers: EARTH_LAYERS }, null, 2)}\n`);
console.log(`Wrote ${EARTH_LAYERS.length} public layer definitions`);
