# Developer notes

Static site: Eleventy 3 → GitHub Pages. No client-side JavaScript ships. The
build must stay fast and boring, because the people who maintain the content
are volunteers editing files in the GitHub web UI.

Read [README.md](README.md) first — it is what those volunteers follow, and
several decisions here exist only to make that document true.

The full background, including why the URLs are what they are, is in
[docs/soccer5-site-plan.md](docs/soccer5-site-plan.md).

---

## Local setup

```bash
nvm use          # Node 24, pinned in .nvmrc — CI uses the same
npm ci
npm run serve    # http://localhost:8080
```

| Command | What it does |
|---|---|
| `npm run serve` | Dev server with live reload |
| `npm run build` | Build to `_site/` |
| `npm run validate` | Check content files (runs before build in CI) |
| `npm run check-urls` | Check the built site (runs after build in CI) |
| `npm run check` | validate → build → check-urls, the whole gate |

Run `npm run check` before pushing. It is exactly what CI runs.

### Testing the path prefix

The site is served from `soccer-5.github.io/Soccer-5-Website/` until the domain
cutover, so **the dev server does not reproduce production.** Anything that
resolves from the domain root works locally and can still 404 in production.
This has already caused one outage — root-absolute `@import`s in CSS.

To test the real thing:

```bash
npm run clean && PATH_PREFIX=/Soccer-5-Website/ npm run build
mkdir -p /tmp/pfx && cp -R _site /tmp/pfx/Soccer-5-Website
cd /tmp/pfx && python3 -m http.server 8099
# then open http://127.0.0.1:8099/Soccer-5-Website/
```

Do this before any change touching URLs, CSS imports, or fonts.

---

## Layout

```
content/     page bodies + front matter      ← volunteers
_data/       CSV data + site.json            ← volunteers
src/         templates and CSS               ← developers
scripts/     validate.js, check-urls.js      ← developers
assets/      images, fonts, legacy PDFs
docs/        the build plan
_design/     migration reference from the old site
```

Eleventy's input is the repo root so `content/` and `_data/` can sit at the top
level where volunteers find them. Everything that is not content is ignored
explicitly in `eleventy.config.js`.

---

## URLs are frozen

This is the constraint that shapes the most code. Every page URL matches what
the old Squarespace site served, including the ugly ones (`/uniforminfo`,
`/leaguerules`). People have bookmarked them and club sites link to them.

- Every page carries an explicit `permalink` in front matter. Filenames are
  readable (`uniform-info.md`); permalinks are legacy (`/uniforminfo.html`).
  **Do not "tidy" either one.**
- Pages are written flat (`_site/uniforminfo.html`), not as
  `directory/index.html`, so Pages serves them at the extensionless URL with no
  redirect.
- `scripts/legacy-urls.js` is the list. `check-urls.js` fails the build if any
  entry stops resolving. Do not delete entries to make a build pass.
- The `/s/` directory preserves Squarespace's asset paths. `assets/s/` is
  copied there verbatim. Do not rename those files.

Note that URLs saved from the old site's *address bar* for PDFs were
`static1.squarespace.com` links, which cannot be preserved. See plan §4.2.

---

## Path prefix

`PATH_PREFIX` comes from `configure-pages` in CI. `HtmlBasePlugin` rewrites
root-relative URLs in HTML output, so templates and Markdown write plain paths
like `/contact`.

**`HtmlBasePlugin` does not touch URLs inside CSS.** Every `url()` and
`@import` in a stylesheet must be relative — they resolve against the
stylesheet's own location and are therefore prefix-independent. `check-urls.js`
enforces this.

At cutover the prefix becomes empty and nothing else changes.

---

## Data layer

CSV files in `_data/` become arrays via `addDataExtension("csv", …)` in
`eleventy.config.js`. `clubs.csv` → `clubs`, and so on.

A page renders a table by naming it in front matter:

```yaml
data_section: club-directory   # or field-list, or uniform-table
```

`layouts/page.njk` includes the matching partial after the Markdown body. This
replaces the shortcode the plan originally specified — a shortcode is template
syntax in a file volunteers edit, which the whole design is trying to avoid.
Adding a new table means: a partial in `src/_includes/partials/`, a line in
`page.njk`, and the name added to `DATA_SECTIONS` in `scripts/validate.js`.

### The field map

`/fields` opens with an SVG map of every field, drawn at build time by
`src/field-map.js` and registered as the `leagueMap` shortcode. Nothing about
it runs in the browser: each pin is an ordinary `<a>` to that field's entry in
the list below, and the label on hover is CSS. It ships as markup inside
`fields.html`, so there is no extra request and nothing to load.

Two inputs feed it, and both are committed:

**`_data/field_coordinates.json`** — the geocoded position of each field,
keyed by `club|name`. It is written by a developer running

```bash
node scripts/geocode-fields.js
```

which looks up only the fields it has no position for. `--refresh` re-does all
of them. It reads the `address` column, asks Nominatim (rate-limited to one
request a second, as their policy requires), and records the address it
searched and the address that matched, so a wrong pin shows up in the diff
rather than silently on the map. Run it after a field is added or an address
corrected, and commit the JSON with the CSV change.

The build itself never touches the network — the plan's §1 constraint — so a
field with no entry here is left off the map and still listed with its address.
`validate.js` prints a warning naming it; it is not a build failure, because a
volunteer adding a field should never be able to stop the site publishing.

If geocoding gets one wrong, the escape hatch is the `lat` and `lon` columns in
`fields.csv`. Put the correct coordinates there directly and commit — no script
to run. A value in those columns wins outright over
`field_coordinates.json`, and `geocode-fields.js` skips a row that already has
both, so it will not overwrite your correction on a later run. `Mary S. Young
State Park` uses this — OpenStreetMap calls it "Mary S. Young Park", so the
address matched the middle of Willamette Drive a kilometre away.

**`src/data/basemap.geojson`** — county outlines, primary and secondary roads,
and rivers, from US Census TIGER/Line (public domain, no attribution required).
88 KB, clipped to `-122.90,45.10,-122.28,45.50`, coordinates at 4 decimals.
Every feature carries a `properties.layer` of `county`, `road` or `water`, which
is the only thing the renderer looks at. Water arrives as polygons for the wide
rivers and centrelines for the narrow ones, so both are handled.

It should not need regenerating — the county has not moved — but if it does,
the source files and `mapshaper` commands are in the plan (§9, Phase 5). If you
change the clip box, change `DRAWN` in `src/field-map.js` to match, or the map
will frame paper the basemap does not cover.

### Swapping to Google Sheets later

The plan (§8) keeps this door open. The change is confined to one place:
replace `_data/clubs.csv` with `_data/clubs.js` that fetches a published-to-web
CSV using `@11ty/eleventy-fetch` and parses it with the same `csv-parse` call.
Templates and validation do not change, because both consume `clubs` as an
array of objects. Keep the CSV as a fallback for when the fetch fails, and add
a `schedule:` cron to the workflow so it rebuilds daily.

---

## Design

`DESIGN.md` is the reference (Intercom-derived, warm cream editorial).
`src/css/tokens.css` is the token layer taken from it; `src/css/site.css` uses
only those tokens — no magic numbers.

Four deliberate departures from DESIGN.md, with reasoning, are recorded in plan
§3.1. The two that matter when editing CSS:

- The accent is the league maroon `#661C29`, not DESIGN.md's violet.
- `--color-smoke` and `--color-ash` must not be used for text. They measure
  3.4:1 and 2.5:1 on the canvas and fail the 4.5:1 floor this site holds to.

Fonts are self-hosted from `assets/fonts/` (Inter, JetBrains Mono, both SIL
OFL). No CDN request, so no visitor IP reaches a third party. Latin subset only.

Accessibility floor, checked by hand each time templates change: one `h1` per
page, no heading-level jumps, landmarks present, skip link works, visible focus,
4.5:1 body contrast, alt text on every image, no horizontal overflow at 320px.

---

## Deploys

Push to `main` → build → deploy. If `validate` or `check-urls` fails, nothing
deploys and the previous build stays live. `main` is protected against
force-push and deletion.

There is no preview environment. `npm run check` plus the path-prefix test above
is the substitute.
