---
name: libretto-design-system
description: Read and change a Libretto site's design system through the libretto MCP server - tokens (colours, type, space, radius), component variants and cells, mixins and themes, under the AA contrast gate. Use when the user wants to change how something looks across the site, add or edit a token, a button or card variant, a theme or a mixin.
---

# The Libretto design system

The design system is where a site's appearance lives. Pages point at it (tokens in node styles, a component's variant, a mixin, a theme), so one change here updates every page that uses it. Prefer a change here to a local style on a node whenever the user means "everywhere".

Use the editing loop of the `libretto-editing` skill: `site_context`, read, `dry_run_ops`, `apply_ops` with a fresh `requestId`, verify, `history.undo` to go back. Every operation below goes in a `splash.batch`; its input is in the table below and in the [design-system reference](../../reference/operations/design-system.md) (`Grep` `^## designSystem.setTokens` with about 40 lines after it). Call `discover_operations` only for a shape you still lack, one name at a time: four names with `schemas: true` answered 31,000 characters in a real session.

## One user-visible change per batch

A batch is the unit of undo, and a brief usually names several changes. Give each its own batch: a new accent colour, larger section titles, another look for the primary button and tighter spacing are four batches, even when the user asked for all of them in one message and said "dry run, then apply". Inside one change, keep together what it needs: the palette steps and the roles on them (so the contrast gate judges the end state), a new token and the nodes re-pointed at it. Never put a component's look in the batch of a token change. Dry-run each batch, show the user the result per change, then apply them in order, each on the `revisions` of the previous answer. Then "annulla solo il pulsante" is one undo of one batch, not a hand-made edit. Rule 6 of `libretto-editing` has the rest.

## Talking about the design system

The person sees the admin's design system pages, not token files. Name what a change does, never its path or key: "il colore d'accento", "la dimensione dei titoli di sezione", "la scala degli spazi tra le sezioni", "lo stile Contorno del pulsante" (a variant's **label**), not `color.text.accent`, `font.size.section-title-display`, `space.section-y.4`, `sm` / `md` / `lg` or `secondary`. Give values in their units (#1F5C99, 48 px, 96 px), and contrast as a ratio with its threshold ("4,9:1, il minimo è 4,5:1"), never a warning count or a reason code.

A whole design update (a brief, a reference, a Figma file) has its own step-by-step recipe: [design update](../../reference/recipes/design-update.md). Contrast and accessibility: [contrast and a11y](../../reference/recipes/contrast-and-a11y.md). Every design-system operation: [design-system reference](../../reference/operations/design-system.md); brand-wide setup: [brand](../../reference/operations/brand.md).

## Read first, small

Read only what the change needs, through resource queries (each is a registry read you could also run through `dry_run_ops`). One narrow group per URI: a whole family (`?tokens=color`) or three groups in one call answered 55,000 characters in a real session.

- `splash://site/<siteId>/design-system` (`designSystem.read`): the index, with the revision, sets, themes, every component's variant keys and each token group's size. Add the paths and values of the narrowest groups the change touches, one or two at a time: `?tokens=color.text`, `?tokens=color.palette.brand`, `?tokens=space.section-y`. Broad groups are large: `?tokens=color,space,font,type` answered 32 KB on Archiplan; `?components=true` adds each component's sizes, states and parts (the segments of a cell key). Never ask for `css=true` unless you need the stylesheet.
- `splash://site/<siteId>/component/<key>?variant=primary&state=hover&own=true` (`designSystem.readComponent`): only the cells you mean. `own=true` keeps the cells actually set; filter by `size`, `part`, `breakpoint`, `property` too. Answers page by `limit` (100) with `total` and `nextCursor`: a large component has thousands of cells, so filter first.
- `designSystem.lint` and `designSystem.diff` (read-only, through `dry_run_ops`) answer a summary: `findingCount`, `findingsBySeverity`, `findingsByReason`, the `worst` 20 findings (errors first, then the contrast pairs furthest below what they need), `overrideCount` and the first 100 `overrides`. `full: true` gives the whole answer, stylesheet included: avoid it.
- `access.read` answers your own level in each design-system area on this site: read it before a design update to know what you may change.

## Check the answer of a write

A design-system write (in `dry_run_ops` or `apply_ops`) answers its change, not the whole system. In each `results[].output`:

- `dryRun` is `true` in a dry run; `changed` says whether anything would move; `revision` is the design-system revision it reaches.
- `changes`: the overrides it adds, changes or removes. Check they are exactly what you meant (no extra token, the right set and theme).
- `errors`: must be empty before you apply (an AA refusal comes back as a `422` instead).
- `warnings`: at most 20, about what you changed (an AAA pair of the cell you touched, a lint note on your token). Tell the user about them in plain words; the counts are for you.
- `warningCount` and `warningsByReason`: the whole system's warnings by reason (`below-aaa`, `decorative`, `asset-missing`...). Compare the counts before and after: a jump means your change hurt pairs elsewhere.

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
| Google font | `font.importGoogle` | `{ "family": "DM Sans", "weights": [400, 700], "styles": ["normal"] }` |
| Font file (WOFF2) | `upload_font_file` of `libretto-files` (it sends `font.upload`) | licence first; one face per call: `{ "path", "name", "weight", "style", "licence" }`; then a `fontFamily` token. Without `font.upload` (`unknown_operation`) or without the file tool: the Typography page in the admin, `libretto-admin-browser` |

## Who may change what (access settings)

Each site decides which design-system areas an editor may change: `palette`, `semantic-colours`, `font-families`, `type-presets`, `space`, `radius`, `borders`, `shadow`, `motion`, `grid`, `assets`, `components`, `variants` (`pick` = only choose a variant on a node), `themes` (`switch-default`), `import-export`, `reset`. A platform admin, and the workspace owner on the sites of their own workspace, may edit every area. Any other editor gets what the site's access settings give editors: by default only the palette, and only view the rest.

A refusal names the area: `403 {"message": "Design system semantic-colours: edit permission required; role has view", "data": {"kind": "access", "area": "semantic-colours", "granted": "view", "needed": "edit"}}`. It is not the token: a new token gets the same answer. Tell the user which areas the job needs: the workspace owner can make the change (or ask their own Claude), and only a platform admin changes what editors may do. Then wait; do not route around it (no hard-coded values on the nodes instead of the token). A workspace owner refused on a site of their own workspace is a bug: open a ticket (`libretto-report-issue`, category `refusal`). `access.read` answers your levels before you try.

## The AA contrast gate

Every design-system change is checked in every theme, on the end state of the batch. A text or icon colour that falls below WCAG AA on its background (4.5:1 for text, 3:1 for icons and other non-text parts) refuses the whole batch with `422` and lists each failing pair, such as `theme light components/accordion.json ...: {color.text.accent} on {color.bg.section} is 1.10:1, below 4.5:1`. AAA shortfalls come back as `warning` findings and do not block.

### Measure contrast with the gate

Never compute WCAG ratios yourself with Bash, Python or Node: the person's Claude may not be allowed to run code, and the gate's number is the one Libretto enforces. To know whether a colour is readable, dry-run it:

1. `dry_run_ops` a `designSystem.setTokens` with the candidate (the palette step and the roles on it). Nothing is saved.
2. Read the answer:
   - **refused** (`422`): the `detail` lists each failing pair with its ratio and threshold (`... on {color.bg.section} is 4.1:1, below 4.5:1`);
   - **accepted**: `results[].output.warnings` lists up to 20 pairs below AAA, each with `foreground`, `background`, `ratio` and `required` (`warningCount` is the total). The list stops at 20, so a pair missing from it has no number: say it passes AA (at least 4.5:1 for text, 3:1 for icons) rather than guess one.
3. To find the nearest readable shade, dry-run one candidate at a time, a step darker or lighter, until it is accepted, and give the user the ratio the gate gave.

`designSystem.lint` (through `dry_run_ops`) answers the same for the whole system: its `worst` list carries the ratio of each pair.

When the gate refuses: pick another palette step, or change the palette step and the role on it together in one `designSystem.setTokens` (the gate reads only the end state). Tell the user which pairs failed in plain words ("il testo d'accento sullo sfondo delle sezioni ha un contrasto 3,9:1, serve almeno 4,5:1"), not token paths. `brand.setup` accepts `acknowledgeContrast: true`; set it only when the user explicitly says to save anyway.

## Never

- Never write a raw colour, size or font where a token exists, in a cell, a mixin or a node style.
- Never invent a token path by accident: `setToken` on a path that does not exist **creates** a new token. Check the path in `design-system?tokens=<its group>` first; add a new token only when the user wants one.
- Never edit `core` palette values when the user means a role ("the accent text"): change the role in `semantic-light` / `semantic-dark`.
- Never delete a variant, a mixin or a theme, or run `designSystem.resetToBlueprint`, without the user's explicit yes: they are destructive and pages may use them.
- Never work around the contrast gate or a `403` (the site's access settings may lock parts of the design system). If the refusal looks wrong, open a ticket (`libretto-report-issue`).
- Never finish without looking: a token change reaches every page (`libretto-visual-check`, two pages, both widths).
- Never add a client-specific component or variant name; variants describe a role (`ghost`, `quiet`, `display`), not a page.
