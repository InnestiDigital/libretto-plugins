---
name: libretto-design-system
description: Read and change a Libretto site's design system through the libretto MCP server - tokens (colours, type, space, radius), component variants and cells, mixins and themes, under the AA contrast gate. Use when the user wants to change how something looks across the site, add or edit a token, a button or card variant, a theme or a mixin.
---

# The Libretto design system

The design system is where a site's appearance lives. Pages point at it (tokens in node styles, a component's variant, a mixin, a theme), so one change here updates every page that uses it. Prefer a change here to a local style on a node whenever the user means "everywhere".

Use the editing loop of the `libretto-editing` skill: `site_context`, read, `discover_operations`, `dry_run_ops`, `apply_ops` with a fresh `requestId`, verify, `history.undo` to go back. Every operation below goes in a `splash.batch`; take its exact input from `discover_operations`.

A whole design update (a brief, a reference, a Figma file) has its own step-by-step recipe: [design update](../../reference/recipes/design-update.md). Contrast and accessibility: [contrast and a11y](../../reference/recipes/contrast-and-a11y.md). Every design-system operation: [design-system reference](../../reference/operations/design-system.md); brand-wide setup: [brand](../../reference/operations/brand.md).

## Read first

- `splash://site/<siteId>/design-system`: `sets`, `themes`, `tokens` (by group, each with its value per set and resolved per theme) and `components` (variants, sizes, states, parts).
- `splash://site/<siteId>/component/<key>` (such as `button`): every cell of the component, its value, its blueprint value and what it resolves to.
- Both are large. When Claude Code saves them to a file, search with `jq`, for example `jq '.tokens[] | select(.group=="color") | .tokens[] | {path, sets}'`.
- `designSystem.lint` and `designSystem.diff` (read-only, run them through `dry_run_ops`) report problems and what differs from the blueprint.
- Every design-system dry run and apply answers about 1 MB: one `warning` finding per AAA contrast pair (over a thousand on Archiplan) plus the compiled CSS. Claude Code saves it to a file; read only what matters: `jq -c '{requestId, changed, revisions, errors: [.findings[] | select(.severity == "error")], aaa: ([.findings[] | select(.severity == "warning")] | length)}' FILE`.

## How it is built

- **Sets** hold token values: `core` (palette and raw scales), `semantic-light` and `semantic-dark` (roles such as `color.text.accent`, usually aliases of palette steps like `{color.palette.brand.500}`).
- **Themes** stack sets: `light` = `core` + `semantic-light`; `dark` adds `semantic-dark`. A node or section takes a theme with `set_theme` or `designSystem.setScheme`.
- **Components** (`button`, `card`, `navbar`, ...) have variants, sizes and states. A **cell** is one property of one part, named `<variant>.<size or all>.<state>.<part>.base.<property>`, for example `primary.all.hover.container.base.background`. Copy cell names from the component resource.
- **Mixins** are named style sheets a node can carry (`set_mixins`), built from tokens.

## Operations

| Goal | Operation | Input (see `discover_operations`) |
|---|---|---|
| Change one token | `designSystem.setToken` | `{ "set": "semantic-light", "path": "color.text.accent", "type": "color", "value": "{color.palette.brand.500}" }` |
| Change several together | `designSystem.setTokens` | `{ "writes": [ {set, path, type, value}, ... ] }` |
| Change a variant's look | `designSystem.setComponentCell` | `{ "component": "button", "cells": [{ "cell": "primary.all.hover.container.base.background", "value": "{color.bg.accent-strong}" }] }` |
| New variant | `designSystem.createVariant` | `{ "component": "button", "variant": "ghost", "label": "Ghost", "from": "primary" }` |
| Rename / remove a variant | `designSystem.updateVariant` / `designSystem.deleteVariant` | delete needs `"confirmed": ["destructive"]` |
| Turn a node's local overrides into a variant | `designSystem.promoteVariant` | `{ "pageId", "nodeId", "variant", "label" }` |
| Theme | `designSystem.createTheme`, `designSystem.updateTheme`, `designSystem.activateSet`, `designSystem.createSet` | |
| Theme of a node | `designSystem.setScheme` | `{ "pageId", "nodeId", "theme": "dark" }` |
| Mixin | `designSystem.setMixin` / `designSystem.deleteMixin` | `{ "key": "band", "label": "Band", "sheet": { "padding-block": "{space.4}" } }` |
| Import tokens (a Tokens Studio / W3C file) | `designSystem.importTokens` | dry run first: it can touch many tokens |
| What differs from the blueprint; problems | `designSystem.diff`, `designSystem.lint` | read-only, through `dry_run_ops` |
| Back to the blueprint | `designSystem.resetToBlueprint` | destructive: the user's explicit yes |
| Breakpoints | `breakpoints.update` | the whole list; as the access settings allow |
| Google font | `font.importGoogle` | `{ "family": "DM Sans", "weights": [400, 700], "styles": ["normal"] }`; font files are uploaded in the admin (Font) |

## Who may change what (access settings)

Each site decides which design-system areas an editor may change: `palette`, `semantic-colours`, `font-families`, `type-presets`, `space`, `radius`, `borders`, `shadow`, `motion`, `grid`, `assets`, `components`, `variants` (`pick` = only choose a variant on a node), `themes` (`switch-default`), `import-export`, `reset`. A platform admin, and the workspace owner on the sites of their own workspace, may edit every area. Any other editor gets what the site's access settings give editors: by default only the palette, and only view the rest.

A refusal names the area: `403 {"message": "Design system semantic-colours: edit permission required; role has view", "data": {"kind": "access", "area": "semantic-colours", "granted": "view", "needed": "edit"}}`. It is not the token: a new token gets the same answer. Tell the user which areas the job needs: the workspace owner can make the change (or ask their own Claude), and only a platform admin changes what editors may do. Then wait; do not route around it (no hard-coded values on the nodes instead of the token). A workspace owner refused on a site of their own workspace is a bug: open a ticket (`libretto-report-issue`, category `refusal`). `access.read` needs `site.admin`, so you cannot read the settings yourself; dry-run your batch to find out.

## The AA contrast gate

Every design-system change is checked in every theme, on the end state of the batch. A text or icon colour that falls below WCAG AA on its background (4.5:1 for text, 3:1 for icons and other non-text parts) refuses the whole batch with `422` and lists each failing pair, such as `theme light components/accordion.json ...: {color.text.accent} on {color.bg.section} is 1.10:1, below 4.5:1`. AAA shortfalls come back as `warning` findings and do not block.

When the gate refuses: pick another palette step, or change the palette step and the role on it together in one `designSystem.setTokens` (the gate reads only the end state). Tell the user which pairs failed. `brand.setup` accepts `acknowledgeContrast: true`; set it only when the user explicitly says to save anyway.

## Never

- Never write a raw colour, size or font where a token exists, in a cell, a mixin or a node style.
- Never invent a token path by accident: `setToken` on a path that does not exist **creates** a new token. Check the path in the `design-system` resource first; add a new token only when the user wants one.
- Never edit `core` palette values when the user means a role ("the accent text"): change the role in `semantic-light` / `semantic-dark`.
- Never delete a variant, a mixin or a theme, or run `designSystem.resetToBlueprint`, without the user's explicit yes: they are destructive and pages may use them.
- Never work around the contrast gate or a `403` (the site's access settings may lock parts of the design system). If the refusal looks wrong, open a ticket (`libretto-report-issue`).
- Never finish without looking: a token change reaches every page (`libretto-visual-check`, two pages, both widths).
- Never add a client-specific component or variant name; variants describe a role (`ghost`, `quiet`, `display`), not a page.
