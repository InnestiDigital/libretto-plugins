# Contrast and accessibility checks

Use before reporting any visual change, and whenever the user asks "is it readable", "is it accessible", or brings colours that look close.

Operations: [design system](../operations/design-system.md), [pages and trees](../operations/pages-and-trees.md).

## What Libretto checks by itself

| Check | Where it runs | What you get |
|---|---|---|
| AA contrast of every text and icon pair in every theme | every design-system change, on the end state of the batch | `422` refusing the batch, with each failing pair and ratio (4.5:1 text, 3:1 non-text) |
| AAA contrast | the same | `warning` findings, not blocking |
| Contrast of a node's local colours | `tree.commit` findings | `design.contrast-aa` (below 4.5:1), `design.contrast-aaa` (below 7:1), on the node |
| Heading order | `tree.commit` findings | `a11y.heading-order`: a heading skips a level |
| Empty structure | `tree.commit` findings | `structure.empty-section`, `structure.empty-box-paint` |
| Local values over the system | `tree.commit` findings | `design.detached`: the node overrides its variant or mixin |
| Missing translations, field formats | `tree.commit` findings | `translation.missing`, `field.format` |

Findings cover the whole page: filter by the `nodeId`s you touched, and mention pre-existing ones separately.

## Run a check on demand

Libretto computes every ratio: never work one out with Bash, Python or Node (the person's Claude may not be allowed to run code, and the gate's number is the one that counts).

1. `designSystem.lint` through `dry_run_ops`: a summary, `findingsBySeverity.error` must be 0; `worst` lists the 20 pairs furthest below what they need, each with `foreground`, `background`, `ratio` and `required`.
2. A colour that is not in the design system yet ("is #C0C0C0 readable on white?"): `dry_run_ops` a `designSystem.setTokens` that puts it on the role, nothing is saved. A `422` lists each failing pair with its ratio; an accepted dry run lists in `results[].output.warnings` up to 20 pairs below AAA (7:1) with their `ratio`. A pair missing from that list has no number: say it passes AA rather than guess one. For the nearest readable shade, dry-run one step darker or lighter at a time.
3. For one page: there is no page lint operation; the page-wide findings come with every `tree.commit` dry run. Dry-run the batch you are about to apply and read its findings (a dry run changes nothing).
4. Look at the result ([preview and visual check](preview-and-verify.md)): contrast over images and gradients is not computed by the gate; judge it on the screenshot and say so.

## When the gate refuses

- Read every pair in the `detail`: `theme light components/button.json ...: {color.text.on-accent} on {color.bg.accent} is 3.9:1, below 4.5:1`. Tell the user in their words: "il testo bianco sul pulsante d'accento ha un contrasto 3,9:1, serve almeno 4,5:1", not the token paths.
- Fix by moving the role to another palette step (darker text, lighter background), or change the palette step and its role together in one `designSystem.setTokens`.
- Never set `acknowledgeContrast` (only `brand.setup` has it) without the user's explicit "save it anyway", and say which pairs stay below AA.

## Beyond the gate (judge and report)

- Alt text on every meaningful image, in every language (`media.update`, or the node's alt prop).
- Link and button texts that make sense alone ("Scopri i servizi", not "Clicca qui").
- One `heading1` per page; headings in order.
- Tap targets on the phone width at least 44 px high (look at the phone screenshot).
- Motion: content visible without it (`hidden-at-rest` findings, see [motion](motion.md)).
- Text over images: enough contrast in the darkest and lightest part of the picture.
