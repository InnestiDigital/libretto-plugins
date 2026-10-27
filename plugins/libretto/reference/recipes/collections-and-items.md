# Collections and items

Use when the user has repeated content with the same fields: projects, events, team members, services, press. A **collection** defines the fields; **items** hold the values; a **repeater** node on a page draws the items.

Operations: [collections](../operations/collections.md), [pages and trees](../operations/pages-and-trees.md).

## Read what exists

- `collection.list` (read-only, through `dry_run_ops`): every collection with its `key`.
- `collection.read` `{ collectionId }`: the fields (`key`, `type`, `label`, `localized`, `required`), `titleField`, `slugField`.
- `item.list` `{ collectionId, status? }`: the draft items in order.

## Add or change items

- One item: `item.create` `{ collectionId, slug, values }`. `values` follow the fields, one value per field type:
  - `text`: a string (`multiline: true` keeps line breaks);
  - `richText`: a Tiptap document (`{ "type": "doc", "content": [...] }`);
  - `url`: a link, as a link's or a button's `href` takes it: `https://…`, `mailto:`, `tel:`, a site path (`/contatti`) or `#anchor`. An `href` binds only to a `url` field, a `file` field or `item.$url`: bound to a `text` field it is refused (`I6.bind_type`);
  - `number`: a finite number; `date`: `YYYY-MM-DD`;
  - `media` and `file`: a media id; `mediaList`: an array of media ids;
  - `reference`: the id of an item of the referenced collection, an array of ids when `multiple`;
  - `select`: one option `value`; `list`: an array of objects of its sub-fields.

  A localized field takes a plain value or a locale map (`{ "it": "...", "en": "..." }`). A required field must be filled in, in the default locale for a locale map.
- Many items: `item.import` `{ collectionId, rows: [{ slug?, values }] }`, all or none. Media values may be the exact file name of a file already in the media library.
- Change: `item.update` `{ collectionId, itemId, slug?, values }` merges key by key; `null` removes a value.
- Order: `item.reorder` `{ collectionId, itemIds }` names every item once.
- Delete: `item.delete` (ask first).
- **Status**: a new item is a draft. `item.setStatus` `{ collectionId, itemId, status: "published" }` marks it for the next publish; it needs `content.publish` (an editor's token has it). The public site shows only published items of a published version: the item appears after `publication.publish` ([publish skill](../../skills/libretto-publish/SKILL.md)).
- History of one item: `item.history` lists the published versions that hold it; `item.rollback` `{ collectionId, itemId, versionId }` restores the draft item from one of them.

## Change the collection itself

- `collection.create` `{ collection: { key, label, titleField, slugField, fields } }`. The key never changes: choose a plain one (`projects`).
- `collection.update` patches label, fields, title or slug field. Removing or retyping a field that an item uses is refused: clear those values first (ask the user).
- `collection.delete` needs `"confirmed": ["destructive"]` and the user's yes.

## Show items on a page

A repeater node clones its child for each item:

```json
{ "op": "insert", "parentId": "<grid id>", "index": 0, "node": {
  "id": "projrep1", "kind": "repeater", "type": "repeater",
  "source": { "kind": "collection", "collection": "projects", "sort": [{ "field": "$position", "dir": "asc" }], "limit": 12 },
  "children": [ { "id": "projcard", "kind": "primitive", "type": "text", "props": { "text": { "$bind": "item.title" } }, "children": [] } ] } }
```

- Bind a prop to a field with `{ "$bind": "item.<field>" }`; `item.$url` is the item's page address, `item.$index` its position; `{ "$bind": "item.date", "template": "Dal {value}" }` wraps the value.
- `filter` (up to 8) and `sort` (up to 3) narrow and order; `limit` caps; `offset` skips.
- Prefer a preset that already holds a repeater (a projects grid, a team list) and change its `source` with `set_props`/the node's source, rather than building the card by hand. Read an existing repeater first and copy its shape: find a `repeater` line in the outline, then `tree/<pageId>?node=<repeater id>&depth=2`.
- A dynamic page (one page per item) is a page set up by a platform admin; check `site_context` pages for one bound to the collection.

## Check

Look at the page with the items ([preview and visual check](preview-and-verify.md)): the preview shows draft items to a signed-in user; the public site shows published ones only.
