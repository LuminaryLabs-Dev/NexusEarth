import { antarcticObservationUrl, globalObservationUrl } from "../lib/earth-imagery/gibs.js";
import { composeEarthTexture, OUTPUT_HEIGHT, OUTPUT_WIDTH } from "../lib/earth-imagery/compose-earth-texture.js";

const POLAR_SIZE = 1024;

async function loadImageData(url, width, height) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Image request failed with HTTP ${response.status}.`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Offscreen 2D canvas is unavailable.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context.getImageData(0, 0, width, height).data;
}

function statusForMode(mode, date) {
  if (mode === "complete") return `NASA global + Antarctic polar · ${date}`;
  if (mode === "global-polar-fallback") return `NASA global · polar fallback · ${date}`;
  return "Base Earth fallback";
}

self.onmessage = async (event) => {
  const { requestId, date, baseTextureUrl } = event.data;
  try {
    const base = await loadImageData(baseTextureUrl, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    const [globalResult, polarResult] = await Promise.allSettled([
      loadImageData(globalObservationUrl(date), OUTPUT_WIDTH, OUTPUT_HEIGHT),
      loadImageData(antarcticObservationUrl(date, POLAR_SIZE), POLAR_SIZE, POLAR_SIZE)
    ]);
    const global = globalResult.status === "fulfilled" ? globalResult.value : null;
    const polar = polarResult.status === "fulfilled" ? polarResult.value : null;
    const composed = composeEarthTexture({
      base,
      global,
      polar,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      polarWidth: POLAR_SIZE,
      polarHeight: POLAR_SIZE
    });
    const canvas = new OffscreenCanvas(OUTPUT_WIDTH, OUTPUT_HEIGHT);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Composite output canvas is unavailable.");
    const image = context.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);
    image.data.set(composed.data);
    context.putImageData(image, 0, 0);
    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({
      requestId,
      date,
      bitmap,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      sourceMode: composed.sourceMode,
      status: statusForMode(composed.sourceMode, date),
      metrics: composed.metrics,
      failures: {
        global: globalResult.status === "rejected" ? String(globalResult.reason) : null,
        polar: polarResult.status === "rejected" ? String(polarResult.reason) : null
      }
    }, [bitmap]);
  } catch (error) {
    self.postMessage({ requestId, date, error: error instanceof Error ? error.message : String(error) });
  }
};
