---
name: libretto-publish
description: Publish a Libretto site, or roll it back to an earlier version, through the libretto MCP server - only on the human's explicit go. Use when the user asks to publish, put live, go online, pubblicare, or undo a publication or roll the site back.
---

# Publishing a Libretto site

Edits land in the draft. **Publishing** snapshots the draft (the pages whose status is `published`, their trees, menus, collections, design system, settings, fonts) into a new live version: the public site serves it at once. It cannot be dry-run and it cannot be undone with `history.undo`; the way back is an earlier version.

## The rule

Publish only when the human says so in this conversation, for this change ("sì, pubblica", "go ahead and publish"). A request to edit is not a request to publish. If in doubt, ask. Never publish as a side effect of another task.

## Before asking for the go

1. List what this session changed, in the user's words: the page and what it did (keep the `requestId`s to yourself).
2. Call `site_context` and check page `status`: a page in `draft` stays off the live site even after publishing; say so if the user edited one (`page.update` `{ pageId, patch: { "status": "published" } }` marks it for the publish, with the go). Collection items publish only when their status is `published` (`item.setStatus`).
3. Run `designSystem.lint` through `dry_run_ops` if the design system changed: `findingsBySeverity.error` must be 0; report the `worst` findings that concern this change.
4. Read `libretto://site/<siteId>/pending-changes` (`publication.pending`): what changed since the live version, by area (pages, design system, settings, menus, collections, fonts...), with the date of the latest edit and, for pages and collections, the changed rows. A publish ships **all** of it, other people's changes included: show the user anything that is not yours, and any changed page still in draft status (it stays out). Keep its `publishBaseRevisions`: they are the publish batch's base revisions.
5. Ask: "Publish these changes now?" and wait.

## Publish

A batch with `publication.publish` **alone**, as `baseRevisions` exactly the `publishBaseRevisions` that `pending-changes` answered (step 4 above: publish what you showed the user), and `"confirmed": ["publish"]`. An older Libretto without `publishBaseRevisions`: the `baseRevisions` of a fresh `site_context`, `history` included.

```json
{
  "format": "libretto.batch", "v": 1, "requestId": "<fresh UUID>",
  "baseRevisions": { "...": "pending-changes' publishBaseRevisions, unchanged" },
  "confirmed": ["publish"],
  "operations": [{ "name": "publication.publish", "input": { "note": "Servizi: new heading" } }]
}
```

Send it to `apply_ops` (not `dry_run_ops`, which refuses publication). If the user wants it done in the admin instead, `libretto-admin-browser` has the steps; the rule of the go is the same. The answer holds `version` (`id`, `shortId`, `status`, `isActive`) and `changedAreas`: the areas this publish changed against the version live before it (`["designSystem"]` for a design-system-only change; an empty list means nothing changed). Tell the user it is online, with the time, the note and what changed in their words ("il design system"), and name the version by its `shortId` (the 8 characters **Pubblicazione e versioni** shows); keep the full `id` for yourself (it is how you roll back). A `409 stale_revision` means the draft moved after you read the pending changes: read `pending-changes` again, tell the user what else changed, and ask again. A refusal for a missing base revision means the batch did not carry `publishBaseRevisions`: read `pending-changes` and use them. Never publish a second time to make sure: read `versions` instead.

## Roll back

First read `libretto://site/<siteId>/versions` (`publication.versions`): the published versions, newest first, each with its `id`, `shortId`, date (`timestamp`), note and `isActive` (the live one). Name versions to the user by `shortId`, date and note, as **Pubblicazione e versioni** shows them. For one page, `versions/<versionId>` (`publication.versionPages`) lists that version's pages with their id in the version and what a rollback of each would change in the draft. Show the user the candidate version (date and note) before anything else.

Pick the smallest tool that fixes it, and get the human's explicit go for each:

- **Not published yet**: `history.undo` `{ "requestId": "..." }` for the batch to take back (see `libretto-editing`).
- **One page went wrong**: `publication.rollbackPage` `{ "pageId", "versionId" }` restores that page of the draft to how the version held it, alone in a batch with `"confirmed": ["destructive"]` (add `tree:<pageId>` to `baseRevisions`). Then publish again, with the go.
- **The whole site**: `publication.activate` `{ "versionId" }` makes an earlier version live again, alone in a batch with `"confirmed": ["publish"]`. It needs `versions.activate`: a platform admin's token, or the token of the workspace owner (an editor who owns the site's workspace); a plain editor's token gets `403`.
- **One collection item**: `item.history` lists the published versions holding it; `item.rollback` `{ collectionId, itemId, versionId }` restores the draft item.

Version ids come from `publication.versions` (and a publish answer). The admin's Publish & versions page (`/admin/p/<programId>/s/<siteId>/publish`) shows the same versions with screenshots, without ids: there the workspace owner can also press **Make live** (Rendi attiva) themselves.

`publication.activate` replaces the draft too: every change not yet published is lost. Say so before asking for the go.

After publishing or rolling back, look at what went live yourself: `render_preview` with `"target": "live"` on the pages the change touched, a crop of what changed at desktop and at mobile ([preview and verify](../../reference/recipes/preview-and-verify.md), The live site). The answer's `liveVersion` must be the version you just made live. Tell the user what you saw; do not ask them to check by hand. Never fetch the public site with Bash or `curl`. If the live capture is refused (`live_capture_unavailable`) or the server is older and has no `target`: with Chrome, `libretto-visual-check`; without it, give the user the `publicSite` link from `site_context` and ask them once to look, naming exactly what to check.
