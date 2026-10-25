# Preview and verify

Use after every applied change, before telling the user it is done. An apply answer says the server accepted the change; it does not say the page looks right.

## 1. Read it back (always)

- `splash://site/<siteId>/outline/<pageId>`: the node is where you meant, with the variant and theme you set.
- The node: `tree/<pageId>?node=<nodeId>&depth=0`, the props and styles you wrote, tokens and all.
- For the design system: the token in `design-system?tokens=<its group>`, or the cell in `component/<key>?variant=<v>&state=<s>&own=true`.
- `history.read` `{ requestId }`: the committed outcome of a batch, rechecked.

## 2. See it

Pick the first that is available:

1. **Chrome** (the `claude-in-chrome` tools): open the draft preview and the admin editor in the user's own Chrome, screenshots before and after, desktop and phone. The `libretto-visual-check` skill has the steps and the rules.
2. **`render_preview`** `{ "pageId", "device": "desktop" | "tablet" | "mobile", "mode": "screenshot" }`: a JPEG of the draft rendered by the server (desktop 1440 px wide, tablet 820 px, mobile 390 px), every image loaded. By default the whole page; `"area": "viewport"` for the first screen only; `"crop": { "nodeId": "<id>" }` for the box of one node (a section you changed: the cheapest useful picture; `node_not_drawn` when the node is absent or has no size at that width). The answer's text gives `width`, `height` and `truncated`: a very tall page comes back cut, so crop a lower section to see the rest. Add `"locale"` for another of the site's languages, `"theme"` for one of its design-system themes, `"colorScheme": "light" | "dark"` for a browser that asks for one. An unknown locale or theme is refused (`locale_unsupported`, `theme_unknown`, 400). Bounded by 30 s (`render_timeout`); a server without a screenshot browser refuses it, then use 1. or 3. An older Libretto offers only desktop and mobile and may miss pictures that load lazily: check in Chrome before reporting a missing image.
3. **`render_preview`** in `mode: "document"`: the page's `splash.render/1` document and compiled CSS. Not a picture, but it shows what will render (resolved texts, classes, tokens) without a browser.

`compare_reference` compares a screenshot with a reference image: `{ pageId, device, referenceMediaId }` for one in the media library (upload it first, [images](images.md)), or `{ pageId, device, referenceUrl }` for an image at a public https address (fetched once, not stored, at most 20 MB; refused with `reference_url_refused`, 422, otherwise). It takes the same `locale`, `theme`, `colorScheme`, `area` and `crop` (compare one section with `crop`), and answers `ratio` of differing pixels, `heightMismatch`, and a verdict. Use it for "make it look like this" jobs; a low ratio is evidence, not proof.

## 3. What to compare

- What the user asked, item by item: say which match and which do not.
- The widths: a change that works at 1440 px can wrap or overflow at 820 or 390 px.
- The other languages and themes: a longer translation or a dark theme can break what the default one shows. Check the second locale at tablet width at least once per job.
- The neighbours: a spacing or token change moves other things; look at the sections around it and at one other page that uses the same token or variant.
- Draft vs public: the preview shows the draft; the public site shows the last published version until someone publishes.

## 4. Report

Per change: page, what changed, the `requestId`, what you saw (screenshot taken or not), and anything that does not match. If you could not see the page at all (no Chrome, no screenshot browser), say so plainly and ask the user to look in the admin editor.
