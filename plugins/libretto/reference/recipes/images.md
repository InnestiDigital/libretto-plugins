# Images

Use when the user gives you a picture to put on the site, wants an image replaced, or asks for alt text.

Operations: [media and fonts](../operations/media-and-fonts.md), [pages and trees](../operations/pages-and-trees.md).

## 1. Get the image into the media library

**A file on this computer** (the usual case): call `upload_media_file` of the plugin's `libretto-files` server with its path. It reads the file and sends `media.upload` for you, so the bytes never pass through the conversation.

```json
{ "path": "/Users/daniele/Desktop/archiplan/cortile.jpg", "dryRun": true }
```

Dry run first, then again without `dryRun`. The answer's `answer` holds the media record (`id`, `url`, kind, width, height) and `requestId` (undo with `history.undo`). Images are capped at 5 MB: shrink a larger one first (macOS: `sips -Z 2400 in.jpg --out in-2400.jpg`; keep JPEG for photos, PNG or SVG for flat graphics).

**Without the `libretto-files` server** (Node missing): `media.upload` in an `apply_ops` batch takes the file as base64 in `data` (`{ filename, contentType, data, folderId }`, `baseRevisions` with `media`). That puts every byte in the conversation: only for small files (an icon, a logo under ~50 KB). For a photo, ask the user to upload it in the admin (Media) and give you the file name.

**Already in the library**: `media.list` `{ "search": "cortile", "kinds": ["image"] }` (read-only) finds it by file name.

## 2. Describe it

`media.update` `{ mediaId, alt: { "it": "...", "en": "..." }, caption?, credit? }`. Alt text says what the picture shows for someone who cannot see it, in each site language; ask the user when the content is not obvious. A purely decorative image gets an empty alt only when the user agrees.

## 3. Place it

- On an image node: `set_props` `{ id, patch: { "src": { "$media": "<media id>" } } }` in a `tree.commit`. Find the node in the outline (`kind:type` such as `primitive:image`); the prop names come from `catalog/<type>` for that type (some types name it `media` or `image`, and carry their own alt prop).
- A new image: `insert` an image node of a type listed in the catalogue, with `props.src` `{ "$media": "<id>" }` and a fresh 8-character id.
- In a collection item: the media field takes the media id ([collections](collections-and-items.md)).
- As a page's featured or social image: `page.update` with the field `page.read` shows.
- Replacing a file everywhere it is used: `media.usage` `{ mediaId }` lists the pages, articles, tokens and settings that use it; `media.replace` swaps the bytes of a row staged by the admin's upload, which MCP cannot stage. To swap from here, upload the new file and re-point each use.

## 4. Check

Look at the page at desktop and phone width ([preview and visual check](preview-and-verify.md)): crop, focus and size come from the node's styles and the variant, not from the file.

## Folders

`media.createFolder`, `media.renameFolder`, `media.deleteFolder`, `media.move`; `upload_media_file` takes a `folderId`.
