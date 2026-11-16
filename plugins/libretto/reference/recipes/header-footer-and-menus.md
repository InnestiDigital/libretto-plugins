# Header, footer, menus and redirects

Use when the user wants to change the bar at the top or the bottom of every page, its links, a menu, or where an old address leads.

Ops: [components](../operations/components.md) (`component.edit`), [parts and styles](../operations/parts-and-styles.md), [sections, presets and lists](../operations/sections-presets-and-lists.md) (`preset.insert`), [menus and redirects](../operations/navigation.md), [pages](../operations/pages.md) (`page.setLayout`).

## Where the header and footer live

On a core site the header, the footer and the frame around each page are **components**, not parts of a page:

- `region.header` and `region.footer`: the bars every page shows;
- the layouts (`layout.default`, and others the site has): the component of role `layout` that draws the header, the footer and the frame round the page; each page names its layout.

`site_context` lists their keys with the other definitions. A change there reaches every page that uses them, so say so to the user.

## Read

1. `definition/<key>` (`definition/region.header`): the component's tree, props, slots and parts, with its node ids.
2. Or one part as a page shows it: `node/<pageId>?node=<nodeId>&owner=layout&component=<key>`.
3. What one page shows of its layout (its variant and props, the header and footer shown or hidden, their words on this page): `page-layout/<pageId>`.
4. The menus: `navigation`, the menus with their items and what an item may point to.

## Change a part of the header or footer

Every op on a component's own tree goes inside one `component.edit`, each with `at: { "component": "<key>" }`, in one batch:

```json
{ "name": "component.edit", "input": { "key": "region.header", "ops": [
  { "name": "tree.set_text", "input": { "at": { "component": "region.header" }, "node": "<ctaId>", "text": "Contattaci" } },
  { "name": "tree.set_style", "input": { "at": { "component": "region.header" }, "node": "<barId>", "scope": "base", "declarations": { "background-color": { "$token": "color.bg.page" } } } }
] } }
```

`component.edit` carries the tree, repeat and instance ops, `tree.duplicate` and `preset.insert`. Its words in another language need no `component.edit`: `translation.set` `{ "at": { "component": "region.header" }, "locale": "en", "pointer": "/tree/nodes/<nodeId>/text", "value": "Contact us" }`.

A **Content author** may run `component.edit` for words and links (`tree.set_text`, `tree.set_props` of a link); styles and structure inside it need a Designer, as on a page. The refusal says who.

## Replace the bar with a saved one

The guide's recipe, one batch: read `sections` for the saved presets (a header or footer bar saved with `preset.save` is one), then

```json
{ "name": "component.edit", "input": { "key": "region.header", "ops": [
  { "name": "preset.insert", "input": { "at": { "component": "region.header" }, "key": "<preset>", "before": "<old bar>", "menus": "<old bar>" } },
  { "name": "tree.remove", "input": { "at": { "component": "region.header" }, "node": "<old bar>" } }
] } }
```

`menus` gives the copy the menus the old bar shows. To keep the current bar for later, `preset.save` it first (`{ "key", "label", "at": { "component": "region.header" }, "node": "<bar>" }`).

## One page different

- Another layout for a page, or the layout's variant and props for this page alone: `page.setLayout` `{ "pageId", "layout": { "key": "layout.default", ... } }`.
- A part shown only to members or only to guests: `tree.set_audience` inside `component.edit` (see [members and access](members-and-access.md)).
- Header motion that plays on every page is the component's own timeline (`component.setTimeline`, an Administrator's); see [motion](motion.md).

## Menus

| Goal | Op |
|---|---|
| A link in a menu | `menuItem.add` `{ "menu": "footer", "item": { "id": "<new 8-character id>", "label": "Lo studio", "target": { "kind": "page", "pageId": "<pageId>" } } }`; under a top-level item: `parent`; a column title: `group` |
| Change its words or where it leads | `menuItem.update` `{ "menu", "id", "label": { "it": "Persone", "en": "People" } }` or `"target"` |
| Move it, remove it | `menuItem.move`, `menuItem.remove` |
| A new menu, rename, delete | `menu.create`, `menu.rename`, `menu.delete` (refused while a page, a layout or a component reads it) |

A Content author adds, changes and moves links (`menuItem.*`); making, renaming or deleting a menu is a Designer's. A menu links each page once (`menu.pageTwice`). A label is one string, or one per language.

## Redirects

Read `redirects`, then `redirect.add` `{ "redirect": { "from": "/studio-vecchio", "to": "/cosa-facciamo", "status": 301 } }` (`/progetti/*` takes the path and everything under it; `to` is a path of the site or an https address), `redirect.update`, `redirect.remove`. The server answers a redirect before any page, so a source that is a published page's address is refused (`redirect.hidesPage`). Redirects are a Designer's; a Content author is refused with who can.

## Check

Look at two pages, desktop and mobile, with the header or footer in the crop (`render_preview` `crop: { "nodeId": "<a header part>" }`): a change reaches every page. A header link: also open it from the screenshot's page in the other language.
