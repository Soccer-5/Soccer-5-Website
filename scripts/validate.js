// Checks the files volunteers edit before the site is built.
//
// Every message names the file, the line, and what to do about it, because the
// person reading it in the Actions log may never have seen a build log before.
// If this script exits non-zero the deploy stops and the live site is
// untouched.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parse } from "csv-parse/sync";
import { LEGACY_PAGES } from "./legacy-urls.js";

const problems = [];
const fail = (file, line, message) =>
  problems.push({ file, line, message });

// Line number of a front-matter key, for error messages.
const lineOf = (raw, key) => {
  const lines = raw.split("\n");
  const i = lines.findIndex((l) => l.startsWith(`${key}:`));
  return i === -1 ? 1 : i + 1;
};

const isUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------- pages

const LAYOUTS = ["page", "null"];
const DATA_SECTIONS = ["club-directory", "field-list", "uniform-table"];

const pageFiles = fs
  .readdirSync("content")
  .filter((f) => f.endsWith(".md"))
  .map((f) => path.join("content", f));

const orders = new Map();
const permalinks = new Map();

for (const file of pageFiles) {
  const raw = fs.readFileSync(file, "utf8");
  let data;
  try {
    ({ data } = matter(raw));
  } catch (err) {
    fail(file, 1, `The settings at the top of this file are not valid. ${err.message}`);
    continue;
  }

  if (!data.title || typeof data.title !== "string") {
    fail(file, 1, 'Missing "title:". Every page needs a title, for example: title: Contact');
  }

  if (!data.permalink) {
    fail(file, 1, 'Missing "permalink:". This is the page\'s web address, for example: permalink: /contact.html');
  } else if (typeof data.permalink !== "string" || !data.permalink.startsWith("/")) {
    fail(file, lineOf(raw, "permalink"), `"permalink: ${data.permalink}" must start with a slash, for example: /contact.html`);
  } else if (permalinks.has(data.permalink)) {
    fail(file, lineOf(raw, "permalink"), `Two pages have "permalink: ${data.permalink}". The other is ${permalinks.get(data.permalink)}. Each page needs its own address.`);
  } else {
    permalinks.set(data.permalink, file);
  }

  if (data.order !== undefined) {
    if (!Number.isInteger(data.order)) {
      fail(file, lineOf(raw, "order"), `"order: ${data.order}" must be a whole number, like 3. It sets the position in the menu.`);
    } else if (orders.has(data.order)) {
      fail(file, lineOf(raw, "order"), `Two pages have "order: ${data.order}". The other is ${orders.get(data.order)}. Give one of them a different number.`);
    } else {
      orders.set(data.order, file);
    }
  }

  if (data.layout !== undefined && !LAYOUTS.includes(String(data.layout))) {
    fail(file, lineOf(raw, "layout"), `"layout: ${data.layout}" is not a layout that exists. Use: layout: page`);
  }

  if (data.data_section !== undefined && !DATA_SECTIONS.includes(data.data_section)) {
    fail(file, lineOf(raw, "data_section"), `"data_section: ${data.data_section}" is not one of the tables this site can show. Use one of: ${DATA_SECTIONS.join(", ")}`);
  }

  if ((data.season_name && !data.season_url) || (data.season_url && !data.season_name)) {
    fail(file, 1, 'A season needs both "season_name:" and "season_url:". One of them is missing, so the schedule link would not appear.');
  }

  for (const key of ["season_url", "feedback_url", "form_url", "map_url"]) {
    if (data[key] && !isUrl(data[key])) {
      fail(file, lineOf(raw, key), `"${key}: ${data[key]}" is not a complete web address. It should start with https://`);
    }
  }
}

// Every legacy page URL must still be claimed by some page's permalink.
const claimed = new Set(
  [...permalinks.keys()].map((p) => (p === "/index.html" ? "/" : p.replace(/\.html$/, ""))),
);
for (const url of LEGACY_PAGES) {
  if (!claimed.has(url)) {
    fail(
      "content/",
      1,
      `No page claims the address "${url}" any more. That address worked on the old website, so links and bookmarks to it would break. Restore the "permalink:" line that had it.`,
    );
  }
}

// ----------------------------------------------------------------- data

const readCsv = (file, expectedHeader) => {
  const raw = fs.readFileSync(file, "utf8");
  const header = raw.split("\n")[0].trim();
  if (header !== expectedHeader.join(",")) {
    fail(file, 1, `The first line must stay exactly:\n    ${expectedHeader.join(",")}\n  but it currently reads:\n    ${header}`);
    return [];
  }
  try {
    return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    // csv-parse reports the offending line; surface it instead of "line 1".
    const at = /on line (\d+)/.exec(err.message);
    fail(
      file,
      at ? Number(at[1]) : 1,
      "This line could not be read. Usually that means it has the wrong number of commas, or a value containing a comma is missing its quotation marks around it — for example an address must be written as \"PO Box 1, Canby, OR\".",
    );
    return [];
  }
};

const clubs = readCsv("_data/clubs.csv", ["name", "city", "address", "email", "phone", "website", "logo"]);
clubs.forEach((row, i) => {
  const line = i + 2;
  if (!row.name) fail("_data/clubs.csv", line, "This club has no name. Every club needs a name in the first column.");
  if (row.email && !row.email.includes("@")) fail("_data/clubs.csv", line, `"${row.email}" does not look like an email address.`);
  if (row.website && !isUrl(row.website)) fail("_data/clubs.csv", line, `"${row.website}" is not a complete web address. It should start with https://`);
  if (row.logo && !fs.existsSync(path.join("assets/images/clubs", row.logo))) {
    fail("_data/clubs.csv", line, `The logo "${row.logo}" is not in assets/images/clubs/. Check the spelling, or leave the column empty.`);
  }
});

const fields = readCsv("_data/fields.csv", ["area", "name", "grades", "address", "map_url", "notes"]);
const areas = readCsv("_data/field_areas.csv", ["area", "dogs", "note"]);
const areaNames = new Set(areas.map((a) => a.area));
fields.forEach((row, i) => {
  const line = i + 2;
  if (!row.name) fail("_data/fields.csv", line, "This field has no name.");
  if (!row.area) fail("_data/fields.csv", line, "This field has no area. The area groups fields under a heading, for example: Canby");
  else if (!areaNames.has(row.area)) {
    fail("_data/fields.csv", line, `The area "${row.area}" is not listed in _data/field_areas.csv, so this field would not appear on the page. Add it there, or correct the spelling.`);
  }
  if (row.map_url && !isUrl(row.map_url)) fail("_data/fields.csv", line, `"${row.map_url}" is not a complete web address.`);
});

const uniforms = readCsv("_data/uniforms.csv", ["club", "jerseys", "colors"]);
uniforms.forEach((row, i) => {
  if (!row.club) fail("_data/uniforms.csv", i + 2, "This row has no club name.");
});

// --------------------------------------------------------------- report

if (problems.length === 0) {
  console.log(`Checked ${pageFiles.length} pages, ${clubs.length} clubs, ${fields.length} fields, ${uniforms.length} uniform rows. Everything looks right.`);
  process.exit(0);
}

console.error(`\nThe website was not updated because of ${problems.length} problem${problems.length === 1 ? "" : "s"} in the files that were just changed.`);
console.error("The website that is currently live has not changed. Fix the problems below and commit again.\n");
for (const p of problems) {
  console.error(`  ${p.file} (line ${p.line})`);
  console.error(`  ${p.message}\n`);
}
process.exit(1);
