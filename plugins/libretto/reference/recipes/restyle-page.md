# Restyle or restructure one page

Use when the user wants one page to look or read differently: spacing, a heading's size, a section's background, parts in another order, two parts in a box, a section in the dark theme. For a change across the site, see [design update](design-update.md).

Ops: [parts and styles](../operations/parts-and-styles.md) (`tree.set_style`, `tree.move`, `tree.insert`, `tree.set_theme`, `tree.set_mixins`), [components](../operations/components.md) (`instance.setVariant`, `instance.override`).

## 1. Read

- `page/<pageId>`: its parts in order, with ids.
- `style/<pageId>?node=<nodeId>`: where each style value of a part comes from (its component, the site's styles, its theme): change it at its source.
- `node/<pageId>?node=<nodeId>`: one part's props and its own styles by scope.
- `tokens`: the values to use.

Before you write, look at the page (`render_preview`, desktop and mobile) and agree on the changes with the user, one by one.

## 2. Pick the right level

From the most shared to the most local; take the first that fits:

1. **A token** changes it on every page (`libretto-design-system`).
2. **A variant** of a component instance: `instance.setVariant` `{ "node", "axis": "tone", "value": "dark" }`.
3. **A theme** on a section: `tree.set_theme` `{ "node", "theme": "dark" }`; its tokens follow there.
4. **A mixin** the site has: `tree.set_mixins` `{ "node", "mixins": ["didascalia"] }`.
5. **The part's own style**: `tree.set_style`, with tokens.
6. **One instance's inner part**: `instance.override` `{ "node": "<instance>", "inner": "<part>", "override": { "style": { "base": { ... } } } }`; null clears it.

## Styles and scopes

`tree.set_style` `{ "at", "node", "scope", "declarations" }` sets the declarations of one scope; `null` clears one:

| Scope | Holds |
|---|---|
| `base` | always |
| `bp:md` | from the site's `md` breakpoint up (the `design` read lists them) |
| `mq:(max-width: 767.98px)` | under a media query of your own |
| `s:hover` | while the part is hovered (its own state); `a:hover` while an ancestor is |
| `pg:menu=open` | while a page state holds |
| `p:<part>` | a named part of a component |
| `t:<selector>` | descendants |
| `th:<theme>` | under a theme |

Join them with `|`: `bp:md|s:hover`. `discover_operations` `{ "names": ["tree.set_style"] }` gives the whole grammar. A value is CSS text, a number or `{ "$token": "<path>" }`. Hide a part on phones only with `display: none` in a `bp:` or `mq:` scope; from every visitor, `tree.set_visibility`.

## Structure

The guide's recipes, each one batch:

- **Put parts in a box**: `tree.insert` `{ "at", "parent": "<their parent>", "index": <the first part's index>, "root": "<new id>", "nodes": { "<new id>": { "kind": "frame", "as": "div", "children": [] } } }`, then `tree.move` each part into it `{ "node", "parent": "<new id>", "index": 0 }`, 1, 2...
- **Take them out**: `tree.move` each part inside it to the box's parent at the box's index + 1 + k, then `tree.remove` the box.
- **Another element**: `tree.set_type` `{ "node", "as": "h2" }` (a heading's level, a box made a section).
- **Whole sections**: `section.move`, `section.remove` ([sections from presets](sections-from-presets.md)).
- **Make a component of a part**: `component.define`, `tree.remove`, `instance.insert` (an Administrator's; the guide has the recipe).

A new id is 8 lower-case letters and digits, unique in the tree.

## Contrast

A colour that leaves a text below AA is corrected in the same step (the answer's `corrections`) or refused: see [contrast and accessibility](contrast-and-a11y.md).

## Check

One batch per change the user would name; after each, `render_preview` with `crop` on the section, desktop and mobile, and `findings/<pageId>`.
