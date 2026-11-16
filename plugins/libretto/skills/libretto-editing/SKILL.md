---
name: libretto-editing
description: Edit or read a Libretto site on the core engine through the libretto MCP server - texts, styles, sections and presets, components, pictures, header and footer, menus, collections, translations, motion. Use whenever the user asks to change, add, move, remove or look up anything on their Libretto site, or mentions Libretto pages, sections, parts or batches. Also use when the libretto tools are missing, the server failed to connect, or Libretto rejected the token (401, Invalid MCP token, Authorization header rejected): it says what to tell the person.
---

# Editing a Libretto site

The site runs on Libretto's core engine. Every change is an **op**; ops travel in a **batch**, and a batch commits as one step a person can undo in History, or not at all. Changes land in the **draft**: nothing is public until someone publishes (the `libretto-publish` skill).

This plugin (1.0) is for core sites. If `site_context` answers an `engine` other than `core`, stop and tell the person: that site runs on Libretto's old engine, which the Libretto plugin 0.5 serves.

Tools of the `libretto` server: `site_context`, `discover_operations`, `read_resources`, `apply_ops`, `dry_run_ops`, `render_preview`, `compare_reference`, `report_issue`. The plugin's local `libretto-files` server adds `upload_media_file`, `upload_media_files` and `upload_font_file`, which send a file from this computer through the upload doors.

**The server's guide comes first.** `site_context` answers `guide`: the server's own rules and recipes for this site (wrap and unwrap, make a component, repeat a part, replace a bar, add a section, animate, brand setup, main language, import items, import a design system, write a new article, member roles) and where an agent cannot go (Brand studio, files over 20 MB and ZIPs, a publish at a set time). Read it once per conversation and follow it; where it and this skill differ, the guide is right.

## When Libretto does not connect

The `libretto` tools are missing, `/mcp` shows `libretto` as failed, or a call answers `401` or `403`. `data.code` names the cause:

- `mcp_token_revoked`, `mcp_token_expired`, `mcp_token_unknown`, `mcp_token_missing`, `mcp_token_wrong_kind` (401): the token no longer works; the fix is a new token.
- `mcp_token_access_lost` (403): the token is good, but the person who made it can no longer work on this site (their access, their role, or a password they must change). A new token does not help until the workspace owner gives the access back: say so first.

For a new token, tell the person these three steps, in their language, with the admin's labels:

1. In the admin, **Account › Agents**: make a new token and copy it (it is shown once).
2. In Claude Code, `/plugin configure libretto@libretti` and paste it as the Libretto site token (in the Claude desktop app: `/plugin` › **libretto** › **Configure**).
3. Start a new session.

For example: "Libretto non accetta più il token di Claude: forse è stato revocato o è scaduto. Crea un nuovo token nell'admin, in Account › Agenti, poi scrivi `/plugin configure libretto@libretti`, incollalo e apri una nuova sessione."

**Only the file tools are missing** (`/mcp` shows `libretto-files` failed) while the other tools work: the token is fine, the plugin cannot find Node.js. Tell the person: install Node.js **LTS** from nodejs.org and restart the app; or, if they start Claude Code from a terminal, set `LIBRETTO_NODE` to the path of a Node 18 or later. Meanwhile files can go up in Admin › Media, and you place them by name.

Never talk about the `Authorization` header, HTTP, the cause codes or the plugin's configuration files: the person cannot act on them.

## Which site

A token reaches one site, the sites its maker chose, or every site of a workspace.

- **One site**: `site_context` answers that site. Leave `siteId` out of every call.
- **Several sites**: `site_context` without `siteId` answers `sites` instead. Pick the site the user named, by its name or address; if they named none, or two could match, show the list and ask. Then call `site_context` with that `siteId` and pass the same `siteId` on every call that works on the site (`read_resources` names the site in each URI). A call without it answers `site_required`; an id the token does not reach, `site_unknown`.
- **Check every answer's `site`** (id, name, address). If it is not the site the user means, stop and say so.
- **Switching site**: say so, call `site_context` with the new `siteId`, and use its `baseRevisions`: each site has its own.

## The loop

1. **Context.** `site_context` once per conversation. Keep: the pages (ids, names, addresses, status), `locales`, the definitions (the header `region.header`, the footer `region.footer`, the layouts such as `layout.default`, the components), `user.may` (what your role may do), `baseRevisions`, `urls` and `resources`.
2. **Read before you write, small.** `read_resources` takes up to 16 URIs, each `libretto://site/<siteId>/<path>`:
   - `page/<pageId>`: the page's parts in order, one line each, with ids. Find your part by its name, words and place.
   - `texts/<pageId>?lang=<locale>`: its words and pictures by section, with the op that writes each.
   - `node/<pageId>?node=<nodeId>`: one part with its props and styles. A part of the header, the footer or a layout: `node/<pageId>?node=<nodeId>&owner=layout&component=<key>`, or the whole component with `definition/<key>`.
   - `sections`, `navigation`, `media`, `data`, `forms`, `tokens`, `design`, `settings`, `redirects`, `motion/<pageId>`, `contrast/<pageId>`, `findings/<pageId>?locale=<locale>`: what each recipe names.

   One answer holds at most 40,000 characters: a long list is cut and named in `bounded`, with the `next` URI that reads on; resources past the budget come back in `deferred`, to read in another call.
3. **Find the op.** `discover_operations` with a plain word (`{ "query": "translate" }`, "upload", "hide", "menu", "redirect", "animate") answers one line per op and door: `summary`, `class` and `who` may run it, `allowed` (with `reason` when not), `undoable`, `dryRun`, `confirm`, `alone` and one `example`. `{ "names": ["tree.set_text"] }` gives one in full: description, every example, input schema. The same texts are in the plugin's [operations reference](../../reference/operations/README.md): `Grep` `^## tree.set_text` in `${CLAUDE_PLUGIN_ROOT}/reference/operations/` with about 40 lines after it. An op listed `allowed: false` is not yours to send: its `reason` says who may.
4. **Batch**, one for each change the user would name (rule 6). The batch is the tool's arguments, at the top level:
   ```json
   {
     "requestId": "<fresh UUID>",
     "baseRevisions": { "...": "site_context.baseRevisions, with each write's revisions laid over it" },
     "message": "Nuovo titolo della sezione Restauro",
     "operations": [
       { "name": "tree.set_text", "input": { "at": { "page": "<pageId>" }, "node": "<nodeId>", "text": "Restauro conservativo" } }
     ]
   }
   ```
   - `baseRevisions`: the revision of every leaf path the batch writes, as you read it. Pass `site_context.baseRevisions` whole and, after each write, lay the answer's `revisions` over it: only the paths a batch writes are judged.
   - `requestId`: a fresh UUID per batch (`uuidgen` on macOS and Linux, `[guid]::NewGuid()` in PowerShell). The same id again answers the first batch: a retry never writes twice.
   - `message`: the step as History shows it, in the person's language. Always give one.
   - `operations`: 1 to 100 `{ name, input }`, in order. Each op names its tree with `at`: `{ "page": "<pageId>" }`, or `{ "component": "<key>" }` for a component's own tree.
5. **Apply.** `apply_ops` runs every check `dry_run_ops` runs and writes nothing when it refuses, so an ordinary edit goes straight to `apply_ops`. Dry-run first only:
   - a door that needs a confirmation (`confirm: "publish"` or `"destructive"`), so the person hears what it does first;
   - `site.setMainLocale` (it answers how many texts stay untranslated), `item.import` (it names the bad cells), an upload, a large restructure;
   - when the user asks to try it first.

   A door whose line says `dryRun: false` (an email that goes at once, a domain) cannot be dry-run. Never send the same batch to both for nothing.
6. **Read the answer.** `ok`, `revision`, `entryId` (the step), `outputs` (what each op made, in order: the id of a new part or section), `revisions` (lay them over your base revisions), `findings` (what Checks finds after the batch: look at the ones on the parts you touched), `corrections` (a text colour the contrast check changed in the same step to stay readable: tell the person) and `undo` (the call that takes the step back while it is the newest). Keep the `entryId`, the `undo` and what the batch did.
7. **Verify.** Read the part again (`node/<pageId>?node=<nodeId>`), then look at it (`libretto-visual-check`: Chrome, else `render_preview` with `crop: { "nodeId": "<the section>" }` at desktop and mobile). Tell the user what changed and where, in their words.
8. **Undo** when asked: send the answer's `undo` alone in a batch, with a fresh `requestId` and your current base revisions: `{ "name": "history.undo", "input": { "step": "<entryId>" } }`. You undo only your own token's steps, and only the newest one: `stale_step` means another step came since, `not_own_step` that the step is someone else's. Then the person takes it back in History (`urls.places["history"]`). `history.redo` puts your step back.

## The header, the footer and the layouts

They are components, not parts of a page: `region.header`, `region.footer` and each layout (`layout.default`); `site_context` lists their keys. Read a part of them with `node/<pageId>?node=<nodeId>&owner=layout&component=<key>` or `definition/<key>`, and send every op on them inside one `component.edit`, each op with `at: { "component": "<key>" }`:

```json
{ "name": "component.edit", "input": { "key": "region.header", "ops": [
  { "name": "tree.set_text", "input": { "at": { "component": "region.header" }, "node": "<nodeId>", "text": "Contattaci" } }
] } }
```

Their words in another language need no `component.edit`: `translation.set` `{ "at": { "component": "region.header" }, "locale": "en", "pointer": "/tree/nodes/<nodeId>/text", "value": "Contact us" }`. What one page shows of its layout (its variant, the header or footer hidden) is `page-layout/<pageId>` and `page.setLayout`. More in [header, footer and menus](../../reference/recipes/header-footer-and-menus.md).

## Refusals

A refused batch changes nothing. The answer says why in `message`, with a `code`:

| Code | What to do |
|---|---|
| `stale_revision` (with `paths`) | Someone changed those paths since you read them. Read again, rebuild the batch on the new revisions, send it again. |
| `missing_base_revision` (with `paths`) | The batch writes a path its `baseRevisions` does not name: take it from a fresh `site_context`. |
| `operation_forbidden` | Your role, or any agent, may not. The sentence says who can; `place` and its link `href` say where. Hand the person the link (what only a person does: [person-only acts](../../reference/operations/person-only.md)). |
| `operation_not_on_core` | A name of Libretto's old engine. The message names the op or door to use instead: use it. |
| `operation_unknown` | No op of this site has that name: find it with `discover_operations`. |
| A core op's own code (`op_target`, `page.slug`, `css.grammar`, ...) with `paths` and `opIndex` | The op at `opIndex` was refused for that reason: fix its input. The op's description lists its refusals. |
| `rate_limited` | A door's limit per token (60 uploads a minute, 60 emails an hour, 10 sites an hour): wait and send it again. |

Never route around a refusal: no raw value instead of a token, no other op that does the same thing, no admin in Chrome for what an agent may not do. If a refusal looks wrong, report it (`libretto-report-issue`, category `refusal`).

## Rules

1. **Appearance comes from the design system.** Colours, type, space, radius and shadow are tokens, written `{ "$token": "color.text.accent" }`; a component's look is its variant (`instance.setVariant`), a shared style a mixin (`tree.set_mixins`), a dark section a theme (`tree.set_theme`). Never write a raw value (`#17759c`, `16px`) where a token exists. If none fits, say so and propose one (`libretto-design-system`).
2. **Each field through its own op.** Words in the main language: `tree.set_text` (`runs` for bold, italic, links); in other languages: `translation.set`. A link, a picture, an alt text: `tree.set_props`. What a component instance shows: `instance.setProp`. A part's style: `tree.set_style`, one scope per op.
3. **Generic capabilities only.** Build from the site's components, the kinds every site can add (`section.addKind`), its presets and its tokens; read `sections` for what can be added. Never invent a component made for one page. Never guess an id: read it.
4. **Read before you write, in small pieces** (the loop, step 2).
5. **Apply ordinary edits directly; dry-run only what needs it** (the loop, step 5).
6. **One user-visible change per batch.** A batch is the unit of undo: one undo takes back a whole batch, never part of it. List the changes the user would name on their own ("the accent colour", "the hero title", "the footer text") and give each its own batch, even when they came in one message. Everything one change needs goes in its batch (a new token and the parts re-pointed at it; the tree.insert and tree.move of a wrap). Tell the user each change can be undone alone.
7. **Never publish on your own.** Only on the human's explicit go (`libretto-publish`).
8. **Files go through the upload doors.** A file on this computer: `upload_media_file` with its path (many: `upload_media_files` with the folder); see [images](../../reference/recipes/images.md). Never paste a file's base64 yourself, and never send `media.add`, `media.replaceBlob` or `font.add`: they record bytes the admin's upload stored, so discovery lists them `offered: false` with the `door` that sends them, and a batch that holds one is refused with `operation_forbidden` naming it. Use `media.uploadFile` (with `replaces` for a new file of an entry) and `font.uploadFace`. A design system file goes through the `design.import` door (`libretto-design-system`).
9. **MCP first.** Use an op or a door whenever one exists. Chrome (`libretto-admin-browser`) opens the place a refusal names for the person, and shows the live site; it never does what MCP refuses.
10. **Look at the result** before saying it is done (`libretto-visual-check`).
11. **Blocked?** Tell the user, do what you can, and report what is missing or wrong (`libretto-report-issue`).
12. **Libretto computes, you do not.** Contrast ratios, what a token resolves to, how a page looks at a width: ask Libretto (a dry run, `contrast/<pageId>`, `tokens`, `render_preview`), never Bash, Python or Node.

## Talking to the user

The person you work for is a designer or a client, not a developer.

- **Their language**, and the admin's own names for places: Pages, Media, Forms, Members, Translations, Publishing, History, Settings › Email, Settings › Domains, Editor › Page, Editor › Design, Editor › Motion, Editor › Checks, Account › Agents, Account › Reports.
- **No internal names** where the person reads: no tool or op names, no `requestId`, `entryId`, node ids, `libretto://` URIs, token paths (`font.size.title`) or variant keys. Say what a change does, as the admin shows it: "il titolo della sezione Restauro", "il colore d'accento", "il pulsante ora usa lo stile Contorno".
- **Keep the receipts yourself**: each batch's `entryId`, `undo` and what it did, so "annulla il pulsante" undoes exactly that.
- **Links only from Libretto**: `site_context.urls`. `admin` (the site's Overview), `places["<key>"]` (every admin place: `media`, `publishing`, `history`, `editor.checks`, `account.agents`, ...), `urls.page.editor` (put the page's address in place of `<pageSlug>`, `home` for the home page), `urls.page.draft` (put the page id in place of `<pageId>`), `live` and `locales["<code>"].live` (null when the site has no address yet). Never build another link.

## Jobs and where their steps are

| The user wants | Read |
|---|---|
| A new look across the site: colours, type, spacing, component looks, themes | [design update](../../reference/recipes/design-update.md) and `libretto-design-system` |
| One page restyled or restructured | [restyle a page](../../reference/recipes/restyle-page.md) |
| A site rebuilt to match a finished design | [rebuild from a reference](../../reference/recipes/rebuild-from-reference.md) |
| A new section, a slide or a card more | [sections from presets](../../reference/recipes/sections-from-presets.md) |
| A blog, a new article | [blogs and articles](../../reference/recipes/blogs-and-articles.md) |
| Header, footer, menus, redirects | [header, footer and menus](../../reference/recipes/header-footer-and-menus.md) |
| Projects, events, team: repeated content | [collections and items](../../reference/recipes/collections-and-items.md) |
| Another language, or another main language | [translations](../../reference/recipes/translations.md) |
| Things that move | [motion](../../reference/recipes/motion.md) |
| Pictures, videos, documents | [images](../../reference/recipes/images.md) |
| A contact form, its messages | [forms](../../reference/recipes/forms.md) |
| Members, member roles, pages for members | [members and access](../../reference/recipes/members-and-access.md) |
| The site's email | [site email](../../reference/recipes/site-email.md) |
| "Is it readable, accessible" | [contrast and accessibility](../../reference/recipes/contrast-and-a11y.md) |
| To see the result, the live site | `libretto-visual-check`, [preview and verify](../../reference/recipes/preview-and-verify.md) |
| To publish or go back | `libretto-publish` |
| Libretto cannot do it, or refuses something that looks right | `libretto-report-issue` |

Not offered to an agent on a core site: posters, flyers and print files of a brand canvas (canvas formats and output profiles are ops, but nothing renders or prints a canvas through MCP: the person does it in the admin); assistant job tools. Say so plainly, and report the need when the person asks for it.

## Worked examples

**A heading in two languages**, one batch:
```json
[
  { "name": "tree.set_text", "input": { "at": { "page": "<pageId>" }, "node": "<nodeId>", "text": "Diamo forma alla luce" } },
  { "name": "translation.set", "input": { "at": { "page": "<pageId>" }, "locale": "en", "pointer": "/tree/nodes/<nodeId>/text", "value": "We give shape to light" } }
]
```

**A style with tokens.** `scope` says when the declarations hold: `base`, `bp:md` (from that breakpoint up), `s:hover`, `mq:(max-width: 767.98px)`, `th:<theme>`, joined by `|`. `null` clears a declaration.
```json
{ "name": "tree.set_style", "input": { "at": { "page": "<pageId>" }, "node": "<nodeId>", "scope": "base", "declarations": { "color": { "$token": "color.text.accent" }, "margin-block-end": { "$token": "space.gutter" } } } }
```

**A section after another**, from a component the site has (`sections` lists them):
```json
{ "name": "section.insert", "input": { "at": { "page": "<pageId>" }, "after": "<sectionId>", "source": { "component": "kind.text-and-picture" } } }
```
The answer's `outputs` holds the new section's `root`; then set its words with `tree.set_text` or `instance.setProp`.

**A component's variant on one instance:**
```json
{ "name": "instance.setVariant", "input": { "at": { "page": "<pageId>" }, "node": "<nodeId>", "axis": "tone", "value": "dark" } }
```
To change how every dark instance looks, change the component's cells (`cell.set`, `libretto-design-system`), not the instance.

## What costs the most

Everything a tool answers stays in the conversation. Keep answers small:

- `site_context` once per conversation; after each write, its `revisions`, not a new context.
- The outline (`page/<pageId>`) and the words (`texts/<pageId>`), then single parts (`node/...`); never every part of a page one by one.
- `discover_operations` with a plain word, then `names` with the one or two ops you will send; the reference files for shapes you only need to read.
- Screenshots of the section you changed (`crop`), desktop and mobile; a whole page only for a review the user asked for.
- When an answer is too large for the client, ask again narrower; never dig through a saved answer with shell tools.
