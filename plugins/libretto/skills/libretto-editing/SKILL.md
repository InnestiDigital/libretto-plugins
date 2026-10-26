---
name: libretto-editing
description: Edit or read a Libretto site through the libretto MCP server - texts, styles, sections from presets, component variants, images, header and footer, menus, collections, translations, motion. Use whenever the user asks to change, add, move, remove or look up anything on their Libretto site, or mentions Libretto pages, sections, nodes or batches. Also use when the libretto tools are missing, the server failed to connect, or Libretto rejected the token (401, Invalid MCP token, Authorization header rejected): it says what to tell the person.
---

# Editing a Libretto site

You work on one site: the one the token was made for (the plugin's **Token del sito Libretto** setting, or `LIBRETTO_MCP_TOKEN`, which wins). Every write goes through the same operation registry the admin uses, so it is validated, audited and undoable. Your changes land in the **draft**; nothing is public until someone publishes (see the `libretto-publish` skill).

Tools of the `libretto` MCP server: `site_context`, `discover_operations`, `read_resources`, `dry_run_ops`, `apply_ops`, `render_preview`, `compare_reference`, `report_issue` (and `job_next_step` / `job_report_step` when you were handed an assistant job id). The plugin's local `libretto-files` server adds `upload_media_file`.

## When Libretto does not connect

The `libretto` tools are missing, `/mcp` shows `libretto` as failed, or a call answers `401` or `403`. Libretto's message says why, and `data.code` names the cause:

- `mcp_token_revoked`, `mcp_token_expired`, `mcp_token_unknown` (wrong, or made before their Libretto was reset), `mcp_token_missing`, `mcp_token_wrong_kind` (401): the token no longer works, and the fix is a new token.
- `mcp_token_access_lost` (403): the token is good, but the person who made it can no longer work on this site (their access to the site or workspace, their role, or a password they must change). A new token does not help until the workspace owner gives the access back: say so first.

For a new token, tell the person these three steps, in their language, with the admin's labels:

1. In the admin sidebar, **Persone e accessi** › **Agenti e accessi MCP**: make a new token and copy it.
2. In Claude Code, `/plugin configure libretto@libretti` and paste it as **Token del sito Libretto** (in the Claude desktop app: `/plugin` › **libretto** › **Configure**).
3. Start a new session.

For example: "Libretto non accetta più il token di Claude: forse è stato revocato o è scaduto. Crea un nuovo token nell'admin, in Persone e accessi › Agenti e accessi MCP, poi scrivi `/plugin configure libretto@libretti`, incollalo e apri una nuova sessione."

Never talk about the `Authorization` header, HTTP, the cause codes, the plugin's `.mcp.json` or configuration files: the person cannot act on them. Only if they start Claude Code from a terminal with `LIBRETTO_MCP_TOKEN` set does the new token go there (it wins). Never suggest `export LIBRETTO_MCP_TOKEN` in `~/.zshrc` or `~/.bashrc` to someone using the desktop app: an app opened from the Dock, Finder or Start menu does not read them.

## Jobs and where their steps are

| The user wants | Read |
|---|---|
| A new look across the site: colours, type, spacing, component looks, themes | [design update](../../reference/recipes/design-update.md) and the `libretto-design-system` skill |
| One page restyled or restructured | [restyle a page](../../reference/recipes/restyle-page.md) |
| A site rebuilt to match a finished design (an HTML/CSS handoff or a live site) | [rebuild from a reference](../../reference/recipes/rebuild-from-reference.md) |
| A new section | [sections from presets](../../reference/recipes/sections-from-presets.md) |
| Header, footer, menus | [header, footer and menus](../../reference/recipes/header-footer-and-menus.md) |
| Projects, events, team: repeated content | [collections and items](../../reference/recipes/collections-and-items.md) |
| Another language | [translations](../../reference/recipes/translations.md) |
| Things that move | [motion](../../reference/recipes/motion.md) |
| Pictures | [images](../../reference/recipes/images.md) |
| "Is it readable / accessible" | [contrast and accessibility](../../reference/recipes/contrast-and-a11y.md) |
| To see the result | the `libretto-visual-check` skill, [preview and verify](../../reference/recipes/preview-and-verify.md) |
| The live site as a visitor sees it | `render_preview` with `"target": "live"` ([preview and verify](../../reference/recipes/preview-and-verify.md)) |
| Something no operation does (a font file without `upload_font_file`) | the `libretto-admin-browser` skill: the admin in the user's Chrome |
| To publish or go back | the `libretto-publish` skill |
| Libretto cannot do it, or refuses something that looks right | the `libretto-report-issue` skill |

Every operation, its input, permission and typical errors: [operations reference](../../reference/operations/README.md), one file per domain.

## Rules

1. **Appearance comes from the design system.** Colour, type, space, radius and shadow are tokens (`{color.text.accent}`, `{space.4}`), component variants (`set_variant`), mixins (`set_mixins`) or themes (`set_theme`). Never write a raw value (`#17759c`, `16px`) where a token exists. If no token fits, say so and propose adding one (`libretto-design-system` skill) instead of hard-coding.
2. **Props hold content and behaviour only**: text, links, image sources, alt text, tags. Never put a colour, size or spacing in a prop.
3. **Generic capabilities only.** Build with what the catalogue and presets offer. Do not invent client-specific components or one-off hacks.
4. **Read before you write, in small pieces.** The page's outline before editing it (`tree/<pageId>` answers it), then the one node you change (`tree/<pageId>?node=<nodeId>`), never the whole document (`?full=true`); the design-system index, then the token group or component cells you change, never the full design system. Every resource below takes a query that narrows it. A site-wide job (every section's spacing, every hand-set title size) is the same: each page's outline with the declarations you look for on each line (`tree/<pageId>?styles=padding-top,padding-bottom`, `?styles=font-size`), then only the nodes you change (see [What costs the most](#what-costs-the-most)).
5. **Dry run first, then apply.** Always `dry_run_ops` the exact batch, read its answer, then `apply_ops`.
6. **One user-visible change per batch, always.** A batch is the unit of undo: `history.undo` takes back a whole batch, never part of it. So before you compose anything, list the changes the user would name on their own ("the accent colour", "the hero title", "the button", "the footer text") and give each its own batch, even when they all came in one message with "dry run, then apply". Everything one change needs goes in its batch (the palette steps and the roles on them; a new token and the nodes re-pointed at it); anything the user could want back alone goes in another. Dry-run each batch, then apply them one after another, each on the `revisions` of the previous answer. Tell the user that each change can be undone alone, and never claim that one undo takes back several. Undo the same way: one `history.undo` per batch, newest change first. Two undos in one batch trip over each other, because the second one targets a state the first one just changed.
7. **Never publish on your own.** Publishing makes changes public: only on the human's explicit go.
8. **Images go through the media library.** A file on this computer: `upload_media_file` with its path (dry run first), then use the media id; see [images](../../reference/recipes/images.md). Never paste a photo's base64 into `media.upload` yourself.
9. **MCP first.** Use an operation whenever one exists. The admin in Chrome (`libretto-admin-browser`) is only for what MCP lacks.
10. **Look at the result** before saying it is done (`libretto-visual-check`).
11. **Blocked?** Tell the user, do what you can, and open a ticket when Libretto is at fault (`libretto-report-issue`). Never work around a refusal.
12. **Scaled layouts scale by themselves.** A page whose layout frame has `responsiveMode: "scale"` (for example "Branded canvas — scaled to fit") draws the whole design at its `designWidth` and scales it to the window between `scaleFromWidth` and `maxScale`. Author it at design size with the usual tokens. Never rewrite sizes as `vw`, `min(vw, rem)` or `calc()` to imitate the scaling: that fights the tokens and doubles the scale. Read the page's frame first (`site_context`, the page's `frame`, and the layout's settings).
    - **Working with the design system in a scaled layout.** Keep using tokens, variants and mixins: a `rem` or `px` token is scaled with the canvas, so one token change still scales every page. Two traps:
      - **Fluid tokens double-scale.** A token whose value uses `vw` (for example `clamp(2rem, 1.5rem + 2vw, 3rem)`) already shrinks with the window, and the canvas then shrinks it again. So first ask what the design is. **A fluid design** (the reference sizes with `clamp()` or `vw` and reflows at its breakpoints) does not belong on a scaled page: move its pages to a breakpoint frame first (`page.update` with `patch.frame`, the frame's settings with `layout.update`; see [rebuild from a reference](../../reference/recipes/rebuild-from-reference.md)), then use fluid tokens as the design has them. **A fixed-width design** keeps its scaled frame, and only there fixed-size tokens are right (read the value in the `design-system` resource); if the site's token is fluid and the scaled page needs a fixed one, propose a fixed token with the user (`libretto-design-system`), never a raw value on the node.
      - **Breakpoints read the canvas, not the window.** Node styles under `bp:md`, `bp:lg` and so on use container queries, and inside the canvas the container is `designWidth` wide. From `scaleFromWidth` upward the design-size rules always apply. Below `scaleFromWidth` the page reflows at the real width, and the base and `bp:sm` rules (the phone design) apply. Author the desktop design at design size and the phone design with the usual breakpoints.
13. **Libretto computes, you do not.** Contrast ratios, sizes at a width, what a token resolves to: ask Libretto (a dry run, `designSystem.lint`, the `design-system` resource, `render_preview`), never Bash, Python or Node. The person's Claude may not be allowed to run code, and Libretto's answer is the one that counts. Contrast: see `libretto-design-system`, Measure contrast with the gate.

## Talking to the user

The person you work for is a designer, not a developer. They read your answers, your tickets and your links.

- **Their language.** Answer in the language they write in (Italian for an Italian studio), and use the admin's own labels (**Pubblicazione e versioni**, **Persone e accessi**).
- **No internal names, anywhere the person reads**: your answers, ticket titles, version notes. Never show:
  - tool names (`render_preview`, `apply_ops`, `dry_run_ops`, `site_context`, `read_resources`) or operation names (`history.undo`, `designSystem.setTokens`);
  - `requestId`s, node ids, `libretto://…`, `libretto.batch`, a version's full id (name a version by its `shortId`, date and note, as **Pubblicazione e versioni** does);
  - token paths and keys (`font.size.display`, `space.section-y.4`, `sm` / `md` / `lg`), raw variant keys (`primary`, `secondary`), finding and rule ids (`structure.empty-box-paint`, `below-aaa`).

  Name things by what they do, as the admin shows them: "la dimensione dei titoli di sezione", "la scala degli spazi tra le sezioni", "il pulsante ora usa lo stile Contorno" (the variant's **label** from the `design-system` index, not its key), "un contrasto è sotto il livello AAA consigliato" (not "1224 avvisi AAA"). Say what happened in their words: "ho provato la modifica senza salvarla, poi l'ho applicata", "ho annullato la modifica", "l'anteprima del server" (not the tool's name).
- **Keep the receipts yourself.** Remember each applied batch's `requestId` and what it did, so "annulla il pulsante" undoes exactly that; do not ask the user for it.
- **Links only from Libretto.** Give links only from `site_context`'s `urls`: `admin` (the site in the admin), `editor` (add `?pageId=<id>` to open a page), `draftPreview` (the draft for a signed-in person; put the page path before the `?`, such as `…/servizi?site=…`) and `publicSite` (the live site; `null` when it has no address yet). For another of the site's languages, `urls.locales["<code>"]` gives its `draftPreview` and `publicSite` (`urls.locales["en-US"].draftPreview`); put the page path after the language's home the same way. An older Libretto without `locales`: the locale in lower case before the page path (`…/en-us/servizi?site=…`; the default language has no prefix). Never build another link and never guess `librettocms.com`. An older Libretto without `urls`: ask the user for their admin address, or tell them where to click (**Pubblicazione e versioni** in the sidebar).

## The loop

1. **Context.** Call `site_context` once per conversation (it answers about 20 KB). Keep the site id, the page list (id, slug, title, status) and `baseRevisions`. After each apply, the answer's `revisions` are your new base revisions: call `site_context` again only after a `409` or in a new conversation.
2. **Outline.** `read_resources` with `libretto://site/<siteId>/tree/<pageId>` (or `outline/<pageId>`, the same answer): one line per node, `id kind:type "name"`, plus variant, theme, `ref=` for component instances and the start of its text. Find your node by its name, text and place. `?styles=font-size,padding-top` adds those declarations to each line, `?depth=2` stops at that depth, and a long page comes in pages (`limit`, then `cursor`).
3. **Node.** `read_resources` with `libretto://site/<siteId>/tree/<pageId>?node=<nodeId>&depth=0` (the operation `tree.node`): the node's props, styles, meta, variant and theme, its ancestors in `path`. Its `revision` is the `tree:<pageId>` base revision. Pick the nodes from the outline and read each at `depth=0`, several URIs in one call (up to 16); `depth=1` only for a small container, never deeper (a section at depth 3 answered 10 KB in a real session). The whole document (`?full=true`) only when you must copy a large subtree. One `read_resources` answer holds at most 40,000 characters: the resources past that come back in `deferred`, with their size; read them in another call, or narrower.
4. **Schema.** First the shapes you already have: the examples in these skills and the plugin's operation reference, one section at a time (`Grep` `${CLAUDE_PLUGIN_ROOT}/reference/operations/` for `^## tree.commit` with about 40 lines after it). Only for an operation whose shape you still lack, `discover_operations` `{ "names": ["<that operation>"] }`, once per conversation: `tree.commit`'s schema alone is about 20 KB. Never search with `query` and a large `limit` (each search answers about 20 KB): the [operations index](../../reference/operations/README.md) lists every name.
5. **Batch**, one for each change the user would name (rule 6).
   ```json
   {
     "format": "libretto.batch",
     "v": 1,
     "requestId": "<fresh UUID>",
     "baseRevisions": { "...": "copy site_context.baseRevisions unchanged" },
     "operations": [{ "name": "tree.commit", "input": { "pageId": "<pageId>", "ops": [] } }]
   }
   ```
   The batch fields are the tool's arguments at the top level, not wrapped in `batch`. Make a UUID with `uuidgen` (macOS/Linux) or `[guid]::NewGuid()` (PowerShell).
6. **Dry run.** `dry_run_ops` with the batch. It runs every check, then rolls back, and its answer says `dryRun: true`. It answers a receipt: the revisions, the undo call, a tree commit as the `nodes` it changed, and the findings counted (`findingCount`, `findingsByRule`) with the first 20 listed. The findings cover the whole page, many already there before you: look at the ones whose `nodeId` you touched. Fix errors before going on. Add `"answer": "full"` to the batch only when you need every finding or the inverse ops. A design-system write answers its own change: see `libretto-design-system`.
7. **Apply.** `apply_ops` with the same operations and a **fresh** `requestId`. The receipt carries the undo call; keep it and the `requestId` for yourself, with what the batch changed: it is how you undo.
8. **Verify.** Do not stop at the apply answer: read the node again (`tree/<pageId>?node=<nodeId>`, or the outline; for a text on the page, its header or its footer, `render_preview` `{ "pageId", "find": "<a few words of it>" }`), then look at it (`libretto-visual-check`: Chrome, else `render_preview` `{ "pageId": "...", "mode": "screenshot", "crop": { "nodeId": "<the section you changed>" } }`, at desktop and at mobile). Tell the user what changed and on which page, in their words (see Talking to the user).
9. **Undo** if needed: a batch with `{ "name": "history.undo", "input": { "requestId": "<the applied one>" } }`, fresh `baseRevisions` from `site_context`. Tell the user "ho annullato la modifica a …".

### Errors

- `409 stale_revision`: someone (or the admin) changed the document. Call `site_context` again, re-read the node, rebuild the batch.
- `422`: the input or a gate refused it (for example the contrast gate). The `detail` says what and where (at most 20 lines and 20 items per list; the rest is counted in `omitted`); fix the cause, do not work around it.
- `403` on an operation: the token's role may not run that operation. Tell the user; do not try another route. If the role should allow it, open a ticket.
- `401`, or `403` `mcp_token_access_lost`: Libretto refused the token. Tell the person what [When Libretto does not connect](#when-libretto-does-not-connect) says: a new token in **Persone e accessi** › **Agenti e accessi MCP**, `/plugin configure libretto@libretti`, a new session (for a lost access, the workspace owner first). Never "check the Authorization header".

All codes with their fixes: [operations reference](../../reference/operations/README.md#errors).

## What costs the most

Everything a tool answers stays in the conversation and is read again at every later step, so one large answer early on is paid for dozens of times. In a real ten-request session (a design update, a home restructure, header and footer, a photo, a translation, a publish and a rollback) these answers made most of the cost. Libretto now answers most of them compactly by default; the large forms are one parameter away, and that is where the cost is:

| Answer | Size | Instead |
|---|---|---|
| A whole page document, `tree/<pageId>?full=true` | 77,000 to 304,000 characters each | The outline (`tree/<pageId>`, with `?styles=` for the declarations you look for), then the nodes at `depth=0` |
| `render_preview` with `include: ["render"]` or `["designSystemCss"]` | about 110,000 and 240,000 characters | To check a text, `find`; to see it, a cropped screenshot |
| Broad design-system groups (`?tokens=color`, three groups in one call) | 55,000 characters | One narrow group per URI (`?tokens=color.text`) |
| `discover_operations` with four names and `schemas: true` | 31,000 characters | The shapes in these skills and the operations reference; one name, only for a shape you lack |
| A dry run or apply with `"answer": "full"`, holding every change of a brief | 31,000 to 73,000 characters | The default receipt, and one batch per change (rule 6) |
| `site_context`, then the `context` resource again | 22,000 characters each time | `site_context` once per conversation |
| `Grep` over the reference with a loose pattern and context lines | 13,000 characters | `^## <operation>` with about 40 lines after it |
| A screenshot | one picture each, kept to the end | The section you changed (`crop`), desktop and phone; the whole page only for a review the user asked for, or before publishing |

When an answer is too large for the client ("exceeds maximum allowed tokens", saved to a file), do not dig through the saved file with shell tools: ask again, narrower. Resources named in `deferred` are not lost: read the ones you need in another call.

## Worked examples

All use `tree.commit` on one page; the node ids come from the outline.

**Text edit.** A heading's text is its `text` prop. Keep the shape you find: a plain string stays a string, a locale map such as `{ "it": "...", "en-US": "..." }` stays a map and you change only the language asked.
```json
{ "name": "tree.commit", "input": { "pageId": "<pageId>", "ops": [
  { "op": "set_props", "id": "zr1ejcm9", "patch": { "text": "Restauro conservativo" } }
] } }
```

**Style edit with tokens.** `set_style` takes a scope (`base`, or a breakpoint such as `bp:md`) and a patch of CSS declarations; write tokens as `{path}`. `null` removes a declaration.
```json
{ "op": "set_style", "id": "zr1ejcm9", "scope": "base", "patch": { "margin-bottom": "{space.4}", "color": "{color.text.accent}" } }
```

**Add a section from a preset.** List the presets with `libretto://site/<siteId>/presets?kind=section` (no trees, just id, label, category, description); read the one you pick with `preset/<presetId>?kind=section` if you need its tree. Insert under the page root (the first line of the outline):
```json
{ "name": "preset.insert", "input": { "pageId": "<pageId>", "parentId": "<root id>", "index": 2, "kind": "section", "presetId": "services-table", "source": "theme" } }
```
The answer's `nodeId` is the new section. Then edit its texts with `set_props`.

**Component variant change.** A design-system component shows in the outline as `component:ds.button ... variant=primary`. The variants it has are in the `design-system` resource (its index lists each component's variant keys). `variant` is an array:
```json
{ "op": "set_variant", "id": "3t5hpsgy", "variant": ["secondary"] }
```
To change how every secondary button looks, change the variant in the design system, not the node.
