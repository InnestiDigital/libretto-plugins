---
name: libretto-report-issue
description: Open a ticket for the Libretto platform owner through the libretto MCP server (report_issue) when Libretto blocks the job - a missing capability, a bug, a refusal that looks wrong, a docs gap, or anything that stops the person you work for. Use when an operation is missing, an answer contradicts the docs, the admin can do something MCP cannot, or the user says "segnala", "report this", "open a ticket".
---

# Reporting an issue to the Libretto team

Libretto's owner reads agent tickets in the admin (Segnalazioni). A good ticket gets a missing capability built or a bug fixed; a vague one gets closed. Tickets are not a way around a refusal: report, tell the user, and carry on with what you can do.

## When to open one

| Situation | `category` | Typical `severity` |
|---|---|---|
| The job needs something no operation, tool or resource does (the admin can, MCP cannot; or nobody can) | `missing-capability` | `high` if the job stops, else `medium` |
| An answer is wrong: a 500, a crash, a result that does not match the input, a preview that differs from the saved tree | `bug` | `high`; `blocking` when the user cannot go on |
| A refusal (403, 422) for something that looks right: the user's role should allow it, the input matches the schema, the admin accepts the same change | `refusal` | `medium` or `high` |
| `discover_operations`, a resource or these skills say one thing and the server does another; a step is missing from the docs | `docs` | `low` or `medium` |
| Anything else that blocks the person | `other` | as it affects them |

Do **not** open one for: your own malformed batch (fix it), a `409 stale_revision` (re-read and rebuild), a contrast-gate refusal of colours that really fail AA, a 401 (the token: tell the user), or something the user simply chose not to do. Never open the same ticket twice: `ticket.list` (or the resource `splash://site/<siteId>/tickets`) shows the ones you already filed on this site.

Ask the user before filing when the ticket would quote their content or their client's data; otherwise file it and tell them.

## What a good ticket holds

Write the `title`, `body`, `steps`, `expected` and `actual` in the user's language (Italian for an Italian studio): the platform owner and the user both read them in the admin. Operation names, error codes and ids stay as they are, inside backticks.


- `title`: one line, the operation and the symptom: "designSystem.setComponentCell refuses hover background on ds.card".
- `body` (Markdown): what you were doing and for whom (the job, not the conversation), what blocked you, what you did instead.
- `steps`: the minimal sequence that reproduces it, with operation names and inputs (ids are fine, secrets never).
- `expected` and `actual`: what should happen; the exact error `code`, `status` and `message` you got.
- `requestId` of the failing batch, `pageId` when the problem is on a page.
- `severity`: `blocking` only when the person cannot go on at all.

Never put a token, a password, or a whole tree or design-system dump in a ticket.

## How

Call the `report_issue` tool of the `libretto` server:

```json
{ "title": "No way to upload a font file over MCP", "category": "missing-capability", "severity": "high",
  "body": "Daniele (workspace owner of Superficial Studio) is moving Archiplan to the studio's licensed face *Sul Sans*. `font.importGoogle` covers only Google Fonts and `font.recordUpload` needs bytes staged by the admin, so the type step of his design update stops here.",
  "steps": "1. discover_operations { query: 'font' }\n2. no operation takes font bytes", "expected": "An operation that uploads a font file, like media.upload does for images",
  "actual": "Only font.importGoogle and font.recordUpload exist" }
```

The answer's `ticket` carries its `id` and `status` (`open`): tell the user in one sentence, in their words, what you reported ("Ho segnalato al team di Libretto che …"); give the ticket id only if they ask. A `429 ticket_rate_limited` means 20 tickets in an hour: stop and summarise the rest for the user. `422 ticket_page_unknown`: drop `pageId`.

The same is the operation `ticket.create` (alone in an `apply_ops` batch, `baseRevisions` `{}`, no dry run); `ticket.list` `{ status? }` reads your own tickets and their `closeNote` answers.

Every field and error: [tickets reference](../../reference/operations/tickets.md) and the `report_issue` entry in [MCP tools](../../reference/operations/mcp-tools.md).

If the server has no `report_issue` tool yet (an older Libretto: it is missing from the tool list), write the ticket out for the user in the shape above so they can send it to the Libretto team.
