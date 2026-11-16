# Members and private pages

Use when the user wants a page or a part only for signed-in members, a reserved area for clients, member roles, or to invite, change or remove a member.

Ops: [forms, members and mail](../operations/forms-members-and-mail.md) (`memberRole.*`, `member.*`), [pages](../operations/pages.md) (`page.setAccess`), [parts and styles](../operations/parts-and-styles.md) (`tree.set_audience`).

**Members** are the people who sign in to the site's pages (clients, students, partners). They are not the people of the admin: adding a person to the admin, changing their role or making an agent token is a person's, in Account › People and access and Account › Agents.

## Read

- `member-roles`: the site's member roles and the pages each opens.
- `member.list` `{ "status": "active", "limit": 50 }` (a door, alone in its batch): the members, newest first, with their status and roles; `query` finds one by name or email.

## Roles

`memberRole.create` `{ "key": "clienti", "label": { "it": "Clienti", "en": "Clients" } }` (a Designer's or an Administrator's): the key is lower-case letters, digits and dashes; pages, parts and members name the role by it. `memberRole.rename` changes only the label. `memberRole.delete` is refused while a page or a part still names it (`memberRole.inUse` lists them).

**Changing a role's key** is the guide's recipe: `memberRole.create` with the new key and the old label; for each member who holds the old role, `member.setRoles` with the new key in place of the old, each alone in its batch; then one batch: `page.setAccess` on each page that names it (`member-roles` lists them), `tree.set_audience` on each part (inside `component.edit` for the header, the footer or a layout), and `memberRole.delete` of the old key.

## A private page

`page.setAccess` `{ "pageId", "requireAuth": true, "requiredRoles": ["clienti"] }` (a Designer's or an Administrator's): only members holding one of those roles open it; no roles, every signed-in member. A role must exist first (`memberRole.unknown`). `password` sets a page password in plain words (the server stores its hash; `null` removes it). `"requireAuth": false, "requiredRoles": []` opens the page to everyone again.

## A part for members only, or for guests only

`tree.set_audience` `{ "at", "node", "audience": { "who": "members", "roles": ["clienti"] } }`: a "Reserved area" link only members see, a sign-up box only guests see (`{ "who": "guests" }`), `null` for every visitor again. A part of the header or footer goes inside `component.edit` of its definition.

## Look at it

`render_preview` `{ "pageId", "as": "guest" }` (a private page shows its sign-in), `"as": "member"`, `"as": "role:clienti"`. The live site shows what a guest sees.

## Members

Each is a door, alone in its batch, a Content author's, a Designer's or an Administrator's; none can be undone, so say what you will do and wait for the yes:

| Goal | Door |
|---|---|
| Invite someone | `member.invite` `{ "email", "name", "roles": ["clienti"], "locale": "it" }`, only at an address the person gave you: the email goes at once, so it cannot be dry-run; 60 emails an hour per token |
| Change a member's roles | `member.setRoles` `{ "memberId", "roles": [...] }` (the roles whole) |
| Disable or enable one | `member.setStatus` `{ "memberId", "status": "disabled" }`: disabling signs them out everywhere |
| Delete one | `member.delete` `{ "memberId" }` with `"confirmed": ["destructive"]` |
| Sign every member out | `member.signOutAll` `{}` with `"confirmed": ["destructive"]`, an Administrator's |

An invitation is an email: it goes through the site's own email ([site email](site-email.md)). When `mail.read` answers `sending: false`, the invitation is not delivered; tell the person before inviting.

A form that files an access request when a visitor fills it in is `form.setAction` ([forms](forms.md)); a person approves the request in Account › Access requests.
