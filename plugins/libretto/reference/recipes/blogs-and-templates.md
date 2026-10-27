# Build a blog, articles or a page on a template

Use when the user wants a blog (a journal, a news list, a log), articles under it, or a page that renders through a page template. Every blog index and every article renders through a template, and the template draws parts of the page that the page's own tree cannot change. So read the templates before you build: they decide what you build in the page and what you leave to the template.

Operations: [blogs, articles and page templates](../operations/blogs-and-articles.md), [pages and trees](../operations/pages-and-trees.md).

## 1. Read the templates

`read_resources` `libretto://site/<siteId>/templates` (`template.index`, a few KB). Each template has:

- `id`: the `templateId` that `blog.create`, `article.create` and the `patch.templateId` of `blog.update` / `article.update` take.
- `appliesTo`: the page type it serves (`blog-index`, `article`, `static`).
- `label`: what it is for, in the site's language.
- `layout`: the layout frame it renders in (`layouts` resource).
- `source`: `theme`, or `site` once the site forked it (`forkPageId`).
- `pages`: how many pages use it.
- `parts`, in page order:
  - `role: "outlet"` is where the page's own tree goes.
  - `role: "locked"` is drawn by the template on every page that uses it. `binds` lists the bind paths it shows (`$bind page.title` is the page's title, `$bind item.featuredImageId` each listed article's image), `feed` the list it repeats (`{ "kind": "articles", "blog": "self", "limit": 12 }`), and `components` the props the template sets (`article-list showViewToggle=true`).

The answer's `configure` says how to change each kind of part. For one template's whole structure, read `template/<templateId>`: its outline, one line per node.

Never guess a `templateId`. A wrong one is refused, and the refusal lists the valid ones; read `templates` instead.

## 2. Pick the template with the user

Match the brief against the locked parts, not the label alone:

- A text-only log needs a blog template whose feed draws no image. A feed that binds each article's featured image draws an image box on every card, even for an article without one. An `article-list` set to `defaultView=list` shows a list first; read `catalog/article-list` for what else its props change.
- A brief that fixes the article header's order needs an article template whose header part has that order.
- A brief with its own "related" list conflicts with a template that locks a related feed: the page would show both.

Tell the user what the template will draw by itself (the title header, the article list, the related list, the Grid/List toggle) before you build. When none fits, say which part is in the way and choose the closest. Changing a template changes every page of it (step 4).

## 3. Create, then fill the outlet

```json
{ "name": "blog.create", "input": { "title": "Log", "templateId": "<id from templates>", "locale": "it" } }
```

The answer's `id` is the page. Its tree fills the outlet: add sections with `tree.commit` or `preset.insert` ([sections from presets](sections-from-presets.md)). Do not rebuild in the outlet what a locked part already draws (the title, the article list). Articles go under the blog with `article.create` `{ blogId, title, templateId }`.

The locked parts' fields come from the page row, not the tree:

- The page's `title`, `featuredImageId`, `authorName` and `excerpt`: `blog.update` / `article.update` `{ id, patch }`.
- The page's `publishedAt`: `article.publish`, which sets the first publication date.
- An `item.*` path in a feed: the same fields of each listed article.

Search engines read every article as a schema.org `BlogPosting` (`headline`, `datePublished`, `dateModified`, `image` from its share or featured image, `author` a Person by its `authorName`, else the site's Organization, `publisher` the Organization). Set `authorName` so the article is signed. A note or a post built as a plain page (no blog) gets the same with `page.update` `{ "patch": { "meta": { ...its meta, "seo": { "subject": { "type": "BlogPosting" } } } } }` (read the page's `meta` first: `patch.meta` replaces it). The Organization's legal name, VAT number, address, profiles elsewhere and logo are site settings (`settings.update`: `organizationLegalName`, `organizationVatId`, `organizationStreetAddress`, `organizationPostalCode`, `organizationLocality`, `organizationRegion`, `organizationCountry`, `organizationSameAs` one https address a line, `organizationLogo` a media id).

## 4. Change a locked part (every page of the template)

Only when the user agrees that every page of that template changes:

1. `page.forkTemplate` `{ "templateId": "<id>" }`, once per template. The answer is the fork's page; its tree is the template's, with the same node ids, and every page of the template renders through it from then on. `templates` now answers `source: "site"` with its `forkPageId`.
2. `tree.commit` on the fork's page id. Use `set_props` on a component node (read its props with `catalog/<type>`, for example `catalog/article-list`), `set_style`, or `insert` / `remove`. The outlet must stay.

One page cannot drop or change a locked part on its own. If one page needs different parts, give it another template (`patch.templateId`). If no template fits and a fork would harm the other pages, open a ticket ([report an issue](../../skills/libretto-report-issue/SKILL.md)) and name the part.

## 5. Look at it

Check the blog and one article at desktop and phone width ([preview and verify](preview-and-verify.md)). Check the locked parts too: the card images, the toggle labels, the title length on phone.
