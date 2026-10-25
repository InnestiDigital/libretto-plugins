---
name: libretto-editing
description: Edit a Libretto site through the libretto MCP server - texts, styles, sections from presets, component variants, images, header and footer, menus, collections, translations, motion. Use whenever the user asks to change, add, move or remove anything on their Libretto site (Archiplan or any other), or mentions Libretto pages, sections, nodes or batches.
---

# Editing a Libretto site

You work on one site: the one the token was made for (the plugin's **Libretto site token** setting, or `LIBRETTO_MCP_TOKEN`, which wins). Every write goes through the same operation registry the admin uses, so it is validated, audited and undoable. Your changes land in the **draft**; nothing is public until someone publishes (see the `libretto-publish` skill).

Tools of the `libretto` MCP server: `site_context`, `discover_operations`, `read_resources`, `dry_run_ops`, `apply_ops`, `render_preview`, `compare_reference`, `report_issue` (and `job_next_step` / `job_report_step` when you were handed an assistant job id). The plugin's local `libretto-files` server adds `upload_media_file`. If the tools are missing, the server is not connected: tell the user to run `/mcp`, and to set the token with `/plugin configure libretto@libretti` (or in `LIBRETTO_MCP_TOKEN`), then restart Claude Code.

## Jobs and where their steps are

| The user wants | Read |
|---|---|
| A new look across the site: colours, type, spacing, component looks, themes | [design update](../../reference/recipes/design-update.md) and the `libretto-design-system` skill |
| One page restyled or restructured | [restyle a page](../../reference/recipes/restyle-page.md) |
| A new section | [sections from presets](../../reference/recipes/sections-from-presets.md) |
| Header, footer, menus | [header, footer and menus](../../reference/recipes/header-footer-and-menus.md) |
| Projects, events, team: repeated content | [collections and items](../../reference/recipes/collections-and-items.md) |
| Another language | [translations](../../reference/recipes/translations.md) |
| Things that move | [motion](../../reference/recipes/motion.md) |
| Pictures | [images](../../reference/recipes/images.md) |
| "Is it readable / accessible" | [contrast and accessibility](../../reference/recipes/contrast-and-a11y.md) |
| To see the result | the `libretto-visual-check` skill, [preview and verify](../../reference/recipes/preview-and-verify.md) |
| To publish or go back | the `libretto-publish` skill |
| Libretto cannot do it, or refuses something that looks right | the `libretto-report-issue` skill |

Every operation, its input, permission and typical errors: [operations reference](../../reference/operations/README.md), one file per domain.

## Rules

1. **Appearance comes from the design system.** Colour, type, space, radius and shadow are tokens (`{color.text.accent}`, `{space.4}`), component variants (`set_variant`), mixins (`set_mixins`) or themes (`set_theme`). Never write a raw value (`#17759c`, `16px`) where a token exists. If no token fits, say so and propose adding one (`libretto-design-system` skill) instead of hard-coding.
2. **Props hold content and behaviour only**: text, links, image sources, alt text, tags. Never put a colour, size or spacing in a prop.
3. **Generic capabilities only.** Build with what the catalogue and presets offer. Do not invent client-specific components or one-off hacks.
4. **Read before you write.** Read the page's outline before editing it, and the node in the tree before changing its props or styles.
5. **Dry run first, then apply.** Always `dry_run_ops` the exact batch, read its answer, then `apply_ops`.
6. **Small batches.** One intent per batch (a heading, a section, a variant). Easier to check and to undo.
7. **Never publish on your own.** Publishing makes changes public: only on the human's explicit go.
8. **Images go through the media library.** A file on this computer: `upload_media_file` with its path (dry run first), then use the media id; see [images](../../reference/recipes/images.md). Never paste a photo's base64 into `media.upload` yourself.
9. **Look at the result** before saying it is done (`libretto-visual-check`).
10. **Blocked?** Tell the user, do what you can, and open a ticket when Libretto is at fault (`libretto-report-issue`). Never work around a refusal.

## The loop

1. **Context.** Call `site_context`. Keep the site id, the page list (id, slug, title, status) and `baseRevisions`.
2. **Outline.** `read_resources` with `splash://site/<siteId>/outline/<pageId>`: one line per node, `id kind:type "name"`, plus variant, theme and `ref=` for component instances. Find your node by its name and place.
3. **Node.** For its current props and styles read `splash://site/<siteId>/tree/<pageId>`. Trees are large: if Claude Code saves the result to a file, search it with `jq` or `grep` for the node id instead of reading it whole.
4. **Schema.** `discover_operations` with the operation name (`tree.commit`, `preset.insert`) gives its input schema and a worked example. Take names and shapes from there, not from memory.
5. **Batch.**
   ```json
   {
     "format": "splash.batch",
     "v": 1,
     "requestId": "<fresh UUID>",
     "baseRevisions": { "...": "copy site_context.baseRevisions unchanged" },
     "operations": [{ "name": "tree.commit", "input": { "pageId": "<pageId>", "ops": [] } }]
   }
   ```
   The batch fields are the tool's arguments at the top level, not wrapped in `batch`. Make a UUID with `uuidgen` (macOS/Linux) or `[guid]::NewGuid()` (PowerShell).
6. **Dry run.** `dry_run_ops` with the batch. It runs every check, then rolls back. `findings` lists issues for the whole page, many already there before you: look at the ones whose `nodeId` you touched. Fix errors before going on.
7. **Apply.** `apply_ops` with the same operations and a **fresh** `requestId`. Keep the `requestId` of the answer: it is how you undo.
8. **Verify.** Do not stop at the apply answer: read the node again from the tree (or the outline), then look at it (`libretto-visual-check`: Chrome, else `render_preview` `{ "pageId": "...", "mode": "screenshot" }`). Tell the user what changed, on which page, and the `requestId`.
9. **Undo** if needed: a batch with `{ "name": "history.undo", "input": { "requestId": "<the applied one>" } }`, fresh `baseRevisions` from `site_context`.

### Errors

- `409 stale_revision`: someone (or the admin) changed the document. Call `site_context` again, re-read the node, rebuild the batch.
- `422`: the input or a gate refused it (for example the contrast gate). The `detail` says what and where; fix the cause, do not work around it.
- `403`: the token's role may not run that operation. Tell the user; do not try another route. If the role should allow it, open a ticket.
- `401`: the token is expired, revoked or wrong. The user makes a new one in the admin (Agenti e accessi MCP) and sets it with `/plugin configure libretto@libretti`, then restarts Claude Code.

All codes with their fixes: [operations reference](../../reference/operations/README.md#errors).

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

**Add a section from a preset.** List presets with an operation (`preset.list` `{ "kind": "section" }`, through `dry_run_ops`, since it only reads) or the `presets` resource. Insert under the page root (the first line of the outline):
```json
{ "name": "preset.insert", "input": { "pageId": "<pageId>", "parentId": "<root id>", "index": 2, "kind": "section", "presetId": "services-table", "source": "theme" } }
```
The answer's `nodeId` is the new section. Then edit its texts with `set_props`.

**Component variant change.** A design-system component shows in the outline as `component:ds.button ... variant=primary`. The variants it has are in the `design-system` resource (`components[].variants`). `variant` is an array:
```json
{ "op": "set_variant", "id": "3t5hpsgy", "variant": ["secondary"] }
```
To change how every secondary button looks, change the variant in the design system, not the node.
