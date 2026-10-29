# Brand canvases: formats in mm, bleed, patterns and print

Use when the user wants a poster, a flyer or a social graphic made in the brand: one composition shown at several sizes, some on paper (A3, A4) and some on screen (a story, a post), and a print file when a format is on paper.

Operations: [brand](../operations/brand.md) (`brand.createTemplate`, `brand.renderDraft`, `brand.updateTemplate`, `brand.print`), [pages and trees](../operations/pages-and-trees.md) (`tree.read`, `tree.commit`, `pattern.paintCells`), [media and fonts](../operations/media-and-fonts.md), [design system](../operations/design-system.md).

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
5. Look at it: `brand.renderDraft` `{ "templateId", "formatId" }` for each format, and fix what differs from what was asked.
6. Approve when the user says so, then print (see Print below).

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

## Fonts for print

A print file takes only fonts the site holds: Google families with `font.importGoogle` (`display` is `swap` when you leave it out), and a foundry's faces with `upload_font_file` in WOFF2, WOFF, TTF or OTF (Libretto stores each as WOFF2). Text set in a family the site has no face for is refused when printing. Ask the user for the licence before uploading a face.

## Print

A print colour is a token with CMYK: a colour token may carry `$extensions["com.libretto.print"] = { "cmyk": [c, m, y, k], "link": "rgb" | "cmyk" | "free" }`, written with `designSystem.setToken` or `setTokens`. `rgb` derives the CMYK from the RGB, `cmyk` derives the RGB, `free` keeps both as given. Every colour the canvas paints needs one: a colour with no CMYK refuses the print.

1. Approve the template (`brand.updateTemplate` with `status: "approved"` and the `draftRevision` of the last `brand.renderDraft`).
2. `brand.print` `{ "templateId", "format": "a3" }`, alone in a batch with the `media` base revision. `format` is one of the template's mm formats (the master when left out). It stores a PDF/X-3 file (FOGRA39, trim plus bleed, crop marks) in the media library and answers its record with the `url`, never the bytes.
3. A 422 `print-refused` lists what the print cannot hold, each with its layers:
   - `colour-without-cmyk`: give the colour token its CMYK.
   - a shadow, a filter, an opacity, a blend mode or a picture with transparency: remove it or flatten the picture first.
   - `system-font`: use a family the site holds.
   Fix those and print again. A picture under 200 ppi at its size in mm is a warning, not a refusal: use a larger file or place it smaller. A 500 `print-nonconforming` means the file failed Libretto's own PDF/X-3 check: open a ticket (`report_issue`).
4. Tell the user where the file is (the media library) and what the findings were.
