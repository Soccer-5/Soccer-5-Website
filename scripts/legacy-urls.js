// Every URL the old Squarespace site served that a person could have
// bookmarked or linked to. These must keep working forever.
//
// See docs/soccer5-site-plan.md section 4. Do NOT remove entries from this
// list to make a build pass — that is the failure this file exists to catch.
// Adding a redirect stub is fine; dropping the URL is not.

export const LEGACY_PAGES = [
  "/",
  "/home",
  "/contact",
  "/fields",
  "/uniforminfo",
  "/referees",
  "/leaguerules",
  "/schedules",
  "/refereefeedback",
];

export const LEGACY_ASSETS = [
  "/s/Soccer-5-2025-2026-Rules-1.pdf",
  "/s/Soccer-5-2025-2026-Rules-Summary-1.pdf",
  "/s/Why-You-Should-Consider-Becoming-a-Soccer-5-League-Referee-2024.pdf",
  "/s/cyso_original_colored_logo.png",
];

export const LEGACY_URLS = [...LEGACY_PAGES, ...LEGACY_ASSETS];
