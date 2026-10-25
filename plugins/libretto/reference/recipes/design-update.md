# Apply a design update to an existing site

Use when the user brings a new look (a reference, a Figma file, a brief): colours, type, spacing, corners, component looks, a dark theme. The update lives in the design system so every page follows; pages are touched only where they hard-code a value.

Operations: [design-system](../operations/design-system.md), [media-and-fonts](../operations/media-and-fonts.md), [brand](../operations/brand.md).

## 1. Take stock

1. `site_context`, then `read_resources` on `splash://site/<siteId>/design-system`. The answer is large; Claude Code saves it to a file. Query it, do not read it whole:
   - every token: `jq -r '.. | objects | select(.path? and .type? and .sets?) | "\(.path)\t\(.type)\t\(.sets|tostring)"' FILE`
   - one token: `jq -c '.. | objects | select(.path? == "color.text.accent")' FILE`
   - components and variants: `jq -c '.. | objects | select(.variants? and .parts?) | {key, variants: [.variants[].key]}' FILE`
   - themes: `jq -c '.. | objects | select(.sets? and .isDefault? != null) | {key, sets}' FILE`
2. `designSystem.diff` through `dry_run_ops`: what the site already changed from its blueprint (read `diff`, ignore `css`).
3. Write the user a short mapping from the brief to tokens before changing anything: which palette steps, which roles, which type styles, which component variants. Ask about anything the brief leaves open.

## 2. Colours

- The palette lives in set `core` (`color.palette.<name>.<step>`); roles live in `semantic-light` and `semantic-dark` (`color.text.*`, `color.bg.*`, `color.border.*`) and are aliases of palette steps (`{color.palette.brand.500}`).
- A new brand colour: change the palette steps. A colour that moves to another role: change the role's alias. Prefer aliases to hex in roles.
- One `designSystem.setTokens` with the palette steps and the roles that sit on them, so the contrast gate judges the end state. `type` is `color`.
- If the gate refuses (422 lists each pair and ratio), pick a darker or lighter step, then dry run again. Never set `acknowledgeContrast` without the user's explicit yes.
- A full rebrand from three colours, a type pairing and a scale is `brand.setup` (it rewrites palettes, roles, type, space and radii in one undoable change). Use it only when the user wants the whole brand replaced, and dry run it first.

## 3. Type

1. Fonts: a Google family is `font.importGoogle` `{ "family", "weights", "styles" }` (409 `font_face_exists` if already there). A font file (a foundry licence) must be uploaded in the admin (Fonts); MCP cannot stage font bytes.
2. Families: `font.family.display`, `font.family.heading`, `font.family.body`, `font.family.ui`... in set `core`, type `fontFamily`, value an array (`["DM Sans", "sans-serif"]`).
3. Type styles: `type.<style>` tokens (`type.section-title`, `type.body`) are composites. `setToken` needs the **whole** value: copy `sets.core` of the token, change what the brief asks, write it back with `"type": "typography"`:
   ```json
   { "set": "core", "path": "type.section-title", "type": "typography",
     "value": { "fontFamily": "{font.family.display}", "fontSize": "clamp(1.5rem, 5vw, 2rem)", "fontWeight": "{font.weight.regular}", "letterSpacing": "-0.01em", "lineHeight": 1.15 } }
   ```
4. Roles: `type.role.heading1`, `type.role.body`, `type.role.lead`... alias a type style (`"{type.display}"`). Re-point a role to change every text that uses it.

## 4. Space, corners, shadows

`space.*`, `radius.*`, `shadow.*`, `border.width.*` in `core`, one `setTokens` per family of tokens. Keep the scale's order (a larger step stays larger).

## 5. Component looks

1. Read the component: `read_resources` `splash://site/<siteId>/component/<key>` (large; query with `jq -c '.. | objects | select(.cell? and (.cell | startswith("primary.")))' FILE`). A cell is `<variant>.<size|all>.<state>.<part>.base.<property>`.
2. `designSystem.setComponentCell` `{ "component": "button", "cells": [{ "cell": "primary.all.hover.container.base.background", "value": "{color.bg.accent-strong}" }] }`. Values are tokens.
3. A look the site lacks: `designSystem.createVariant` `{ component, variant, label, from }`, then its cells; then `set_variant` on the nodes that should use it (`libretto-editing`).
4. A node that already looks right through local overrides: `designSystem.promoteVariant` `{ pageId, nodeId, variant, label }` turns them into a variant and re-attaches the node.

## 6. Themes

- Light and dark come from stacking sets: a theme is `{ key, label, sets }`. `designSystem.createTheme`, `designSystem.updateTheme`, `designSystem.activateSet` / `designSystem.createSet` for a new layer.
- Put a section on a theme: `designSystem.setScheme` `{ pageId, nodeId, theme }` (or `set_theme` in a `tree.commit`).

## 7. Pages that do not follow

- `tree.commit` answers carry `design.detached` findings: nodes whose local declarations override the system. Read those nodes; replace raw values with tokens (`set_style` with `{token.path}`), or remove the declaration (`null`) so the variant shows.
- Text with a hand-set size: apply a type role on its five properties (see [restyle a page](restyle-page.md)).
- Hand-set sizes that differ a lot from the token (a display heading at `clamp(…, 8.55rem)` where `type.section-title` stops at 2rem): re-pointing them at the token would shrink them. List them for the user with today's size and the size the token would give, and propose new size tokens per family of headings (`font.size.section-title-display`) to re-point them at, rather than collapsing them onto one token or scaling raw values. Ask before choosing.
- Before the type and colour steps, dry-run one write per area: a `403` with `data.kind: "access"` means the site keeps that design-system area closed to editors ([design-system skill](../../skills/libretto-design-system/SKILL.md), Who may change what). Tell the user at the start, not half-way through the update.

## 8. Check and report

- `designSystem.lint` (through `dry_run_ops`): errors must be zero; AAA warnings are information.
- `render_preview` `{ "pageId", "device": "desktop" | "mobile", "mode": "screenshot" }` on the home page and two other key pages. If the reference is an image in the media library, `compare_reference` `{ pageId, device, referenceMediaId }`.
- Report each applied `requestId` with what it changed. Nothing is public until the user asks to publish (`libretto-publish`).
