// Draws the field map on /fields as inline SVG, at build time.
//
// Nothing here runs in the browser. The page ships plain SVG with no script:
// each pin is an ordinary link to the field's entry in the list below it, and
// the label that appears on hover is CSS. That keeps the map working with
// scripting off, on a phone (tap the pin, land on the address), and for anyone
// tabbing through with a keyboard.
//
// Coordinates come from _data/field_coordinates.json, which scripts/geocode-
// fields.js writes and a developer commits. A field with no coordinates is
// simply left off the map — validate.js says which ones.
//
// The basemap is src/data/basemap.geojson (US Census, public domain). See the
// header of that file's entry in CONTRIBUTING-DEV.md for how to regenerate it.

import fs from "node:fs";

const BASEMAP = "src/data/basemap.geojson";

// Degrees of breathing room between the outermost field and the frame.
const PADDING = 0.02;

export const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// The league is almost as tall as it is wide, which on a page makes a map the
// size of a screen. Widen the frame towards this ratio instead — the extra is
// county either side, which costs nothing and reads better than a square.
const ASPECT = 1.6;

// How far src/data/basemap.geojson was clipped when it was generated. Widening
// past this would frame empty paper with the county outline stopping dead at
// the cut, so the frame stops here. Keep in step with the clip bbox in the
// regeneration commands in CONTRIBUTING-DEV.md.
const DRAWN = { minLon: -122.9, maxLon: -122.28 };

// An equirectangular projection with the longitude scaled by cos(latitude).
// Over the 45 km this map covers, the error against a real projection is a
// fraction of a pin; a projection library would be a dependency for nothing.
const makeView = (points, width) => {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats) - PADDING;
  const maxLat = Math.max(...lats) + PADDING;
  let minLon = Math.min(...lons) - PADDING;
  let maxLon = Math.max(...lons) + PADDING;

  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const tall = maxLat - minLat;
  const wide = (maxLon - minLon) * k;
  if (wide / tall < ASPECT) {
    const grow = (tall * ASPECT - wide) / k / 2;
    minLon = Math.max(minLon - grow, DRAWN.minLon);
    maxLon = Math.min(maxLon + grow, DRAWN.maxLon);
  }

  const scale = width / ((maxLon - minLon) * k);
  return {
    minLon, maxLat, k, scale, width,
    height: Math.round(tall * scale),
  };
};

const project = (lon, lat, view) => [
  Math.round((lon - view.minLon) * view.k * view.scale * 10) / 10,
  Math.round((view.maxLat - lat) * view.scale * 10) / 10,
];

// GeoJSON rings and lines to one SVG path. Everything in a layer becomes a
// single <path>, which keeps the markup an order of magnitude smaller than one
// element per ring.
const ringsOf = (geometry) => {
  const { type, coordinates: c } = geometry;
  if (type === "Polygon" || type === "MultiLineString") return c;
  if (type === "MultiPolygon") return c.flat();
  if (type === "LineString") return [c];
  return [];
};

const pathFor = (features, view, close) => {
  const parts = [];
  for (const feature of features) {
    for (const ring of ringsOf(feature.geometry)) {
      const points = ring.map(([lon, lat]) => project(lon, lat, view));
      if (points.length < 2) continue;
      parts.push(`M${points.map((p) => p.join(" ")).join("L")}${close ? "Z" : ""}`);
    }
  }
  return parts.join("");
};

const escape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Water arrives as a mix of shapes: the Willamette and the Clackamas are wide
// enough to be polygons, while the Molalla and the Tualatin only exist in the
// Census data as centrelines. The first get filled, the second stroked, so they
// are kept apart here rather than sorted out at draw time.
const isArea = (feature) => feature.geometry?.type?.endsWith("Polygon");

let basemap = null;
const loadBasemap = () => {
  if (basemap) return basemap;
  basemap = { county: [], road: [], waterArea: [], waterLine: [] };
  if (!fs.existsSync(BASEMAP)) return basemap;
  const { features } = JSON.parse(fs.readFileSync(BASEMAP, "utf8"));
  for (const feature of features) {
    const layer = feature.properties?.layer;
    if (layer === "county") basemap.county.push(feature);
    else if (layer === "road") basemap.road.push(feature);
    else if (layer === "water") {
      (isArea(feature) ? basemap.waterArea : basemap.waterLine).push(feature);
    }
  }
  return basemap;
};

// Every field that has a point, in the order it appears in fields.csv.
const locate = (fields, coordinates) =>
  fields
    .map((row) => {
      const override = row.lat && row.lon
        ? { lat: Number(row.lat), lon: Number(row.lon) }
        : null;
      const point = override || coordinates[`${row.club}|${row.name}`];
      return point ? { ...row, lat: point.lat, lon: point.lon } : null;
    })
    .filter(Boolean);

const WIDTH = 1000;

const drawBase = (view) => {
  const { county, road, waterArea, waterLine } = loadBasemap();
  const layers = [
    ["fieldmap__water", waterArea, true],
    ["fieldmap__river", waterLine, false],
    ["fieldmap__road", road, false],
    ["fieldmap__county", county, true],
  ];
  return layers
    .filter(([, features]) => features.length)
    .map(([cls, features, close]) => `<path class="${cls}" d="${pathFor(features, view, close)}"/>`)
    .join("");
};

/**
 * Every Soccer-5 field on one map.
 *
 * Pins are all one colour deliberately. The plan called for colouring them by
 * host club, but fourteen clubs is far past what colour can carry — a
 * fourteen-swatch legend is unreadable, and unusable for a colourblind reader.
 * Position already separates the clubs (each plays in its own town), and a pin
 * says which club it belongs to on hover and in its link target, so the colour
 * would have been decoration standing in for information.
 */
export function leagueMap(fields, coordinates) {
  const placed = locate(fields, coordinates);
  if (!placed.length) return "";

  const view = makeView(placed, WIDTH);
  const title = `Map of all ${placed.length} Soccer-5 fields`;
  const marks = placed
    .map((field) => {
      const [x, y] = project(field.lon, field.lat, view);
      // The pin is a link to the field's entry in the list below, so tapping it
      // on a phone lands on the address rather than trying to show a label.
      return (
        `<a class="fieldmap__pin" href="#field-${slugify(`${field.club}-${field.name}`)}">` +
        `<title>${escape(`${field.name} — ${field.club}`)}</title>` +
        // An invisible disc twice the pin's size, so a finger can hit it. Kept
        // modest on purpose: the clubs with fields a few streets apart would
        // otherwise have hit areas swallowing each other.
        `<circle class="fieldmap__hit" cx="${x}" cy="${y}" r="15"/>` +
        `<circle class="fieldmap__dot" cx="${x}" cy="${y}" r="7"/>` +
        `<text x="${x}" y="${Math.round((y - 14) * 10) / 10}" text-anchor="middle">${escape(field.name)}</text>` +
        `</a>`
      );
    })
    .join("");

  return (
    `<svg class="fieldmap" viewBox="0 0 ${WIDTH} ${view.height}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${escape(title)}">` +
    `<title>${escape(title)}</title>${drawBase(view)}${marks}</svg>`
  );
}
