# Changelog

## 0.5.6

### Brand

- Claude can light a dot grid from a picture in one step, the way the editor's "Light the dots from a picture" does: the dots around the figures of the photo, with the size of the area and how much of it must hold drawing as settings. The guide says what it can and cannot tell apart (a figure from a line of the plan) and how to fix the rest.

## 0.5.5

### Brand

- Blends and transparency print the way a print designer flattens them: a grid of dots in multiply over a photo, a picture with transparent pixels or a faded layer is flattened with what lies under it into a 300 ppi CMYK area, over a flat colour it stays vector in the computed colour, and everything above stays sharp. Claude tells you what was flattened.
- Claude sees the print file before it goes to the printer: the page of the PDF, bleed and crop marks included.
- A canvas can let the studio change a layer's blend and opacity.

## 0.5.4

### Brand

- Claude now sees the canvas it draws. A draft render (and a render of an approved canvas) arrives as a picture it can look at, not as a block of text, so it can judge the layout before it approves or prints.
- Claude can compare a canvas with the reference you give it (a file in the media library, an image link or a web page): it gets the reference, its render and the places they differ side by side, and fixes the biggest differences first.
- Claude can make a dot grid follow a picture (so the dots stay on the photo when it moves or is cropped for another format), and the guide explains how, with an example.
- Printing a canvas asks only for the media library's revision, as the guide always said.

## 0.5.3

### Brand

- A new guide for posters, flyers and social graphics: formats in millimetres or pixels, bleed, margins and safe zones, the print colours, the fonts a print file needs, and how to read what the print refuses.
- Claude can light chosen dots of a dot-grid layer from their positions (single dots or whole rows) instead of failing to write the pattern; the change is one step and can be undone.

### Fonts

- Font files can be TTF, OTF or WOFF as well as WOFF2: Libretto converts them to WOFF2 when it stores them, so Claude no longer asks you to convert a file first.
- A Google font imported without a `display` setting now uses `swap` (the text shows at once and changes when the font has loaded).

## 0.5.2

### Brand

- Claude can finish a brand canvas on its own: it looks at the canvas as it stands, approves it when you say so, and makes the print PDF (PDF/X-3, FOGRA39, with bleed and crop marks), which lands in the media library. If the canvas holds something a print file cannot (a colour without its CMYK, a shadow, a transparency), it tells you what and where.

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
