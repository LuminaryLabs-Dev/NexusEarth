import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const chunksRoot = path.resolve("out/_next/static/chunks");

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

const chunks = await collectJavaScriptFiles(chunksRoot);
if (chunks.length === 0) {
  throw new Error(`No generated JavaScript chunks found in ${chunksRoot}`);
}

for (const chunk of chunks) {
  const result = spawnSync(process.execPath, ["--check", chunk], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`Generated chunk failed syntax validation: ${path.relative(process.cwd(), chunk)}`);
  }
}

console.log(`Validated ${chunks.length} generated JavaScript chunks`);
