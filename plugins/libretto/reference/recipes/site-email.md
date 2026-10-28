# Site email

Use when the user wants a site's forms or members to send email, asks why a message was not emailed, or gives you their SMTP server.

Operations: [site email](../operations/mail.md), [forms and members](../operations/forms-and-members.md).

## What goes through it

A site's own email follows its mail setting: each form's notification (and `form.sendTest`), and the emails to the site's members (sign-up link, password reset, invitation). Email to the people of the admin always goes through the platform; it is not the site's to set.

## Read it first

`mail.read` answers the `mode`, `platformAllowed`, `sending` and the stored server (`smtp`, with `hasPassword` instead of the password).

| `mode` | What happens |
|---|---|
| `platform` | the platform's server. Only when `platformAllowed`: the platform admin allows it per workspace; you cannot. |
| `smtp` | the site's own SMTP server |
| `none` | nothing leaves. Every form message is still stored, marked `notification: { status: "failed", error: "mail_not_configured" }`, and the admin's inbox says "Notification failed: email not configured". Members get no email. |

`sending: false` means no email goes out now. Saving a form that has recipients on such a site answers a warning finding about the form, its rule `mail_not_configured`: tell the user; the form saved.

## Set the site's own server

Ask the user for the server's host, port, security, user, password and the sender address their provider allows. Never guess them, never write a password you were not given, and never repeat a password back.

```json
{ "name": "mail.update", "input": { "mode": "smtp", "smtp": {
  "host": "smtp.example.com", "port": 587, "security": "starttls",
  "user": "studio@example.com", "password": "<the user's app password>",
  "fromAddress": "studio@example.com", "fromName": "Studio"
} } }
```

- Run it alone in a batch, with the `mail` base revision (from `site_context`). It is not undoable: to go back, send the previous settings again.
- `port` is 25, 465, 587 or 2525; `security` is `tls` for 465, `starttls` for the others.
- The password is write-only: leave it out or send `""` to keep the stored one, `null` to remove it. No answer ever shows it, and the batch's history and audit log are redacted.
- The host must be public: a local, private, link-local or unique-local address is refused (422 `mail_host_refused`), also when a name resolves to one.
- `mode: "platform"` without `platformAllowed` is 403 `mail_platform_not_allowed`. `mode: "none"` keeps the stored server for later.

## Check it

`mail.test { "to": "<an address the user reads>" }` sends a short email through the saved settings. Run it alone in a batch. A failure tells what to fix:

| Code | Fix |
|---|---|
| `mail_not_configured` (409) | the mode is `none`, or `platform` without permission: set a server |
| `mail_auth_failed` | user or password |
| `mail_connection_failed` | host or port |
| `mail_tls_failed` | `security`: `tls` for 465, `starttls` for the others |
| `mail_refused` | the server refused the message: usually the sender address |
| `mail_host_refused` (422) | a local or private host: use the provider's public host name |
| `mail_secrets_unavailable` (503) | the platform cannot read the stored password: ask the user to send it again |

Never send a test to an address the user did not give you.

## Messages that were not emailed

`submission.list` answers each submission's `notification`: `sent`, `failed` with its code, or null when the form had no recipients. Fixing the mail does not re-send the old ones: tell the user which messages were not emailed, so they read them in the inbox.
