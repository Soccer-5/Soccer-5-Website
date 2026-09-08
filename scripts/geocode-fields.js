// Turns the addresses in _data/fields.csv into map coordinates.
//
// Developers run this by hand; it is never part of `npm run build`, because the
// build has to work offline (plan §1). It writes _data/field_coordinates.json,
// which IS committed — the site build just reads that file like any other data.
//
//   node scripts/geocode-fields.js             only look up fields not cached yet
//   node scripts/geocode-fields.js --refresh   look up every field again
//
// Run it after adding a field or correcting an address, then commit the updated
// _data/field_coordinates.json alongside the CSV change. Every cached entry
// records the address that was searched and the address OpenStreetMap matched,
// so a wrong pin is visible in the diff instead of appearing silently on the map.

import fs from "node:fs";
import { parse } from "csv-parse/sync";

const CACHE = "_data/field_coordinates.json";
const ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Nominatim asks for an identifying User-Agent and at most one request per
// second. This is a one-time job over 49 rows, so that costs about a minute.
const USER_AGENT = "Soccer-5-Website field map build (https://soccer5clubs.org)";
const DELAY_MS = 1100;

// Every Soccer-5 field is in or next to Clackamas County. A result outside this
// box is Nominatim matching the wrong town in another state — common with a
// street address that has no city, and the kind of mistake that would otherwise
// show up as a pin in the middle of nowhere.
const BOUNDS = { minLat: 45.0, maxLat: 45.65, minLon: -123.1, maxLon: -121.9 };

const refresh = process.argv.includes("--refresh");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fields = parse(fs.readFileSync("_data/fields.csv", "utf8"), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const cache = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
  : {};

// Most addresses are found as they are written, but Nominatim will not match
// some abbreviations: it wants "5811 South Whiskey Hill Road", not "5811 S
// Whiskey Hill Rd.", and "Fischers" rather than "Fischer's". Spelling them out
// is only ever a fallback, so an address that already works keeps working.
const WORDS = {
  n: "North", s: "South", e: "East", w: "West",
  ne: "Northeast", nw: "Northwest", se: "Southeast", sw: "Southwest",
  rd: "Road", st: "Street", ave: "Avenue", av: "Avenue", dr: "Drive",
  ln: "Lane", blvd: "Boulevard", pkwy: "Parkway", hwy: "Highway",
  ct: "Court", cir: "Circle", pl: "Place", ter: "Terrace", way: "Way",
};
const spellOut = (address) =>
  address
    .replace(/'/g, "")
    .split(/\b/)
    .map((part) => WORDS[part.toLowerCase()] || part)
    .join("")
    .replace(/\.(?=\s|,|$)/g, "");

// A field's address is written for a parent reading it on the page ("1859 S.
// Township Rd., Canby"), so it usually has no state and sometimes no city.
// Ask for the address as written first, then spelled out; fall back to the
// field's own name, which for a school or a park is often the better-known
// thing in OpenStreetMap.
const queriesFor = (row) => {
  const withState = (s) => (/\bOR\b|Oregon/i.test(s) ? s : `${s}, OR`);
  const out = [];
  if (row.address) {
    out.push(withState(row.address));
    out.push(withState(spellOut(row.address)));
    // The mailing city is not always the city OpenStreetMap files the street
    // under — Ninety-One Grade School has a Hubbard address but sits across the
    // county line — so try the street on its own before giving up on it.
    out.push(withState(spellOut(row.address.split(",")[0])));
  }
  const city = (row.address || "").split(",").slice(-2)[0];
  out.push(withState(city ? `${row.name}, ${city.trim()}` : row.name));
  return [...new Set(out)];
};

// Nominatim answers "355 NE 6th Ave., Estacada" with the middle of Estacada
// when it cannot find the street number. A whole town is never a useful answer
// for a pin on a field, so throw those away and let a later query try.
const TOO_BROAD = new Set([
  "country", "state", "county", "city", "town", "village", "hamlet",
  "suburb", "neighbourhood", "postcode", "municipality",
]);

// Answers are ranked by how well they locate a *place*, which is not the same
// as Nominatim's own place_rank. A match on a road is only its midpoint —
// Athey Creek Middle School came back 3.5 km away down a long Borland Road —
// so a named park or school beats a road even though the park ranks lower in
// Nominatim's address hierarchy (a park is 24, a road 26).
const scoreOf = (hit) => (hit.addresstype === "road" ? 1 : 2);

const lookup = async (query) => {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const [hit] = await res.json();
  if (!hit || TOO_BROAD.has(hit.addresstype)) return null;
  return {
    lat: Number(Number(hit.lat).toFixed(6)),
    lon: Number(Number(hit.lon).toFixed(6)),
    matched: hit.display_name,
    kind: hit.addresstype,
    score: scoreOf(hit),
    rank: Number(hit.place_rank) || 0,
  };
};

const inBounds = ({ lat, lon }) =>
  lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat &&
  lon >= BOUNDS.minLon && lon <= BOUNDS.maxLon;

const found = [];
const missing = [];
let looked = 0;

for (const row of fields) {
  const key = `${row.club}|${row.name}`;

  // A lat/lon typed into fields.csv is a deliberate correction. It wins, and
  // there is nothing to look up.
  if (row.lat && row.lon) continue;
  if (cache[key] && !refresh) continue;

  // Try every phrasing and keep the most precise answer rather than the first
  // one: the address usually wins, but for a school or a park the field's own
  // name is often the only thing OpenStreetMap knows to building precision.
  let result = null;
  for (const query of queriesFor(row)) {
    if (looked++) await sleep(DELAY_MS);
    try {
      const hit = await lookup(query);
      if (!hit) continue;
      if (!inBounds(hit)) {
        console.warn(`  ${row.name}: "${query}" matched ${hit.matched}, which is outside Clackamas County — ignored`);
        continue;
      }
      const better =
        !result ||
        hit.score > result.score ||
        (hit.score === result.score && hit.rank > result.rank);
      if (better) result = { ...hit, searched: query };
      // An exact building at the address is as good as it gets; stop asking.
      if (result.score === 2 && result.rank >= 30) break;
    } catch (err) {
      console.warn(`  ${row.name}: lookup failed (${err.message})`);
    }
  }

  if (result) {
    cache[key] = result;
    found.push(row.name);
    console.log(`  ${row.name} -> ${result.lat}, ${result.lon}`);
  } else {
    missing.push(row);
  }
}

// Drop entries for fields that are no longer in the CSV, so the cache does not
// accumulate rows nobody can see.
const live = new Set(fields.map((row) => `${row.club}|${row.name}`));
for (const key of Object.keys(cache)) if (!live.has(key)) delete cache[key];

// Sorted so the committed file has a stable, reviewable diff.
const sorted = Object.fromEntries(
  Object.keys(cache).sort().map((key) => [key, cache[key]]),
);
fs.writeFileSync(CACHE, `${JSON.stringify(sorted, null, 2)}\n`);

console.log(`\n${Object.keys(sorted).length} of ${fields.length} fields have coordinates.`);
if (found.length) console.log(`Looked up ${found.length} this run.`);
if (missing.length) {
  console.log(`\nNo coordinates for ${missing.length} field(s). They will be left off the map:`);
  for (const row of missing) console.log(`  ${row.club} — ${row.name} (${row.address || "no address"})`);
  console.log("\nFix the address in _data/fields.csv and run this again, or look the");
  console.log("point up by hand and put it in the lat and lon columns for that row.");
}
