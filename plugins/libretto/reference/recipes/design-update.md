# A design update across the site

Use when the user brings a new look for the whole site: a brief, a brand book, a reference site or a Figma file with colours, type, spacing and component looks. One page only: [restyle a page](restyle-page.md). Rebuilding a whole site from a finished design: [rebuild from a reference](rebuild-from-reference.md).

Ops: [design system](../operations/design-system.md), [components](../operations/components.md) (`cell.set`, `mixin.set`, `component.setVariantAxes`). The skill: `libretto-design-system`.

## 0. Read and plan

1. `tokens` and `design`: the token sets and their tokens, the themes, the fonts and what uses each, the site's styles (mixins), the breakpoints.
2. Look at two or three pages as they are now (`render_preview`, desktop and mobile): the "before".
3. Write the plan in the user's words, one line per change they would name: the palette, the text styles, the spacing, the corners, the button's look, the dark theme. Each is one batch (rule 6 of `libretto-editing`), except the brand setup below.
4. Check who may do it: a Designer repaints palette colours with values of their own; roles, type, space, radius, themes, cells and fonts are an Administrator's (`discover_operations` says it per op).

## 1. Fonts first

The text styles name font families, so the families come first:

- A Google Fonts family: the `font.addGoogle` door `{ "family": "Inter", "weights": [400, 700], "italic": false }`, alone in its batch.
- A licensed file on this computer: `upload_font_file` (one face per call; a variable file is one face for its range). Check the licence with the person first.
- A face's loading and fallback: the `font.setFace` door.

## 2. The brand setup: colours, type, scale, spacing, corners

The guide's recipe, **one batch** so one undo takes it all back: read `tokens`, then `token.set` on the tokens the site already has:

- each step of a palette family repainted in the new colour at its own lightness (`color.palette.<family>.<step>`);
- the heading and body font tokens (`$type: "fontFamily"`);
- each text size a step of the ratio around the body size;
- each space and each radius the same multiple of the new unit.

Never invent paths: `token.set` on a path that does not exist creates a token. Dry-run the batch first and read its `corrections`: the texts the contrast check would recolour to stay readable. Show the user what moved, then apply.

## 3. Roles, one batch each

The semantic roles (`color.text.accent`, `color.bg.section`, ...) are aliases of palette steps in `semantic-light` (and the dark set): `token.set` `{ "set": "semantic-light", "path": "color.text.accent", "token": { "$type": "color", "$value": "{color.palette.brand.600}" } }`. Change a role, not a palette step, when the user means "the accent text".

## 4. Component looks, one batch each

Read `definition/<key>` for the component's variants, parts and cells. A look is a cell: `cell.set` `{ "key", "cell": "<variant>.<size>.<state>.<part>.<breakpoint>.<property>", "value": { "$token": "..." } }` (`*` for any). "The primary button on hover" is `primary.*.hover.<its part>.*.background-color`. A new variant is a value on an axis (`component.setVariantAxes`, the axes whole) and its cells.

## 5. Themes

A dark theme: `theme.set` (its label, the sets it reads in order, `activation` by colour scheme) and its own set with `themeSet.set` (the set whole). A section in it: `tree.set_theme`. Look at it with `render_preview` `{ "theme": "dark" }` or `{ "colorScheme": "dark" }`.

## 6. Shared styles and breakpoints

A style several parts share (a caption, a band): `mixin.set`, then `tree.set_mixins` on the parts. Breakpoints: `breakpoint.set`, `breakpoint.rename` (it rewrites every style that names it).

## 7. Check

After each batch, two pages that use the change, desktop and mobile (`libretto-visual-check`); `site-findings` before and after: a jump means the change hurt pages elsewhere. Tell the user each change can be undone alone.

A whole token file (Tokens Studio, DTCG, Figma variables) is imported by a person in Editor › Design (Import and export); an agent sends its tokens with `token.set`. `design-export` reads the design system as DTCG files.
