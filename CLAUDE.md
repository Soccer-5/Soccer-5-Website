# Orientation

Static site for the Soccer-5 recreational soccer league (Clackamas County,
Oregon). Eleventy 3 → GitHub Pages, no client-side JavaScript. It replaced a
Squarespace site in 2026.

The build plan, including the reasoning behind every significant decision, is
[docs/soccer5-site-plan.md](docs/soccer5-site-plan.md). Read it before making
structural changes. [CONTRIBUTING-DEV.md](CONTRIBUTING-DEV.md) covers local
setup and the data layer.

## Ownership

- `content/` and `_data/` belong to volunteers who edit them in the GitHub web
  UI. Keep them plain: no template syntax, no nesting, no required fields
  beyond what `scripts/validate.js` already enforces. [README.md](README.md) is
  written for those volunteers and must stay true.
- `src/`, `scripts/`, `.github/` belong to developers.

## Things that will bite you

- **URLs are frozen.** Page paths match the old Squarespace site
  (`/uniforminfo`, `/leaguerules`, and the `/s/*.pdf` assets). They are listed
  in `scripts/legacy-urls.js` and enforced after every build. Never remove an
  entry to make a build pass.
- **The dev server does not reproduce production.** The site is served under
  `/Soccer-5-Website/` until the domain cutover. Test with `PATH_PREFIX` set —
  the recipe is in CONTRIBUTING-DEV.md.
- **URLs inside CSS must be relative.** `HtmlBasePlugin` rewrites HTML
  attributes only. A root-absolute `@import` 404s in production and the site
  renders unstyled.
- **No photographs.** Decided deliberately; plan §3.1. Stock photos of children
  are not an acceptable substitute — those licenses grant copyright, not model
  releases.

## Open items

`_design/inventory/CHECKLIST.md` lists content questions from the migration
that still need a human answer, including a contradictory club email address
and two live referee-feedback forms.
