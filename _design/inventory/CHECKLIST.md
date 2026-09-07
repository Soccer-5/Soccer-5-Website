# Phase 1 migration checklist

Old site captured 2026-09-07 from https://www.soccer5clubs.org.
Raw text of each page is in this directory, one file per old path.

## Pages

| Old URL | New URL | Source file | Status |
|---|---|---|---|
| `/` | `/` | `content/index.md` | Migrated verbatim |
| `/home` | `/home` | `content/home-redirect.md` | Redirect stub to `/` (old page was byte-identical to `/`) |
| `/contact` | `/contact` | `content/contact.md` + `_data/clubs.csv` | Migrated, 14 clubs |
| `/fields` | `/fields` | `content/fields.md` + `_data/fields.csv`, `_data/field_areas.csv` | Migrated, 49 fields in 13 areas |
| `/uniforminfo` | `/uniforminfo` | `content/uniform-info.md` + `_data/uniforms.csv` | Migrated, 15 rows |
| `/referees` | `/referees` | `content/referees.md` | Migrated verbatim |
| `/leaguerules` | `/leaguerules` | `content/league-rules.md` | Migrated verbatim |
| `/schedules` | `/schedules` | `content/schedules.md` | Migrated; season is two front-matter fields |
| `/refereefeedback` | `/refereefeedback` | `content/referee-feedback.md` | Migrated verbatim |

Dropped: `/cart` (Squarespace commerce residue, no content).

## Assets

All four legacy `/s/` files downloaded to `assets/s/` with filenames unchanged,
served at the same paths:

- `/s/Soccer-5-2025-2026-Rules-1.pdf` (1.5 MB)
- `/s/Soccer-5-2025-2026-Rules-Summary-1.pdf` (90 KB)
- `/s/Why-You-Should-Consider-Becoming-a-Soccer-5-League-Referee-2024.pdf` (236 KB)
- `/s/cyso_original_colored_logo.png` (124 KB)

Images pulled off the Squarespace CDN before it goes away:

- 14 club logos → `assets/images/clubs/`, named after the club slug in `clubs.csv`
- favicon → `assets/favicon/favicon.webp` (Squarespace served WebP under a
  `.ico` name; Phase 3 should generate a real favicon set from the S5 logo)
- 8 page heroes were downloaded, then removed on 2026-09-07 when the league
  decided against photographs. See plan §3.1. They are in git history if
  anyone wants them back.

The plan's §3 listed only two hero images. There were eight, plus the logos.

## Changes made to the content

Typos fixed, per the plan's "fix only obvious typos" rule. Each was verified
against the linked Google Map or the club's own site:

| Where | Old | New | Evidence |
|---|---|---|---|
| Fields, Canby | Legay Park | Legacy Park | Map link points to "Legacy Park, Canby" |
| Fields, Lake Oswego | 1500 Greentreet Rd. | 1500 Greentree Rd. | Palisades Elementary is on Greentree Rd. |
| Fields, Molalla | 920 Shirley Steet | 920 Shirley Street | Adjacent row spells it correctly |
| Fields, Willamette United | 11055 SW WIlsonville Rd. | 11055 SW Wilsonville Rd. | Capital "I" mid-word |
| Contact, Country Christian | 16975 Hwy 21 | 16975 Hwy 211 | Molalla is on OR-211; no Hwy 21 there |

Formatting changes: the old site bolded whole paragraphs and set several
headings in all caps. Headings are now sentence case and the bold is gone,
except where it marks the two-line home/away jersey rule on `/uniforminfo`.

## Open items — need a human decision

1. **Oregon City Soccer Club email is self-contradictory on the old site.**
   The link text reads `president@ocsoccerclub.org` but the `mailto:` behind
   it goes to `registrar@ocsoccerclub.org`. `clubs.csv` currently has
   `registrar@` (what clicking actually did). Confirm which is right.

2. **Two different referee feedback forms are live.**
   - `/referees` links `https://forms.gle/Lb5ifN9kdp3pcsKYA`
   - `/refereefeedback` links `https://bit.ly/Soccer5RefereeFeedback`, which
     redirects to `https://forms.gle/DrVjH9cKTZjBjTaM8`

   Different form ids. One is probably stale, and coaches are being split
   across two response spreadsheets. Both were carried over as-is.

3. **Oregon City field data has two inconsistencies.**
   - The area note says "No Dogs Allowed except at Chapin Park on leashes,"
     but no Chapin Park is listed among the fields.
   - "Wesley Lynn Park" (12901 Frontier Pkwy) has a Google Map link that
     points at Chapin Park instead.

4. **Colton Youth Soccer's website link is a vanity name over a different
   host.** Link text is `coltonyouthsoccerorganizations.com`; the href goes to
   `clubs.bluesombrero.com/Default.aspx?tabid=1333762`. `clubs.csv` holds the
   working bluesombrero URL. Confirm whether the vanity domain still resolves.

5. **A dead link was dropped.** The Willamette Park field row linked
   `http://www.soccer5or.com/doclib/WILLAMETTE%20PARK.jpg` — a file on the
   league's previous domain. Not carried over.

6. **Five fields have no map link** on the old site and still have none:
   both Colton schools and all three Molalla fields.

## Deviation from the plan

§6.1 specified a `{% clubDirectory %}` shortcode in the Markdown body. That is
Nunjucks syntax in a file volunteers edit, which conflicts with the constraint
that volunteers never see template code. Instead each page names its table in
front matter:

```yaml
data_section: club-directory
```

Valid values are `club-directory`, `field-list`, and `uniform-table`. The table
renders after the Markdown body. Same result, one plain word, nothing that
looks like code.
