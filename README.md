# Nexus Earth

Interactive 3D Earth explorer using recent NASA VIIRS true-color imagery.

Nexus Earth composites three sources into one seamless 2048×1024 globe texture in a browser worker:

1. A local complete Earth base texture.
2. Dated global NOAA-20 VIIRS imagery from NASA GIBS in EPSG:4326.
3. Matching Antarctic imagery from NASA GIBS in EPSG:3031.

Missing satellite pixels fall through to the base Earth. The Antarctic projection is reprojected into the global texture and blended between 55°S and 62°S before Three.js receives a single texture.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app exports to `out/` and deploys automatically to GitHub Pages after every push to `main`.

## Validation

```bash
npm test
npm run build
```

The base texture is the Three.js r180 example Earth texture. Live observation imagery is provided by NASA Global Imagery Browse Services (GIBS).
