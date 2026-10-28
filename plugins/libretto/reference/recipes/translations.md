# Translations

Use when the user wants a text in another language, a page translated, or a language added.

Operations: [pages and trees](../operations/pages-and-trees.md), [site and settings](../operations/site-and-settings.md), [navigation](../operations/navigation.md), [collections](../operations/collections.md), [media and fonts](../operations/media-and-fonts.md).

## The site's languages

- MCP has no read of the site's language list. Use the codes the site's texts already use: the page titles in `site_context` are locale maps (for a site in Italian and English: `it` and `en-US`), and so are the texts in the trees. The first is usually the default. Never invent a code (`en` is not `en-US`).
- Adding or removing a language is `site.updateLanguages`, which needs `site.admin`: a platform admin's token. An editor or a workspace owner gets 403; ask the user to have a platform admin add it (admin: Impostazioni > Lingue). Removing one sweeps it out of every text and needs `"confirmed": ["destructive"]`.
- An added language shows the default language's text until translated.

## Where texts live, and their shape

A text is either a plain string (the same in every language) or a **locale map** `{ "it": "Servizi", "en-US": "Services" }`. Keep the shape you find; to translate a plain string, turn it into a map that keeps the original under the default locale.

| Text | Where | Write with |
|---|---|---|
| Node texts (headings, paragraphs, buttons, alt) | `props` in the page or region tree | `tree.commit` `set_props` `{ id, patch: { "text": { "it": "...", "en": "..." } } }` |
| Rich text | a `richtext` node | `content.importMarkdown` `{ pageId, nodeId, locale, markdown }`: one language at a time, the others keep theirs |
| Page title, SEO title and description | page fields | `page.update` `{ pageId, patch: { "title": { ... } } }` (fields from `page.read`) |
| Page address in a language | `slugs` of a page, an article or a blog index | `page.update` `{ pageId, patch: { "slugs": { "en-US": "method" } } }`; `article.update` / `blog.update` take `patch.slugs` the same way ([Its address](#its-address-in-that-language)) |
| Menu labels | menus | `navigation.upsert` with locale-map labels ([menus](header-footer-and-menus.md)) |
| Collection values | items | `item.update` with locale maps on `localized` fields |
| Image alt, caption | media | `media.update` `{ mediaId, alt: { ... } }` |
| A picture with words in it (a chart, a poster, a diagram) | an `image` node's `src`, each of its `sources[].src`, an `svg` node's `media` | `set_props` with a locale map of pictures: `{ "src": { "it": { "$media": "<it id>" }, "en-US": { "$media": "<en id>" } } }`. The default language's entry is required (`I8.locale_default`); a language left out shows the default's. Each language's picture brings its own size and alt text. A plain picture stays one for every language |
| Share image (social card) | page or article fields | `page.update` `{ pageId, patch: { "ogImages": { "en-US": "<media id>" } } }`; an article or a blog index: `article.update` / `blog.update` `patch.seo.ogImages`. The default language's is `ogImageId`; the map patches like `slugs` (`null` removes a language's own, which then shares the default's) |
| ARIA labels (`aria-label`, `aria-description`, …) | a node's `attrs` | `set_attrs` `{ id, patch: { "aria-label": { "it": "Grafico dei costi", "en-US": "Cost chart" } } }`; a language with no entry gets no label. Only the ARIA attributes a visitor hears take a map |
| Site title, tagline, legal line | settings | `settings.update` (fields from `settings.read`) |
| Form labels and messages | forms | `form.update` (fields from `form.read`) |

## Translate a page

1. Read the outline (`tree/<pageId>`): text nodes show as `primitive:text`, `primitive:richtext`, buttons and links, each with the start of its text. Read those nodes at `depth=0`, up to 16 URIs per `read_resources` call (`tree/<pageId>?node=<id>&depth=0`), and list every text prop with its node id, in the default language. Never a section's subtree at depth 3 or 4, and never the render document (`render_preview` with `include: ["render"]`) to read texts; `render_preview` `find: "<words>"` finds a text you know.
2. Translate them; show the user the list (node, original, translation) for a page of any length before writing.
3. One `tree.commit` with a `set_props` per node; change only the language asked, keep the others.
4. Dry run: `translation.missing` findings list texts that still lack the language. Apply, then translate the page's title and SEO fields with `page.update`, and the menu labels.
5. Give the page its address in that language: see [Its address](#its-address-in-that-language).
6. Look at the page in that language at tablet and phone width: `render_preview` `{ pageId, mode: "screenshot", device: "tablet", locale: "en-US", crop: { nodeId } }` for the sections you translated, or in Chrome the language's `draftPreview` from `site_context`'s `urls.locales` ([preview and visual check](preview-and-verify.md)).

## Its address in that language

A page, an article or a blog index can answer its own slug in each language that is not the default: `/metodo` in Italian, `/en/method` in English. Without one, the language answers the default slug (`/en/metodo`). Menus, links, the language switcher, canonical, hreflang and the sitemap follow it by themselves.

1. Read the page's current `slugs` (`page.read`, or its line in the `pages` resource): never overwrite one the user chose.
2. Derive the slug from the translated title: lower case, digits and hyphens only, no accents (`Il nostro metodo` → `our-method`). The key is the locale code as the texts use it (`en-US`), never the default language: its slug is the page's `slug`.
3. One batch per page: `page.update` `{ pageId, patch: { "slugs": { "en-US": "our-method" } } }` (an article: `article.update`, a blog index: `blog.update`, same `patch.slugs`). The patch merges by language: a value sets it, `null` removes it, a language left out keeps its own. `page.create`, `article.create` and `blog.create` take `slugs` directly.
4. A refusal names the field (`slugs.en-US`): the slug is taken by a sibling page in some language (a slug names one page under its parent in every language), or a top-level slug is a locale code of the site or `api` / `admin`. Pick another slug; never rename the sibling to make room.

Changing a slug of a **published** page (or its `slug`, or moving it) adds a 301 from each old address to the new one in the site's redirects, live with the next publish: tell the user, in their words ("il vecchio indirizzo porterà a quello nuovo dopo la pubblicazione"). A wrong-language address (`/en/metodo` once `/en/method` exists) also answers a 301, never a 404.

## Rules

- Never machine-translate brand names, people's names or legal text without asking.
- Never drop a language from a map while editing another.
- Keep the text length in mind: a longer translation can break a layout; look at the phone width.
