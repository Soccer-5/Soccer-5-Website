// Eleventy configuration. Developers only — volunteers never edit this file.
//
// Input is the repo root so that `content/` and `_data/` can sit at the top
// level where volunteers can find them. Everything that is not site content
// has to be explicitly ignored below.

export default function (eleventyConfig) {
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
