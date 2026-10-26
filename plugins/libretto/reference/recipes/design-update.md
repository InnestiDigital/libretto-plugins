# Apply a design update to an existing site

Use when the user brings a new look (a reference, a Figma file, a brief): colours, type, spacing, corners, component looks, a dark theme. The update lives in the design system so every page follows; pages are touched only where they hard-code a value.

Operations: [design-system](../operations/design-system.md), [media-and-fonts](../operations/media-and-fonts.md), [brand](../operations/brand.md).

## 1. Take stock

1. `site_context`, then `read_resources` on `libretto://site/<siteId>/design-system`: a small index (sets, themes, each component's variant keys, each token group's size). Then read only the groups the brief touches, one query each (a query answers only what it asks; `index=true` adds the index back):
   - colours: `design-system?tokens=color.palette.brand` (the steps you will change), then `?tokens=color.text` or `?tokens=color.bg` for the roles on them;
   - type: `design-system?tokens=font.family`, then `?tokens=type.role`;
   - space and shape: `design-system?tokens=space.section-y` (or the one group the brief names), `?tokens=radius`.
   The index gives each group's size: read the small groups, one or two per call. Asking for `color,space,font,type` at once answered 32 KB on one site.
   Never read the whole design system (`css=true` adds a 240 KB stylesheet you do not need).
2. `designSystem.diff` through `dry_run_ops`: a summary of what the site already changed from its blueprint (`overrideCount`, the first 100 `overrides`). `access.read`: your level in each design-system area.
3. Write the user a short plan before changing anything, one line per change they would name, in their words ("il colore d'accento", "la dimensione dei titoli di sezione", "il pulsante principale"), with the values in their units. Keep the token paths, scale keys and variant keys to yourself. Ask about anything the brief leaves open.
4. **Plan the batches: one per change the user would name.** A brief with four items is four batches, even when the user asks for one dry run of everything. The batch is the unit of undo: a component look that shares a batch with the token changes cannot be undone alone, and the user then needs a hand-made edit to get it back. Put in each batch everything that one change needs (the palette steps and the roles on them; a new token and the nodes re-pointed at it), and nothing else. Dry-run each, report each, apply them in order on the `revisions` of the previous answer. A batch that needs a token another batch creates is dry-run after that batch is applied.

## 2. Colours

- The palette lives in set `core` (`color.palette.<name>.<step>`); roles live in `semantic-light` and `semantic-dark` (`color.text.*`, `color.bg.*`, `color.border.*`) and are aliases of palette steps (`{color.palette.brand.500}`).
- A new brand colour: change the palette steps. A colour that moves to another role: change the role's alias. Prefer aliases to hex in roles.
- The colour change is one batch: one `designSystem.setTokens` with the palette steps and the roles that sit on them, so the contrast gate judges the end state. `type` is `color`.
- "Is this colour readable on white?" is a question for the gate, not for a script: dry-run the candidate and read the ratio in the `422` detail or in the answer's `warnings` ([design-system skill](../../skills/libretto-design-system/SKILL.md), Measure contrast with the gate). To find the nearest readable shade, dry-run one darker step at a time.
- If the gate refuses (422 lists each pair and ratio), pick a darker or lighter step, then dry run again. Never set `acknowledgeContrast` without the user's explicit yes.
- A full rebrand from three colours, a type pairing and a scale is `brand.setup` (it rewrites palettes, roles, type, space and radii in one undoable change). Use it only when the user wants the whole brand replaced, and dry run it first.

## 3. Type

1. Fonts: a Google family is `font.importGoogle` `{ "family", "weights", "styles" }` (409 `font_face_exists` if already there). A font file (a foundry's face):
   1. Licence first: ask the user under which licence the studio holds the face and whether it covers web use on this site; do not upload without it.
   2. Upload each face (one file per weight and style, WOFF2 only) with `upload_font_file` of the `libretto-files` server: `{ "path", "name": "Sul Sans", "weight": 400, "style": "normal", "licence": "<the licence>", "dryRun": true }`, then without `dryRun`. It sends `font.upload`; 409 `font_face_exists` means the face is there already (`replace: true` only on the user's word).
   3. Point a family token at it (step 2). A Libretto without `font.upload` answers `unknown_operation`: then upload the faces on the admin's Typography page with Chrome (`libretto-admin-browser`), or ask the user to.
2. Families: `font.family.display`, `font.family.heading`, `font.family.body`, `font.family.ui`... in set `core`, type `fontFamily`, value an array (`["DM Sans", "sans-serif"]`).
3. Type styles: `type.<style>` tokens (`type.section-title`, `type.body`) are composites. `setToken` needs the **whole** value: copy `sets.core` of the token, change what the brief asks, write it back with `"type": "typography"`:
   ```json
   { "set": "core", "path": "type.section-title", "type": "typography",
     "value": { "fontFamily": "{font.family.display}", "fontSize": "clamp(1.5rem, 5vw, 2rem)", "fontWeight": "{font.weight.regular}", "letterSpacing": "-0.01em", "lineHeight": 1.15 } }
   ```
4. Roles: `type.role.heading1`, `type.role.body`, `type.role.lead`... alias a type style (`"{type.display}"`). Re-point a role to change every text that uses it.

## 4. Space, corners, shadows

`space.*`, `radius.*`, `shadow.*`, `border.width.*` in `core`, one `setTokens` per family of tokens, one batch per change the user named. Keep the scale's order (a larger step stays larger).

- A percentage change across a space group ("section spacing 25 % tighter") is one token: a `number` named `scale` in that group multiplies every dimension in it and in its subgroups, `{ "set": "core", "path": "space.section-y.scale", "type": "number", "value": 0.75 }` (above 0; 1 is no change). Use `space.scale` for every space token of the site. Do not rewrite each step by hand ([design-system skill](../../skills/libretto-design-system/SKILL.md), Space scale factors).
- Spaces written by hand on the sections do not follow the tokens, nor the factor. Find them with each page's outline and the declarations on each line (`tree/<pageId>?styles=padding-top,padding-bottom`), never with whole documents (`?full=true`: 77,000 to 304,000 characters each in a real session). Tell the user how many sections and pages hold them, and propose pointing them at the nearest space token so the factor reaches them too; that is one change, so one batch, apart from the factor.

## 5. Component looks

1. Read only the cells you will change: `read_resources` `libretto://site/<siteId>/component/<key>?variant=primary&state=hover&own=true` (add `part`, `property`, `breakpoint` to narrow further; page with `cursor` while `nextCursor` is set). A cell is `<variant>.<size|all>.<state>.<part>.<breakpoint>.<property>`; `design-system?components=true` lists each component's sizes, states and parts.
2. `designSystem.setComponentCell` `{ "component": "button", "cells": [{ "cell": "primary.all.hover.container.base.background", "value": "{color.bg.accent-strong}" }] }`. Values are tokens.
3. A look the site lacks: `designSystem.createVariant` `{ component, variant, label, from }`, then its cells; then `set_variant` on the nodes that should use it (`libretto-editing`).
4. A node that already looks right through local overrides: `designSystem.promoteVariant` `{ pageId, nodeId, variant, label }` turns them into a variant and re-attaches the node.

## 6. Themes

- Light and dark come from stacking sets: a theme is `{ key, label, sets }`. `designSystem.createTheme`, `designSystem.updateTheme`, `designSystem.activateSet` / `designSystem.createSet` for a new layer.
- Put a section on a theme: `designSystem.setScheme` `{ pageId, nodeId, theme }` (or `set_theme` in a `tree.commit`).

## 7. Pages that do not follow

- `tree.commit` answers carry `design.detached` findings: nodes whose local declarations override the system. Read those nodes; replace raw values with tokens (`set_style` with `{token.path}`), or remove the declaration (`null`) so the variant shows.
- Text with a hand-set size: apply a type role on its five properties (see [restyle a page](restyle-page.md)).
- Hand-set sizes that differ a lot from the token (a display heading at `clamp(…, 8rem)` where `type.section-title` stops at 2rem): re-pointing them at the token would shrink them. List them for the user with today's size and the size the token would give, and propose new size tokens per family of headings (`font.size.display`) to re-point them at, rather than collapsing them onto one token or scaling raw values. Ask before choosing.
- Before the type and colour steps, read `access.read`: an area at `view` refuses writes with `403` and `data.kind: "access"` ([design-system skill](../../skills/libretto-design-system/SKILL.md), Who may change what). Tell the user at the start, not half-way through the update.

## 8. Check and report

- `designSystem.lint` (through `dry_run_ops`): errors must be zero; AAA warnings are information.
- `render_preview` `{ "pageId", "device": "desktop" | "tablet" | "mobile", "mode": "screenshot" }` on the home page and two other key pages (`"area": "viewport"` for the first screen, `"crop": { "nodeId" }` for one section), then once more with `"theme": "dark"` (or another theme the update touched) and with the site's second locale at tablet width (`"locale": "en-US", "device": "tablet"`). Every screenshot stays in the conversation: prefer the first screen and crops of the sections the change reaches, and take each picture once. Against a reference, `compare_reference` `{ pageId, device, referenceMediaId }` or `{ pageId, device, referenceUrl }` for a public https image.
- Tell the user what each change did, in their words, and that each can be undone alone; keep each `requestId` and the receipt's undo call to yourself. Nothing is public until the user asks to publish (`libretto-publish`).
