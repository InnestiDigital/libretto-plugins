# Restyle or restructure a page

Use when the user wants one page to look or read differently: new spacing, another theme on a band, a column layout, sections in another order, a section split or merged. For a change meant for every page, go to the design system first ([design update](design-update.md)).

Operations: [pages and trees](../operations/pages-and-trees.md), [components and presets](../operations/components-and-presets.md).

## 1. Read the page

1. `site_context`: the page id and `baseRevisions` (you need `tree:<pageId>`).
2. `read_resources` `splash://site/<siteId>/outline/<pageId>`: one line per node, indented, `id kind:type "name"`, then what the node sets (`variant=`, `theme=`, `ref=` for a component instance). Mixins and styles are only in the tree.
3. For each node you will touch, read it alone: `tree/<pageId>?node=<nodeId>&depth=1` (props, styles, variant, theme, and its children one level down). Never the whole tree.
4. `catalog` resource (`catalog.index`): the node types this site can place, one line each. Before inserting one, read its props with `catalog/<type>` (`catalog.entry`, such as `catalog/ds.button`). Insert only types listed there.

## 2. Say the plan

Write the user the change as a list of node edits before building it: "move section `x` above `y`", "put band `z` on theme `dark`", "space between cards: `{space.6}`". Ask about anything unclear.

## 3. Build one `tree.commit` per intent

| Want | Op |
|---|---|
| Different spacing, size, alignment | `set_style` `{ id, scope: "base", patch: { "gap": "{space.6}" } }`; per breakpoint `scope: "bp:md"`; `null` removes a declaration |
| Text styled as another role | `set_style` with the role's five properties (`font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`) as tokens of `type.role.*`, or better a mixin that carries them (`set_mixins`) |
| Another look of a component | `set_variant` `{ id, variant: ["secondary"] }` (variants from the `design-system` resource) |
| Dark or light band | `set_theme` `{ id, theme: "dark" }` (themes from the `design-system` resource), or `designSystem.setScheme` |
| A named style sheet | `set_mixins` `{ id, mixins: ["band"] }` |
| Reorder | `move` `{ id, parentId, index }` |
| New element | `insert` `{ parentId, index, node }` with a fresh 8-character id (`[0-9a-z]{8}`) for every node in it |
| Remove | `remove` `{ id }`: ask first when it holds content |
| Change a node's type (a `text` to a `heading`) | `set_type` `{ id, type }` |
| Show only on some devices | `set_visibility` `{ id, visibility }` (shape from `discover_operations` `tree.commit`) |
| Rename, anchor | `set_meta` `{ id, name, anchor }` |
| An inner node of a component instance | `set_override` `{ id: <instance id>, target: <inner node id>, patch }` |

Rules: tokens for every colour, size and space (`{space.4}`, not `16px`); a section belongs directly under the page root; keep one intent per batch.

## 4. Dry run, apply, verify

1. `dry_run_ops`, read `findings` for the nodes you touched (`design.detached`, `a11y.heading-order`, `structure.empty-section`, `design.contrast-aa`) and errors.
2. `apply_ops` with a fresh `requestId`.
3. Read the outline again; look at it ([preview and visual check](preview-and-verify.md)).
4. Tell the user what changed, in their words; keep each `requestId` to undo with `history.undo`.

## Restructure with reuse

- The same block on several pages: make it a site component, `component.createFromNode` `{ pageId, nodeId, key, name }`, then `component.instantiate` where it should appear. Edit the component once.
- A block the user may want again: `preset.save` `{ pageId, nodeId, label, kind: "section" | "element", category }`, then `preset.insert` ([sections from presets](sections-from-presets.md)).
- A new page is `page.create` (and `page.forkTemplate` from a template, `page.delete` to remove one, ask first). They need `site.structure`: a platform admin, or the workspace owner on the sites of their workspace. Another editor gets 403: ask the user to have the workspace owner create the page (in the admin, Pagine), then build its content here. The layout frames (`layout.update`) follow the same rule.
