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
  S5 avatar (maroon disc, white "S5" over a white mountain range), committed as
  `assets/images/S5-1128.png` with web-sized copies in `assets/images/logo/`.
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

Not everything is savable. Name these now so nobody spends Phase 5 trying.

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
  most certainly broken, Phase 5 includes an explicit "the rules PDF has moved
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

### Phase 4 — Documentation
- `README.md` per §7.
- `CONTRIBUTING-DEV.md`: local setup, where things live, how to add a page,
  how the data layer works, how to swap to Google Sheets later.
- `CLAUDE.md`: one-paragraph orientation, pointer to this plan, the rule that
  `content/` and `_data/` are volunteer-owned and `src/` is developer-owned.

**Done when:** a volunteer can follow README to change a club's email
without asking anyone.

### Phase 5 — Cutover
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
