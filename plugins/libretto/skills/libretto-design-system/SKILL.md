---
name: libretto-design-system
description: Read and change a core Libretto site's design system through the libretto MCP server - tokens (colours, type, space, radius), themes and token sets, component variants and cells, mixins, breakpoints and fonts, with the contrast check that corrects or refuses unreadable text. Use when the user wants to change how something looks across the site, add or edit a token, a button or card variant, a theme, a mixin or a font.
---

# The Libretto design system

The design system is where a site's appearance lives. Pages point at it (a token in a part's style, a component's variant, a mixin, a theme), so one change here reaches every page that uses it. Prefer a change here to a local style whenever the user means "everywhere".

Use the loop of the `libretto-editing` skill (its "Which site" rules on a token of several sites): `site_context`, read, `apply_ops`, verify, undo with the answer's `undo`. Each op below goes in a batch with its `baseRevisions`, `requestId` and `message`; its whole input is in the [design-system reference](../../reference/operations/design-system.md) and [components reference](../../reference/operations/components.md) (`Grep` `^## token.set` with about 40 lines after it).

## Read first, small

- `tokens`: the design tokens of the default theme, by set (`core`, `semantic-light`, ...), each with its `$type`, its `$value` (a literal, or an alias such as `{color.palette.brand.600}`) and its description. `tokens/<theme>`: the tokens as one theme sets them.
- `design`: the design system as Editor › Design lists it: themes, token sets, fonts with what uses each, site styles (mixins), breakpoints.
- `definition/<key>`: one component (its props, variant axes, cells, slots and parts). The keys are in `site_context`'s definitions.
- `contrast/<pageId>`: a page's text and ground pairs, each with its ratio and the one it needs. `site-contrast`: how many texts of each page fall short. `site-findings`: how many findings each page has.
- `design-export`: the whole design system as DTCG files, as text. The `design.export` door answers the same files as the zip Design › Import and export downloads.

Read only the groups the change needs, and never compute what a token resolves to yourself: the `tokens` read and `render_preview` say it.

## Who may change what

`discover_operations` says it per op (`allowed`, with `reason` when not), and the refusal names who can:

- A **Designer** sets a palette colour to a value of its own (`token.set` on a `color.palette.*` token with a literal `$value`), picks a part's or a page's theme (`tree.set_theme`), styles parts (`tree.set_style`) and picks variants (`instance.setVariant`).
- An **Administrator** also sets aliases and every other token (roles, type, space, radius), themes and token sets, components and their cells, mixins, breakpoints, guidelines and fonts.
- **Accepting a hard-to-read colour pair** is a person's decision, the site administrator's, whatever an agent's role: hand them Editor › Checks (`urls.places["editor.checks"]`).

A refusal is not the token's fault: a new token gets the same answer. Tell the user which change needs whom, and wait; never route around it (no raw value on the parts instead of the token).

## One user-visible change per batch

A batch is the unit of undo. A new accent colour, larger section titles, another look for the primary button and tighter spacing are four batches, even when they came in one message. Inside one change keep together what it needs: the palette step and the roles on it (the contrast check judges the end state), a new token and the parts re-pointed at it. Apply them in order, each on the `revisions` of the previous answer, and tell the user the result per change.

The exception is the guide's **brand setup** (three colours, a type pairing, a type scale, spacing and corners): one batch of `token.set` on the tokens the site already has, so one undo takes the whole setup back.

## Talking about the design system

The person sees Editor › Design, not token files. Name what a change does, never its path or key: "il colore d'accento", "la dimensione dei titoli di sezione", "la scala degli spazi tra le sezioni", "lo stile Contorno del pulsante" (a variant's label, not its key). Give values in their units (#1F5C99, 48 px), and contrast as a ratio with its threshold ("4,9:1, il minimo è 4,5:1").

## The ops

| Goal | Op | Input |
|---|---|---|
| A token: a colour, a size, a font family, a shadow, an alias | `token.set` | `{ "set": "core", "path": "color.palette.brand.500", "token": { "$type": "color", "$value": "#2f6f8f" } }`; a role: `{ "set": "semantic-light", "path": "color.text.accent", "token": { "$type": "color", "$value": "{color.palette.brand.600}" } }`; `"token": null` clears it |
| A theme: its label, the sets it reads, a draft, where it applies by itself | `theme.set` | `{ "key": "dark", "theme": { "label": "Scuro", "sets": ["core", "semantic-light", "semantic-dark"], "activation": { "prefersColorScheme": "dark" } } }`: the theme whole |
| A token set a non-default theme reads | `themeSet.set` | `{ "key": "semantic-dark", "tokens": { ... } }`: the set whole, as a DTCG tree |
| A part or a section in another theme | `tree.set_theme` | `{ "at": { "page": "<pageId>" }, "node": "<nodeId>", "theme": "dark" }` |
| One look of a component: a variant, a size, a state, a part | `cell.set` | `{ "key": "component.section-head", "cell": "dark.*.*.root.*.background-color", "value": { "$token": "color.bg.inverse" } }`: the cell is `<variant>.<size>.<state>.<part>.<breakpoint>.<property>`, `*` for any |
| A component's variants | `component.setVariantAxes` | `{ "key": "...", "axes": { "tone": ["light", "dark"] } }`, the axes whole; `hidden` stops offering a value |
| A shared named style | `mixin.set`, then `tree.set_mixins` on the parts | `{ "key": "didascalia", "mixin": { "label": "Didascalia", "style": { "base": { "font-size": { "$token": "font.size.small" } } } } }` |
| A breakpoint | `breakpoint.set`, `breakpoint.rename` | `{ "name": "md", "query": "(min-width: 768px)" }`; rename rewrites every style that names it |
| A Google Fonts family | the `font.addGoogle` door | `{ "family": "Inter", "weights": [400, 700], "italic": false }`, alone in its batch |
| A font file on this computer | `upload_font_file` of `libretto-files` (the `font.uploadFace` door) | `{ "path", "name", "weight", "style", "licence" }`; a variable file: `"weight": [200, 800]` or no weight |
| A face's settings (how it loads, pinned axes, fallback) | the `font.setFace` door | `{ "id": "<fontId>", "load": "swap" }` |
| Then the family on the text styles | `token.set` | the `fontFamily` tokens the styles read |
| A rule for what a role may change | `guideline.set` | `fixed`, `free` or a `choice` of tokens, with the note people read |
| A whole design system file (Tokens Studio, DTCG, Figma variables) | the `design.import` door | `{ "fileName": "tokens.zip", "data": "<the file as base64>" }`, alone in its batch: see [importing a design system](#importing-a-design-system) |
| The site's design system as a file | the `design.export` door | `{}`: the zip as base64 in `data`, with its `fileName` and `files` |

Every op's refusals and the rest of its input are in its description (`discover_operations` with `names`). Removing a token, a mixin or a breakpoint that parts still use is refused with where it is used: point them elsewhere first.

## The contrast check

Every write is checked on its end state, in every theme, at WCAG AA:

| What | Needs |
|---|---|
| Text | 4.5:1 |
| Large text: at least 24 px, or at least 18.66 px at weight 700 or more (a size Libretto cannot work out counts as normal text) | 3:1 |
| The graphic (a shape, a path, an icon) of a link or a button with no text of its own | 3:1 |

Each pair's answer says the ratio it measures and the one it needs (`required`). When a pair falls short, Libretto either:

- **corrects it in the same step**: the answer's `corrections` names each text whose colour it changed, with the ratios before and after. Tell the person what was changed and why ("ho scurito il grigio delle didascalie: era 2,8:1, ora 6,7:1"); one undo takes back the change and its corrections together; or
- **refuses the batch** (`contrast.uncorrectable`, with the pair): no colour of the site keeps that text readable there. Pick another palette step, or change the palette step and the role on it together in one batch (the check reads only the end state).

To try a colour without keeping it, `dry_run_ops` the `token.set` and read its `corrections` and refusals: nothing is stored. `contrast/<pageId>` lists a page's pairs with their ratios; `site-contrast` says which pages have pairs that fall short. Never compute a ratio with code.

Keeping an unreadable pair on purpose is a person's decision: `contrast.bypass` (one page) and `component.acceptContrast` (every instance of a component) are the site administrator's, in Editor › Checks. An agent is refused them; hand the person `urls.places["editor.checks"]`. See [contrast and accessibility](../../reference/recipes/contrast-and-a11y.md).

## A whole design update

A brief, a reference or a Figma file has its own recipe: [design update](../../reference/recipes/design-update.md).

## Importing a design system

A design system file the person gives you (a zip of Tokens Studio's layout or of an export, one Tokens Studio file, one plain DTCG file, a Figma variables export) goes in whole through the `design.import` door, as Editor › Design (Import and export) takes it. It is an Administrator's.

1. **Encode it, never by hand.** Put the file's bytes in `data` as base64 with a shell (`base64 < tokens.zip | tr -d '\n'`), unchanged, and its name in `fileName`. A token file is text and small; one too long to carry in a call is the person's to import in Editor › Design (`urls.places["editor.design"]`). At most 20 MB.
2. **Dry-run it first** (`dry_run_ops`, the door alone in its batch). The answer's `plan` says what the file would do: how many values it adds (`added`), changes (`changed`), keeps (`same`) and skips (`skipped`: a value whose type is not the site's, or a name a value may not have), each in `rows` (the first 200, the rest counted in `more`), the sets it adds (`newSets`) and the themes it makes or changes (`themes`; a new theme comes in as a draft). Nothing is deleted. Tell the person the plan in their words and wait for their yes.
3. **Apply it** with `apply_ops`: one step, one `undo` takes the whole import back. A design that moved since the dry run is refused as `stale_revision`: dry-run again.
4. **Look** at two pages, both widths (`libretto-visual-check`), and read the answer's `corrections`.

A file that changes nothing answers `changes: 0` and its plan, nothing written. To change a few values, `token.set` each; a non-default theme's set whole is `themeSet.set`.

## Never

- Never write a raw colour, size or font where a token exists, in a cell, a mixin or a part's style.
- Never invent a token path by accident: `token.set` on a path that does not exist **creates** a token. Check the path in `tokens` first; add one only when the user wants it.
- Never repaint a palette step when the user means a role ("the accent text"): change the role in `semantic-light` (and the dark set when the site has one).
- Never clear a token, a theme, a mixin or a variant without the user's explicit yes: pages may use them.
- Never work around the contrast check or a refusal. If it looks wrong, report it (`libretto-report-issue`).
- Never finish without looking: a token change reaches every page (`libretto-visual-check`, two pages, both widths).
- Never add a client-specific component or variant name; variants describe a role (`ghost`, `quiet`, `display`), not a page.
