# Soccer-5 Website Rebuild — Build Plan

Rebuild https://www.soccer5clubs.org (currently Squarespace) as a static site
built with Eleventy, hosted on GitHub Pages, maintained by non-technical
volunteers who edit files in the GitHub web UI and commit directly to `main`.

This document is the working brief for a Claude Code session. Work through the
phases in order. Each phase ends with a checkable "done when."

---

## 1. Goals and constraints

**Goals**
- $0/month hosting. Only recurring cost is the domain registration.
- Volunteers can update club contacts, field info, uniform info, and season
  links by editing a file in GitHub and clicking "Commit changes." No local
  tooling, no PRs, no CLI.
- A bad edit can never take the site down: the build fails, the last good
  deploy stays live, and someone gets an email.
- Content is separated from presentation. Volunteers touch `content/` and
  `_data/` only; they never touch templates or CSS.
- New visual design, based on a DESIGN.md from styles.refero.design (Bill
  supplies) plus league assets (Bill supplies).

**Hard constraints**
- Public GitHub repo (required for free Pages + free Actions minutes).
- No client-side JavaScript framework. Plain HTML/CSS; small vanilla JS only
  if something genuinely needs it (e.g. mobile nav toggle).
- No external services at build time in v1 (no Google Sheets fetch). Keep the
  door open for it later — see §8.
- No forms in v1. If the old Contact page has a Squarespace form, replace it
  with a `mailto:` link or note it as an open item — do not build a form
  handler.
- No custom webfonts unless the DESIGN.md calls for one that is freely
  available (Google Fonts / Bunny Fonts). Otherwise use the system stack.
- **URL preservation.** Every URL the old site serves that a human could have
  bookmarked or linked to must resolve on the new site — same path, no 404.
  This covers all eight content pages and the same-origin `/s/` asset paths.
  See §4.1. Squarespace CDN URLs — both `images.squarespace-cdn.com/...` and
  `static1.squarespace.com/static/...` — are out of scope and **will break**:
  they are on a foreign origin we do not control and they disappear when the
  subscription is cancelled. Accepted loss, see §4.2.

**Non-goals**
- CMS UI (Decap/Sveltia). Explicitly deferred.
- Search, comments, analytics, dark mode. Not needed.
- Pixel-matching the Squarespace site. The design is being replaced.

---

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Generator | Eleventy (latest 3.x) | Minimal, Markdown-native, sub-second builds, no framework |
| Templates | Nunjucks (`.njk`) | Eleventy default, readable for future maintainers |
| Content | Markdown with YAML front matter | Most forgiving format for hand editing |
| Structured data | CSV in `_data/` | GitHub renders CSV as a table; nearly impossible to break |
| Hosting | GitHub Pages via Actions workflow | One platform for editing and hosting |
| Deploy trigger | Every push to `main` + manual `workflow_dispatch` | No PRs, no branches for volunteers |
| Package manager | npm, `package-lock.json` committed | Reproducible builds in CI |
| Node | Current LTS, pinned in `.nvmrc` and the workflow | Same version locally and in CI |
| URLs | Old Squarespace paths kept verbatim, set per-page via `permalink` | Existing bookmarks and third-party links keep working without redirect stubs (§4.1) |

---

## 3. Inputs Bill provides before Phase 3

Put these in the repo root or `_design/` before starting the design phase:

- `DESIGN.md` — downloaded from styles.refero.design. Use its CSS custom
  properties block as the token layer in `src/css/tokens.css`. Follow its
  do/don't rules. Swap the accent color for the league color if they differ.
- ~~League assets~~ — settled 2026-09-07. The league has no brand. Bill made an
  S5 avatar (maroon disc, white "S5" over a white mountain range), now traced
  to `assets/images/logo/s5.svg` (2.9 KB) with PNG fallbacks beside it. The
  SVG is the canonical mark; the original 1128px raster has been deleted and
  is in git history if needed.
  Sampled from it: **`#661C29`** maroon and white. That is the palette.
  There are no photographs on the site — see §3.1.
- Nothing to supply for the `/s/` files — Phase 1 downloads all four
  (two rules PDFs, the referee flyer, the CYSO logo) straight from the live
  site. Bill only needs to confirm the two rules PDFs are the current ones.
- Which GitHub org the repo lives in, and the custom domain to use
  (`soccer5clubs.org`, with `www` redirecting, or the reverse). Org and repo
  settled: `Soccer-5/Soccer-5-Website`.

### 3.1 No photographs — decided 2026-09-07

The old site carried eight hero photos, 5.2 MB in total, all Squarespace stock.
They are gone and are not being replaced. Reasons, in order of weight:

1. **They worked against the site's job.** People arrive to find the schedule
   link, a field address, or a club contact. A 1.4 MB decorative photo above a
   list of 49 addresses is an obstacle for someone checking a field location on
   a phone in a parking lot.
2. **Licensing.** They were stock images licensed through Squarespace. Re-hosting
   them on GitHub Pages is very likely outside that license, so keeping them
   would have been a legal question as well as a design one.
3. **Photographs of children are a separate problem.** Free-license stock sites
   grant copyright, not model releases. Pictures of identifiable kids who are
   not in the league read strangely on a youth league site.

The design therefore rests on the maroon, the logo, and typography. If the
league later supplies its own game photos with parental consent, the templates
can take them — but the default stays no photos, and stock photography of
children is not to be added.

The eight old heroes are recoverable from git history (removed in the commit
that recorded this decision) if anyone ever wants them back.

---

## 4. Content inventory and URL map (from the live site, Sept 2026)

Verified against `https://www.soccer5clubs.org/sitemap.xml` on 2026-09-07.
Eight pages. **The `Path` column is contractual** — these are the URLs the new
site must serve (see §4.1).

| Path (unchanged) | Old page | In nav | Content type | Notes |
|---|---|---|---|---|
| `/` | Home | — | Prose + hero image | League description, service area list, registration timing, equipment list, schedule caveats, "referees needed" section |
| `/home` | Home | — | duplicate of `/` | Squarespace's canonical home slug. Redirect to `/` |
| `/contact` | CONTACT | yes | **Club directory** (structured) | ~13 clubs: name, mailing address, email, website. Drives `_data/clubs.csv`. Also embeds `/s/cyso_original_colored_logo.png` |
| `/fields` | FIELDS | yes | Structured list (verify) | Field names, addresses, map links. Likely drives `_data/fields.csv` — confirm shape during Phase 1 |
| `/uniforminfo` | UNIFORM INFO | yes | Prose or table (verify) | Note the slug: `uniforminfo`, not `uniforms`. Decide prose vs CSV during Phase 1 |
| `/referees` | REFEREES | yes | Prose | Why/how to become a referee, links to oregonreferee.com and assignor contact. Links `/s/Why-You-Should-Consider-Becoming-a-Soccer-5-League-Referee-2024.pdf` |
| `/leaguerules` | LEAGUE RULES | yes | Short prose + PDF links | Note the slug: `leaguerules`, not `rules`. Links **two** PDFs, not one |
| `/schedules` | SCHEDULES | yes | One link + hero image | Season name + link to the Affinity/SportsAffinity schedule. Season link changes twice a year — make it a single obvious front-matter field |
| `/refereefeedback` | REFEREE FEEDBACK | no | One line + one link | **Not in the plan before.** Not in the site nav, but it is in the sitemap, so coaches were given the URL directly. Body: "Coaches, submit your referee feedback on this form" → `https://bit.ly/Soccer5RefereeFeedback`. Build it as a real page at the same path |

Same-origin asset URLs that must also keep working. These are the paths in
the page HTML; Squarespace 302s each one to a `static1.squarespace.com` URL
(see §4.2), so serve the file directly at the `/s/` path instead:

| Path (unchanged) | What | Linked from |
|---|---|---|
| `/s/Soccer-5-2025-2026-Rules-1.pdf` | Full league rules | `/leaguerules` |
| `/s/Soccer-5-2025-2026-Rules-Summary-1.pdf` | Rules summary | `/leaguerules` |
| `/s/Why-You-Should-Consider-Becoming-a-Soccer-5-League-Referee-2024.pdf` | Referee recruiting flyer | `/referees` |
| `/s/cyso_original_colored_logo.png` | Club logo | `/contact` |

Drop from the old site: `/cart` (Squarespace commerce residue — no real
content, no reason to preserve), any Squarespace-injected scripts, the
duplicated nav blocks.

**Phase 1 task:** crawl all eight pages, save the raw text of each to
`_design/inventory/<page>.md` as reference, download every `/s/` asset, and
confirm the structure of Fields and Uniform Info before designing the data
files. Re-run the sitemap crawl at the top of Phase 1 in case anything was
added since this table was written.

### 4.1 URL preservation strategy

Bookmarks and third-party links (club websites, league emails, printed
flyers) point at the old paths. Breaking them is not acceptable, and the old
slugs are ugly enough (`uniforminfo`, `leaguerules`) that the temptation to
"clean them up" needs to be named and refused here.

**Decision: keep the old paths as the canonical paths.** Do not rename to
`/uniforms/` or `/rules/` and redirect. Reasons: a static site on GitHub Pages
has no server-side 301 — the only redirect mechanism is a `<meta http-equiv>`
stub page, which is slower, invisible to some crawlers, and one more file to
keep in sync. If the path is the path, there is nothing to maintain.

Mechanics:

- Every page in `content/` carries an explicit `permalink` in its front
  matter. Do not let Eleventy derive URLs from filenames — a volunteer
  renaming a file must not be able to change a URL by accident.
- Emit **`<slug>.html`, not `<slug>/index.html`.** Directory-style output
  (`_site/leaguerules/index.html`) makes GitHub Pages 301 `/leaguerules` →
  `/leaguerules/`: the bookmark still works, but the URL changes in the
  address bar and costs a round trip. Flat output (`permalink:
  /leaguerules.html` → `_site/leaguerules.html`) is served directly at
  `/leaguerules` by Pages' extensionless lookup, with no redirect and the URL
  unchanged. **Confirmed on 2026-09-07** with a throwaway `/probe.html`
  deployed to `soccer-5.github.io/Soccer-5-Website/`: `GET /probe` → 200, no
  `Location` header, URL unchanged. Flat permalinks are the standard for
  every page.
- File names in `content/` stay readable (`uniform-info.md`) while the
  permalink stays legacy (`/uniforminfo`). Document the pairing in
  `CONTRIBUTING-DEV.md` so nobody "fixes" it later.
- `/home` is the one genuine redirect: a stub page at `/home` with
  `<meta http-equiv="refresh" content="0; url=/">` plus a
  `<link rel="canonical" href="/">` and a visible "Redirecting to the home
  page" link for no-JS/no-refresh clients.
- The `/s/` assets keep their exact paths: put the files in `assets/s/` and
  passthrough-copy that directory to `/s/` in `eleventy.config.js`. Yes, `/s/`
  is a Squarespace-ism. It costs nothing, it keeps any existing `/s/` link
  alive, and it is the only PDF URL we can preserve at all (§4.2). Do not
  rename the PDFs — the filename is part of the URL. When the 2026-2027 rules
  land, add the new file, leave the old one in place, and point
  `/leaguerules` at the new one.
- The nav on the new site links to the same paths, so nav links and legacy
  bookmarks are the same URLs — nothing diverges over time.

**Enforcement:** `scripts/validate.js` gets a `LEGACY_URLS` array containing
every path in the two tables above. After the build, it asserts that each one
resolves to a file in `_site/` (either `<path>.html`, `<path>/index.html`, or
the file itself for assets). A missing one fails the build with the message
"URL `/leaguerules` no longer exists — old bookmarks would break." This is the
one check that must not be deleted when someone reorganizes content later.

### 4.2 URLs that will break — accepted losses

Not everything is savable. Name these now so nobody spends Phase 6 trying.

**Squarespace CDN file URLs.** `/s/<file>.pdf` is not where Squarespace
actually serves the file; it is a 302 to a `static1.squarespace.com` URL
carrying the site id, an opaque file id, and a timestamp:

```
https://www.soccer5clubs.org/s/Soccer-5-2025-2026-Rules-Summary-1.pdf
  → 302 → https://static1.squarespace.com/static/648b75fdcd6027391c2f44d0/t/
          68aca8164016f16bda18f803/1756145686668/
          Soccer-5+2025-2026+Rules+Summary+%281%29.pdf
```

Anyone who opened the rules PDF and then bookmarked it, or copied the address
bar, or pasted the link into an email, has the `static1` URL — not the `/s/`
one. That is the likeliest saved form of the rules link, and it is on an
origin we do not control. It dies with the subscription. Nothing to do about
it.

Practical consequences:

- Still preserve the `/s/` paths. They are what the page HTML links to, they
  cost one passthrough-copy line, and they are the only PDF URL that *can*
  survive.
- Do not attempt to mirror `static1` paths. The site id and file id are
  Squarespace-internal; recreating that structure on Pages would be pointless
  cargo-culting for links that would still have the wrong hostname.
- Because the rules PDF link is the one most likely to be saved and the one
  most certainly broken, Phase 6 includes an explicit "the rules PDF has moved
  to `https://soccer5clubs.org/s/<file>.pdf`" note to club contacts. That
  outreach, not a redirect, is the mitigation.

**Squarespace CDN image URLs.** Same story for
`images.squarespace-cdn.com/...` (the two hero photos). Re-hosted under
`/assets/images/`; any third party hot-linking the old CDN URL breaks.

**Not a loss:** the bit.ly links, including `bit.ly/Soccer5RefereeFeedback`
on `/refereefeedback`. Bill controls those and is not changing them, so they
keep working through the cutover independent of anything here. Carry them
over verbatim; do not "clean them up" into direct URLs — the short link is
the stable address, and rewriting it would throw away the one layer of
indirection that survives platform moves.

---

## 5. Repository layout

```
soccer5-site/
├── .github/
│   └── workflows/
│       └── deploy.yml          # build + validate + deploy to Pages
├── .nvmrc
├── .gitignore                  # node_modules, _site
├── package.json
├── package-lock.json
├── eleventy.config.js
├── README.md                   # volunteer-facing: how to edit (see §7)
├── CONTRIBUTING-DEV.md         # developer-facing: local dev, structure, design tokens
├── DESIGN.md                   # from refero, design reference for humans and agents
├── CLAUDE.md                   # pointers for future Claude Code sessions
├── content/                    # ← volunteers edit here
│   ├── index.md                # → /
│   ├── home-redirect.md        # → /home  (redirect stub to /)
│   ├── contact.md              # → /contact
│   ├── fields.md               # → /fields
│   ├── uniform-info.md         # → /uniforminfo   (legacy slug — do not rename)
│   ├── referees.md             # → /referees
│   ├── referee-feedback.md     # → /refereefeedback
│   ├── league-rules.md         # → /leaguerules   (legacy slug — do not rename)
│   └── schedules.md            # → /schedules
├── _data/                      # ← volunteers edit here
│   ├── site.json               # site title, tagline, base URL, nav order
│   ├── clubs.csv
│   ├── fields.csv              # if Fields turns out to be structured
│   └── uniforms.csv            # if Uniform Info turns out to be structured
├── src/                        # ← developers only
│   ├── _includes/
│   │   ├── layouts/
│   │   │   └── base.njk
│   │   └── partials/
│   │       ├── nav.njk
│   │       ├── footer.njk
│   │       ├── club-directory.njk
│   │       └── field-list.njk
│   ├── css/
│   │   ├── tokens.css          # custom properties from DESIGN.md
│   │   └── site.css            # layout + components
│   └── js/
│       └── nav.js              # only if needed
├── assets/
│   ├── images/
│   ├── s/                      # copied to /s/ — legacy Squarespace asset paths
│   │   ├── Soccer-5-2025-2026-Rules-1.pdf
│   │   ├── Soccer-5-2025-2026-Rules-Summary-1.pdf
│   │   ├── Why-You-Should-Consider-Becoming-a-Soccer-5-League-Referee-2024.pdf
│   │   └── cyso_original_colored_logo.png
│   └── favicon/
├── scripts/
│   └── validate.js             # front matter + CSV schema + legacy-URL checks
└── _site/                      # build output, gitignored
```

Rationale: everything a volunteer touches is under `content/` and `_data/`,
top level, no nesting. Everything else is one level down or in dotfiles.

---

## 6. Content model

### 6.1 Pages (`content/*.md`)

Front matter schema, enforced by `scripts/validate.js`:

```yaml
---
title: Contact            # required, shown as page heading and <title>
permalink: /contact.html  # required, the live URL — see §4.1, do not change
nav: Contact              # optional, nav label if different from title
order: 2                  # optional, integer, nav position; omit to keep out of nav
layout: page              # optional, defaults to "page"
hero: /assets/images/x.jpg # optional
description: ...          # optional, meta description
---
Markdown body.
```

`permalink` is required on every page and is treated as frozen: `validate.js`
cross-checks the full set against its `LEGACY_URLS` list, so removing or
editing one fails the build.

Home page (`index.md`) uses `layout: home`, `order: 0`, `permalink: /`.
`/refereefeedback` has no `order` — it is a real page but not in the nav,
same as today.

Schedules page gets explicit fields so the twice-a-year edit is one line:

```yaml
---
title: Schedules
order: 6
season_name: Fall 2026
season_url: https://oysa.sportsaffinity.com/...
---
```

Pages that render structured data (Contact, Fields) keep their Markdown body
for intro prose and include the data partial via a shortcode, e.g.
`{% clubDirectory %}`. Volunteers never see Nunjucks; the shortcode name is
documented in README.

### 6.2 Clubs (`_data/clubs.csv`)

```
name,city,address,email,website,phone,notes
Clackamas United Soccer Club,Clackamas,"12042 SE Sunnyside Rd., Clackamas, OR 97015",,https://www.clackamasunited.com,,
Oregon City Soccer Club,Oregon City,"PO Box 307 Oregon City, OR 97045",registrar@ocsoccerclub.org,https://www.ocsoccerclub.org,,
```

- `name` required; everything else optional and rendered only if present.
- Sorted by `name` at build time regardless of row order.
- Normalize `website` to include scheme at build time so volunteers can paste
  `www.example.org`.
- Validation: header row exact match, `name` non-empty, `website` parses as a
  URL if present, `email` contains `@` if present.

### 6.3 Fields and Uniforms

Decide in Phase 1 after seeing the actual pages. Default assumptions:

- `fields.csv`: `name,address,map_url,notes,host_club`
- `uniforms`: probably prose in `uniforms.md`; only make it CSV if the old
  page is clearly a per-club table.

Eleventy reads CSV via a tiny `_data/*.js` wrapper or a global data extension
using `csv-parse`. Keep the parser dependency small.

### 6.4 Site config (`_data/site.json`)

```json
{
  "title": "Soccer-5",
  "tagline": "Recreational Soccer League",
  "url": "https://soccer5clubs.org",
  "contact_email": ""
}
```

---

## 7. Volunteer workflow (goes in README.md)

README.md is the single document volunteers read. Write it for someone who
has never used GitHub. Sections:

1. **What this site is** — two sentences.
2. **How to edit a page** — with screenshots or exact click path:
   open `content/`, click the file, click the pencil, edit, scroll down,
   "Commit changes" → "Commit directly to the main branch" → Commit.
   Site updates in about 2 minutes.
3. **How to update the club list** — same steps for `_data/clubs.csv`, plus
   "one club per line, keep the first line exactly as is, put quotes around
   anything containing a comma."
4. **How to update the schedule link** — edit `season_name` and `season_url`
   in `content/schedules.md`.
5. **Markdown cheat sheet** — headings, bold, links, lists. Five lines.
6. **If something goes wrong** — "If your change doesn't appear after 5
   minutes, your edit broke the build. The old site is still up. Check the
   Actions tab for a red X, open it, and read the error. Or email <dev>."
7. **Do not edit** — anything under `src/`, `.github/`, or config files.
8. **Do not change the `permalink:` line** at the top of a page, and do not
   rename or delete files in `assets/s/`. Those are the web addresses people
   have bookmarked; changing one breaks their link. The build will stop you,
   but it is easier not to try.

Also set the repo's default file view so `content/` and `_data/` are obvious
(they're at the top level, alphabetically before `src/`).

---

## 8. Deferred: Google Sheets as a data source

Not in v1. If volunteers find CSV editing painful, the path is:

- Publish the sheet to web as CSV (File → Share → Publish to web → CSV).
  Public URL, no auth, no secrets.
- `_data/clubs.js` fetches that URL with `@11ty/eleventy-fetch` (cached).
- Add `schedule: cron: "0 12 * * *"` to the workflow so it rebuilds daily.
  Keep `workflow_dispatch` for on-demand.
- Keep `clubs.csv` in the repo as a fallback if the fetch fails, so a
  Google outage doesn't break the build.

Design the data layer in Phase 2 so swapping the source is a one-file change.

---

## 9. Build phases

### Phase 0 — Repo bootstrap
- Create repo in the league's GitHub org. Public. `main` as default branch.
  Done: org `Soccer-5`, repo `Soccer-5-Website`, served at
  `https://soccer-5.github.io/Soccer-5-Website/` until the domain cutover.
  Because that is a project-pages subpath, the build takes a `PATH_PREFIX`
  env var (from `configure-pages`' `base_path`) and every internal link in a
  template must go through Eleventy's `url` filter. At cutover the prefix
  becomes empty and nothing else changes.
- `npm init`, install `@11ty/eleventy`, `csv-parse`. Pin Node in `.nvmrc`.
- `eleventy.config.js`: input `.`, includes `src/_includes`, output `_site`,
  ignore `README.md`, `CONTRIBUTING-DEV.md`, `DESIGN.md`, `CLAUDE.md`,
  `_design/`. Passthrough copy `assets/`, `src/css/`, `src/js/`, and
  `assets/s/` → `/s/` (legacy asset paths, §4.1).
- Hello-world page builds and serves locally with `npx @11ty/eleventy --serve`.
- ~~**Verify extensionless URL serving on GitHub Pages**~~ (§4.1). Done
  2026-09-07: `/probe` returned 200 with no redirect. Flat permalinks
  (`permalink: /leaguerules.html`) confirmed for every page. Probe deleted.
- `.github/workflows/deploy.yml` using `actions/configure-pages`,
  `actions/upload-pages-artifact`, `actions/deploy-pages`. Trigger on push
  to `main` and `workflow_dispatch`. Concurrency group so overlapping commits
  don't race.
- Enable Pages in repo settings → Source: GitHub Actions.
- Enable Actions failure notifications for the org owner (and document how
  volunteers can watch the repo for failures).

**Done when:** pushing to `main` deploys the hello-world page to
`<org>.github.io/<repo>`.

### Phase 1 — Content migration
- Re-crawl `/sitemap.xml` first; reconcile against the §4 table and add any
  path that appeared since 2026-09-07.
- Crawl all eight live pages. Save raw text to `_design/inventory/`.
- Download the two hero images into `assets/images/`, and all four `/s/`
  files into `assets/s/` with the **`/s/` path filenames byte-for-byte
  unchanged** — follow the 302 to fetch the bytes, but name the local file
  after the `/s/` path, not the `static1` one (they differ: hyphens vs
  URL-encoded spaces).
- Set `permalink` on every page to its legacy path from §4.
- Write `content/*.md` for every page with the text migrated faithfully.
  Preserve wording; fix only obvious typos and Squarespace formatting
  artifacts (the old site bolds entire paragraphs — don't carry that over).
- Build `_data/clubs.csv` from the Contact page.
- Decide Fields/Uniforms structure and build those data files if warranted.
- Wire the CSV loader and the `clubDirectory` shortcode.
- Unstyled but complete site renders all pages with all content.

**Done when:** every piece of information on the old site is reachable on the
new one, with a side-by-side checklist in `_design/inventory/CHECKLIST.md`,
and every URL in §4 resolves in the local build.

### Phase 2 — Validation and safety net
- `scripts/validate.js`: checks front matter schema for every page (including
  a required `permalink`), CSV headers and required columns, that `order`
  values are unique, and that every `season_url`/`website`/`map_url` parses.
  Exit non-zero with a plain-English message that names the file and line.
- Legacy-URL check (§4.1): a post-build pass over `LEGACY_URLS` asserting each
  path resolves in `_site/`. Also crawl the built HTML for internal `href`s
  and fail on any that resolve to nothing — one dead-link check covers both
  new pages and the `/s/` assets.
- Add `npm run validate` (pre-build schema checks) and `npm run check-urls`
  (post-build) to the workflow. A URL regression must fail the deploy.
- Test it: commit a deliberately broken CSV, confirm the build fails, the
  old deploy stays live, and the Actions log message is readable by a
  non-developer. Revert.
- Add a `CODEOWNERS`-free branch protection that only blocks force-pushes and
  deletion of `main`. Do NOT require PRs or status checks.

**Done when:** a bad commit produces a red X with a message a volunteer could
act on, and the live site is unaffected.

### Phase 3 — Design
- Bill drops `DESIGN.md` into the repo. Assets are already in (§3).
- Read `DESIGN.md` fully. Extract the CSS custom properties block into
  `src/css/tokens.css`. The accent is `#661C29`, sampled from the league
  avatar; substitute it for whatever accent `DESIGN.md` ships with.
- No hero image block — see §3.1. The page header carries the logo and the
  page title, and content starts immediately.
- Build `base.njk`, `nav.njk`, `footer.njk`, `home.njk`, `page.njk`.
- Build `site.css` using only tokens from `tokens.css`. No magic numbers.
- Components needed: page header with logo, nav (responsive; hamburger only if
  the DESIGN.md pattern needs it), prose container, club
  directory (cards or table — pick what fits the design), field list,
  "season link" callout on Schedules, footer with league name and a
  "site source on GitHub" link.
- Accessibility floor: semantic landmarks, skip link, visible focus,
  4.5:1 contrast for body text, images have alt text, nav works without JS.
- Test at 360px, 768px, 1280px widths.

**Done when:** all pages render in the new design, Lighthouse accessibility
≥ 95, no console errors, and every page is under 300 KB total. With no
photographs there is nothing to exempt from that budget.

### 3.1 What was built, and where it departs from DESIGN.md

DESIGN.md is a SaaS marketing language; this is a utility site. Most of it
carried over. The departures, all deliberate:

- **Accent is `#661C29`, not `#0007cb`.** Planned substitution. The maroon
  measures 11.3:1 on the cream canvas, so unlike the violet it is safe for
  body text, not just decoration.
- **No Serrif face.** DESIGN.md pairs a serif with the sans for editorial
  texture, but also says never to mix more than two typographic voices. Inter
  plus JetBrains Mono is two, and a serif earns nothing on a page of 49 field
  addresses. Saves a font download.
- **`--color-smoke` and `--color-ash` are not used for text.** DESIGN.md
  assigns them to muted headings and inactive tabs; they measure 3.4:1 and
  2.5:1 on the canvas and fail this site's 4.5:1 floor. They stay in the
  token file for non-text use.
- **Body copy is weight 400, headings 300.** This is DESIGN.md's own rule
  ("use weight 400 only for body and supporting text where readability is
  paramount"), applied literally rather than stretching the 300 signature
  across everything.
- **Components that had no subject were skipped**: announcement banner, tab
  nav, product screenshot panel, customer logo grid, image strip, two-column
  feature blocks. The club directory reuses the card treatment; the schedule
  link reuses the filled black button.

Fonts are self-hosted from `assets/fonts/` rather than loaded from a CDN, so
no visitor IP reaches a third party and the site has no runtime dependency
the league does not control. Inter and JetBrains Mono are both SIL OFL. Latin
subset only, four faces, 91 KB total.

Measured: heaviest page (Contact, with 14 club logos) is 166 KB. No
JavaScript ships at all — the nav is plain links, so it works with scripting
disabled.

### Phase 4 — Documentation
- `README.md` per §7.
- `CONTRIBUTING-DEV.md`: local setup, where things live, how to add a page,
  how the data layer works, how to swap to Google Sheets later.
- `CLAUDE.md`: one-paragraph orientation, pointer to this plan, the rule that
  `content/` and `_data/` are volunteer-owned and `src/` is developer-owned.

**Done when:** a volunteer can follow README to change a club's email
without asking anyone.

Done 2026-09-07. Walked the README's own steps: editing the `email` column in
`clubs.csv` publishes correctly, and the mistake the README warns about (an
address with a comma and no quotation marks) produces exactly the error the
"If something goes wrong" section describes, naming the file and the line.

README covers the §7 list plus a file-to-page table, because
`uniform-info.md` → Uniform Info and `league-rules.md` → League Rules are not
guessable from the filename. It also tells volunteers not to touch
`permalink`, which §4.1 depends on.

CONTRIBUTING-DEV.md documents the path-prefix test explicitly, since the dev
server does not reproduce production and that gap has already caused one
outage (root-absolute `@import`s in CSS, fixed in commit 70e5e2b).

### Phase 5 — Field map

An embedded map of all 49 fields on `/fields`, generated at build time from
`_data/fields.csv`. No third-party service at runtime, no visitor IP leaves
the site, no JavaScript — consistent with §1's hard constraints.

#### Chosen approach: build-time SVG

A Nunjucks shortcode projects each field's coordinates onto a static county
basemap and renders one `<a href="#field-slug"><circle/><text/></a>` per
field, pins colored by host club. Hover label is pure CSS
(`circle:hover + text { opacity: 1 }`), so it needs no script and degrades to
"tap to jump to the list entry" on phones, which is most of this audience.

- Basemap: Clackamas County boundary, primary roads, hydrography from Census
  TIGER/Line (public domain, no attribution required), simplified with
  `mapshaper` to roughly 100 KB of GeoJSON, committed under `src/data/`.
- Coordinates: geocoded from each field's `address` column (below), not typed
  in by volunteers — see below.
- Same shortcode, given a bounding box, can render a small per-club inset;
  useful where pins are dense (Willamette United has 14 fields within about
  15 km — at county scale their pins overlap).

**Fallback:** if the SVG basemap looks too stylized once built, switch to a
raster PNG composited from OSM tiles by a developer-run script
(`scripts/render-field-map.js`, run manually, output committed to
`assets/images/`), with an HTML image map (`<area shape="circle" title="Name
· Club">`) laid over it for the hover/tap targets. Same coordinate data
feeds both; switching does not touch `_data/`.

#### Data model changes

`_data/fields.csv`'s leading column, `area`, is renamed `club` and its values
switch from the current area labels (`Canby`, `Molalla Soccer`, `Valley
Premier FC Fields`, …) to a `name` in `_data/clubs.csv`. Two optional trailing
columns are also added:

```
club,name,grades,address,map_url,notes,lat,lon
```

`lat`/`lon` are an override, left blank in the normal case. The build's data
source of truth stays `address` — see below. A volunteer only touches
`lat`/`lon` if geocoding gets a specific address wrong (a school with the
field on the far side of a large campus, for instance) and someone looks up
the correct point by hand; document that as an edge case in README, not the
normal workflow.

`_data/field_areas.csv` drops its `area` column and gains a required `club`
column in its place — sections are now titled by club, not by area:

```
club,dogs,note
Canby United Soccer Association,,
```

`validate.js` fails the build if a `club` value, in either file, doesn't
match a row in `clubs.csv`, the same pattern already used for `permalink` and
`order`. `field-list.njk` groups `fields.csv` by `club` instead of `area`, and
the per-club `dogs`/`note` lookup in `field_areas.csv` becomes a match on
`club` instead of `area`.

#### Geocoding: address-first, committed cache

Volunteers are not going to look up and paste latitude/longitude, and
shouldn't have to — the address column already exists and is the thing
they'll actually maintain. But Eleventy's own build (`npm run build`, what
GitHub Actions runs on every commit) must stay offline per §1, so geocoding
can't happen inline in the build.

Instead:

1. A developer-run script, `scripts/geocode-fields.js`, reads
   `fields.csv`, geocodes any row missing `lat`/`lon` via a free geocoder
   (Nominatim, rate-limited to 1 req/s — this is a one-time, low-volume job,
   not a runtime dependency), and writes the results to a committed cache,
   `_data/field_coordinates.json`, keyed by `club|name`.
2. The Eleventy build reads that cache as ordinary `_data` — no network
   call, same as any other CSV.
3. A field with no cache entry and no `lat`/`lon` override is simply left off
   the map; `validate.js` prints a warning (not a build failure) naming the
   field, so a volunteer adding a new field notices without the whole site
   breaking on the next commit.
4. Re-run `geocode-fields.js` by hand whenever `fields.csv` gets new rows
   (occasionally) or an address is corrected — commit the updated cache file
   alongside the CSV change.

#### What needs a human pass before this can be built

From the current data:

- **Every row in `fields.csv` and `field_areas.csv` needs its current `area`
  value (`Canby`, `Clackamas`, …, 13 in all) replaced with a `club` name from
  `clubs.csv`.** Twelve are an unambiguous rename (e.g. `Canby` →
  `Canby United Soccer Association`, applied to every field in that area).
  One is not: **`Molalla Soccer`**'s fields could belong to `Molalla Youth
  Sports` or `Country Christian Soccer` — both are Molalla-area clubs in
  `clubs.csv` — and it's not clear from the current data which club owns
  which field. Because the join is now per-field rather than per-area, this
  can be resolved field-by-field instead of forcing one answer for the whole
  group; either way it needs a decision before `fields.csv` can be rewritten.
- **Five fields have no map link at all** (checklist item 6): both Colton
  schools and all three Molalla fields. Their `address` values look
  geocodable as-is (street address + city), but haven't been verified against
  a map. Worth a manual check before the first geocode run.
- **Five more fields have a map link that won't yield coordinates** — either
  a `goo.gl`/`maps.app.goo.gl` short link (Clackamas High School, Alder Creek
  Middle School) or a Google "place ID" link with no embedded lat/lon (Baker
  Prairie Middle School, Mt Scott Elementary, Willamette Park). Not a
  blocker — geocoding runs off `address`, not `map_url` — but worth spot
  checking the address text since nothing has ever verified these against a
  map.
- **Oregon City has the inconsistency already flagged in checklist item 3:**
  "Wesley Lynn Park" lists an address on Frontier Pkwy but its map link
  points at Chapin Park, and the club's note in `field_areas.csv` mentions
  Chapin Park dogs rules even though no Chapin Park row exists. Resolve which
  park is which before geocoding Oregon City, or the pin will land in the
  wrong place silently.

None of this blocks writing the shortcode, the basemap, or `validate.js`
changes — only the first production geocode run needs it settled.

**Done when:** `/fields` shows a county map with one hover/tap target per
field with committed coordinates, colored by host club, and `npm run check`
fails the build if `field_areas.csv` has a `club` that doesn't match
`clubs.csv`.

Done 2026-09-07. All 49 fields are on the map, `npm run check` is clean, and
the club column is validated in both CSVs against `clubs.csv`.

#### What was built, and where it departs from this section

- **Pins are not colored by host club.** Fourteen clubs is far past what color
  can carry: no categorical palette distinguishes fourteen hues, a
  fourteen-swatch legend is unreadable, and it fails outright for a colorblind
  reader. It would also have meant fourteen new colors, which `tokens.css`
  forbids — DESIGN.md's palette is the only source. The clubs are already
  separated on the map by geography (each plays in its own town), and every pin
  names its club on hover and links to that club's entry in the list, so the
  color would have been decoration standing in for information. All pins are
  the league maroon.
- **No per-club inset maps.** These were built and then removed. At the zoom a
  single club needs, rural Clackamas County has no roads, rivers or boundaries
  to orient against, so each inset was a near-empty rectangle; fourteen of them
  took the page to 12,600 px tall and 800 KB, pushing the addresses — the thing
  people actually come for — far down the page. One map, then the list.
- **The map is one `<figure>` at the top of `/fields`,** not a shortcode
  volunteers write. Same reasoning as the `data_section` decision in
  CONTRIBUTING-DEV.md: no template syntax in files volunteers edit.
- **`fields.csv` gained `lat` and `lon` as planned,** and one row uses them:
  `Mary S. Young State Park` is "Mary S. Young Park" in OpenStreetMap, so its
  address matched the middle of Willamette Drive, a kilometre off.
- **Geocoding needed more than one query per field.** Addresses are written for
  a parent to read, not for a geocoder: `19010 S. Fischer's Mill Rd.` fails on
  the apostrophe and the abbreviation, and Ninety-One Grade School has a Hubbard
  mailing address but sits over the county line. The script tries the address,
  then the address spelled out, then the street alone, then the field's name,
  and keeps the most precise answer rather than the first. It rejects a match on
  a whole town, and prefers a named park or school over a road, because a road
  match is only its midpoint — Athey Creek Middle School first came back 3.5 km
  away down a long Borland Road.
- **The results were checked, not assumed.** 38 of the 49 fields have a Google
  Maps link with coordinates embedded in it; geocoding independently landed
  within 400 m of the league's own pin on all but two, and both of those were
  investigated. This is worth repeating after any bulk address change.

The basemap in `src/data/basemap.geojson` was cut from Census TIGER/Line 2023
(`GENZ2023/shp/cb_2023_us_county_500k.zip`, `TIGER2023/PRISECROADS/
tl_2023_41_prisecroads.zip`, and AREAWATER + LINEARWATER for counties 41005,
41047, 41051, 41067 and 41071), clipped to `-122.90,45.10,-122.28,45.50`,
filtered to MTFCC S1100/S1200 for roads and to water over 0.15 km², simplified
with `mapshaper` to 88 KB at 4-decimal precision, and tagged with a
`properties.layer` of `county`, `road` or `water`. It should never need
regenerating; if it does, CONTRIBUTING-DEV.md points here and the `DRAWN`
constant in `src/field-map.js` has to move with the clip box.

Two things were deliberately left alone. **Memorial Park** geocodes to its
street address rather than the middle of the park, 580 m from the league's own
pin — for someone driving there the entrance is the better point. And on a
phone the pins are about 10 px across: with 49 fields spread over 40 km on a
335 px map, no hit target makes them individually tappable, which is why the
list below carries every address and Google Maps link independently of the map.

### Phase 6 — Cutover
- Add `CNAME` file (via Pages custom-domain setting, which commits it).
- DNS: `A` records for apex to GitHub Pages IPs, `CNAME` for `www` →
  `<org>.github.io`. Enable "Enforce HTTPS" once the cert issues.
- Verify old URLs against the live old site before DNS cutover: script a loop
  over every path in §4 hitting both hosts, and diff the status codes. Every
  path that is 200 on Squarespace must be 200 on Pages. Record the output in
  `_design/inventory/url-check.txt`.
- Re-run the same check against the real domain after DNS propagates, and
  again after "Enforce HTTPS" is on (the http→https redirect must preserve the
  path, not dump everyone on the home page).
- Grep the club websites listed in `clubs.csv` for inbound links to
  soccer5clubs.org; anything pointing at a path not in §4 gets added to
  `LEGACY_URLS` with a redirect stub.
- Notify club contacts (from `clubs.csv`) that any saved
  `static1.squarespace.com` link to the rules PDF will stop working, and give
  them the new `https://soccer5clubs.org/s/<file>.pdf` address plus the
  `/leaguerules` page link. This is the only mitigation available for §4.2 —
  do it before cancelling, while the old links still resolve.
- Soak for a few days with both live; then cancel Squarespace.
- Confirm the domain registration is not tied to the Squarespace
  subscription. If the domain is registered through Squarespace, either
  keep only the domain product or transfer the registrar (Cloudflare
  Registrar is at-cost if you want to move it).

**Done when:** `https://soccer5clubs.org` and `https://www.soccer5clubs.org`
both serve the new site over HTTPS, every URL in §4 returns 200 on the real
domain, and Squarespace billing is off.

---

## 10. Open questions to settle during the build

- Does the old Contact page have a form? If yes, what happens to
  submissions today, and is a `mailto:` acceptable?
- What is the shape of Fields and Uniform Info? (Phase 1.)
- Who is the second person with admin on the GitHub org? (Bus factor.)
- Which email gets build-failure notifications?
- Does the league have a logo and brand color, or is the design free to
  choose?
- Are there any pages or PDFs linked from the old site that aren't in the
  nav? `/refereefeedback` is one (now in §4); re-check `/sitemap.xml` in
  Phase 1 for others.
- The two rules PDFs are named `...2025-2026-...`. Confirm the intended
  policy for next season: new file alongside the old, old URL left alive.

