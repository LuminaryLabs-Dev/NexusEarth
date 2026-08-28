# Nexus Earth

A terrain-enabled, searchable 3D Earth explorer built with Next.js and CesiumJS.

The deployed application is fully static. The browser streams only the terrain and imagery tiles needed by the current camera, while local data guarantees that the planet and search interface continue to work when a live service fails.

## Features

- WGS84 CesiumJS globe with complete polar rendering
- Open 30 m global terrain from Mapterhorn/Copernicus DEM, with ellipsoid fallback
- Complete local NASA Blue Marble atlas fallback
- Dated NASA GIBS imagery with NOAA-20, NOAA-21, Suomi NPP, MODIS, and date fallbacks
- Atlas, Current satellite, Terrain relief, and Night Earth base modes
- Borders, clouds, fires, snow/ice, and land-cover overlays
- Bundled search across 15,000 cities, countries, regions, landmarks, and coordinates
- Click-to-inspect coordinates, terrain, country, nearest place, source, and date
- Visible source attribution and honest unavailable states

The AI observations layer is intentionally disabled until versioned analysis tiles exist with model, date, processing, and confidence metadata. No browser-side foundation model or public geocoder is used.

## Run locally

```bash
npm ci
npm run dev
```

## Validate and build

```bash
npm test
npm run build
```

`prebuild` generates the bundled GeoNames/Natural Earth data, copies Cesium workers and runtime assets to `public/cesium/`, and retains a committed search seed if an upstream download is temporarily unavailable. Next.js exports the static site to `out/` under the production `/NexusEarth/` base path. The Cesium engine and widgets are pinned to matching releases, and `postbuild` parse-checks every generated JavaScript chunk before the existing GitHub Pages workflow can deploy it from `main`.

## Data preparation

The committed search index is generated from GeoNames `cities15000` and Natural Earth country boundaries:

```bash
npm run data:search -- \
  --cities path/to/cities15000.txt \
  --admin1 path/to/admin1CodesASCII.txt \
  --boundaries path/to/admin.geojson
```

`data-pipeline/` contains reproducible GDAL entry points and the approved source priority for a future self-hosted polar-safe atlas and quantized terrain set. Large source scenes and generated tiles belong in versioned object storage, not this repository.

## Sources

- CesiumJS — Apache-2.0
- NASA Blue Marble and NASA GIBS
- Mapterhorn / Copernicus DEM GLO-30
- GeoNames — CC BY 4.0
- Natural Earth — public domain

See `public/data/earth-layer-manifest.json` for each runtime layer’s provider, attribution, date behavior, legend, zoom range, inspection method, and fallback chain.
