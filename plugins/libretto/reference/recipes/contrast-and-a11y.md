# Contrast and accessibility

Use when the user asks "is it readable", "is it accessible", when a write came back with `corrections` or a contrast refusal, or before a publish.

Ops: [design system](../operations/design-system.md) (`token.set`; the contrast records), [parts and styles](../operations/parts-and-styles.md) (`tree.set_style`, `tree.set_attrs`, `tree.set_props`, `tree.set_type`), [media](../operations/media.md) (`media.setMeta`).

## Read what Checks finds

- `contrast/<pageId>`: the page's text and ground colour pairs and how readable each is, with its ratio and the one it needs (`required`).
- `site-contrast`: how many texts of each page fall below the contrast they need; start with the pages that have most.
- `findings/<pageId>?locale=<locale>`: what Editor › Checks finds on a page: a picture with no words, a link that says nothing, the main heading and the heading levels, a required value missing.
- `site-findings`: how many findings each page of the site has; start with the pages that have most.

Libretto measures; never compute a ratio with code.

## How the contrast check works

Every write is judged on its end state, in every theme, at WCAG AA: 4.5:1 for text; 3:1 for large text (at least 24 px, or at least 18.66 px at weight 700 or more; a size Libretto cannot work out counts as normal text); 3:1 for the graphic (a shape, a path, an icon) of a link or a button with no text of its own. When a pair falls short, Libretto corrects the text's colour in the same step and says so in the answer's `corrections` (the text, both colours, both ratios), or refuses the batch (`contrast.uncorrectable`) when no correction keeps it readable. One undo takes a change and its corrections back together.

## Fix a pair

1. Read `contrast/<pageId>` and find the pair: which text, on which ground.
2. Fix it at its source, in this order of preference:
   - the role the text uses, for every page: `token.set` on `color.text.*` (an Administrator's), or the palette step under it with a literal colour (a Designer may);
   - the text's own colour on this page: `tree.set_style` with a token (`{ "$token": "color.text.primary" }`);
   - one instance's text: `instance.override`.
3. To try a colour first, `dry_run_ops` the batch and read its `corrections`: what Libretto would change, and the ratios. Nothing is stored.
4. Tell the person the ratio before and after, in their words ("il testo grigio sulle schede era 2,8:1, ora 6,7:1; il minimo è 4,5:1").

**Keeping a hard-to-read pair** (a brand grey kept on purpose, a ground that cannot be measured) is a person's decision, the site administrator's: `contrast.bypass` for one page, `component.acceptContrast` for every instance of a component. An agent is refused both, whatever its role; give the person Editor › Checks (`urls.places["editor.checks"]`), where they accept it with a reason.

## Other findings

| Finding | Fix |
|---|---|
| A picture with no words | `media.setMeta` `{ "id", "alt" }` for the file everywhere, or the part's own `alt` with `tree.set_props` ([images](images.md)); an empty alt for a decorative one |
| A link that says nothing ("clicca qui") | its words with `tree.set_text`, or a name for assistive technology with `tree.set_attrs` `{ "attrs": { "aria-label": "..." } }` |
| The main heading missing or twice, levels that skip | `tree.set_type` `{ "node", "as": "h1" }` (or `h2`, `h3`) |
| A required value missing in a component | `instance.setProp` with the value |
| Missing translations | [translations](translations.md) |

After each fix, read `findings/<pageId>` again: the count must go down, not up.
