# Images

Use when the user gives you a picture to put on the site, wants an image replaced, or asks for alt text.

Operations: [media and fonts](../operations/media-and-fonts.md), [pages and trees](../operations/pages-and-trees.md).

## 1. Get the image into the media library

**A file on this computer** (the usual case): call `upload_media_file` of the plugin's `libretto-files` server with its path. It reads the file and sends `media.upload` for you, so the bytes never pass through the conversation.

```json
{ "path": "~/Immagini/foto.jpg", "dryRun": true }
```

Dry run first, then again without `dryRun`. The answer's `answer` holds the media record (`id`, `url`, kind, width, height) and `requestId` (undo with `history.undo`). Images are capped at 5 MB: shrink a larger one first (macOS: `sips -Z 2400 in.jpg --out in-2400.jpg`; keep JPEG for photos, PNG or SVG for flat graphics).

**Many files** (a folder of photos, a reference's images): `upload_media_files` in one call per 100 files, never one call per photo.

```json
{ "directory": "~/Immagini/sito", "pattern": "*.{jpg,png,webp}", "dryRun": true }
```

Or `{ "paths": [ ... ] }` for a chosen list. The dry run checks every file, the library and its quota, and sends one file to the server; then call again without `dryRun`. A file whose name and size match one in the library is skipped (its id is in `skipped`), so after an interruption the same call uploads only what is missing; more than 100 files: call again with the rest. The answer maps each uploaded file to its media id (`uploaded`) and each refused one to the reason (`refused`): shrink the ones over 5 MB and send them again, tell the user about the rest. When the same picture comes in several widths (`foto-480.jpg`, `foto-1200.jpg`, `foto-2400.jpg`), upload only the largest: Libretto renders its own sizes from it. Then write the alt texts (step 2) for the ones you place, not for all.

**Without the `libretto-files` server** (Node not found: see `libretto-editing`, When Libretto does not connect): `media.upload` in an `apply_ops` batch takes the file as base64 in `data` (`{ filename, contentType, data, folderId }`, `baseRevisions` with `media`). That puts every byte in the conversation: only for small files (an icon, a logo under ~50 KB). For a photo, ask the user to upload it in the admin (Media) and give you the file name.

**Already in the library**: `media.list` `{ "search": "foto", "kinds": ["image"] }` (read-only) finds it by file name.

## 2. Describe it

Look at the picture once (`Read` the file) to write its alt text; do not read it again.


`media.update` `{ mediaId, alt: { "it": "...", "en": "..." }, caption?, credit? }`. Alt text says what the picture shows for someone who cannot see it, in each site language; ask the user when the content is not obvious. A purely decorative image gets an empty alt only when the user agrees.

## 3. Place it

- On an image node: `set_props` `{ id, patch: { "src": { "$media": "<media id>" } } }` in a `tree.commit`. Find the node in the outline (`kind:type` such as `primitive:image`); the prop names come from `catalog/<type>` for that type (some types name it `media` or `image`, and carry their own alt prop).
- A new image: `insert` an image node of a type listed in the catalogue, with `props.src` `{ "$media": "<id>" }` and a fresh 8-character id.
- In a collection item: the media field takes the media id ([collections](collections-and-items.md)).
- As a page's featured or social image: `page.update` with the field `page.read` shows (`ogImageId`; `ogImages` for another language's own share image).
- A picture with words in it, one per language (a chart, a poster, an SVG drawing): `src` (or an svg node's `media`) as a locale map of pictures, the default language's required ([translations](translations.md), Where texts live).
- Replacing a file everywhere it is used: `media.usage` `{ mediaId }` lists the pages, articles, tokens and settings that use it; `media.replace` swaps the bytes of a row staged by the admin's upload, which MCP cannot stage. To swap from here, upload the new file and re-point each use.

## Icons, illustrations and charts in the site's colours (SVG)

An SVG on an image node is a picture: the site's colours never reach it. To draw it in the page with the site's tokens, place it on an `svg` node (the **SVG drawing** primitive).

1. **Prepare the file.** Lines and fills that follow the text colour use `currentColor`. Mark the one element in the second colour `data-role="accent"`, or name its colour at upload. Keep it to geometry and presentation attributes or plain class rules (`.a { stroke: … }`): no filters, embedded pictures, links or animations; at most 96 KB and 1,500 elements.
2. **Upload it.** `upload_media_file` with its path; if the file paints its text colour or accent with a literal colour, name them: `{ "path": "~/glifi/cricchetto.svg", "svgTextColor": "#f5f4ee", "svgAccentColor": "#3ccb7f" }`. The answer's `inline` is `ready` (with `elements`, whether it has an `accent` part, and the `colors` left as drawn, which no token reaches) or `refused` with the reason (`svg_inline_too_large`, `svg_inline_too_many_elements`, `svg_inline_unsupported`, `svg_inline_styled`, `svg_inline_no_viewbox`): fix the file and upload it again. `media.read` `{ mediaId }` answers the same later.
3. **Place it.** `insert` `{ "kind": "primitive", "type": "svg", "props": { "media": { "$media": "<id>" }, "label": { "it": "…", "en": "…" } } }`; `decorative: true` (no label) for one that only decorates text that says the same. An svg node whose media is not a ready SVG is refused at the node (`media_invalid`, with the reason).
4. **Colour and size it with tokens** in the node's styles: `color` (the `currentColor` lines), `color` under `p:accent` (the accent part), `width` and `height` (an icon is `icon.size.inline` square by default; an illustration fills its container's width).

## 4. Check

Look at the page at desktop and phone width ([preview and visual check](preview-and-verify.md)): crop, focus and size come from the node's styles and the variant, not from the file.

## Folders

`media.createFolder`, `media.renameFolder`, `media.deleteFolder`, `media.move`; `upload_media_file` and `upload_media_files` take a `folderId`.
