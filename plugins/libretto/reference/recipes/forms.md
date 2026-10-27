# Forms

Use when the user wants a contact form, or a form's errors, required marks, consent sentence or send button changed.

Operations: [forms and members](../operations/forms-and-members.md), [pages and trees](../operations/pages-and-trees.md), [design system](../operations/design-system.md).

## Where each part lives

| Part | Where | Write with |
|---|---|---|
| Fields, their labels, help, placeholders, required | the form's definition | `form.create`, `form.update` `patch.fields` (the whole list) |
| A field's own messages | the field's `messages` | `form.update` `patch.fields` |
| The messages every field shares, the error summary, the required or optional marks | the form's `settings` | `form.update` `patch.settings` |
| The send button text, thank-you and error texts, the consent sentence | the `ds.form` node's props | `tree.commit` `set_props` |
| The send button's position, every colour and size | the design system | `designSystem.setComponentCell` |

A definition takes effect when it is saved, with no publish. The node's props go live with the page's publish.

`patch.settings` replaces the stored settings (all but `action`): read the form first (`form.read`) and send every setting back with your change, or the ones you leave out go back to their defaults.

## Error messages

Each text is a plain string or a locale map (`{ "it": "…", "en-US": "…" }`); an unset one keeps the built-in message of the visitor's language.

- On a field: `messages.required` (a required field left empty, only on a required field) and `messages.invalid` (any other broken rule: a malformed email, a pattern, a choice, a date, a length; never on a checkbox).
- On the form, for every field without its own: `settings.messages.required`, `invalid`, `email` (a malformed address; wins over `invalid`) and `consent` (the privacy consent not given).

The server checks the submit again and answers with the same messages in the page's language, so there is nothing to set twice.

```json
{ "name": "form.update", "input": { "formId": "…", "patch": { "fields": [
  { "key": "name", "type": "text", "label": "Nome", "required": true, "messages": { "required": { "it": "Manca il nome." } } },
  { "key": "email", "type": "email", "label": "Email", "required": true, "messages": { "required": { "it": "Manca l’indirizzo email." }, "invalid": { "it": "L’indirizzo email non sembra valido: per esempio nome@azienda.it." } } }
] } } }
```

## Error summary

With a `summary` in the settings: after a failed send the form lists the fields to fix at its top, each linked to its field, and moves the focus there. Without it, the focus goes to the first broken field.

- `title`: the line above the list; it must hold `{n}`, the count, in every language.
- `one`: the line when one field is broken (else `title` with `1`).
- `list`: `"labels"` (each line is the field's label, the default) or `"messages"` (each line is the error message, as a reference that lists "Manca il nome." does).

```json
"summary": { "title": { "it": "Il modulo ha {n} campi da sistemare:" }, "one": { "it": "Il modulo ha un campo da sistemare:" }, "list": "messages" }
```

## Required and optional marks

The `marker` setting: absent or `{ "kind": "asterisk" }` puts `*` after each required label. `{ "kind": "text", "required": …, "optional": … }` puts words instead, on the required fields, the optional ones or both (one of the two at least):

```json
"marker": { "kind": "text", "required": { "it": "(obbligatorio)" }, "optional": { "it": "(facoltativo)" } }
```

The words draw the `required-mark` part of the text input, textarea and select: style them there (`typography`, `foreground` cells), never on the node. Checkboxes carry no mark.

## Consent sentence with its link inside

The node's `consent` prop is rich text, so the privacy link sits in the sentence. Write it as a Tiptap document of one paragraph with a `link` mark on the link's words. The form draws only the inline marks (bold, italic, link, code, keys): a heading or a list gives its words, a second paragraph starts a new line. Links are checked like every rich text link: an unsafe one draws as plain text.

```json
{ "op": "set_props", "id": "<form node>", "patch": { "consent": { "it": { "type": "doc", "content": [{ "type": "paragraph", "content": [
  { "type": "text", "text": "Ho letto l’" },
  { "type": "text", "text": "informativa sulla privacy", "marks": [{ "type": "link", "attrs": { "href": "/privacy/" } }] },
  { "type": "text", "text": " e acconsento al trattamento dei miei dati per ricevere una risposta." }
] }] } } } }
```

When `consent` is set, the older `consentText`, `privacyLabel` and `privacyHref` are not drawn: do not fill both, or clear them with `set_props` (`null`) so the sentence does not appear twice in the inspector. The form asks for consent only when its `consent` setting is true.

## Send button position

The button sits at the end of its row by default. The position is the `align` cell of the form layout's `actions` part, `start`, `center` or `end`:

```json
{ "name": "designSystem.setComponentCell", "input": { "component": "form-layout", "cells": [{ "cell": "stacked.all.default.actions.base.align", "value": "start" }] } }
```

`stacked` is the form layout variant the form draws (its `form` part's cell, `default.all.default.form.base.variant`); read both on the `component/form` and `component/form-layout` resources first. A cell at another breakpoint (`md` instead of `base`) moves the button from that width up.

## Check

- `render_preview` the page, then submit nothing in the browser (the `libretto-visual-check` skill) to see the messages, the summary and the marks. Never send a real submit on a live site without the user: it emails the recipients.
- `form.sendTest` with `dryRun` shows the notification without sending it.
