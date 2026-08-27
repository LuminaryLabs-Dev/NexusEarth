import { Credit, CustomHeightmapTerrainProvider, Rectangle, WebMercatorTilingScheme } from "cesium";

export const TERRAIN_TILE_SIZE = 512;
export const TERRAIN_GRID_SIZE = 65;
export const TERRAIN_MAX_ZOOM = 12;

export function decodeTerrariumHeight(red, green, blue) {
  return red * 256 + green + blue / 256 - 32768;
}

export function decodeTerrariumGrid(pixelData, sourceSize = TERRAIN_TILE_SIZE, gridSize = TERRAIN_GRID_SIZE) {
  const heights = new Float32Array(gridSize * gridSize);
  for (let row = 0; row < gridSize; row += 1) {
    const sourceY = Math.round(row * (sourceSize - 1) / (gridSize - 1));
    for (let column = 0; column < gridSize; column += 1) {
      const sourceX = Math.round(column * (sourceSize - 1) / (gridSize - 1));
      const offset = (sourceY * sourceSize + sourceX) * 4;
      heights[row * gridSize + column] = pixelData[offset + 3] === 0
        ? 0
        : decodeTerrariumHeight(pixelData[offset], pixelData[offset + 1], pixelData[offset + 2]);
    }
  }
  return heights;
}

export class PolarSafeWebMercatorTilingScheme extends WebMercatorTilingScheme {
  tileXYToRectangle(x, y, level, result) {
    const rectangle = super.tileXYToRectangle(x, y, level, result);
    const tiles = 2 ** level;
    if (y === 0) rectangle.north = Math.PI / 2;
    if (y + 1 === tiles) rectangle.south = -Math.PI / 2;
    return rectangle;
  }
}

async function loadTerrainGrid(x, y, level) {
  if (level > TERRAIN_MAX_ZOOM) return new Float32Array(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE);
  const response = await fetch(`https://tiles.mapterhorn.com/${level}/${x}/${y}.webp`, { mode: "cors" });
  if (!response.ok) throw new Error(`Terrain tile ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = typeof OffscreenCanvas === "function"
    ? new OffscreenCanvas(TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE)
    : Object.assign(document.createElement("canvas"), { width: TERRAIN_TILE_SIZE, height: TERRAIN_TILE_SIZE });
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE);
  bitmap.close();
  const pixels = context.getImageData(0, 0, TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE).data;
  return decodeTerrariumGrid(pixels);
}

export function createMapterhornTerrainProvider() {
  const cache = new Map();
  const callback = (x, y, level) => {
    const key = `${level}/${x}/${y}`;
    if (!cache.has(key)) {
      const promise = loadTerrainGrid(x, y, level).catch(() => new Float32Array(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE));
      cache.set(key, promise);
      if (cache.size > 64) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  };
  const provider = new CustomHeightmapTerrainProvider({
    callback,
    width: TERRAIN_GRID_SIZE,
    height: TERRAIN_GRID_SIZE,
    tilingScheme: new PolarSafeWebMercatorTilingScheme({
      rectangleSouthwestInMeters: undefined,
      rectangleNortheastInMeters: undefined
    }),
    credit: new Credit("Mapterhorn · Copernicus DEM GLO-30")
  });
  provider.getTileDataAvailable = (_x, _y, level) => level <= TERRAIN_MAX_ZOOM;
  return provider;
}
