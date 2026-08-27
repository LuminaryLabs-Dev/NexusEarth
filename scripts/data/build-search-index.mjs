import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const citiesPath = argument("cities");
const adminPath = argument("admin1");
const boundariesPath = argument("boundaries");
const outputPath = argument("output") ?? "public/data/search/places.json";
if (!citiesPath || !adminPath || !boundariesPath) {
  throw new Error("Usage: npm run data:search -- --cities cities15000.txt --admin1 admin1CodesASCII.txt --boundaries admin.geojson");
}

const [cityText, adminText, boundaryText] = await Promise.all([
  readFile(citiesPath, "utf8"), readFile(adminPath, "utf8"), readFile(boundariesPath, "utf8")
]);
const boundaries = JSON.parse(boundaryText);
const countryNames = new Map(boundaries.features.map((feature) => [feature.properties.ISO_A2, feature.properties.ADMIN]));
const adminNames = new Map(adminText.trim().split("\n").map((line) => {
  const [code, name] = line.split("\t");
  return [code, name];
}));

const allCities = cityText.trim().split("\n").map((line) => {
  const columns = line.split("\t");
  const countryCode = columns[8];
  const regionCode = `${countryCode}.${columns[10]}`;
  return {
    id: `geonames:${columns[0]}`,
    name: columns[1],
    alternateNames: [...new Set([columns[2], ...columns[3].split(",")].filter(Boolean))].slice(0, 10),
    type: "city",
    lat: Number(columns[4]),
    lon: Number(columns[5]),
    country: countryNames.get(countryCode) ?? countryCode,
    region: adminNames.get(regionCode) ?? null,
    regionCode,
    population: Number(columns[14]) || 0
  };
});

const cityEntries = allCities.sort((a, b) => b.population - a.population).slice(0, 15000);
const regionAggregates = new Map();
for (const city of allCities) {
  if (!city.region || city.population <= 0) continue;
  const current = regionAggregates.get(city.regionCode) ?? { weight: 0, lat: 0, lon: 0, country: city.country, name: city.region };
  const weight = Math.max(city.population, 15000);
  current.weight += weight;
  current.lat += city.lat * weight;
  current.lon += city.lon * weight;
  regionAggregates.set(city.regionCode, current);
}
const regionEntries = [...regionAggregates.entries()].map(([code, value]) => ({
  id: `region:${code}`,
  name: value.name,
  alternateNames: [],
  type: "region",
  lat: value.lat / value.weight,
  lon: value.lon / value.weight,
  country: value.country,
  population: 0
}));
const countryEntries = boundaries.features.map((feature) => ({
  id: `country:${feature.properties.ADM0_A3}`,
  name: feature.properties.ADMIN,
  alternateNames: [feature.properties.NAME_LONG, feature.properties.ABBREV, feature.properties.NAME_ALT].filter(Boolean),
  type: "country",
  lat: Number(feature.properties.LABEL_Y),
  lon: Number(feature.properties.LABEL_X),
  country: feature.properties.ADMIN,
  population: Number(feature.properties.POP_EST) || 0
})).filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lon));
const features = [
  ["South Pole", -90, 0, "Antarctica", ["Geographic South Pole"]],
  ["Antarctica", -82, 0, "Antarctica", ["South Polar Region"]],
  ["Mount Everest", 27.9881, 86.925, "Nepal / China", ["Everest", "Sagarmatha", "Chomolungma"]],
  ["Himalayas", 28, 84, "Asia", ["Himalaya"]],
  ["Andes", -20, -68, "South America", []],
  ["Alps", 46.8, 9.8, "Europe", []],
  ["Rocky Mountains", 44, -110, "North America", ["Rockies"]],
  ["North Pole", 90, 0, "Arctic Ocean", ["Geographic North Pole"]],
  ["Mariana Trench", 11.35, 142.2, "Pacific Ocean", ["Challenger Deep"]],
  ["Prime Meridian", 51.4779, 0, "United Kingdom", ["Greenwich Meridian"]],
  ["International Date Line", 0, 180, "Pacific Ocean", ["Antimeridian"]]
].map(([name, lat, lon, country, alternateNames], index) => ({ id: `feature:${index}`, name, lat, lon, country, alternateNames, type: "feature", population: 0 }));

const output = [...countryEntries, ...regionEntries, ...features, ...cityEntries];
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output)}\n`);
console.log(`Wrote ${output.length.toLocaleString()} search records to ${outputPath}`);
