---
name: libretto-publish
description: Publish a Libretto site, or roll it back to an earlier version, through the libretto MCP server - only on the human's explicit go. Use when the user asks to publish, put live, go online, pubblicare, or undo a publication or roll the site back.
---

# Publishing a Libretto site

Edits land in the draft. **Publishing** snapshots the draft (the pages whose status is `published`, their trees, menus, collections, design system, settings, fonts) into a new live version: the public site serves it at once. It cannot be dry-run and it cannot be undone with `history.undo`; the way back is an earlier version.

## The rule

Publish only when the human says so in this conversation, for this change ("sì, pubblica", "go ahead and publish"). A request to edit is not a request to publish. If in doubt, ask. Never publish as a side effect of another task.

## Before asking for the go

1. List what this session changed: each applied `requestId`, the page and what it did.
2. Call `site_context` and check page `status`: a page in `draft` stays off the live site even after publishing; say so if the user edited one (`page.update` `{ pageId, patch: { "status": "published" } }` marks it for the publish, with the go). Collection items publish only when their status is `published` (`item.setStatus`).
3. Run `designSystem.lint` through `dry_run_ops` if the design system changed, and report errors.
4. Remind the user that the admin shows every pending change, including other people's, on the site's publishing page (Publishing & versions); the MCP server has no read of pending changes, so you only know your own.
5. Ask: "Publish these changes now?" and wait.

## Publish

A batch with `publication.publish` **alone**, the `baseRevisions` of a fresh `site_context` (with `history`), and `"confirmed": ["publish"]`:

```json
{
  "format": "splash.batch", "v": 1, "requestId": "<fresh UUID>",
  "baseRevisions": { "...": "fresh site_context.baseRevisions" },
  "confirmed": ["publish"],
  "operations": [{ "name": "publication.publish", "input": { "note": "Servizi: new heading" } }]
}
```

Send it to `apply_ops` (not `dry_run_ops`, which refuses publication). The answer holds `version` (`id`, `status`, `isActive`). Report the version id and the note. A `409 stale_revision` means the draft moved: read `site_context` again, tell the user what else changed, and ask again.

## Roll back

Pick the smallest tool that fixes it, and get the human's explicit go for each:

- **Not published yet**: `history.undo` `{ "requestId": "..." }` for the batch to take back (see `libretto-editing`).
- **One page went wrong**: `publication.rollbackPage` `{ "pageId", "versionId" }` restores that page of the draft to how the version held it, alone in a batch with `"confirmed": ["destructive"]` (add `tree:<pageId>` to `baseRevisions`). Then publish again, with the go.
- **The whole site**: `publication.activate` `{ "versionId" }` makes an earlier version live again, alone in a batch with `"confirmed": ["publish"]`. It needs `versions.activate`: a platform admin's token, or the token of the workspace owner (an editor who owns the site's workspace); a plain editor's token gets `403`.
- **One collection item**: `item.history` lists the published versions holding it; `item.rollback` `{ collectionId, itemId, versionId }` restores the draft item.

Version ids come from a publish answer (keep it and give it to the user), or from `item.history` on a collection item, which lists every published version holding the item with its id. The admin's Publish & versions page (`/admin/p/<programId>/s/<siteId>/publish`) lists the versions with their dates and screenshots but shows no ids: there the workspace owner can press **Make live** (Rendi attiva) on a version themselves. The MCP server cannot list versions.

`publication.activate` replaces the draft too: every change not yet published is lost. Say so before asking for the go.

After publishing, look at the public page (the site's domain, signed out) to confirm the version is live.
