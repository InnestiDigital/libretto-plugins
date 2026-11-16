# Add a section: from a kind, a component, a copy or a saved preset

Use when the user wants a new section on a page, a section copied from another page, a saved part placed again, or one item more in a list (a slide, a card, a question).

Ops: [sections, presets and lists](../operations/sections-presets-and-lists.md), [components](../operations/components.md) (`instance.setProp`, `instance.setVariant`).

## 1. Read what can be added

- `sections`: the section kinds, the site's section components, the saved presets, and the sections of every page (to copy). Pick from it with the user; never guess a key.
- `page/<pageId>`: the page's sections in order, with their ids, to say where the new one goes.

## 2. Pick the source

| The user wants | Op | Who may |
|---|---|---|
| A section of a kind every site can add (text and picture, questions and answers, contact form, banner, gallery, cards), the first time | `section.addKind` `{ "at": { "page": "<pageId>" }, "after": "<sectionId>", "kind": "questions-and-answers" }` | Content author, Designer, Administrator |
| Another section of a component the site has (`kind.<kind>` once added, or its own section components) | `section.insert` `{ "at": { "page": "<pageId>" }, "after": "<sectionId>", "source": { "component": "kind.text-and-picture" } }`; `source.props` sets its first values | Content author, Designer, Administrator |
| A copy of a section of a page | `section.insert` with `"source": { "page": "<pageId>", "node": "<sectionId>", "name": "Clienti, seconda parte" }` | Content author, Designer, Administrator |
| A saved preset (a section, a part, a bar) | `preset.insert` `{ "at": { "page": "<pageId>" }, "key": "<preset>", "parent": "<parentId>", "index": 2 }`, or `"before": "<nodeId>"` | Designer, Administrator |

`after` or `before` names a section of the page; with neither the section goes at the end. A Content author asking for a preset is refused with who can and the editor's link: hand it on, or offer the nearest kind instead.

Each answer's `outputs` holds the new section's `root`. Keep it: the next batch fills it.

## 3. Fill it

One batch per change the user would name:

- Words: `tree.set_text` on its texts, or `instance.setProp` on the instance's props (`{ "node": "<instance>", "prop": "title", "value": "..." }`); then `translation.set` for each other language.
- Pictures: `tree.set_props` `{ "props": { "src": { "$media": "<mediaId>" }, "alt": "..." } }` (see [images](images.md)).
- Its look: `instance.setVariant` (a tone, a size), never raw styles.

## Lists inside a section

A carousel's slides, a list's items and a grid's cards are the items of an instance's slot:

| Goal | Op |
|---|---|
| One item more, a copy of another | `slot.add` `{ "at", "node": "<instance>", "slot": "default", "source": { "copy": "<itemId>", "name": "Foto in cantiere" } }` |
| One item more, built new | `slot.add` with `"source": { "root": "<new id>", "nodes": { ... } }` |
| Reorder, remove | `slot.move` `{ "item", "index" }`, `slot.remove` `{ "item" }` |

`slot.full` and `slot.at_least` say the slot's most and least items. `instance.fillSlot` replaces a slot's whole content: use it only when the user wants that.

## Move, copy and remove sections

`section.move` `{ "node", "after" }`, `section.remove` `{ "node" }` (with the motion wholly inside it). A part inside a section moves with `tree.move` and copies with `tree.duplicate`.

## Save a section as a preset

`preset.save` `{ "key": "apertura-con-foto", "label": "Apertura con foto", "at": { "page": "<pageId>" }, "node": "<sectionId>" }` (a Designer's): a section becomes a section preset, the bar of a header or footer a bar, anything else a part. Pages that inserted a copy keep it when the preset changes.

## Check

`render_preview` with `crop: { "nodeId": "<the new section>" }`, desktop and mobile; `findings/<pageId>` for a section that needs values (a required prop left empty, a picture without words).
