# Rebuild a site from a static reference

Use when the user hands you a finished design to reproduce: an HTML/CSS handoff (a folder with `index.html` and `styles.css`) or the address of a live site, and asks "make my Libretto site look like this". The job is a rebuild, not a restyle: work in the order below, because each step sets what the next one reads. Build everything from generic capabilities (rule 3 of the `libretto-editing` skill): tokens, variants, presets, node styles. Never a component made for this one site.

Operations: [site and settings](../operations/site-and-settings.md) (`layout.update`, `breakpoints.update`), [pages and trees](../operations/pages-and-trees.md), [design-system](../operations/design-system.md), [media and fonts](../operations/media-and-fonts.md), [navigation](../operations/navigation.md), [motion](../operations/motion.md).

## 0. Read the reference

1. Read its stylesheet before any page: the `:root` custom properties (colours, sizes, spaces, radii, easings), every `@media` rule and the widths it breaks at, the fonts it loads, and whether sizes are fixed (`px`, `rem`) or fluid (`clamp()`, `vw`).
2. Decide which kind of reference it is:
   - **fluid**: sizes use `clamp()` or `vw`, and the layout reflows at its breakpoints (columns collapse at 767 px, a tablet layout at 1023 px, a cap at 1920 px);
   - **fixed-width**: one design at one width (say 1440 px) meant to scale down as a picture.
3. Take reference screenshots of each section at 1440 and 390 px wide (the `libretto-visual-check` skill's Chrome, or the user's files). `compare_reference` also opens a live reference page itself (`referencePageUrl` with a `referenceSelector` per section), so screenshots are needed only for a handoff that is not online.
4. Write the user the plan in their words: frame, tokens, component looks, header and footer, then the pages section by section. Each step below is at least one batch (rule 6).
5. Bring its images into the media library once, before the sections: `upload_media_files` of the plugin's `libretto-files` server with the reference's image folder (`{ "directory": "<the folder>", "dryRun": true }`, then without `dryRun`; up to 100 files a call, call again for the rest: what is already in the library is skipped). A reference often ships each picture in several widths (`hero-480.jpg`, `hero-960.jpg`, `hero-1920.jpg`, or the files of a `srcset`): upload only the largest of each, with `paths`. Libretto renders its own sizes and formats from it (`srcset`, AVIF and WebP), so the smaller copies only fill the library. Keep the answer's map from file to media id: the sections use it.

## 1. The layout frame first

The frame decides how every later size behaves, so it comes before tokens.

- **Fluid reference: a breakpoint frame.** Put its pages on a frame with `responsiveMode: "breakpoint"` (the theme's `default` frame): `page.update` `{ "pageId", "patch": { "frame": "default" } }`, one page per operation. Read the frame list and each frame's settings in the theme (`site_context` gives each page's `frame`). To change a frame's settings for the site (`maxWidth`, `insetX`, `containerMode`), `layout.update` `{ "layoutId": "default", "layout": { ... } }`: it takes the **whole** frame (its `id` equal to `layoutId`) and replaces the site's version of that theme frame, so start from the frame as it is and change only what the reference needs. It needs `site.structure` (a platform admin, or the workspace owner on their sites).
- **Fixed-width reference: a scaled frame.** Only then keep or choose a frame with `responsiveMode: "scale"` (such as "Branded canvas — scaled to fit", `designWidth` 1440): it draws the design at 1440 px and scales it to the window.
- **Why it matters.** Node styles under `bp:` and `cq:` scopes compile to container queries on the layout's content box. On a breakpoint frame that box is as wide as the page, so the reflows of a fluid reference work. On a scaled frame it is always `designWidth` wide: `bp:` and `cq:` styles never switch above the frame's `scaleFromWidth`, and a fluid token shrinks with the window and is then scaled again (it double-scales). A fluid reference on a scaled page cannot match.
- **Breakpoints.** The site's list is mobile-first: `base`, then `sm` 480, `md` 768, `lg` 1024, `xl` 1440; these five must stay. Add the reference's own widths with `breakpoints.update` `{ "styleBreakpoints": [ ...the whole list... ], "before": [ ...the list as it is now... ] }` (min widths strictly increasing; a breakpoint at min 1081 for a menu that folds at 1080). A desktop-first rule (`max-width`) needs no breakpoint: see the table below. Breakpoints need the `breakpoints.edit` level.

## 2. Tokens

Map the reference's `:root` to the design system ([design update](design-update.md) has the reads, and the `libretto-design-system` skill the shapes):

- Colours, radii, shadows, easings: one `designSystem.setTokens` per change the user would name (the palette steps and the roles on them together), under the AA gate. Never a raw value on a node where a token can hold it.
- **Fluid type and space stay fluid.** A dimension token takes a `clamp()` as its value (`clamp(2.15rem, 1.2rem + 4.5vw, 6.4rem)`), and so does the `fontSize` of a `type.*` preset. Copy the reference's clamp with its own numbers; ask Libretto what it resolves to at a width (`render_preview`), never compute it yourself (rule 13). This is right only on a breakpoint frame (step 1).
- Fonts: `font.importGoogle` for a Google family; a font file with `upload_font_file` (or `font.upload`), with its licence in `licence`. Then point the `font.family.*` tokens at the family, and check that every token naming another family (a ui or serif family the blueprint declares) is pointed too.

## 3. Component looks

For each button, chip, card or link style of the reference:

1. Read the component's variants and cells: the `design-system` index lists each component's variant keys; `component/<key>?variant=<key>&own=true` answers one variant's cells.
2. A new look is a new variant: `designSystem.createVariant` `{ "component": "button", "variant": "light", "label": "Light", "from": "primary" }`, then `designSystem.setComponentCell` `{ "component": "button", "cells": [{ "cell": "light.all.default.container.base.background", "value": "{color.bg.surface}" }, ...] }`. A cell key is `<variant>.<size>.<state>.<part>.<breakpoint>.<property>`; its value is a token alias, a declared keyword, or a `{ component, variant }` reference for a part the component borrows.
3. Then `set_variant` on the nodes that should draw it.

## 4. Header, footer and menus

Follow [header, footer and menus](header-footer-and-menus.md) for the mechanics (region trees, `tree.commit` on the region's page, `navigation.upsert`). What a reference usually needs:

- A burger at every width: the `menu-dialog` node's `collapseBelow` left empty. With a breakpoint in it, the burger shows only below that breakpoint and the bar's own `nav-list` takes over above it.
- The open menu's look is the drawer nav's cells (component `drawer-nav`, variant `full` for a full-screen menu, `right` for a side panel unless the node names one): `overlay` (`background`, `opacity`, `blur`), `panel` (`background`, `width`, `padding`, `shadow`, `z`, `radius`, `offset-x`, `offset-y`, `fit`), `motion` (`delay`, `duration`, `easing`, `fade`), for example `full.all.default.overlay.base.blur`. Where it opens from is the `menu-dialog` props `side`, `from` and `drawerHeight`.
- Menu items: targets `page`, `anchor`, `external` and `languages`.
- A menu panel that opens below the bar: `menu-dialog` `from: "below-bar"`. The panel hangs from the bottom edge of the header bar, spans the full width and reaches the screen's bottom (or its content's height, with the drawer nav's `fit` cell). The bar stays visible and usable: the burger turns into the close control (its glyph and its name swap), so the panel draws no close button of its own. Its look is the drawer nav's `full` variant: the veil under it is the `overlay` cells, and a `transparent` panel background lets the veil show.

## 5. One section at a time

For each page, top to bottom, one section per batch:

1. Insert the closest preset ([sections from presets](sections-from-presets.md)) or build the section from boxes, texts and images (`insert`), then set its geometry with `set_style` (the table below).
2. Compare it with the reference at desktop and at mobile: `compare_reference` `{ "pageId", "device": "desktop", "crop": { "nodeId": "<the section>" }, "referenceMediaId": "<the reference section's screenshot>" }`, then `"device": "mobile"` (390 px). With an image of the reference: upload your screenshot of that section with `upload_media_file`, or give `referenceUrl`, a public https address of an image.
   For a live reference site, name its page and the same section instead of an image: `"referencePageUrl": "https://…/about", "referenceSelector": "#team"` (the server opens it at the same width, motion reduced, every image loaded; `selector_not_drawn` when nothing matches). The draft is captured with its scenes at their end state, as the reference page is (a line drawn, a counter at its last value); `"motion": "start"` captures the draft's first frame instead, for a reference image of a first screen before its animations play.
   Compare one section at a time, one call after the other: parallel lanes share the server's capture slots. A `render_busy` answer (503) carries `retryAfter`: wait that many seconds and call again, rather than counting it as a failed comparison.
3. Read `ratio` and `heightMismatch`. Fix the largest difference first (a wrong frame or token shows on every section; fix it there, not per node), then compare again.
4. Stop when the ratio is below what the user accepts for that section, and tell them what still differs. Never loosen a check or fake a match (an image of the reference placed on the page is not a rebuild).

## CSS to Libretto

Every row is a node style (`set_style` `{ id, scope, patch }`), a prop, or an operation. A declaration value may be a token (`{space.6}`) or a raw CSS string (`"clamp(22px, 2.3vw, 34px)"`); the server refuses what the style catalogue does not allow, at its path.

| In the reference | In Libretto |
|---|---|
| `:root { --accent: … }` | a token: `designSystem.setTokens` (step 2) |
| `font-size: clamp(…)`, fluid spacing | a fluid dimension token, or the `fontSize` of a `type.*` preset; a one-off size as a raw `clamp()` declaration |
| `display: grid; grid-template-columns: repeat(12, 1fr); gap` | `set_style` `{ "display": "grid", "grid-template-columns": "repeat(12, 1fr)", "gap": "{space.…}" }`; a child's place is `grid-column-start` / `grid-column-end` (no `grid-column` shorthand), and `order` |
| `grid-template-columns: subgrid` | the same declaration on the child grid |
| `@media (min-width: 768px)` | scope `bp:md` (the site's breakpoint ids; add one with `breakpoints.update`) |
| `@media (max-width: 767px)` | scope `cq:(max-width:767px)`: a container query on the page-wide content box, so no breakpoint is needed |
| `@media (prefers-reduced-motion: reduce)` | scope `mq:(prefers-reduced-motion:reduce)`. Reveals never animate under reduced motion, and scenes play their reduced-motion form, so only hand-written transitions need it |
| `position: sticky; top: …` | `set_style` `{ "position": "sticky", "top": "…" }` |
| `mix-blend-mode: difference` | `set_style` `{ "mix-blend-mode": "difference" }` (`isolation: isolate` on the parent when the blend must stop there) |
| `aspect-ratio`, `object-fit`, `object-position` | node styles of the box or the image, per `bp:` |
| `.card:hover img { … }` | scope `s::hover\|t: img` on the card (the tail is a descendant selector; `t:> img` for a child). Hover rules apply only on devices that can hover |
| `.card:has(> img)` | scope `s::has(> img)` |
| `.prose sup a`, `blockquote p`, `ol > li p` | a chained tail on the rich text: `t: sup a`, `t: blockquote p`, `t:> ol > li p`. Up to three selectors, each an element a rich text draws named by its tag (`a`, `p`, `h1`–`h6`, `ul`, `ol`, `li`, `blockquote`, `sup`, `sub`, `strong`, `em`, `code`, `kbd`, `figure`, `figcaption`, `img`, `table` and its rows and cells, `hr`, `span`), no class, a pseudo-element only on the last (`t: sup a::after`). A one-selector tail takes any tag or class, as before |
| `a { text-decoration: none }`, `a { color }` inside a text | `t: a` on the rich text: the link element draws its underline and colour, so the node style wins |
| `text-wrap: balance` / `pretty` | `set_style` `{ "text-wrap": "balance" }` (`wrap`, `nowrap`, `balance`, `pretty`, `stable`); a design-system part with a `typography` cell takes a `text-wrap` cell too (`wrap`, `balance`, `pretty`, `nowrap`), so a heading variant can balance its titles |
| `<sup>`, `<sub>` in a text | the rich text's `superscript` and `subscript` marks (`{ "type": "superscript" }` on the text run; `<sup>…</sup>` in `content.importMarkdown`); a link in the run stays a link, raised |
| footnotes: `<sup id="ref-1"><a href="#nota-1">1</a></sup>` and a notes list with `↩` back-links | generic pieces, no footnote node. The reference: the run `1` with the marks `superscript`, `anchor` `{ "attrs": { "id": "ref-1" } }` and `link` `{ "attrs": { "href": "#nota-1" } }`. The notes: an ordered list whose items open with a run marked `anchor` `{ "id": "nota-1" }` and end with a run `↩` marked `link` `{ "attrs": { "href": "#ref-1", "ariaLabel": "Torna al testo" } }`, so a screen reader hears the words, not the arrow. An id is a letter, then letters, digits, `-`, `_`. Write `↩` without the emoji selector (U+FE0F). The batch: [blogs and templates](blogs-and-templates.md), Footnotes |
| a path segment with no page (`/note/tema/libretto`, where `/note/tema` is a 404) | a folder: `page.create` `{ "pageType": "folder", "slug": "tema", "title": {…}, "parentId": "<note>" }`, then the pages with `parentId` the folder. A folder takes `slug`, `slugs`, `title`, `parentId` and `position` only, is always published, holds no tree and never shows in menus, breadcrumbs, lists or the sitemap: do not create an empty draft page for the segment |
| `body.is-dark { background }` on one page | the page's frame background: `page.update` `patch.meta.layoutOverrides.background` (`{ "color": "var(--ds-color-bg-inverse)" }`: a frame colour is CSS, so a token is named by its `--ds-*` variable, as the theme's frames do). `patch.meta` replaces the whole `meta`: read the page first and send its `meta` back with your change merged in |
| `<img srcset sizes>` | the `image` primitive with a media library `src`: Libretto renders its own `srcset` (AVIF and WebP, 320 to 2560 px); set `sizes` to the reference's and `loading: "eager"` on the first screen's image |
| `<picture><source media>` (another crop on phones) | the `image` primitive's `sources`: up to 6 `{ media, src }` or `{ upToWidth, src }` (exactly one of the two), each `src` a media library image or a URL in place of the image's own `src` for the viewports it names. `media` is a site breakpoint id, from its min width up (not the first breakpoint); `upToWidth` is a width in px, for a desktop-first `max-width` source such as `{ "upToWidth": 767, "src": { "$media": "<phone crop id>" } }`. Each source keeps Libretto's own `srcset`; `object-position` per `bp:` is a node style |
| `<iframe>` map or video | the `embed` primitive: `url` (https on Google Maps embed, OpenStreetMap embed, YouTube no-cookie or Vimeo player) and `title` (the frame's name). `loading` says when the frame loads: `immediate` (the default) with the page, `onClick` when the visitor presses the placeholder's load button, `afterConsent` once the visitor grants the external media consent category (`media`) or loads this frame alone. Until then the page shows a placeholder and makes no request to the host: `notice` (its text), `loadLabel` (the load button), `allowLabel` (the consent button, `afterConsent` only), and `linkUrl` with `linkLabel` (an https link that opens the content at its provider). A video by its provider is the `video` primitive |
| a JavaScript slideshow | the `carousel` behaviour: `mode`, `autoplay`, `interval`, `pauseOnHover`, `loop`, `indicators`. `transition: "fade"` crossfades paged slides in place (the `slide` part's duration and easing cells time it; `slide`, the default, changes at once). `controls`: `full` (previous, next, the indicators and play/pause), `play` (only play/pause) or `none` (nothing drawn; the pointer or focus on the carousel always holds the autoplay). A title over the slides goes in its `overlay` slot and stays while they change, so `mix-blend-mode` on the title node blends with them. Under reduced motion it never plays and the first slide stays |
| a scrolling strip of names or logos | the `marquee` behaviour, one per row, each with its own `speed` (pixels per second) and `reverse`; `mode: "alternate"` with `distance` for a strip that swings back and forth. `pauseOnHover` (on by default) stops it under the pointer; `pointerScrub` (`off`, `follow` or `opposite`, loop mode only) moves the items with the pointer or against it, `pointerGain` (0.1 to 5) pixels per pointer pixel; `hoverArea: "parent"` makes rows stacked in one box stop and follow the pointer together (`band`, the default, is the marquee alone) |
| a list whose picture follows the pointer | the `project-index` behaviour with `peek` on (its parts, such as `peek`, take node styles with `p:peek`) |
| elements fading in on scroll | a reveal: `set_meta` `meta.reveal` (`effect` `fade-up` and others, `mode` `enter` or `scroll`, `staggerChildren`), or the site's block reveal |
| parallax, pinned or scrubbed motion (`animation-timeline: view()`) | a scene recipe: `motion.listRecipes`, then `motion.applyRecipe` (the `parallax` recipe moves a target by a share of its height, in %) ([motion](motion.md)). Not yet: one drift reveal applied to many nodes at once |
