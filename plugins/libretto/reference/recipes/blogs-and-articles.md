# Blogs and articles

Use when the user wants a new article, a journal or news entry, or to change how an article shows on its blog's list.

Ops: [pages](../operations/pages.md) (`page.duplicate`, `page.setArticle`, `page.setHead`, `page.setStatus`), [parts and styles](../operations/parts-and-styles.md), [translations](../operations/translations.md).

## How a blog is made on a core site

A blog is a page, and its articles are pages under it. Each article page has its own tree (its words and pictures) and a listing: what the blog's list shows of it (its excerpt per language, its picture, its author), set with `page.setArticle`. The blog page lists the article pages under it. There are no page templates to pick: an article looks like the articles beside it because it starts as a copy of one.

Read `pages` (every page with its address, parent, layout and status) to find the blog page and its articles, and `page/<pageId>` of an article to see its parts.

## Write a new article

As Pages › New article does it (the server's guide has the recipe), in this order, one batch each:

1. **A hidden copy of the blog's last article.** In `pages` the blog is the page of kind `blog-index` and its articles the pages of kind `article` under it; take the one with the highest `position`. One batch: `page.duplicate` `{ "pageId": "<fresh UUID>", "from": "<that article's pageId>", "slug": "via-giulia-secondo-lotto", "title": "Via Giulia, secondo lotto", "position": <the highest position among them + 1>, "status": "draft" }`, then `page.setArticle` `{ "pageId": "<the copy>", "excerpt": { "it": null }, "featuredImageId": null, "authorName": null, "authorUserId": null }` with only the fields the source has, so the copy does not show the old article's listing. It stays `draft` until the person says it is ready.
2. **Its listing**: `page.setArticle` `{ "pageId": "<the copy>", "excerpt": { "it": "..." }, "featuredImageId": "<mediaId>", "authorName": "Archiplan" }`. A field left out is kept; null clears it. The picture comes from the media library ([images](images.md)).
3. **Its words and pictures**: read `texts/<pageId>` of the copy, then `tree.set_text` on each text and `tree.set_props` on each picture (`src` and `alt`); remove the parts it does not need with `tree.remove`, and add parts with `tree.insert` or `tree.duplicate`.
4. **Its head**: `page.setHead` `{ "pageId", "head": { "metaTitle", "description", "ogImage", "subject": { "type": "Article" } } }`: what search engines and link previews read.
5. **Other languages**: `translation.set` for each text (pointer `/tree/nodes/<nodeId>/text`), for the head (`/head/description`), and `page.setSlug` with `slugs` for its address; `page.rename` with `locale` for its name.
6. **Online**: `page.setStatus` `{ "pageId", "status": "published" }` when the person says it is ready; it goes live with the next publish, on their go (`libretto-publish`).

## A new blog

A new blog page with its list is built by a person in Pages (`urls.places["pages"]`), or copied from an existing blog page with `page.duplicate`. `page.add` makes a plain page, not a blog: say so, and offer the copy.

## Footnotes and links inside an article

A text's words with marks go in `runs` of `tree.set_text`: `{ "t": "Scrivici", "m": [{ "a": { "href": "/contatti" } }] }`, `{ "br": true }`, `{ "t": "Dal 1998", "m": ["strong"] }`. A link to a heading of the page needs an anchor on it: `tree.derive_anchors` gives each heading under a part one made from its words; `tree.set_props` `anchor` sets one by hand.

## Check

`render_preview` of the blog page (the new card in its list) and of the article, desktop and mobile; `findings/<pageId>` of the article (a picture without words, a link that says nothing, the main heading).
