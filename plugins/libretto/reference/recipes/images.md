# Pictures, videos and documents

Use when the user wants a photo placed or swapped, its alt text written, a file uploaded, a folder of photos brought in, or a file in use replaced.

Ops: [media](../operations/media.md) (the `media.uploadFile` door, `media.setMeta`, `media.move`, `mediaFolder.*`), [parts and styles](../operations/parts-and-styles.md) (`tree.set_props`).

## Upload from this computer

The plugin's `libretto-files` server reads the file and sends it through the `media.uploadFile` door, so its bytes never enter the conversation:

- **One file**: `upload_media_file` `{ "path": "~/Immagini/facciata.jpg", "alt": "La facciata restaurata di via San Quintino" }` (`folderId`, `caption`, `credit` too). `dryRun: true` makes every check and stores nothing.
- **A folder**: `upload_media_files` `{ "directory": "~/Immagini/cantiere", "pattern": "*.{jpg,png}", "dryRun": true }`, then without `dryRun`. At most 50 files a call: call again for the rest; files already in the library (same name and size) are skipped. A reference that ships each picture in several widths: give only the largest; Libretto renders its own sizes.
- **Into a folder**: read `media` for the folders' ids, or make one first with `mediaFolder.create` `{ "id": "<fresh UUID>", "name": "Cantieri", "parentId": null }`.

The answer holds the file's media `id`, its step (`entryId`) and the `undo` that takes it back.

What the door takes: JPEG, PNG, GIF, WebP, SVG, MP4, WebM or PDF, at most 20 MB in one call; Libretto checks the file as Admin › Media does (type, size, content, the site's space) and says why when it refuses. The doors take 60 uploads a minute per token. A file over 20 MB (`upload_too_large`) or a ZIP archive (`upload_archive`) is a person's: they upload it in Admin › Media (`urls.places["media"]`), where a ZIP becomes a folder; then read `media` and place it by its name. The library's space: `media-space`.

Without the plugin's files server (it failed to start), the same door takes the file as base64 in `data` inside `apply_ops`; never write a large file's base64 into the conversation. Ask the person to upload it in Admin › Media instead.

## Place a picture

1. The part: `page/<pageId>`, then `node/<pageId>?node=<nodeId>` (a picture part, `kind: "image"`).
2. One batch: `tree.set_props` `{ "at": { "page": "<pageId>" }, "node": "<pictureId>", "props": { "src": { "$media": "<mediaId>" } } }`.
3. Its words: every place that shows a file reads the file's own alt text, set with `media.setMeta` `{ "id": "<mediaId>", "alt": { "it": "...", "en": "..." } }`. A part that holds its own `alt` prop shows that one instead: write it there with `tree.set_props`, or clear it (`"alt": null`) in the same batch as the `media.setMeta` so the file's words show.

A picture in a component instance (a card, a hero) is one of its props: `instance.setProp` `{ "node": "<instance>", "prop": "<its picture prop>", "value": { "$media": "<mediaId>" } }`. A picture of a collection's item is its field (`item.set`). A gallery's slides are items of its slot ([sections from presets](sections-from-presets.md), Lists).

## Alt text that says something

Say what the picture shows for someone who cannot see it, in the page's language, in a sentence; for a decorative picture, an empty alt. Never "image", the file name, or "foto di". `findings/<pageId>` names the pictures with no words.

## Replace a file that is in use

`upload_media_file` with `"replaces": "<mediaId>"`: the new file becomes that entry's file, of the same kind (a picture for a picture); its words and folder stay, and every page, component and item that shows it follows. Never remove a file that is in use: `media.remove` is refused (`media.inUse`, naming the places), and `media-uses/<mediaId>` lists them.

## Tidy the library

`media.setMeta` (alt, caption, credit, name, focal point), `media.move` `{ "mediaIds", "folderId" }`, `mediaFolder.rename`, `mediaFolder.move`, `mediaFolder.delete` (an empty folder only).

## Icons, logos, the site's icon

The site's icon and the logo search engines show are settings: upload the file, then `settings.setGeneral` `{ "general": { "favicon": "<mediaId>" } }`. An SVG that should take the text colour of the part drawing it: `upload_media_file` with `svgTextColor` (and `svgAccentColor` for its one accent element).

## Check

`render_preview` with `crop` on the part, desktop and mobile; `findings/<pageId>`.
