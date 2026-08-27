import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("node_modules/cesium/Build/Cesium");
const outputRoot = path.resolve("public/cesium");
const runtimeDirectories = ["Assets", "ThirdParty", "Widgets", "Workers"];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const directory of runtimeDirectories) {
  await cp(path.join(sourceRoot, directory), path.join(outputRoot, directory), {
    recursive: true
  });
}

console.log(`Copied Cesium runtime assets to ${outputRoot}`);
