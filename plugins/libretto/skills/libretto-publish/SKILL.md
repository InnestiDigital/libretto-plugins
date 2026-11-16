---
name: libretto-publish
description: Publish a core Libretto site, make a saved version live or roll the site back to an earlier version, through the libretto MCP server - only on the human's explicit go. Use when the user asks to publish, put live, go online, pubblicare, or undo a publication, bring back an earlier page, or roll the site back.
---

# Publishing a Libretto site

Edits land in the draft. **Publishing** makes the draft live as the next version (v<N>), all or nothing: the live pages are cleared, the search index rebuilt and the version's screenshots taken. It is a door: alone in its batch, confirmed `["publish"]`, and no undo in History takes it back; the way back is an earlier version.

## The rule

Publish, make a version live or roll back only when the human says so in this conversation, for this change ("sì, pubblica", "go ahead and publish"). A request to edit is not a request to publish. If in doubt, ask. Never publish as a side effect of another task.

## Before asking for the go

1. List what this session changed, in the user's words: the page and what it did.
2. Read `glance`: what is live, the changes to publish (everyone's, not only yours) and the last step. A publish ships **all** of them: name to the user anything that is not yours.
3. Check the pages' status in `site_context` (or `pages`): a page marked `draft` stays off the live site even after publishing. If the user edited one and wants it online, `page.setStatus` `{ "pageId", "status": "published" }` marks it for the publish (an edit: it has its own batch and its own undo). A collection item goes live only with status `published` (`item.set`).
4. Look at what Checks finds before it goes live: `site-findings` (how many findings each page has), `findings/<pageId>?locale=<locale>` for the pages you changed. Tell the user about the ones that concern this change.
5. Dry-run the publish (below): it judges it with nothing stored. A `stale_revision` means the draft moved since you read it: read again and tell the user what else changed.
6. Ask: "Pubblico queste modifiche adesso?" and wait.

## Publish

On the go, a batch with `publication.publish` **alone**, `"confirmed": ["publish"]`, and as `baseRevisions` the revisions you read the draft at (your current map: `site_context.baseRevisions` with each write's `revisions` laid over it):

```json
{
  "requestId": "<fresh UUID>",
  "baseRevisions": { "...": "as you read the draft" },
  "confirmed": ["publish"],
  "message": "Pubblicata la nuova sezione Restauro",
  "operations": [{ "name": "publication.publish", "input": { "note": "Servizi: nuovo titolo della sezione Restauro" } }]
}
```

The answer's `version` names what went live (`id`, such as `v12`). Tell the user it is online, with the note and what changed in their words, and name the version as Publishing names it. A `stale_revision` means the draft moved after you read it: read again, tell the user what else changed, and ask again. **Never publish a second time to make sure**: the same `requestId` again answers the first publish; read `versions` instead.

A saved version can be made live too: `version.publish` `{ "version": "<name>" }`, forward only, confirmed `["publish"]`, on the go. `version.snapshot` `{ "name", "note" }` names the draft as it is now, as a version to publish later or come back to; it changes nothing on the site.

## Go back

First read `versions`: the saved versions and which one is live. `version-changes/<version>` says what making a version live would change; `version-pages/<version>` lists the pages a version holds and what bringing each back would do. Show the user the candidate (its name, date and note) before anything else.

Pick the smallest step that fixes it, and get the human's explicit go for each:

| What went wrong | Step |
|---|---|
| A change not published yet, made by you in this conversation | Its `undo` (`history.undo` `{ "step": "<entryId>" }`), alone, while it is the newest step. A person's step, or one with another step after it, the person takes back in History. |
| One page | Read `page-restore/<version>?page=<pageId>`: the page as that version held it, what changes and the `ops` that bring it back as one step (`page.revert`, or the ops that bring a deleted page back). Send those ops in one batch; the live site changes at the next publish, with the go. |
| One collection item | Read `item-history/<collectionId>?item=<itemId>`: its steps, each with the `item.revert` that brings it back as it left it. Send that op; publish later, with the go. |
| The whole live site | `version.rollback` `{ "version": "<name>" }`, alone, confirmed `["publish"]`: the version that was live before is live again; the draft keeps the edits made since. Dry-run it first. It is an Administrator's: another role's token is refused with who can. |

After publishing or rolling back, look at what went live: `render_preview` with `"target": "live"` on the pages the change touched (a crop of what changed, desktop and mobile; [preview and verify](../../reference/recipes/preview-and-verify.md)). Its `liveVersion` must be the version you just made live. Tell the user what you saw; do not ask them to check by hand. Never fetch the public site with Bash or `curl`. If the live capture is refused (`page_not_live`, `site_not_live`): with Chrome, `libretto-visual-check`; without it, give the user `urls.live` (or the page's address under it) and ask them once to look, naming what to check.
