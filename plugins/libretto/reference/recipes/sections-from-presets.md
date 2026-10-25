# Add sections from presets

Use when the user wants a new section (a hero, a services table, a gallery, a contact band) on a page or in the header or footer. A preset is a ready-made subtree that already follows the design system; inserting one is better than building a section node by node.

Operations: [components and presets](../operations/components-and-presets.md), [pages and trees](../operations/pages-and-trees.md).

## 1. Choose the preset

1. `read_resources` `splash://site/<siteId>/presets?kind=section` (`preset.index`; kinds: `section`, `box`, `element`; `&source=site` for the site's own): each preset's `id`, `kind`, `source`, `label`, `category`, `description` and `keywords`, without trees. Read the tree of the one you are about to insert, if you need it, with `preset/<presetId>?kind=section`. Do not use `preset.list`: it answers every preset with its tree.
2. Each preset has a `source`: `theme` (built in) or `site` (saved by someone on this site with `preset.save`).
3. Pick by role (what the section does), not by its sample text. Tell the user which one and why; offer two when the brief is open.

## 2. Find where it goes

- On a page: the parent is the page root, the first line of `splash://site/<siteId>/outline/<pageId>`. `index` is its position among the root's children (0 is first). Read the outline to pick the index between the right sections.
- In the header or footer: `region.read` `{ "region": "header" }` through `dry_run_ops`; its `pageId` and the tree's root id are the target. A section preset goes under the region root only (never inside a section: refused as `I5.section_placement`).

## 3. Insert, then fill

```json
{ "format": "splash.batch", "v": 1, "requestId": "<uuid>", "baseRevisions": { "tree:<pageId>": 41 },
  "operations": [
    { "name": "preset.insert", "ref": "hero",
      "input": { "pageId": "<pageId>", "parentId": "<root id>", "index": 1, "kind": "section", "presetId": "hero-split", "source": "theme" } }
  ] }
```

1. `dry_run_ops`, then `apply_ops` (fresh `requestId`). The answer's `nodeId` is the new section.
2. Read the outline again: the new section's nodes have fresh ids. Replace the sample texts with the user's with `set_props` in a second `tree.commit` (keep a locale map a map: see [translations](translations.md)). Replace the sample images ([images](images.md)).
3. Set the section's anchor if a menu should point at it: `set_meta` `{ id, anchor: "servizi" }` ([header, footer and menus](header-footer-and-menus.md)).
4. Look at it ([preview and visual check](preview-and-verify.md)).

Insert and fill can be one batch: give `preset.insert` a `ref`, but the inner ids are known only after the insert, so filling texts in the same batch is practical only for the section node itself (`{ "$ref": { "operation": "hero", "path": ["nodeId"] } }`). Two batches are simpler.

## Save a section for later

The user likes a section and wants it again elsewhere: `preset.save` `{ pageId, nodeId, label, kind: "section", category }`. A preset is a copy; for a block that should stay the same everywhere, use a site component (`component.createFromNode`) instead.

## When nothing fits

Say so. Do not fake a missing kind of section with a pile of boxes: build it from catalogue types only if the user agrees, and open a ticket for the missing preset ([report an issue](../../skills/libretto-report-issue/SKILL.md)).
