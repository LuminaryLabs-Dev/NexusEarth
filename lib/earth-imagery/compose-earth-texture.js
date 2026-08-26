import { antarcticPixelForLonLat } from "./antarctic-projection.js";

export const OUTPUT_WIDTH = 2048;
export const OUTPUT_HEIGHT = 1024;
export const POLAR_BLEND_START = -55;
export const POLAR_BLEND_END = -62;
export const EDGE_FEATHER_WIDTH = 16;
export const POLAR_MASK_FEATHER_RADIUS = 24;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function polarBlendWeight(latitude) {
  if (latitude >= POLAR_BLEND_START) return 0;
  if (latitude <= POLAR_BLEND_END) return 1;
  return smoothstep((POLAR_BLEND_START - latitude) / (POLAR_BLEND_START - POLAR_BLEND_END));
}

export function isMissingPixel(data, offset) {
  return data[offset + 3] < 16 || Math.max(data[offset], data[offset + 1], data[offset + 2]) <= 5;
}

function blendPixel(source, sourceOffset, target, targetOffset, alpha = 1) {
  const sourceAlpha = (source[sourceOffset + 3] / 255) * alpha;
  const inverse = 1 - sourceAlpha;
  target[targetOffset] = Math.round(source[sourceOffset] * sourceAlpha + target[targetOffset] * inverse);
  target[targetOffset + 1] = Math.round(source[sourceOffset + 1] * sourceAlpha + target[targetOffset + 1] * inverse);
  target[targetOffset + 2] = Math.round(source[sourceOffset + 2] * sourceAlpha + target[targetOffset + 2] * inverse);
  target[targetOffset + 3] = 255;
}

function sampleValidBilinear(data, width, height, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > width - 1 || y > height - 1) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const samples = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x1, y0, tx * (1 - ty)],
    [x0, y1, (1 - tx) * ty],
    [x1, y1, tx * ty]
  ];
  const color = [0, 0, 0, 0];
  let totalWeight = 0;
  for (const [sampleX, sampleY, weight] of samples) {
    if (weight <= 0) continue;
    const offset = (sampleY * width + sampleX) * 4;
    if (isMissingPixel(data, offset)) continue;
    color[0] += data[offset] * weight;
    color[1] += data[offset + 1] * weight;
    color[2] += data[offset + 2] * weight;
    color[3] += data[offset + 3] * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) return null;
  return color.map((channel) => Math.round(channel / totalWeight));
}

function boxBlurFloat(source, width, height, radius) {
  const horizontal = new Float32Array(source.length);
  const output = new Float32Array(source.length);
  const diameter = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    const row = y * width;
    for (let offset = -radius; offset <= radius; offset += 1) {
      sum += source[row + Math.max(0, Math.min(width - 1, offset))];
    }
    for (let x = 0; x < width; x += 1) {
      horizontal[row + x] = sum / diameter;
      sum -= source[row + Math.max(0, x - radius)];
      sum += source[row + Math.min(width - 1, x + radius + 1)];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      sum += horizontal[Math.max(0, Math.min(height - 1, offset)) * width + x];
    }
    for (let y = 0; y < height; y += 1) {
      output[y * width + x] = sum / diameter;
      sum -= horizontal[Math.max(0, y - radius) * width + x];
      sum += horizontal[Math.min(height - 1, y + radius + 1) * width + x];
    }
  }
  return output;
}

export function featherPolarNoData(data, width, height, radius = POLAR_MASK_FEATHER_RADIUS) {
  if (radius <= 0) return new Uint8ClampedArray(data);
  const pixelCount = width * height;
  const validity = new Float32Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    validity[index] = isMissingPixel(data, index * 4) ? 0 : 1;
  }
  const blurredValidity = boxBlurFloat(validity, width, height, radius);
  const output = new Uint8ClampedArray(data.length);
  for (let channel = 0; channel < 3; channel += 1) {
    const premultiplied = new Float32Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      premultiplied[index] = data[index * 4 + channel] * validity[index];
    }
    const blurredColor = boxBlurFloat(premultiplied, width, height, radius);
    for (let index = 0; index < pixelCount; index += 1) {
      const alpha = blurredValidity[index];
      output[index * 4 + channel] = validity[index] > 0
        ? data[index * 4 + channel]
        : alpha > 0.001
          ? Math.round(blurredColor[index] / alpha)
          : 0;
    }
  }
  for (let index = 0; index < pixelCount; index += 1) {
    output[index * 4 + 3] = Math.round(blurredValidity[index] * 255);
  }
  return output;
}

export function featherLongitudeEdges(data, width, height, edgeWidth = EDGE_FEATHER_WIDTH) {
  const actualWidth = Math.max(0, Math.min(Math.floor(edgeWidth), Math.floor(width / 2)));
  for (let y = 0; y < height; y += 1) {
    for (let distance = 0; distance < actualWidth; distance += 1) {
      const left = (y * width + distance) * 4;
      const right = (y * width + (width - 1 - distance)) * 4;
      const strength = 1 - distance / actualWidth;
      for (let channel = 0; channel < 3; channel += 1) {
        const average = Math.round((data[left + channel] + data[right + channel]) / 2);
        data[left + channel] = Math.round(data[left + channel] * (1 - strength) + average * strength);
        data[right + channel] = Math.round(data[right + channel] * (1 - strength) + average * strength);
      }
      data[left + 3] = 255;
      data[right + 3] = 255;
    }
  }
}

export function composeEarthTexture({
  base,
  global = null,
  polar = null,
  width = OUTPUT_WIDTH,
  height = OUTPUT_HEIGHT,
  polarWidth = 1024,
  polarHeight = 1024,
  projectPolarPixel = antarcticPixelForLonLat,
  edgeFeatherWidth = EDGE_FEATHER_WIDTH
}) {
  const expectedLength = width * height * 4;
  if (!(base instanceof Uint8ClampedArray) || base.length !== expectedLength) {
    throw new Error(`Base texture must contain ${expectedLength} RGBA bytes.`);
  }
  if (global && (!(global instanceof Uint8ClampedArray) || global.length !== expectedLength)) {
    throw new Error(`Global texture must contain ${expectedLength} RGBA bytes.`);
  }
  if (polar && (!(polar instanceof Uint8ClampedArray) || polar.length !== polarWidth * polarHeight * 4)) {
    throw new Error("Polar texture dimensions do not match its RGBA buffer.");
  }

  const output = new Uint8ClampedArray(base);
  const metrics = {
    totalPixels: width * height,
    globalApplied: 0,
    baseFallback: 0,
    polarApplied: 0,
    polarMissing: 0,
    featheredEdgePixels: Math.min(edgeFeatherWidth, Math.floor(width / 2)) * height * 2
  };

  for (let offset = 0; offset < expectedLength; offset += 4) {
    if (global && !isMissingPixel(global, offset)) {
      blendPixel(global, offset, output, offset);
      metrics.globalApplied += 1;
    } else {
      metrics.baseFallback += 1;
    }
  }

  if (global && polar) {
    const featheredPolar = featherPolarNoData(polar, polarWidth, polarHeight);
    const startRow = Math.max(0, Math.floor(((90 - POLAR_BLEND_START) / 180) * height));
    const sample = new Uint8ClampedArray(4);
    for (let y = startRow; y < height; y += 1) {
      const latitude = 90 - ((y + 0.5) / height) * 180;
      const weight = polarBlendWeight(latitude);
      if (weight <= 0) continue;
      for (let x = 0; x < width; x += 1) {
        const longitude = ((x + 0.5) / width) * 360 - 180;
        const polarPixel = projectPolarPixel(longitude, latitude, polarWidth, polarHeight);
        if (!polarPixel) {
          metrics.polarMissing += 1;
          continue;
        }
        const color = sampleValidBilinear(featheredPolar, polarWidth, polarHeight, polarPixel.x, polarPixel.y);
        if (!color) {
          metrics.polarMissing += 1;
          continue;
        }
        sample.set(color);
        const offset = (y * width + x) * 4;
        blendPixel(sample, 0, output, offset, weight);
        metrics.polarApplied += 1;
      }
    }
  }

  featherLongitudeEdges(output, width, height, edgeFeatherWidth);
  const sourceMode = global && polar && metrics.polarApplied > 0
    ? "complete"
    : global
      ? "global-polar-fallback"
      : "base-fallback";
  return { data: output, metrics, sourceMode };
}
