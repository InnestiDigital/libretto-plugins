# Preview and verify

Use after every change, before a publish and after one: read the result back, then look at it.

Tools: `read_resources`, `render_preview`, `compare_reference` ([tools and resources](../operations/tools-and-resources.md)). Looking in the user's Chrome: the `libretto-visual-check` skill.

## Read it back

The answer of a write says what Libretto accepted. Read what it holds now:

| Changed | Read |
|---|---|
| A part's words, props or style | `node/<pageId>?node=<nodeId>`; where a style comes from: `style/<pageId>?node=<nodeId>` |
| A header, footer or layout part | `node/<pageId>?node=<nodeId>&owner=layout&component=<key>`, or `definition/<key>` |
| A page's words in a language | `texts/<pageId>?lang=<locale>` |
| The page's parts in order | `page/<pageId>` |
| A token, a theme | `tokens`, `tokens/<theme>` |
| A menu, a redirect | `navigation`, `redirects` |
| A timeline | `motion/<pageId>` |
| What Checks finds | `findings/<pageId>?locale=<locale>`, `contrast/<pageId>` |
| The step in History | `history` (the steps, newest first, with who and what) |
| What goes live at the next publish | `glance` |

## Look at it

`render_preview` `{ "pageId", "device": "desktop", "crop": { "nodeId": "<the section>" } }`, then `"device": "mobile"`. Options:

- `target: "live"`: the page a visitor gets now (`liveVersion` names the version); after a publish, it must be the version you made live.
- `width` (320 to 2560) instead of a device, for a breakpoint of the site.
- `locale`, `theme`, `as` (`guest`, `member`, `role:<key>`), `item`, `colorScheme`, `area: "viewport"` (the first screen).
- `motion: "start"` (the first frame; the default `end` is every part at rest) and `scroll` (`{ "y" }`, `{ "progress" }`, `{ "nodeId" }`).

Not offered: a page as a document or an outline (read `page/<pageId>` and `texts/<pageId>`), a live page under a theme or as a member (`render_not_offered`), a page before a batch (apply, look, undo). A busy queue answers `render_busy` with `retryAfter`: wait, call once more, then go on without the picture and say so.

## Compare with a reference

`compare_reference` takes the draft page's screenshot (the same view options) and a reference: `referenceMediaId` (an image of the media library), `referenceUrl` (a public image) or `referencePageUrl` (a public page, captured at the same device; `referenceSelector` crops it to one element). Compare one section at a time: `crop: { "nodeId" }` against the same section's `referenceSelector`. The answer: `ratio` (the share of pixels that differ), `heightMismatch` and a verdict. Fix the biggest difference first, then compare again.

## The live site

After a publish or a rollback: `render_preview` with `"target": "live"` on the pages the change touched, a crop of what changed, desktop and mobile. `page_not_live` or `site_not_live`: the page or the site is not online; give the person `urls.live` and ask them once to look, naming what to check. Never fetch the public site with Bash or `curl`.
