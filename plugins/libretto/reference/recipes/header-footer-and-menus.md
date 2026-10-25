# Header, footer and menus

Use when the user wants to change what every page shows at the top or bottom (logo, menu, contact line, social links), or what a menu lists.

Operations: [pages and trees](../operations/pages-and-trees.md) (`region.read`, `tree.commit`), [navigation](../operations/navigation.md), [components and presets](../operations/components-and-presets.md).

## How it is built

- The header, footer, `above` and `below` are **regions**: trees shared by every page. Each lives on its own page row named `region-*`, which is not a page of the site (it has no URL and is not in menus).
- A **menu** is site data (key, label, items), edited with `navigation.*`. A `nav-list` node in a region (or a page) draws one: its props are `source` (`menu` or `pages`), `menu` (the menu key), `layout`, `label` (what screen readers announce).
- Menus are versioned with the site: the public site shows the published ones.

## Change the header or footer

1. Find the region's page in `site_context`: the pages named `region-header`, `region-footer`, `region-above`, `region-below`. Read its outline (`outline/<region pageId>`): the first line is the region root.
2. Read the node you change: `tree/<region pageId>?node=<nodeId>&depth=1`. (`region.read` `{ "region": "header" }` and the `regions` resource answer whole region trees: use them only to copy a large subtree.)
3. A `tree.commit` on the region's `pageId`, exactly like a page: `set_props`, `set_style`, `set_variant`, `insert`, `move`, `remove`. The base revision is `tree:<region pageId>` (in `site_context.baseRevisions`).
4. New section in a region: `preset.insert` with the region's `pageId` and the region root as `parentId` ([sections from presets](sections-from-presets.md)).
5. Dry run, apply, look at two pages (every page shows the change): [preview and visual check](preview-and-verify.md).

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
