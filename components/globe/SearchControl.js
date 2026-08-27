"use client";

import { useMemo, useState } from "react";
import { searchPlaces } from "../../lib/earth/search/search-index.js";

export default function SearchControl({ places, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchPlaces(places, query), [places, query]);

  const choose = (place) => {
    setQuery(place.name);
    setOpen(false);
    onSelect(place);
  };

  return (
    <div className="search-control">
      <label htmlFor="earth-search">Search Earth</label>
      <div className="search-box">
        <input
          id="earth-search"
          value={query}
          placeholder="City, country, or 40.7, -74"
          autoComplete="off"
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) choose(results[0]);
            if (event.key === "Escape") setOpen(false);
          }}
        />
        <button type="button" disabled={!results[0]} onClick={() => results[0] && choose(results[0])}>Go</button>
      </div>
      {open && query.length >= 2 && (
        <div className="search-results" role="listbox">
          {results.length ? results.map((place) => (
            <button type="button" role="option" key={place.id} onClick={() => choose(place)}>
              <strong>{place.name}</strong>
              <span>{[place.region, place.country, place.type].filter(Boolean).join(" · ")}</span>
            </button>
          )) : <p>No local result. Try coordinates.</p>}
        </div>
      )}
    </div>
  );
}
