# Translations

Use when the user wants a text in another language, a page translated, or a language added.

Operations: [pages and trees](../operations/pages-and-trees.md), [site and settings](../operations/site-and-settings.md), [navigation](../operations/navigation.md), [collections](../operations/collections.md), [media and fonts](../operations/media-and-fonts.md).

## The site's languages

- MCP has no read of the site's language list. Use the codes the site's texts already use: the page titles in `site_context` are locale maps (Archiplan: `it` and `en-US`), and so are the texts in the trees. The first is usually the default. Never invent a code (`en` is not `en-US`).
- Adding or removing a language is `site.updateLanguages`, which needs `site.admin`: a platform admin's token. An editor or a workspace owner gets 403; ask the user to have a platform admin add it (admin: Impostazioni > Lingue). Removing one sweeps it out of every text and needs `"confirmed": ["destructive"]`.
- An added language shows the default language's text until translated.

## Where texts live, and their shape

A text is either a plain string (the same in every language) or a **locale map** `{ "it": "Servizi", "en-US": "Services" }`. Keep the shape you find; to translate a plain string, turn it into a map that keeps the original under the default locale.

| Text | Where | Write with |
|---|---|---|
| Node texts (headings, paragraphs, buttons, alt) | `props` in the page or region tree | `tree.commit` `set_props` `{ id, patch: { "text": { "it": "...", "en": "..." } } }` |
| Rich text | a `richtext` node | `content.importMarkdown` `{ pageId, nodeId, locale, markdown }`: one language at a time, the others keep theirs |
| Page title, SEO title and description, slug | page fields | `page.update` `{ pageId, patch: { "title": { ... } } }` (fields from `page.read`) |
| Menu labels | menus | `navigation.upsert` with locale-map labels ([menus](header-footer-and-menus.md)) |
| Collection values | items | `item.update` with locale maps on `localized` fields |
| Image alt, caption | media | `media.update` `{ mediaId, alt: { ... } }` |
| Site title, tagline, legal line | settings | `settings.update` (fields from `settings.read`) |
| Form labels and messages | forms | `form.update` (fields from `form.read`) |

## Translate a page

1. Read the outline (`outline/<pageId>`): text nodes show as `primitive:text`, `primitive:richtext`, buttons and links. Read their props section by section with `tree/<pageId>?node=<section id>&depth=4` (a section's subtree, not the whole page), and list every text prop with its node id, in the default language.
2. Translate them; show the user the list (node, original, translation) for a page of any length before writing.
3. One `tree.commit` with a `set_props` per node; change only the language asked, keep the others.
4. Dry run: `translation.missing` findings list texts that still lack the language. Apply, then translate the page's title and SEO fields with `page.update`, and the menu labels.
5. Look at the page in that language at tablet and phone width: `render_preview` `{ pageId, mode: "screenshot", device: "tablet", locale: "en-US" }`, or in Chrome the address with the language prefix ([preview and visual check](preview-and-verify.md)).

## Rules

- Never machine-translate brand names, people's names or legal text without asking.
- Never drop a language from a map while editing another.
- Keep the text length in mind: a longer translation can break a layout; look at the phone width.
