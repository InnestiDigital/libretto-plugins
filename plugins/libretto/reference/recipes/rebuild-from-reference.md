# Rebuild a site from a reference

Use when the user hands you a finished design to reproduce (an HTML and CSS handoff, a Figma file, the address of a live site) and asks "make my Libretto site look like this". It is a rebuild, not a restyle: work in the order below, because each step sets what the next one reads. Build from what every site has (tokens, variants, mixins, presets, part styles), never a component cut to this one site.

Ops: [design system](../operations/design-system.md), [components](../operations/components.md), [parts and styles](../operations/parts-and-styles.md), [sections, presets and lists](../operations/sections-presets-and-lists.md), [pages](../operations/pages.md), [navigation](../operations/navigation.md), [motion](../operations/motion.md).

## 0. Read the reference and plan

1. Its stylesheet before any page: the `:root` custom properties (colours, sizes, spaces, radii, easings), every `@media` rule and the width it breaks at, the fonts it loads, and whether sizes are fixed (`px`, `rem`) or fluid (`clamp()`, `vw`).
2. Read the site: `site_context` (pages, definitions, locales), `design` and `tokens` (the breakpoints, the token sets, the themes), `sections` (the presets).
3. Write the plan in the user's words: breakpoints and tokens, component looks, header and footer, then the pages section by section. Each step is at least one batch.
4. Bring the reference's images into the media library once, before the sections: `upload_media_files` with its image folder (`{ "directory": "<folder>", "dryRun": true }`, then without `dryRun`; at most 50 files a call, call again for the rest: what the library has is skipped). A reference often ships each picture at several widths: upload only the largest (`paths`); Libretto makes its own sizes and formats. Keep the answer's map from file to media id: the sections use it.

## 1. Breakpoints

The site's breakpoints are the `bp:<name>` style scopes, mobile first (`design` lists them). Add the reference's own widths with `breakpoint.set` `{ "name": "menu", "query": "(min-width: 1081px)" }` (an Administrator's). A desktop-first rule (`max-width`) needs no breakpoint: use an `mq:` scope (table below).

## 2. Tokens and fonts

Map the reference's `:root` to the design system ([design update](design-update.md) has the order and the brand setup batch):

- Fonts first: `font.addGoogle` for a Google family, `upload_font_file` for a licensed file; then the font tokens point at the family.
- Colours, radii, shadows, easings: `token.set` on the tokens the site has, one change the user would name per batch, the contrast check correcting or refusing a text it leaves hard to read. Never a raw value on a part where a token can hold it.
- **Fluid type and space stay fluid**: a dimension token takes a `clamp()` as its value. Copy the reference's numbers; look at the result with `render_preview` at a `width`, never compute it.

## 3. Component looks

For each button, card or link style: read `definition/<key>` (its variants, parts and cells); a new look is a value on a variant axis (`component.setVariantAxes`, the axes whole) and its cells (`cell.set`); then `instance.setVariant` on the parts that should draw it. A style several parts share: `mixin.set`, then `tree.set_mixins`.

## 4. Header, footer and menus

[Header, footer and menus](header-footer-and-menus.md): the header and footer are parts of the layout's definitions, changed inside `component.edit`; the menus are `menu.*` and `menuItem.*`. A page's layout: `page.setLayout`, with `overrides` for this page alone (a dark background on one page).

## 5. One section at a time

For each page, top to bottom, one section per batch:

1. Insert the closest section of the site ([sections from presets](sections-from-presets.md): `section.insert`, `preset.insert`) or build it from parts (`tree.insert`: boxes, texts, pictures with `{ "$media": "<id>" }`), then its geometry with `tree.set_style` (the table below).
2. Compare it with the reference at desktop and at mobile: `compare_reference` `{ "pageId", "device": "desktop", "crop": { "nodeId": "<the section>" }, "referencePageUrl": "https://…/about", "referenceSelector": "#team" }`, then `"device": "mobile"`. For a reference that is not online, upload your screenshot of the section with `upload_media_file` and name it with `referenceMediaId`. One comparison at a time: captures share the server's few slots; on `render_busy`, wait `retryAfter` seconds and call again.
3. Look at `ratio` and `heightMismatch`. Fix the largest difference first: a wrong token shows on every section, so fix it there, not per part. Compare again.
4. Stop when the user accepts the section, and tell them what still differs. Never fake a match (a picture of the reference placed on the page is not a rebuild).

## CSS to Libretto

Each row is a part's style (`tree.set_style` `{ "at", "node", "scope", "declarations" }`), a prop or an op. A value is CSS text, a number or `{ "$token": "<path>" }`; Libretto refuses what its style rules do not allow (`css.grammar`), naming the declaration.

| In the reference | In Libretto |
|---|---|
| `:root { --accent: … }` | a token: `token.set` |
| `font-size: clamp(…)`, fluid spacing | a fluid dimension token; a one-off size as a `clamp()` declaration |
| `display: grid; grid-template-columns: repeat(12, 1fr); gap` | the same declarations, `gap` as a token |
| `@media (min-width: 768px)` | scope `bp:md` (a breakpoint of the site; add one with `breakpoint.set`) |
| `@media (max-width: 767px)` | scope `mq:(max-width: 767.98px)` |
| a container query | scope `cq:<query>` |
| `@media (prefers-reduced-motion: reduce)` | scope `mq:(prefers-reduced-motion: reduce)`; a timeline has its own `reducedMotion` |
| `.card:hover img { … }` | scope `s:hover\|t: img` on the card; `a:hover` on the image for "while an ancestor is hovered" |
| `.prose a`, `li > p` | scope `t: a`, `t:> li > p` on the text |
| `:not([href])`, `::after`, `[aria-expanded="true"]` | scope `s::not([href])`, `s:::after`, `s:[aria-expanded="true"]` |
| a style only in the dark theme | scope `th:dark`, or the section in the theme (`tree.set_theme`) |
| `position: sticky`, `mix-blend-mode`, `aspect-ratio`, `object-fit`, `text-wrap: balance` | the same declarations |
| `<img srcset sizes>` | a picture part with `src` `{ "$media": "<id>" }` and its `alt`: Libretto makes the sizes and formats |
| `<iframe>` map or video | a part of kind `embed`, or a `widget` with its `config` (`discover_operations` names `tree.insert` for the kinds and their fields) |
| a path segment with no page of its own (`/note/tema/…`) | a folder: `page.create` with `pageType: "folder"`, the pages under it with `parentId` |
| elements fading in on scroll, parallax, a pinned scene | timelines on the page ([motion](motion.md)): a starting motion from `motion/<pageId>`, a `view` or `scroll` trigger |
| a slideshow, a scrolling strip of logos | a component of the site that does it (`site_context.definitions`) with `instance.insert`; if the site has none, tell the person and report it (`libretto-report-issue`) rather than imitating it with scripts |
