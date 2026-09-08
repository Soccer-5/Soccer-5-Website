// Draws the jersey swatches on /uniforminfo, at build time.
//
// Nothing here runs in the browser and no volunteer writes any HTML or CSS to
// get a swatch. The `colors` column of _data/uniforms.csv is already a list of
// plain colour names typed by a volunteer — "navy blue, white" — and this file
// turns that text into rectangles:
//
//   a comma  separates one jersey from the next     "red, white"  -> two
//   a slash  splits one jersey between two colours  "green/white" -> one, split
//
// Each name is matched against the CSS colour keywords. Most two-word names
// resolve once the space is closed up ("forest green" -> forestgreen), so the
// alias table below is only for the ones CSS spells differently.
//
// A name that resolves to nothing stops the build: scripts/validate.js reads
// the same parse and says which line and which word. That is the whole safety
// net — a volunteer never sees a colour value, only the word they wrote.

// The CSS named colours, which are the only values this file will ever put in
// the markup. Everything else is rejected, so the volunteer's text can never
// reach the page as a style: there is nothing to escape and nothing to inject.
const CSS_COLOR_NAMES = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black
   blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse
   chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
   darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta
   darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
   darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink
   deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen
   fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey
   honeydew hotpink indianred indigo ivory khaki lavender lavenderblush
   lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
   lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
   lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
   limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid
   mediumpurple mediumseagreen mediumslateblue mediumspringgreen
   mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
   navajowhite navy oldlace olive olivedrab orange orangered orchid
   palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff
   peru pink plum powderblue purple rebeccapurple red rosybrown royalblue
   saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
   slateblue slategray slategrey snow springgreen steelblue tan teal thistle
   tomato turquoise violet wheat white whitesmoke yellow yellowgreen`
    .trim()
    .split(/\s+/),
);

// Names a volunteer plausibly writes that closing the space does not fix.
// Keep this short and keep every entry exact — "navy blue" and navy are the
// same colour. An approximate match ("kelly green" for green) would quietly
// print the wrong jersey, so those are left to fail validation instead, where
// the volunteer is told which word to change.
const ALIASES = {
  "navy blue": "navy",
  "light grey": "lightgray",
  "dark grey": "darkgray",
  "off white": "whitesmoke",
};

const toCss = (name) => {
  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (ALIASES[key]) return ALIASES[key];
  const closed = key.replace(/\s+/g, "");
  return CSS_COLOR_NAMES.has(closed) ? closed : null;
};

/**
 * One row's `colors` cell, parsed but not yet drawn.
 *
 * Returns one entry per jersey, each carrying what the volunteer wrote and the
 * colours it resolved to. `css` is null for a word this file does not know,
 * which is what validate.js reports on.
 */
export function parseJerseys(colors) {
  return String(colors || "")
    .split(",")
    .map((jersey) => jersey.trim())
    .filter(Boolean)
    .map((jersey) => ({
      written: jersey,
      parts: jersey
        .split("/")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ written: name, css: toCss(name) })),
    }));
}

/**
 * A row's jerseys as rectangles: one per jersey, split diagonally when the
 * volunteer wrote two colours with a slash.
 *
 * The only thing inline here is the colour itself, as two custom properties.
 * Size, border and corner all stay in site.css, which is where this site keeps
 * every design decision — the style attribute carries data, not styling.
 *
 * Marked aria-hidden because the colour names are printed beside the swatches
 * as text. A screen reader should hear "navy blue, white" once, not twice, and
 * colour is never the only thing carrying the answer.
 */
export function jerseySwatches(colors) {
  const swatches = [];
  for (const jersey of parseJerseys(colors)) {
    const resolved = jersey.parts.map((p) => p.css).filter(Boolean);
    // An unresolved name only reaches here in a dev preview; validate.js stops
    // the build before it can deploy. Drop it rather than draw a blank box.
    if (!resolved.length) continue;
    const [a, b = a] = resolved;
    swatches.push(`<span class="jersey" style="--jersey-a:${a};--jersey-b:${b}"></span>`);
  }
  return swatches.length
    ? `<span class="jerseys" aria-hidden="true">${swatches.join("")}</span>`
    : "";
}
