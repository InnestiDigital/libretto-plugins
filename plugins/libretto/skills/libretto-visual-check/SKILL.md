---
name: libretto-visual-check
description: Look at a core Libretto page before and after a change - the server's screenshots (render_preview, at a device or a width, a language, a theme, as a guest or a member, the draft or the live page), or in the user's own Chrome (claude-in-chrome tools) the View draft page and the editor - and report what differs from what was asked. Use after applying a visual change on a Libretto site, when the user asks "how does it look", "show me", "check it", or when a design update needs judging by eye.
---

# Seeing your work on a Libretto site

An apply answer says Libretto accepted the change. Only looking says it is right. Look before you change anything (the "before") and again after (the "after"), at desktop and phone width.

## The server's screenshots first

`render_preview` answers a JPEG of a page, with nothing to set up:

| Argument | Says |
|---|---|
| `pageId` | The page, from `site_context`'s pages. |
| `target` | `draft` (default): the draft as it will be once published; `live`: what a visitor gets now (`liveVersion` names the version). |
| `device` / `width` | `desktop` (1440 px), `tablet` (820), `mobile` (390), or a `width` of your own from 320 to 2560 (a breakpoint of the site). |
| `crop: { "nodeId" }` | One part's box: an id from `page/<pageId>`, or a header or footer part. |
| `area` | `page` (default) or `viewport`, the first screen. |
| `locale` | One of the site's languages; absent: the main one. |
| `theme`, `as`, `item` (draft only) | Under one of the site's themes; as a `guest`, a signed-in `member` or `role:<key>` (a member holding that role); one item of a collection page. |
| `colorScheme` | A `light` or `dark` browser. |
| `motion`, `scroll` | `end` (default): every part at rest, as a visitor who asks for less motion sees it; `start`: the first frame. `scroll` (`{ "y" }`, `{ "progress" }` or `{ "nodeId" }`) captures the screen further down with motion allowed; not with a crop or `area: "page"`. |

The usual before and after: `{ "pageId", "device": "desktop", "crop": { "nodeId": "<the section you change>" } }`, then the same with `"device": "mobile"`; for a text in another language, `"locale"` at `"tablet"`; for a theme you changed, `"theme"`.

- A live page under a theme, as a member or for one item is not offered (`render_not_offered`): the live site shows what a guest sees.
- Captures share the server's few capture slots: a call may wait its turn (`queuedMs` says how long). A queue too long answers `render_busy` with `retryAfter`: wait that many seconds and call once more; if it is busy again, say so in plain words and go on without the picture. `render_timeout` or `screenshot_unavailable`: say it once, do not retry in a loop.
- Nothing renders a page before a batch: to compare, apply, look, and undo if the user does not want it.

`compare_reference` compares a draft page's screenshot with a reference (an image of the media library, a public image, or a public page with `referenceSelector`), one section at a time: `ratio` of pixels that differ, `heightMismatch` and a verdict. See [preview and verify](../../reference/recipes/preview-and-verify.md).

Each screenshot stays in the conversation: crop to the sections you changed, and keep the whole page for a review the user asked for or before a publish.

## In the user's Chrome

With the `claude-in-chrome` tools (`tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `computer`, `resize_window`, `read_page`, `find`), you can see the draft as the person does. If the tools are missing, or `tabs_context_mcp` finds no connected browser, the server's screenshots are enough.

### Rules (never bend them)

1. **The person signs in, not you.** If a page asks to sign in, stop and ask them to sign in in that Chrome; never type an email or a password, never read cookies.
2. **Look, do not touch.** Navigate, scroll, resize, take screenshots, read. Never click Publish, Delete, Undo or any save button; never drag in the editor's canvas; never type into the editor. Changes go through MCP.
3. **Never accept a dialog.** Dismiss it or stop, and tell the person.
4. **Your own tab.** Open a new tab (`tabs_create_mcp`) and close it at the end; put the window back to the size it had.
5. **Nothing leaves the machine.** Screenshots stay in the conversation.

### The addresses

Only from `site_context.urls`:

| What | Link |
|---|---|
| View draft of a page: the draft as it will look once published, for a signed-in person | `urls.page.draft` with the page's id in place of `<pageId>` |
| The page in the editor | `urls.page.editor` with the page's address in place of `<pageSlug>` (`home` for the home page); `?node=<nodeId>` selects a part, `&lang=<locale>` edits a language |
| The public page: only the published version | `urls.live` and the page's address under it; another language: `urls.locales["<code>"].live` |
| Any admin place (Media, Publishing, History, Editor › Checks) | `urls.places["<key>"]` |

### Before and after

1. **Before** you apply: open View draft of the page. Desktop: `resize_window` to 1440 x 900, screenshot the area you will change. Phone: 390 x 844, reload, the same area. For a text change, also the other language at tablet width (820 x 1180).
2. Apply your change through MCP.
3. **After**: reload, the same widths and scroll position, screenshot.
4. For a part, open the editor with `?node=<nodeId>`: the part is selected and the Inspector shows it. Read; do not edit there. The Inspector shows a variant's label, not its key.
5. For a site-wide change (a token, a variant, the header): check a second page that uses it.

## Compare and report

For each thing the user asked: matches or does not, with what you saw ("lo sfondo al passaggio del mouse ora è l'accento, ma sul telefono l'etichetta è rimasta scura"). Also report what changed that was not asked (a heading that wraps, a section that moved, an overflow at 390 px). Then say what you will fix, and fix it through MCP.

## A change that does not show

- A refused batch changes nothing: never report it as done.
- The answer was `ok` but the screenshot shows the old state: check the page id and the part id, read the part back (`node/<pageId>?node=<nodeId>`), and for a header or footer part check you edited its component (`component.edit`), not a page. If the read has the change and the screenshot does not, that is a bug: report it (`libretto-report-issue`).
- The answer's `corrections` say the contrast check changed a text colour in the same step: the screenshot shows the corrected colour. Tell the person.
- The answer's `findings` are what Editor › Checks shows for the page; a number that grew after your change points at something you introduced.
- An editor tab the person left open does not refresh by itself: tell them to reload it after your changes; never click its buttons yourself.
