# The Soccer-5 website

This repository holds everything on [soccer5clubs.org](https://soccer5clubs.org).
When you change a file here and save it, the website updates itself about two
minutes later.

Prior to deploying with the DNS entry soccer5clubs.org, the website can be previewed
on the [Github Pages Preview Page](https://soccer-5.github.io/Soccer-5-Website).

You do not need to install anything. Everything below happens in your web
browser, on this page.

---

## The only two folders you need

| Folder | What is in it |
|---|---|
| **`content`** | The words on each page — one file per page |
| **`_data`** | The lists: clubs, fields, uniform colors |

Everything else is the machinery that builds the site. Leave it alone.

---

## How to change the words on a page

1. Click the **`content`** folder above.
2. Click the file for the page you want to change:

   | Page on the website | File to edit |
   |---|---|
   | Front page | `index.md` |
   | Contact | `contact.md` |
   | Fields | `fields.md` |
   | Uniform Info | `uniform-info.md` |
   | Referees | `referees.md` |
   | League Rules | `league-rules.md` |
   | Schedules | `schedules.md` |
   | Referee Feedback | `referee-feedback.md` |

   (`home-redirect.md` is not a real page. Leave it alone.)

3. Click the **pencil icon** (✏️) near the top right.
4. Make your change.
5. Scroll to the bottom and click the green **Commit changes** button.
6. Leave **Commit directly to the `main` branch** selected, and click
   **Commit changes** again.

That is it. Wait about two minutes, then reload the website to see it.

### The lines at the top of each file

Every page file starts with a block that looks like this:

```
---
title: Contact
permalink: /contact.html
order: 1
---
```

You can change **`title`** — that is the big heading on the page.

**Do not change `permalink`.** That is the page's address on the web. People
have bookmarked these addresses and other websites link to them. If you change
it, those links break. The site will refuse to publish if you do, but it is
easier not to.

---

## How to update the club list

1. Click **`_data`**, then **`clubs.csv`**.
2. Click the pencil icon (✏️).
3. Each club is one line. The columns, in order, are:
   `name, city, address, email, phone, website, logo`
4. Commit the same way as above.

Three rules:

- **Keep the first line exactly as it is.** It names the columns.
- **If a value contains a comma, put quotation marks around it.** Addresses
  almost always need this: `"PO Box 861, Canby, OR 97013"`
- **Leave a column empty if you do not have it.** Just put nothing between the
  two commas. Only the name is required.

To remove a club, delete its whole line. To add one, add a line in the same
shape. The order of the lines does not matter — the website sorts clubs
alphabetically on its own.

---

## How to update the schedule link

This is the twice-a-year change.

1. Click **`content`**, then **`schedules.md`**.
2. Click the pencil icon (✏️).
3. Change these two lines:

```
season_name: SPRING 2026
season_url: https://oysa.sportsaffinity.com/...
```

`season_name` is the text on the button. `season_url` is where the button
goes — paste the whole address, starting with `https://`.

4. Commit.

---

## How to update fields and uniforms

Same idea, in `_data`:

- **`fields.csv`** — one line per field: `area, name, grades, address, map_url, notes`
  The `area` groups fields under a heading and must match a line in
  `field_areas.csv`.
- **`field_areas.csv`** — one line per area: `area, dogs, note`
  This is where the dog policy and parking notes live.
- **`uniforms.csv`** — one line per club: `club, jerseys, colors`

The same three rules as the club list apply: keep the first line, quote
anything containing a comma, leave unknown values empty.

---

## Writing text: the five things worth knowing

```
## A heading                  (two hashes for a heading, three for a smaller one)

**bold text**                 (two stars either side)

[words people click](https://example.org)      (link text in [ ], address in ( ))

- a bullet                    (a dash and a space)
- another bullet

A blank line between paragraphs. Without it they run together.
```

---

## If something goes wrong

**Your change did not show up after five minutes.**

Something in your edit stopped the site from building. Nothing is broken for
visitors — the website is still showing the last good version.

To see what happened:

1. Click the **Actions** tab at the top of this repository.
2. The top entry will have a red ✗. Click it.
3. Click **build**, then look for the red text.

The message is written in plain English and names the file and the line. The
most common one is a missing pair of quotation marks around an address with a
comma in it.

Fix the file the message names and commit again. If you are stuck, undo your
change by editing the file back to how it was, or ask a developer.

**You cannot break the live website.** A bad edit stops the update; it never
takes the site down.

---

## Please do not edit

- `src` — the page templates and styling
- `scripts` — the checks that protect the site
- `assets` — images, fonts, and the rules PDFs
- `.github` — the publishing machinery
- `docs`, `_design`, `DESIGN.md` — notes for developers
- `eleventy.config.js`, `package.json`, and anything else at the top level

If something in one of those needs to change, ask a developer.

---

## For developers

See [CONTRIBUTING-DEV.md](CONTRIBUTING-DEV.md).
