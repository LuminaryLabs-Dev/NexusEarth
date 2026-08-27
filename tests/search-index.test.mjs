import test from "node:test";
import assert from "node:assert/strict";
import { parseCoordinates, searchPlaces } from "../lib/earth/search/search-index.js";

const places = [
  { id: "london", name: "London", alternateNames: ["Londres"], population: 9000000 },
  { id: "londonderry", name: "Londonderry", alternateNames: ["Derry"], population: 85000 },
  { id: "new-london", name: "New London", alternateNames: [], population: 27000 }
];

test("parses valid latitude and longitude", () => {
  assert.deepEqual(parseCoordinates("-77.8419, 166.6863"), {
    id: "coordinates:-77.8419,166.6863",
    name: "-77.8419, 166.6863",
    type: "coordinates",
    lat: -77.8419,
    lon: 166.6863,
    country: null
  });
  assert.equal(parseCoordinates("91, 0"), null);
});

test("ranks exact and prefix matches ahead of contains matches", () => {
  assert.deepEqual(searchPlaces(places, "London").map((place) => place.id), ["london", "londonderry", "new-london"]);
  assert.equal(searchPlaces(places, "Londres")[0].id, "london");
});
