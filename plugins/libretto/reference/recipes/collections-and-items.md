# Collections and items: projects, events, team

Use when the user has repeated content (projects, events, people, products) to add, import, change or list on a page.

Ops: [collections and items](../operations/collections.md), [sections, presets and lists](../operations/sections-presets-and-lists.md) (`repeat.*`), [pages](../operations/pages.md) (`page.setItemRoute`).

## Read

`data`: the collections with their id, key, fields and items. Use the collection's **id** in item ops (`"collection": "<its id>"`) and its **key** where a repeat or a page names it.

## Items

| Goal | Op | Who may |
|---|---|---|
| One item | `item.create` `{ "collection": "<id>", "id": "<fresh UUID>", "slug": "casa-sul-lago", "status": "draft", "values": { "title": { "it": "Casa sul lago", "en": "Lake house" }, "year": 2023 } }` | Content author, Designer, Administrator |
| Many at once (a file's rows, at most 500, all or none) | `item.import` `{ "collection": "<id>", "items": [{ "id", "slug", "status", "values" }, ...] }` | the same |
| Change values, the slug, the status or the place | `item.set` (fields left out stay; null clears one) | the same |
| Remove one | `item.remove` | the same |
| Bring one back as an earlier step left it | read `item-history/<collectionId>?item=<itemId>`, then send the `item.revert` it names | the same |

**An import** (a CSV of events, a spreadsheet of products): read the file, map its columns to the collection's fields (`data` gives each field's key and type), make a fresh UUID and a slug per row, and **dry-run** the `item.import` first: a refusal names its row (`detail.row`, from 1) and the bad cell (`item.value`, `item.field`, `item.slug`). Fix those rows and dry-run again; then apply. A field the collection lacks is refused: add it first (below), with the person's yes.

**Online**: an item goes live only with `status: "published"` and only at the next publish, on the human's go (`libretto-publish`). Put the items in with status `published` when the person wants them online, or `item.set` the status after.

A value in more than one language is a map by language (`{ "it": "...", "en": "..." }`) for a field that is `localized`.

## Collections and fields (a Designer's)

`collection.create` `{ "id": "<fresh UUID>", "key": "progetti", "label": { ... }, "fields": [ ... ] }`, `collection.setField` (add or change one field: its type, label, whether it is required, a select's options, a reference's target), `collection.removeField`, `collection.set` (label, key, the title and slug fields), `collection.remove` (an empty collection nothing reads).

## Show a collection on a page

The guide's recipe: a repeat draws a template once per item. `repeat.insert` `{ "at": { "page": "<pageId>" }, "parent": "<sectionId>", "index": 1, "id": "<new id>", "repeat": { "name": "Progetti", "source": { "kind": "data", "from": { "collection": "progetti", "sort": [{ "field": "year", "dir": "desc" }], "limit": 6 } } }, "template": { "root": "<card id>", "nodes": { ... } } }`; in the template a text shows an item's field with `{ "$item": "title" }` (or `{ "$bind": "item.title" }`), a picture its `src` the same way.

To turn a part that exists into a repeat: `tree.remove` the part and `repeat.insert` its nodes as the template at its place, in one batch; then `translation.set` for each translation its texts had. `repeat.setSource` changes the collection, the filter, the sort or the limit; `repeat.setSubset` names some items to style apart.

## A page per item

A dynamic page (address segment `[slug]`) shows one item per address. `page.setItemRoute` `{ "pageId", "route": "root" }` puts the items at the top of the site instead of under the page. `tree.set_show_on` shows a part only on the list or only on the item pages. Look at one item with `render_preview` `{ "pageId", "item": "<itemId>" }`.

## Check

`render_preview` of the page with the repeat, desktop and mobile; one item page with `item`.
