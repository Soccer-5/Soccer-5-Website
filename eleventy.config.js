// Eleventy configuration. Developers only — volunteers never edit this file.
//
// Input is the repo root so that `content/` and `_data/` can sit at the top
// level where volunteers can find them. Everything that is not site content
// has to be explicitly ignored below.

import { HtmlBasePlugin } from "@11ty/eleventy";
import { parse } from "csv-parse/sync";

export default function (eleventyConfig) {
  // Rewrites root-relative URLs in the built HTML to include pathPrefix, so
  // links written as /contact or /s/rules.pdf in a Markdown body work both on
  // the project-pages subpath and at the domain root. Without this, links in
  // page bodies (which do not go through the `url` filter) 404 in preview.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // CSV files in _data/ become arrays of objects keyed by the header row.
  // Volunteers edit these in GitHub, which renders CSV as a table.
  eleventyConfig.addDataExtension("csv", (contents) =>
    parse(contents, { columns: true, skip_empty_lines: true, trim: true }),
  );

  // Volunteers paste "www.example.org"; links need a scheme.
  eleventyConfig.addFilter("externalUrl", (value) => {
    if (!value) return value;
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  });

  // "/contact.html" -> "/contact", "/index.html" -> "/". Pages are written as
  // flat .html files so that GitHub Pages serves them at the old Squarespace
  // paths; links should use those paths, not the filenames.
  eleventyConfig.addFilter("cleanUrl", (value) =>
    value === "/index.html" ? "/" : (value || "").replace(/\.html$/, ""),
  );

  // "https://www.example.org/" -> "www.example.org" for link text. A long
  // path or query string is trimmed to an ellipsis: the label is for humans,
  // the href carries the real address.
  eleventyConfig.addFilter("displayUrl", (value) => {
    const bare = (value || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
    const slash = bare.indexOf("/");
    if (slash === -1 || bare.length <= 34) return bare;
    return `${bare.slice(0, slash)}/\u2026`;
  });

  // Group an array of rows by one of its columns, preserving first-seen order.
  eleventyConfig.addFilter("groupBy", (rows, key) => {
    const out = new Map();
    for (const row of rows || []) {
      if (!out.has(row[key])) out.set(row[key], []);
      out.get(row[key]).push(row);
    }
    return [...out].map(([name, items]) => ({ name, items }));
  });

  eleventyConfig.setInputDirectory(".");
  eleventyConfig.setOutputDirectory("_site");
  eleventyConfig.setDataDirectory("_data");
  eleventyConfig.setIncludesDirectory("src/_includes");

  // Not site content.
  for (const path of [
    "README.md",
    "CONTRIBUTING-DEV.md",
    "DESIGN.md",
    "CLAUDE.md",
    "docs/",
    "_design/",
    "scripts/",
  ]) {
    eleventyConfig.ignores.add(path);
  }

  // Volunteers write `layout: page` in front matter, not a path.
  eleventyConfig.addLayoutAlias("page", "layouts/page.njk");

  // Nav is driven by the `order` field. A page without `order` is a real
  // page at a real URL but is left out of the nav — /refereefeedback is one.
  eleventyConfig.addCollection("nav", (collection) =>
    collection
      .getAll()
      .filter((item) => typeof item.data.order === "number")
      .sort((a, b) => a.data.order - b.data.order),
  );

  // Legacy Squarespace asset paths. These files must stay reachable at /s/
  // exactly as they were on the old site — see docs/soccer5-site-plan.md §4.1.
  // Do not rename them and do not move them under /assets/.
  eleventyConfig.addPassthroughCopy({ "assets/s": "s" });

  eleventyConfig.addPassthroughCopy({ "assets/images": "assets/images" });
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "assets/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  return {
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    // Set by CI when deploying to the project-pages subpath
    // (soccer-5.github.io/Soccer-5-Website/). Empty once the custom domain
    // is live. Templates must run internal links through the `url` filter.
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
