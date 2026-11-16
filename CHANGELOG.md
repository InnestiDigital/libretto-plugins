# Changelog

## 1.0.0

For Libretto sites on the core engine only. Sites on the old engine keep the 0.5.x line, which this release does not replace: never install both for one site.

### What changes for an agent

- **Eight tools.** `site_context`, `discover_operations`, `read_resources`, `apply_ops`, `dry_run_ops`, `render_preview`, `compare_reference`, `report_issue`. The job tools and the old tool names are gone; an old op name is refused with `operation_not_on_core`, which names the op or door to use.
- **The batch.** `requestId`, `baseRevisions`, `message` and `operations` at the top level. Only the leaf paths the batch writes are judged: copy `site_context.baseRevisions` and lay each write's `revisions` over it. A part of the header, the footer or a layout is written inside `component.edit`; tokens with `token.set`, component looks with `cell.set`; structure with the `tree.*` ops.
- **Undo.** Each write answers its `undo`, the `history.undo` call for that step; an agent takes back only its own token's newest step, and a person takes back anything else in Admin › History.
- **Doors.** Publish, roll back, uploads, fonts, members, form messages, mail, domains and sites are doors, each alone in its batch, with its own confirmation, dry-run and limit; publish and roll back only on the human's go.
- **Contrast.** A write that leaves a text hard to read is corrected in the same step (the answer's `corrections`) or refused with `contrast.uncorrectable`. Keeping a hard-to-read pair is a person's decision in Editor › Checks.
- **Person-only acts.** The site's email settings, deleting a site, packages, people, tokens, downloading messages and triaging reports are refused with `operation_forbidden`, the place and its link: the skills hand the person that link, and `libretto-admin-browser` opens it for them.
- **Reads.** 39 resources, the admin's own reads; long lists are cut and named in `bounded` with the URI that reads on. `reports` holds the issues the agent reported and the owner's answers.
- **Screenshots.** `render_preview` shows the draft or the live page at a device or a width, in a language, under a theme, as a guest, a member or a role, one item of a collection, the first or the last frame of motion, scrolled; `compare_reference` takes the same view against an image or a public page.

### Files

- `libretto-files` uploads through the `media.uploadFile` and `font.uploadFace` doors, the file as base64 in `data`, at most 20 MB a call, every kind of media and WOFF2, WOFF, TTF and OTF fonts. A ZIP or a larger file is refused with "upload it in Admin › Media". A folder goes 50 files a call; what the library holds is skipped, read through the `media` resource; the space left through `media-space`.
- It refuses a site on the old engine and a token of several sites without `siteId`.

### Reference

- `reference/operations/` is generated from `data/agent-registry.json`, the registry Libretto writes for agents (`scripts/reference-from-registry.mjs`): 160 ops and 29 doors in 14 domains, the 10 acts only a person does, the 8 tools and the 39 resources, with the server's guide.
- The recipes are rewritten for core. New: blogs and articles, members and private pages. Gone: brand canvases (no core door renders or prints a canvas) and blogs and templates.
- `scripts/check-names.mjs` fails on any op, door or resource the skills, recipes, server or README name that the registry lacks.

## 0.5.9

### Motion

- The motion recipe opens its hand-built part with the common requests (intro or page-load sequence, a header that differs per page, a title that zooms on scroll, a logo docking into the bar) and how to build each, so a missing recipe is not reported as a missing capability.

## 0.5.8

### Files

- A PDF has its own ceiling, 20 MB, as Libretto's: a larger one is told to compress (export again with pictures at 300 ppi, or a smaller-file preset) and stays a PDF; nothing tells anyone to turn a PDF into a picture. Images and SVGs stay at 5 MB; videos go up to 20 MB through Claude, larger ones through the admin's Media.

### Collections

- A repeater points at another collection with the tree op `set_source` (its whole source: collection, filter, sort, limit); `set_props` on a repeater is refused, so the collections recipe no longer suggests it.
- A component field's name is keyed by the site's own language codes (`{ "it": "Titolo", "en": "Title" }` on an it, en site); another key is refused.

## 0.5.7

### Motion

- Claude can write motion the recipes do not cover yet: a scene that repeats (a logo that swings forever), a bar that rides away scrolling down and comes back scrolling up, a full-screen menu that holds the page still, a heading that enters line by line or word by word, sections that stack as you scroll, a logo visitors can drag, a node shown on some sections only, and header motion that plays on every page. For each one the guide says the limits and what a visitor with reduced motion sees.
- A screenshot says what a visitor with reduced motion sees, so Claude knows when a capture shows a scene's end and when its start.

### Header and fonts

- A fixed bar keeps clear of a phone's home indicator and notch (safe areas).
- Text styles can be italic or slanted, drawn by the family's italic or by a variable font's slant axis; Google Fonts families bring every alphabet Google serves; a variable font file is one upload for its whole weight range.

## 0.5.6

### Brand

- Claude can light a dot grid from a picture in one step, the way the editor's "Light the dots from a picture" does: the dots around the figures of the photo, with the size of the area and how much of it must hold drawing as settings. The guide says what it can and cannot tell apart (a figure from a line of the plan) and how to fix the rest.

## 0.5.5

### Brand

- Blends and transparency print the way a print designer flattens them: a grid of dots in multiply over a photo, a picture with transparent pixels or a faded layer is flattened with what lies under it into a 300 ppi CMYK area, over a flat colour it stays vector in the computed colour, and everything above stays sharp. Claude tells you what was flattened.
- Claude sees the print file before it goes to the printer: the page of the PDF, bleed and crop marks included.
- A canvas can let the studio change a layer's blend and opacity.

## 0.5.4

### Brand

- Claude now sees the canvas it draws. A draft render (and a render of an approved canvas) arrives as a picture it can look at, not as a block of text, so it can judge the layout before it approves or prints.
- Claude can compare a canvas with the reference you give it (a file in the media library, an image link or a web page): it gets the reference, its render and the places they differ side by side, and fixes the biggest differences first.
- Claude can make a dot grid follow a picture (so the dots stay on the photo when it moves or is cropped for another format), and the guide explains how, with an example.
- Printing a canvas asks only for the media library's revision, as the guide always said.

## 0.5.3

### Brand

- A new guide for posters, flyers and social graphics: formats in millimetres or pixels, bleed, margins and safe zones, the print colours, the fonts a print file needs, and how to read what the print refuses.
- Claude can light chosen dots of a dot-grid layer from their positions (single dots or whole rows) instead of failing to write the pattern; the change is one step and can be undone.

### Fonts

- Font files can be TTF, OTF or WOFF as well as WOFF2: Libretto converts them to WOFF2 when it stores them, so Claude no longer asks you to convert a file first.
- A Google font imported without a `display` setting now uses `swap` (the text shows at once and changes when the font has loaded).

## 0.5.2

### Brand

- Claude can finish a brand canvas on its own: it looks at the canvas as it stands, approves it when you say so, and makes the print PDF (PDF/X-3, FOGRA39, with bleed and crop marks), which lands in the media library. If the canvas holds something a print file cannot (a colour without its CMYK, a shadow, a transparency), it tells you what and where.

## 0.5.1

### Brand

- The brand rules you put into Libretto reach Claude: before it writes copy, composes a brand canvas or picks colours, it reads the site's brand brief (the concept, the tone words, the do and don't rules, the logos, and the brand colours and fonts as the design system draws them) and follows it.

## 0.5.0

Everything new since 0.4.7.

### Pictures, drawings and fonts

- Icons, illustrations and charts drawn in the site's own colours: upload an SVG with `upload_media_file` (naming its text and accent colours when the file paints them), place it on an SVG drawing, and colour and size it with the design system's tokens.
- A picture with words in it (a chart, a poster, a drawing) can differ by language, and so can a page's or an article's share image and a node's ARIA label.
- Variable fonts upload at their weight range, so a text style can use any weight inside it; a variable face stored at one weight by an earlier version can be uploaded again to fix it.

### Pages, texts and articles

- Footnotes in a rich text: a raised number that links to its note, and a `↩` back-link that a screen reader announces in words.
- A page for addresses that do not exist (your own 404 page), per language if needed.
- Folders: pages under an address segment that has no page of its own (`/note/tema/libretto`).
- An article keeps its real date (a note written in March), on a draft or an already published article.
- Text styles that set how lines break (balanced headings, tidy paragraphs) across the whole site.
- Contact forms: their error messages per language, the error summary, the required marks, a consent sentence with the privacy link inside, and where the send button sits.
- The site's own email: send form notifications through the site's SMTP server, send a test email, and find the messages that were not emailed.

### Motion

- Scenes that draw a line, count up to a figure or decode a text, and two ready patterns: bars that grow in turn and a ratchet that turns one tooth per value.
- Scenes on the named parts of a drawing (a wheel, a chart's bars, an illustration drawn layer by layer) and on a stat's value.

### Checking and publishing

- Screenshots and reference comparisons show every animation at its end state, as the reference page is captured; ask for the first frame to see where a scene starts.
- Comparisons against a live reference page and one of its sections, without taking screenshots by hand.
- A busy screenshot queue is waited out instead of failing: Claude waits for its turn (a call may take a few minutes) and tries again once when the server asks it to.
- Before a publish, Claude names the pages that stay offline because a page above them is still a draft, and the menu links that lead to them.
