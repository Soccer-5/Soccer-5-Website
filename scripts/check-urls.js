// Runs after the build, against _site/.
//
// Two jobs:
//   1. Every URL the old website served still resolves. Bookmarks and links
//      from club websites and emails point at these.
//   2. No internal link on the site points at a page or file that is missing.

import fs from "node:fs";
import path from "node:path";
import { LEGACY_URLS } from "./legacy-urls.js";

const OUT = "_site";
const prefix = (process.env.PATH_PREFIX || "/").replace(/\/+$/, "");
const problems = [];

// GitHub Pages serves /contact from _site/contact.html, and /x/ from
// _site/x/index.html. Accept anything Pages would accept.
const resolves = (url) => {
  const clean = url.split(/[?#]/)[0];
  const rel = decodeURIComponent(clean).replace(/^\//, "");
  if (rel === "" || rel.endsWith("/")) {
    return fs.existsSync(path.join(OUT, rel, "index.html"));
  }
  return (
    fs.existsSync(path.join(OUT, rel)) ||
    fs.existsSync(path.join(OUT, `${rel}.html`)) ||
    fs.existsSync(path.join(OUT, rel, "index.html"))
  );
};

for (const url of LEGACY_URLS) {
  if (!resolves(url)) {
    problems.push(
      `The address "${url}" worked on the old website but is missing from this build.\n` +
        `  Anyone who bookmarked it, or linked to it from a club website or email, would get a "page not found".\n` +
        `  See docs/soccer5-site-plan.md section 4.`,
    );
  }
}

// Crawl the built HTML for internal links.
const htmlFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
walk(OUT);

const dead = new Map();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let url = m[1];
    if (!url.startsWith("/")) continue; // external, anchor, or mailto
    if (prefix && url.startsWith(`${prefix}/`)) url = url.slice(prefix.length);
    if (!resolves(url)) {
      if (!dead.has(url)) dead.set(url, new Set());
      dead.get(url).add(path.relative(OUT, file));
    }
  }
}
for (const [url, pages] of dead) {
  problems.push(`The link "${url}" points at something that does not exist. Used on: ${[...pages].join(", ")}`);
}

if (problems.length === 0) {
  console.log(`Checked ${LEGACY_URLS.length} old addresses and every internal link across ${htmlFiles.length} pages. Nothing is broken.`);
  process.exit(0);
}

console.error(`\nThe website was not updated because ${problems.length} link${problems.length === 1 ? "" : "s"} would be broken.`);
console.error("The website that is currently live has not changed.\n");
for (const p of problems) console.error(`  ${p}\n`);
process.exit(1);
