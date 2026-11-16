# Translations

Use when the user wants a text in another language, a page translated, a language added, or another language made the main one.

Ops: [translations](../operations/translations.md) (`translation.set`), [site, settings and domains](../operations/site-settings-and-domains.md) (`site.setLocales`, `site.setMainLocale`), [pages](../operations/pages.md) (`page.setSlug`, `page.rename`, `page.setHead`).

## How core keeps languages

A site has one **main language**: the tree holds its words. Every other language is a translation of one field, by a JSON pointer, made from the main language's value as it is now. When the main language's words change later, the translation reads as **stale** until it is set again. `site_context.locales` lists the site's languages; never invent a code (`en` is not `en-US`).

## Read what needs translating

`translations/<locale>?page=<pageId>`: one row per field of that page and of the components (the header and footer among them), each with `at`, `pointer`, `source` (the main language's words), `value` (the translation) and `status`: `missing`, `stale`, `current`, `fallback` (read from a fallback language) or `inherited`. `counts` adds them up. Leave out `?page=` for the whole site, the collections' items too.

`texts/<pageId>?lang=<locale>` shows the page's words and pictures as that language reads them.

## Translate a page

1. Read `translations/<locale>?page=<pageId>` and take the rows with status `missing` or `stale`.
2. Translate them; for a page of any length show the user the list (where, original, translation) before writing.
3. One batch: a `translation.set` per row, with the row's own `at` and `pointer`: `{ "at": { "page": "<pageId>" }, "locale": "en", "pointer": "/tree/nodes/<nodeId>/text", "value": "Our method" }`. A row of the header or footer has `at: { "component": "<key>" }`: `translation.set` takes it as it is, no `component.edit` needed. `null` clears a translation, so the field reads the main language again.
4. The page's own fields, in the same batch: its search title and description are rows too (`/head/title`, `/head/metaTitle`, `/head/description`); a social image of its own in that language is `/head/ogImage` with a media id; its name in the page list and menus is `page.rename` `{ "pageId", "title": "Method", "locale": "en" }`.
5. Read the rows again: `counts.missing` and `counts.stale` should be 0 for what you did.
6. Look at it in that language at desktop and phone width: `render_preview` `{ "pageId", "locale": "en", "device": "mobile" }`. A longer translation can break a line or a button.

The main language is never translated: change its words with `tree.set_text` (or `instance.setProp`, `page.setHead`). A heading in two languages is one batch: `tree.set_text`, then `translation.set` on the same node (the `apply_ops` example).

## Other places words live

| Words | Write with |
|---|---|
| Menu labels | `menuItem.update` `{ "label": { "it": "Progetti", "en": "Projects" } }` (the label whole, every language it keeps) |
| A picture's alt and caption | `media.setMeta` with one text per language, written whole |
| A collection item's values | `item.set` with a map by language on a `localized` field ([collections](collections-and-items.md)) |
| A form's label, field labels and messages | `form.update`, `formField.update`: one text, or one per language ([forms](forms.md)) |
| A member role's name | `memberRole.rename` with one text per language |

The site's name, tagline, company name and legal line (`settings.setGeneral`) are one text for every language.

## Its address in that language

`page.setSlug` `{ "pageId", "slugs": { "en": "our-method" } }`: lower-case words joined by `-`, no accents, made from the translated name; `null` removes one, so that language answers the main slug. Read the page's slugs in `pages` first and never overwrite one the user chose. A refusal `page.slug` or `route.taken` means a sibling or an item holds it: pick another, never rename the other page to make room.

## Add or drop a language

`site.setLocales` `{ "defaultLocale": "it", "locales": ["it", "en", "de"] }`, with the main language as it is now (a Designer's or an Administrator's). `fallbacks` names what a language reads before the main one when a text is missing (`{ "en-US": ["en"] }`). A language dropped while pages hold its translations keeps them and Checks reports them; ask before dropping one.

## Make another language the main one

The guide's recipe: the site must have the language (`site.setLocales`) and its texts (`translation.set`), then `site.setMainLocale` `{ "locale": "en" }`. **Dry-run it first** and tell the person what it answers: `missing` (how many texts would keep the old main language's words) and `places` (where). Its addresses lose their language prefix, the old main language's take one, and old addresses answer with a redirect. One undo takes it all back.

## Rules

- Never translate brand names, people's names or legal text without asking.
- Change only the language asked; the others stay as they are.
- A translation is made from the main language's words as they are now: translate after the main language's words are final, or the rows go stale.
