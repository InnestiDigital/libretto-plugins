# Preview and verify

Use after every applied change, before telling the user it is done. An apply answer says the server accepted the change; it does not say the page looks right.

## 1. Read it back (always)

- `splash://site/<siteId>/outline/<pageId>`: the node is where you meant, with the variant and theme you set.
- The node in `splash://site/<siteId>/tree/<pageId>`: the props and styles you wrote, tokens and all.
- For the design system: the token or cell in the `design-system` or `component/<key>` resource.
- `history.read` `{ requestId }`: the committed outcome of a batch, rechecked.

## 2. See it

Pick the first that is available:

1. **Chrome** (the `claude-in-chrome` tools): open the draft preview and the admin editor in the user's own Chrome, screenshots before and after, desktop and phone. The `libretto-visual-check` skill has the steps and the rules.
2. **`render_preview`** `{ "pageId", "device": "desktop" | "mobile", "mode": "screenshot" }`: a full-page JPEG of the draft rendered by the server (desktop 1440 px wide, mobile 390 px). Bounded by 30 s (`render_timeout`); a server without a screenshot browser refuses it, then use 1. or 3. Known limit (2026-10-25): images uploaded to the media library can be missing from these screenshots (they load lazily) while the page shows them; check in Chrome before reporting a missing image.
3. **`render_preview`** in `mode: "document"`: the page's `splash.render/1` document and compiled CSS. Not a picture, but it shows what will render (resolved texts, classes, tokens) without a browser.

`compare_reference` `{ pageId, device, referenceMediaId }` compares a screenshot with a reference image in the media library (upload the reference first, [images](images.md)): `ratio` of differing pixels, `heightMismatch`, and a verdict. Use it for "make it look like this" jobs; a low ratio is evidence, not proof.

## 3. What to compare

- What the user asked, item by item: say which match and which do not.
- Both widths: a change that works at 1440 px can wrap or overflow at 390 px.
- The neighbours: a spacing or token change moves other things; look at the sections around it and at one other page that uses the same token or variant.
- Draft vs public: the preview shows the draft; the public site shows the last published version until someone publishes.

## 4. Report

Per change: page, what changed, the `requestId`, what you saw (screenshot taken or not), and anything that does not match. If you could not see the page at all (no Chrome, no screenshot browser), say so plainly and ask the user to look in the admin editor.
