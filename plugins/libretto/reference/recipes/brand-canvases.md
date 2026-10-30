# Brand canvases: formats in mm, bleed, patterns and print

Use when the user wants a poster, a flyer or a social graphic made in the brand: one composition shown at several sizes, some on paper (A3, A4) and some on screen (a story, a post), and a print file when a format is on paper.

Operations: [brand](../operations/brand.md) (`brand.createTemplate`, `brand.renderDraft`, `brand.updateTemplate`, `brand.print`), [render tools](../operations/mcp-tools.md) (`compare_reference`), [pages and trees](../operations/pages-and-trees.md) (`tree.read`, `tree.commit`, `pattern.paintCells`, `pattern.setLink`, `pattern.fillFromImage`), [media and fonts](../operations/media-and-fonts.md), [design system](../operations/design-system.md).

## What a brand template is

A canvas page (a section holding one box, the canvas host) that carries its formats in the host's `meta.formats`:

```json
{ "list": [
  { "id": "a3", "label": "A3", "width": 297, "height": 420, "unit": "mm", "dpi": 150,
    "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 }, "bleed": 5 },
  { "id": "story", "label": "Storia 9:16", "width": 1080, "height": 1920, "unit": "px",
    "margins": { "top": 250, "right": 60, "bottom": 250, "left": 60 },
    "safe": { "top": 250, "right": 0, "bottom": 250, "left": 0 } }
], "master": "a3" }
```

- **Units.** `width`, `height`, `margins`, `safe` and `bleed` are in the format's own `unit`: `mm` on paper, `px` on screen. An mm format draws at its `dpi` (72 to 600, 150 when absent), so A3 at 150 dpi is 1754 x 2480 px; every format must draw at 16 to 4096 px a side.
- **Trim and bleed.** `width` and `height` are the trim, the paper size. `bleed` (mm, usually 5) is the extra the printer cuts off. Draw what touches an edge to the edge of the trim; the print file extends it into the bleed by itself.
- **Margins and safe.** Margins are where content should stay inside. `safe` is what a platform's own interface covers (Instagram's 250 px at the top and bottom of a story): a layer pinned to an edge stays flush to it but its content sits inside the safe zone.
- **The master.** The master format's placement is the layers' own style geometry (`left`, `top`, `width`, `height`, `transform` in percentages of the canvas). Every other format remaps it, unless a layer has its own placement there (`meta.place.<formatId>`, `{ x, y, w, h }` centre and size in percent). Design the master first, then look at each format.
- **Pins.** A layer with `meta.pin` (`top`, `bottom`, `left` or `right`) stays flush to that edge in every format.

## Steps

1. Read the brand brief (`libretto://site/<siteId>/brand`) and the colours: type and colour come from the design-system tokens, never from raw values.
2. `brand.createTemplate` `{ "name", "formats": { "list": [...], "master": "a3" } }`. It answers the template row; its `id` is the page id. Read the tree with `tree.read` to get the host's id.
3. Build the layers with `tree.commit` on that page: `insert` under the host, `set_style` for the geometry (scoped CSS `position: absolute`, `left`, `top`, `width`, `height` in percent), `set_props` for the text or the picture. Texts use `type.*` presets and `font.family.*` tokens.
4. Change the formats later with `set_meta` on the host: its `meta` is replaced whole, so send the whole `meta` you read with `formats` changed.
5. Look at it: `brand.renderDraft` `{ "templateId", "formatId" }` for each format. The picture comes as an image block after the receipt (fitted to 1568 px on its longer side); the result's `image` is only a line naming it, and `width` and `height` are the full render's. Look at the picture before you change anything: never judge a layout from percentages you computed. If you cannot see an image, say so and ask the user to look.
6. Compare it with the reference the user gave (a file in the media library, an image at a public https URL or a public page): `compare_reference` `{ "templateId", "formatId", "referenceMediaId" }` (or `referenceUrl`, or `referencePageUrl` with `referenceSelector`). The answer is one image block with three panels side by side, the reference, your render and the pixels that differ in red, plus `ratio` (the share of differing pixels), `heightMismatch` and the verdict. Fix the biggest red areas first (a picture's size and place, a band's width, a text's size), render again and compare again until the red is only edges and anti-aliasing. For a reference you can only see on the user's screen, ask for it as an upload (`upload_media_file`).
7. Approve when the user says so, then print (see Print below).

## Pattern layers: dots on a lattice

A `pattern` layer draws dots on a triangular lattice. Insert it like any layer; its props are `angle` (degrees), `diameter` (a share of the pitch) and `cells`; its colour, blend mode and opacity are node styles. The layer's box anchors the lattice: its centre is the dot `[0, 0]`, its width the pitch.

```json
{ "op": "insert", "parentId": "<host id>", "index": 1,
  "node": { "id": "dots0001", "kind": "primitive", "type": "pattern", "props": { "angle": 0, "diameter": 0.6 } } }
```

A new pattern is a full lattice. Which dots are lit is stored as a bitset, so never write `cells` by hand: `pattern.paintCells` writes it from coordinates, one commit, undoable.

- `cells`: single dots as `[i, j]` pairs; `runs`: rows as `{ "j": 3, "from": 2, "to": 9 }` (row `j`, columns `from` to `to` included). Together at most 62 000 cells a call.
- `on` (default `true`) lights them; `"on": false` darkens them.
- `from`: `"empty"` or `"full"` first resets the pattern (discarding what was painted); without it the dots are painted onto what the pattern holds. To light only chosen dots: `"from": "empty"`, then the cells.
- The painted cells must fit a window of 256 x 256 cells; a wider spread is refused with a message naming the limit. A call that changes nothing is refused as `no_change`.

```json
{ "name": "pattern.paintCells", "input": {
  "pageId": "<template page id>", "nodeId": "dots0001", "from": "empty",
  "cells": [[0, 0], [-2, 1]], "runs": [{ "j": 3, "from": 2, "to": 9 }] } }
```

The dot `[i, j]` sits `i` pitches along the lattice's first axis (at `angle`, the screen's y pointing down) plus `j` pitches along the second, at `angle - 60`: at angle 0, `i` goes right and `j` goes right and up. Look at the result with `brand.renderDraft` and adjust, as you would a picture.

### Dots that follow a picture

`pattern.setLink` makes the lattice follow an image layer of the same page, so the dots stay on the picture when it moves, zooms or is cropped by each format's cover fit; `"link": null` stops it.

```json
{ "name": "pattern.setLink", "input": {
  "pageId": "<template page id>", "nodeId": "dots0001",
  "link": { "node": "pict0001", "origin": [0.5, 0.5], "pitch": 0.0167, "ratio": 1.5 } } }
```

- `node`: the id of the image layer (an `image` primitive of the page; a text, a box or the pattern itself is refused).
- `origin`: where dot `[0, 0]` lies on the picture, as `[x, y]` fractions of the picture's width and height (`[0.5, 0.5]` is its centre, `[0, 0]` its top-left corner).
- `pitch`: the distance between neighbouring dots, as a fraction of the picture's width (`0.0167` is 60 dots across it).
- `ratio`: the picture's width over its height in pixels (a 3000 x 2000 picture is `1.5`; the media record has both).
- The image layer must be placed in percentages, unrotated and fitted by cover (`object-fit: cover`); otherwise the link is ignored and the pattern stays where its own box puts it. Look at the render to check the dots sit where you meant.

### Dots lit from a picture

`pattern.fillFromImage` does what the editor's "Light the dots from a picture" does, with the same maths, so a poster whose dots sit around the figures of its photo needs one call, not thousands of cells. The lit cells are replaced (dots already lit go dark unless the picture lights them), as one commit that `history.undo` takes back.

```json
{ "name": "pattern.fillFromImage", "input": {
  "pageId": "<template page id>", "nodeId": "dots0001", "imageId": "pict0001",
  "inkPct": 15, "radiusCells": 2, "coveragePct": 1, "spread": 0 } }
```

- `imageId`: the image layer to read (a picture of the media library, upright and fitted by cover); left out, the picture the pattern follows (`pattern.setLink`).
- A dot is lit when at least `coveragePct` of the picture's pixels within `radiusCells` cells of it are ink (a pixel is ink from `inkPct` % dark and opaque); then the lit area grows by `spread` cells. The defaults (15, 2, 1, 0) light the soft areas around figures drawn in thin strokes. A bigger radius or a smaller coverage gives bigger areas; a `radiusCells` of 0 lights only the dots on the strokes.
- The picture's plan lines (a wall, a dimension) carry ink too and light dots: the call cannot tell a figure from a line. Look at the render, then darken what should stay dark with `pattern.paintCells` (`"on": false`).
- The answer carries `lit`, the number of dots lit. The lit cells must fit 256 x 256 cells; if they do not, raise `coveragePct` or `inkPct`.

## Fonts for print

A print file takes only fonts the site holds: Google families with `font.importGoogle` (`display` is `swap` when you leave it out), and a foundry's faces with `upload_font_file` in WOFF2, WOFF, TTF or OTF (Libretto stores each as WOFF2). Text set in a family the site has no face for is refused when printing. Ask the user for the licence before uploading a face.

## Print

A print colour is a token with CMYK: a colour token may carry `$extensions["com.libretto.print"] = { "cmyk": [c, m, y, k], "link": "rgb" | "cmyk" | "free" }`, written with `designSystem.setToken` or `setTokens`. `rgb` derives the CMYK from the RGB, `cmyk` derives the RGB, `free` keeps both as given. Every colour the canvas paints needs one: a colour with no CMYK refuses the print.

1. Approve the template (`brand.updateTemplate` with `status: "approved"` and the `draftRevision` of the last `brand.renderDraft`).
2. `brand.print` `{ "templateId", "format": "a3" }`, alone in a batch whose `baseRevisions` names `media` (copy it from `site_context`; no other revision is needed, and any other you name is checked as usual). `format` is one of the template's mm formats (the master when left out). It stores a PDF/X-3 file (FOGRA39, trim plus bleed, crop marks) in the media library and answers its record with the `url`, never the bytes, plus a look at the file: its page rendered from the PDF itself (the whole sheet, bleed, crop marks and slug line included), as an image block after the receipt. Look at it: it is what the printer gets, flattened areas included.
3. A 422 `print-refused` lists what the print cannot hold, each with its layers:
   - `colour-without-cmyk`: give the colour token its CMYK.
   - `system-font`: use a family the site holds.
   - a transparency on the canvas itself (not on one of its layers): give the canvas an opaque colour.
   Fix those and print again. A picture under 200 ppi at its size in mm is a warning, not a refusal: use a larger file or place it smaller. A 500 `print-nonconforming` means the file failed Libretto's own PDF/X-3 check: open a ticket (`report_issue`).
4. Tell the user where the file is (the media library), what the findings were, and what the print flattened (its `warnings`).

## Blends, opacity and transparency in print

A layer may blend with what lies under it: `set_style` on the layer at `base` with `mix-blend-mode` (`normal`, `darken`, `multiply`, `color-burn`, `lighten`, `screen`, `color-dodge`, `overlay`, `soft-light`, `hard-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) and `opacity` (0 to 1). A pattern of dots in `multiply` over a photo is the usual case: the dots darken the photo and the drawings above stay crisp.

A PDF/X-3 file holds no transparency, so the print flattens it, as a print designer would:

- **Over a flat colour, vector.** A layer whose only transparency is its own blend or opacity, over one flat colour (the canvas's or a box's), prints as vector shapes in the colour the blend gives, computed in CMYK from the two colours' print data: backdrop + opacity x (blend(backdrop, colour) - backdrop).
- **Over anything else, a 300 ppi CMYK raster.** A layer over a photo, a picture with transparent pixels, a shadow, a filter or a colour with alpha is flattened with everything under it, in its own area only, into one 300 ppi CMYK picture: the blend is computed in CMYK, token colours keep their CMYK, picture pixels go through the FOGRA39 profile.
- **Above stays vector.** Layers above the flattened area (texts, bands, a logo mark) are printed as they are, vector and sharp.
- **What it tells you.** The answer's `warnings` say what was flattened and what stays vector in the computed ink, in the user's language ("Appiattiti a 300 ppi in quadricromia: griglia, con ciò che sta sotto (foto, griglia)."), and the slug line of the file says it in the site's language ("appiattiti a 300 ppi: foto, griglia, marchio"). The editor's print checks show each transparency as "Flattened in print", not as a problem.

Name the layers (`name`) the way the user calls them: the warnings and the slug use the names.

## Blend and opacity in the studio

A person making a graphic in the studio may change a layer's blend and opacity when the canvas exposes them: add `"$blend"` to the layer's entry of the template's `customerSettings` (`brand.updateTemplate` `{ "templateId", "patch": { "customerSettings": { "<layerId>": ["$blend"] } } }`, alongside the other entries the layer exposes). The studio then shows the sixteen modes and an opacity slider; a graphic carries them as the override `{ "<layerId>": { "$blend": { "mode": "multiply", "opacity": 0.8 } } }` (`brand.render` and `brand.print` take the same `overrides`), refused where the curation does not grant `$blend`.
