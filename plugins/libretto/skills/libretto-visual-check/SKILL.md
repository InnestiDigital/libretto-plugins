---
name: libretto-visual-check
description: Look at a Libretto page before and after a change, in the user's own Chrome (claude-in-chrome tools) - the draft preview and the admin editor, at desktop and phone width - and report what differs from what was asked. Use after applying a visual change on a Libretto site, when the user asks "how does it look", "show me", "check it", or when a design update needs judging by eye. Falls back to render_preview and re-reading the tree when Chrome is not available.
---

# Seeing your work on a Libretto site

An apply answer says Libretto accepted the change. Only looking says it is right. Look before you change anything (the "before"), and again after (the "after"), at both widths.

## Is Chrome there?

The `claude-in-chrome` tools (`mcp__claude-in-chrome__*`: `tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `computer` for screenshots and scrolling, `resize_window`, `read_page`, `get_page_text`, `find`, `read_console_messages`) drive the user's own Chrome. If they are missing, or `tabs_context_mcp` finds no connected browser, skip to [Without Chrome](#without-chrome).

## Rules (never bend them)

1. **The user signs in, not you.** The admin must already be open and signed in in that Chrome, on the same address as the Libretto server (`LIBRETTO_URL`, default `https://librettocms.com`). If you land on `/admin/login`, stop and ask the user to sign in in that Chrome; never type an email or a password, never use a password manager prompt, never read cookies.
2. **Look, do not touch.** Navigate, scroll, resize, take screenshots, read text. Never click Publish (Pubblica), Delete (Elimina), Revoke (Revoca), Restore, Undo (Annulla) or any save button; never drag in the editor canvas; never type into the editor. Changes go through the MCP server, where they are checked and undoable; the few jobs MCP cannot do in the admin are `libretto-admin-browser`, with its own rules.
3. **Never accept a dialog.** A confirm, alert, "leave page?" or permission prompt: dismiss it or stop, and tell the user.
4. **Your own tab.** Open a new tab for the check (`tabs_create_mcp`); do not take over the tab the user is working in, and close yours at the end.
5. **Nothing leaves the machine.** Screenshots stay in the conversation; do not upload them anywhere unless the user asks (for `compare_reference` they go to the site's media library, see [images](../../reference/recipes/images.md)).

## The addresses

Use `site_context`'s `urls` whenever it has them, and give the user only those: `admin`, `editor` (`?pageId=<id>`, `&nodeId=<id>` to select a node), `draftPreview` (put the page path before the `?`) and `publicSite` (null when the site has no address yet). The patterns below are what those URLs look like and how to reach the other admin pages from `admin`. When it has none, the patterns below need the address of the user's Libretto: take it from a tab the user already has open on the admin (`tabs_context_mcp`), or ask; never assume `librettocms.com`. Take the ids from `site_context`: the site's `id`, `programId` and `domain`, and the page list with each page's `id`, `slug` and `parentId`. A page's path is its slug under its parents' slugs (`/servizi`, `/lavori/casa-tortona`); the home page (slug `home`) is `/`. Pages named `region-*`, `navbar`, `footer`, `card` and `template-*` are building blocks, not addresses.

| What | Address | Shows |
|---|---|---|
| Draft preview of a page | `<LIBRETTO_URL><page path>?site=<siteId>` | the **draft**, as the public page will look after publishing; only to a signed-in user with access to the site |
| Public page | the site's own domain (its `domain` in `site_context`, or the admin's Impostazioni > Domini) and the page path, in a tab where the user is not signed in to that domain | only the **published** version; your change is not there until someone publishes |
| Admin editor on a page | `<LIBRETTO_URL>/admin/p/<programId>/s/<siteId>/editor?pageId=<pageId>` (add `&nodeId=<nodeId>` to select a node) | the draft in the editor canvas, the Layers panel, the inspector |
| Design system | `<LIBRETTO_URL>/admin/p/<programId>/s/<siteId>/design-system/colours` (also `/typography`, `/space`, `/surfaces`, `/components`, `/components/<key>`, `/themes`, `/specimen`) | tokens, components and the specimen page as the designer sees them |
| Menus | `.../navigation` | the site's menus |
| Media | `.../media` | the library, with your uploads |
| Activity | `.../settings/activity` | every applied batch, yours under the name of the person who made the token ("Daniele ha inserito un preset nella pagina Servizi") |
| Publish & versions (Pubblicazione e versioni) | `.../publish` | pending changes (everyone's) and published versions with screenshots: **look only** |

## Before and after

1. **Before** you apply: open the draft preview of the page in a new tab. Desktop: `resize_window` to 1440 x 900, screenshot the area you will change (scroll to it; full page if the change is site-wide). Phone: `resize_window` to 390 x 844, reload, screenshot the same area. For a text or translation change also check the other language at tablet width (820 x 1180): the same address with the language prefix, in lower case, such as `/en-us/servizi?site=<siteId>` for `en-US` (the language switcher shows the prefix).
2. Apply your change through MCP (`libretto-editing`, `libretto-design-system`).
3. **After**: reload the same tab, the same two widths, the same scroll position. Screenshot.
4. For a node change, open the editor with `&nodeId=<nodeId>`: the node is selected in the canvas and in Layers, and the inspector (right) shows it under Impostazioni / Stili / Movimento. The inspector shows a variant's **label**, not its key (the `secondary` button variant reads "Contorno" on Archiplan; labels are in the `design-system` resource). Read; do not edit there.
5. For a site-wide change (a token, a variant, the header): check a second page that uses it.
6. Close your tab; put the window back to the size it had (ask `tabs_context_mcp` first and note it).

## Scaled layouts

On a page whose layout is in scale mode (`responsiveMode: "scale"`), the server sends the unscaled page and the app scales it once it has started, about a second after load. So:

- Wait until `document.documentElement.dataset.app` is `"started"` before you measure anything; earlier numbers are the unscaled draft of the page.
- The scale is a `transform` on `.layout-scale-content`. Measure boxes with `getBoundingClientRect()`; a computed `font-size` or `rem` never changes under a transform, so a scaled 40px heading still reports `40px`.
- Expected size = design size × (window width ÷ `designWidth`), clamped by `minScale`/`maxScale`, from `scaleFromWidth` upward; below it the page reflows instead.
- The preview and the published page scale the same way. If they differ after the app has started, that is a bug worth a ticket; before it has started, it is not.

## Compare and report

For each thing the user asked: matches / does not match, with what you saw ("the hover background is now the accent, but the label stayed dark on phone"). Also report what changed that was not asked (a wrapped heading, a shifted section, an overflow at 390 px). Attach or describe the before and after screenshots. Then say what you will fix, and fix it through MCP.

## Recognising a refused or missing edit

- A refused batch (`4xx` from `dry_run_ops`/`apply_ops`) changes nothing: the preview and the editor show the old state. Never report a refused change as done.
- If the preview still shows the old state after a successful apply: reload (the page can be cached for a moment), check you are on the draft preview (`?site=`) and not the public page, check the page and node ids, and read the node in the tree. If the tree has your change and the preview does not, that is a bug: open a ticket (`libretto-report-issue`).
- The Activity page lists your applied batch under the token owner's name; a refusal is not listed there.
- An editor tab the user left open does not refresh by itself. When the user then saves there, the editor refuses with "Il sito è cambiato dopo che l’hai aperto (in un’altra scheda, da un’altra persona o con una pubblicazione). Ricarica la pagina e riprova.", and its Annulla may say the change "non si può più annullare". Tell the user to reload the editor after your changes; never click its buttons yourself.
- The editor's top bar shows **Controlli · N** and the bar under the canvas summarises them ("Avvisi: N, nessuno blocca la pubblicazione.") ("avviso · 'Testo' non ha la traduzione en-US"): these are the page's findings, the same as your dry run's `findings` (not tickets). A number that grew after your change points at something you introduced.
- The top bar says **Tutte le modifiche salvate** when the editor holds nothing unsaved; if it shows unsaved work, the user is editing too: tell them before you apply more.

## Without Chrome

1. Read the result back: the outline and the node (`tree/<pageId>?node=<nodeId>`), the token (`design-system?tokens=<group>`) (see [preview and verify](../../reference/recipes/preview-and-verify.md)).
2. `render_preview` `{ pageId, device: "desktop", mode: "screenshot", crop: { nodeId: "<the section you changed>" } }` (or `area: "viewport"` for the first screen, nothing for the whole page), then `device: "mobile"`, and `device: "tablet"` with the site's second `locale` (and a `theme` the change touched): the server's own screenshots of the draft. An unknown locale or theme answers `locale_unsupported` or `theme_unknown`; an older Libretto has no tablet. If the server cannot capture (`screenshot_unavailable`, an error, `render_timeout`), say it once in plain words and do not retry in a loop. Use the document summary (`mode: "document"`, never `full: true`) to see that the section renders, or read the nodes you changed. Tell the user you could not take a screenshot, give them the `draftPreview` link, and open a ticket if the capture keeps failing on a server that should have it.
3. Tell the user you could not see the page in a browser and ask them to look at it in the admin editor: give them the editor address above.
