# Changelog

## 0.5.1

### Brand

- The brand rules you put into Libretto reach Claude: before it writes copy, composes a brand canvas or picks colours, it reads the site's brand brief (the concept, the tone words, the do and don't rules, the logos, and the brand colours and fonts as the design system draws them) and follows it.

## 0.5.0

Everything new since 0.4.7.

### Pictures, drawings and fonts

- Icons, illustrations and charts drawn in the site's own colours: upload an SVG with `upload_media_file` (naming its text and accent colours when the file paints them), place it on an SVG drawing, and colour and size it with the design system's tokens.
- A picture with words in it (a chart, a poster, a drawing) can differ by language, and so can a page's or an article's share image and a node's ARIA label.
- Variable fonts upload at their weight range, so a text style can use any weight inside it; a variable face stored at one weight by an earlier version can be uploaded again to fix it.

### Pages, texts and articles

- Footnotes in a rich text: a raised number that links to its note, and a `↩` back-link that a screen reader announces in words.
- A page for addresses that do not exist (your own 404 page), per language if needed.
- Folders: pages under an address segment that has no page of its own (`/note/tema/libretto`).
- An article keeps its real date (a note written in March), on a draft or an already published article.
- Text styles that set how lines break (balanced headings, tidy paragraphs) across the whole site.
- Contact forms: their error messages per language, the error summary, the required marks, a consent sentence with the privacy link inside, and where the send button sits.
- The site's own email: send form notifications through the site's SMTP server, send a test email, and find the messages that were not emailed.

### Motion

- Scenes that draw a line, count up to a figure or decode a text, and two ready patterns: bars that grow in turn and a ratchet that turns one tooth per value.
- Scenes on the named parts of a drawing (a wheel, a chart's bars, an illustration drawn layer by layer) and on a stat's value.

### Checking and publishing

- Screenshots and reference comparisons show every animation at its end state, as the reference page is captured; ask for the first frame to see where a scene starts.
- Comparisons against a live reference page and one of its sections, without taking screenshots by hand.
- A busy screenshot queue is waited out instead of failing: Claude waits for its turn (a call may take a few minutes) and tries again once when the server asks it to.
- Before a publish, Claude names the pages that stay offline because a page above them is still a draft, and the menu links that lead to them.
