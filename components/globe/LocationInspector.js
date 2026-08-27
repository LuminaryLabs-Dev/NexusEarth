"use client";

function coordinate(value, positive, negative) {
  return `${Math.abs(value).toFixed(4)}°${value >= 0 ? positive : negative}`;
}

export default function LocationInspector({ inspection }) {
  if (!inspection) {
    return (
      <aside className="inspector empty">
        <p className="section-label">Location inspector</p>
        <h2>Click the globe</h2>
        <p>Inspect coordinates, terrain, the nearest indexed place, and the active source without inventing measurements from browse imagery.</p>
      </aside>
    );
  }
  const elevation = inspection.height == null ? "Unavailable" : inspection.height < -1
    ? `${Math.abs(Math.round(inspection.height)).toLocaleString()} m depth`
    : `${Math.round(inspection.height).toLocaleString()} m elevation`;
  return (
    <aside className="inspector">
      <p className="section-label">Location inspector</p>
      <h2>{inspection.nearest?.name ?? inspection.country}</h2>
      <p>{[inspection.region, inspection.country].filter(Boolean).join(", ")}</p>
      <dl>
        <div><dt>Latitude</dt><dd>{coordinate(inspection.lat, "N", "S")}</dd></div>
        <div><dt>Longitude</dt><dd>{coordinate(inspection.lon, "E", "W")}</dd></div>
        <div><dt>Terrain</dt><dd>{elevation}</dd></div>
        {inspection.nearest && <div><dt>Nearest place</dt><dd>{inspection.nearest.distanceKm.toFixed(1)} km</dd></div>}
        <div><dt>Source</dt><dd>{inspection.source}</dd></div>
        {inspection.observationDate && <div><dt>Observed</dt><dd>{inspection.observationDate}</dd></div>}
      </dl>
      {inspection.legend && <p className="legend-note">{inspection.legend}. This layer is a visualization, not a point measurement.</p>}
    </aside>
  );
}
