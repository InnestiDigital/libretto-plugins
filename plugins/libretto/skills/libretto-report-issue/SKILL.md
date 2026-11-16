---
name: libretto-report-issue
description: Open a ticket for the Libretto platform owner through the libretto MCP server (report_issue) when Libretto blocks the job - a missing op or door, a bug, a refusal that looks wrong, words that mislead, or anything that stops the person you work for. Use when an operation is missing, an answer contradicts its own description, the admin can do something MCP cannot, or the user says "segnala", "report this", "open a ticket".
---

# Reporting an issue to the Libretto team

The people who run Libretto read agent reports; the person you work for sees theirs in Account › Reports. A good report gets a missing capability built or a bug fixed; a vague one gets closed. A report is not a way around a refusal: report, tell the user, and carry on with what you can do.

## When to open one

| Situation | `category` | Typical `severity` |
|---|---|---|
| The job needs something no op, door or resource does (the admin can and MCP cannot, or nobody can) | `missing-capability` | `high` if the job stops, else `medium` |
| An answer is wrong: a 500, a result that does not match the input, a screenshot that differs from what the reads say | `bug` | `high`; `blocking` when the person cannot go on |
| A refusal for something that looks right: the role should allow it, the input matches the schema and the examples, the admin accepts the same change | `refusal` | `medium` or `high` |
| An op's description, a resource or these skills say one thing and the server does another; a read named in an op's words does not exist | `docs` | `low` or `medium` |
| Anything else that blocks the person | `other` | as it affects them |

Do **not** open one for: your own malformed batch (fix it), a `stale_revision` (read again and rebuild), a contrast refusal of colours that really fail AA, a 401 (the token: the `libretto-editing` skill, When Libretto does not connect), a refusal that says a person does it and where (`operation_forbidden` with a `place`: hand them the link), or something the user chose not to do. Never open the same report twice: read `reports` first (`libretto://site/<siteId>/reports`, `?status=open` for the open ones): your reports on this site, each with its status and the owner's answer.

A report cannot be amended. When you learn something new about one you filed, open a follow-up whose title says what it adds and whose body starts with the first report's id. That is not a duplicate.

Ask the user before filing when the report would quote their content or their client's data; otherwise file it and tell them.

## What a good report holds

Write `title`, `body`, `steps`, `expected` and `actual` in the user's language (Italian for an Italian studio): the platform owner and the user both read them.

- `title`: one line, the symptom as the person sees it, with the admin's names for places: "Non si può programmare una pubblicazione", "Il pulsante non accetta uno sfondo diverso al passaggio del mouse". No tool or op names, ids or codes in the title: they go in `steps` and `actual`, in backticks.
- `body` (Markdown): what you were doing and for whom, what blocked you, what you did instead.
- `steps`: the shortest sequence that reproduces it, with op names and inputs (ids are fine, secrets never).
- `expected` and `actual`: what should happen; the exact `code`, `status` and `message` you got.
- `requestId` of the failing batch, `pageId` when it happened on a page.
- `severity`: `blocking` only when the person cannot go on at all.

Never put a token, a password, a visitor's message or a whole page in a report.

## How

Call `report_issue`:

```json
{ "title": "Non si può programmare una pubblicazione", "category": "missing-capability", "severity": "medium",
  "body": "La persona voleva pubblicare la pagina di primavera lunedì alle 9. Ho cercato con `discover_operations` \"publish\": c'è solo `publication.publish`, che pubblica subito.",
  "steps": "1. `discover_operations` `{ \"query\": \"publish\" }`\n2. nessuna operazione accetta una data", "expected": "Una porta che pubblica a un'ora data",
  "actual": "Solo `publication.publish` e `version.publish`, che vanno online subito" }
```

Tell the user in one sentence, in their words, what you reported ("Ho segnalato al team di Libretto che …"); give the report's id only if they ask. At most 20 reports an hour per person: past that, stop and summarise the rest for the user. Read the answers later in `reports`.

Every argument: the `report_issue` entry of [tools and resources](../../reference/operations/tools-and-resources.md).
