# Header, footer and menus

Use when the user wants to change what every page shows at the top or bottom (logo, menu, contact line, social links), or what a menu lists.

Operations: [pages and trees](../operations/pages-and-trees.md) (`region.read`, `tree.commit`), [navigation](../operations/navigation.md), [components and presets](../operations/components-and-presets.md).

## How it is built

- The header, footer, `above` and `below` are **regions**: trees shared by every page. Each lives on its own page row named `region-*`, which is not a page of the site (it has no URL and is not in menus).
- A **menu** is site data (key, label, items), edited with `navigation.*`. A `nav-list` node in a region (or a page) draws one: its props are `source` (`menu` or `pages`), `menu` (the menu key), `layout`, `label` (what screen readers announce).
- Menus are versioned with the site: the public site shows the published ones.

## Change the header or footer

1. Find the region's page in `site_context`: the pages named `region-header`, `region-footer`, `region-above`, `region-below`. Read its outline (`outline/<region pageId>`): the first line is the region root.
2. Read the node you change: `tree/<region pageId>?node=<nodeId>&depth=1`; `tree/<region pageId>` is the region's outline. (`region.read` `{ "region": "header" }` and the `regions` resource answer whole region trees: use them only to copy a large subtree.)
3. A `tree.commit` on the region's `pageId`, exactly like a page: `set_props`, `set_style`, `set_variant`, `insert`, `move`, `remove`. The base revision is `tree:<region pageId>` (in `site_context.baseRevisions`).
4. New section in a region: `preset.insert` with the region's `pageId` and the region root as `parentId` ([sections from presets](sections-from-presets.md)).
5. Apply, look at two pages (every page shows the change): [preview and visual check](preview-and-verify.md). The draft preview renders the draft's header and footer. To check a text there, `render_preview` `{ "pageId": "<any page>", "find": "<a few words>" }` (it searches the page, its header and its footer) or the node in the region's tree; to see it, a screenshot cropped to the header or footer node (`"crop": { "nodeId": "<its id>" }`). If the node has your text and the draft preview does not, that is a bug: tell the user and open a ticket (`libretto-report-issue`).

## Free content in the footer

The `footer` node draws its columns from props and menus, but its **brand column** (the logo or wordmark) also takes free nodes: a sentence under the logo, a link, an image, a `ds.*` component. Use it for anything the footer's props have no field for, never a fake menu item.

1. Insert the node as a child of the `footer` node with `"slot": "brand"`: `{ "op": "insert", "parentId": "<footer node id>", "slot": "brand", "index": 0, "node": { "id": "<8 chars>", "kind": "primitive", "type": "text", "props": { "text": "Uno studio che ..." } } }`. Several nodes are drawn after the logo in `index` order. A child without the slot is refused (`I3.slot_required`), and only primitives and `ds.*` components fit (`I4.accepts`).
2. Style each node with its own node styles (`set_style` on its id), like any text.
3. The column itself is the footer's `brand` part, a wrapping row: to put the sentence under the logo, `set_style` on the footer node with scope `p:brand` and `{ "flex-direction": "column", "align-items": "flex-start" }`.

## Change a menu

1. `navigation.read` through `dry_run_ops`: every menu with its `key`, `label`, `items` (each `id`, `label`, `target`, `children`).
2. `navigation.anchors` (read-only): every page with the anchors of its tree, then the header and footer anchors, marked with their `region`.
3. `navigation.upsert` `{ "menu": { key, label, items } }` writes the **whole** menu: copy the current items, change what the user asked, send them all. Targets:
   - a page: `{ "kind": "page", "pageId": "<id>" }`;
   - a section of a page: `{ "kind": "anchor", "pageId": "<id>", "anchor": "servizi" }` (the section's `anchor`, set with `set_meta`);
   - a header or footer anchor: `{ "kind": "anchor", "pageId": "<home page id>", "anchor": "<region anchor>" }`, never the region's own page id;
   - outside: `{ "kind": "external", "href": "https://..." }`;
   - the language switcher: `{ "kind": "languages" }`.
   Item ids are 8 characters `[0-9a-z]`; keep the existing ids, make fresh ones for new items. Labels may be locale maps (`{ "it": "Servizi", "en": "Services" }`).
4. `navigation.reorder` changes the order of the menus; `navigation.delete` removes a menu (ask first: a `nav-list` may draw it).
5. A new menu shows only where a `nav-list` names it: set the node's `menu` prop with `set_props` in the region.

## Checks

- An anchor that no section carries yet is a finding, not a refusal: add the anchor on the section, or fix the item.
- A page in `draft` status is not on the public site even if a menu points at it.
- Changing the menu or region is a site-wide change: tell the user, and show both a desktop and a phone screenshot (the phone menu often differs).
