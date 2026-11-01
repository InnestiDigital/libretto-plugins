# Motion: scenes and reveals

Use when the user wants things to move: content that appears as you scroll, a logo that docks into the header, parallax, a pinned story, snapping sections, hover transitions.

Operations: [motion](../operations/motion.md), [components and presets](../operations/components-and-presets.md) (`effect.*`), [site and settings](../operations/site-and-settings.md).

Three layers, from the simplest:

| Layer | What it is | Where it is written |
|---|---|---|
| Site block reveal | One reveal for every block of every page (and of the footer) | site setting `blockReveal`, `settings.update` |
| Node reveal | How one node enters as it scrolls into view | the node's `meta.reveal`, `tree.commit` `set_meta` |
| Scenes | Scroll- or time-driven animations of named nodes, built from recipes | the page's scenes, `motion.applyRecipe` (or `motion.replace`) |

## Read first

- `read_resources` `libretto://site/<siteId>/motion`: the recipes with their knobs, and the diagnosis codes.
- `libretto://site/<siteId>/motion/<pageId>`: the page's scenes and their findings.
- `motion.listRecipes` and `effect.list` (read-only): built-in recipes (`reveal`, `parallax`, `read-along`, `payoff`, `hide`, `image-sequence`, `intro`, `build-up`, `dock`, `menus`, `retype`, `invert`, `snap`) and effect presets, then the site's own.

## A reveal on one node

1. `effect.list` for a ready reveal, or build one. Two shapes:
   - enter: `{ "mode": "enter", "effect": "fade-up", "once": true, "threshold": 0.15, "staggerChildren": false, "durationMs": 600, "distance": 24 }`
   - follows the scroll: `{ "mode": "scroll", "effect": "fade-up", "start": { "value": 82, "unit": "px" }, "length": { "value": 150, "unit": "px" }, "easing": "ease-in-out", "staggerChildren": false }`
   Effects: `fade`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `scale`, `blur`.
2. `set_meta` replaces the node's `meta`: read the node's current `meta` in the tree and send it whole with `reveal` added: `{ "op": "set_meta", "id": "<node>", "meta": { ...current, "reveal": { ... } } }`.
3. A node inside a section that the site block reveal already reaches gets the site's look; give it its own reveal only when the user wants it different.
4. Save a reveal the user likes as a site effect: `effect.save` `{ pageId, nodeId, label }`.

## The site block reveal

`settings.read`, then `settings.update` with `blockReveal` `{ enabled, page: <reveal>, footer: <reveal> }`. It changes every page: tell the user.

## Scenes from recipes

1. Pick the recipe and read its knobs (number, choice, words, a node, a distance in screens). Element knobs (`target`, `slot`) have no default: give `{ "nodeId": "<id>", "part": "root" }`, with `"region": "header"` for a node of the header (ids from `regions`).
2. `motion.applyRecipe` `{ pageId, recipeId, knobs }`. Applying the same recipe on the same target again replaces its scenes, so re-apply to adjust. `snap` writes the page's scroll setting: add the `pages` base revision.
3. Dry run: the answer's `motion.<code>` findings (`target-missing`, `target-ambiguous`, `stateful-target`, `overlap`, `empty-range`, `hidden-at-rest`, `never-matches`) name each problem. Fix every one before applying: `hidden-at-rest` means a visitor without motion would not see the content.
4. After applying, `motion.diagnose` `{ pageId }` must answer no findings for your scenes.
5. A tuned scene set the user wants elsewhere: `motion.saveRecipe` `{ pageId, sceneIds, label }`.
6. `motion.replace` writes the page's scenes by hand; prefer recipes. `motion.delete` removes scenes (ask first).

## Draw, count and scramble

Three effect entries play on what a node shows: a chart line or an illustration that draws itself, a figure that counts, a status line that decodes. No recipe builds them: write them with `motion.replace` (read the page's scenes first and send them all, yours added), on any trigger.

| `effect` | Target | What it does |
|---|---|---|
| `{ "kind": "drawPath", "part": "accent", "from": { "start": 50, "end": 50 } }` (both optional) | an `svg` node (an inline drawing) | Draws every stroke of the drawing, or only its `part`'s, from the segment `from` (in % of each stroke; nothing by default, `{ 50, 50 }` grows from the middle, `{ 100, 100 }` from the end) to the whole stroke. The entry's `stagger` (ms) draws one stroke after another. |
| `{ "kind": "countTo", "from": 0 }` or `{ "kind": "countTo", "values": [1200, 980, 640] }` | a `text` node whose text holds a number | Counts from `from` (0 by default) to the number the text shows, or shows `values` in turn, each for an equal share, then the text's number. Read and written at the page's locale, in the text's shape (`1.234` in Italian, `2026` stays ungrouped), the words around it kept. |
| `{ "kind": "scrambleText", "chars": "0123456789", "revealDelayMs": 300, "speed": 0.5 }` (all optional) | a `text` node | Reveals the text's own letters out of random `chars` (or `upperCase`, the default, `lowerCase`, `upperAndLowerCase`). |

An entry: `{ "id": "<uuid>", "sceneId": "<scene>", "target": { "nodeId": "<svg or text node>", "part": "root" }, "keyframes": [], "effect": { ... }, "position": { "type": "absolute", "ms": 200 }, "duration": 2600, "easing": "power1.inOut" }`. Play it when it comes into view with `{ "type": "intersection", "anchor": <ref>, "threshold": 0.25, "once": true }`, or drive it by the scroll with a `scroll` trigger, `scrub` and `pin`: a counter stepping through `values` while a line draws, both entries in one scene.

- Each ends on the page's markup. To change the number a counter reaches, change the text (in every language).
- A step on the wrong kind of node is refused: `INVALID_EFFECT_TARGET` (422 `scene_target_invalid`). A text with no number, or a drawing with no stroke, plays nothing (the runtime reports it).
- Reduced motion shows the markup at once: nothing to set.

Two keyframe patterns that go with them:

- **Bars that grow from the bottom, in turn:** one entry on the bars' container, `keyframes: [{ "offset": 0, "transform": { "scaleY": 0 } }, { "offset": 1, "transform": { "scaleY": 1 } }]`, `"transformOrigin": "50% 100%"`, `"stagger": 35`, on an `intersection` trigger with `once`.
- **A ratchet that turns one tooth per value:** a `rotate` entry (`"0deg"` to the angle of n - 1 teeth) with `"easing": "steps(n, jump-none)"` beside a `countTo` with n - 1 `values`, at the same `position` and `duration`, in a `scroll` scene with `scrub` and `pin`. Both hold n positions and jump together.

**Parts of a drawing.** An element the SVG file marks `data-part="<name>"` (lower-case letters, digits, hyphens; not `root`) is a part of the svg node: the `media` resource lists each SVG's `parts`. Target it as `{ "nodeId": "<svg node>", "part": "wheel" }` to turn the wheel without the pawl, `"part": "bars"` with a `stagger` to grow the bars one by one, or give `drawPath` a `part` and one entry per layer (construction, subject, signal, labels), each at a later `position`, to draw an illustration layer by layer. A part turns and scales about its own centre unless the entry sets `transformOrigin`. Name the parts in the file before uploading. A row uploaded before parts existed has none: upload the same file again (`upload_media_file`) and point the svg nodes at the new id (a draft change, live with the next publish). MCP cannot replace a row in place; the user can, in the admin (Media › the file › **Sostituisci file…**), which keeps the id but changes the published site at once, without a publish. A bad name refuses the inline drawing with the name in the reason. A drawing per language (`media` a locale map, [translations](translations.md)) offers the parts every language's file names: give each language's file the same `data-part` names, so one scene plays whatever the visitor's language.

**Text steps on a component.** `countTo` and `scrambleText` also play on a part of a component that holds text only, such as a stat's `{ "part": "value" }`. A refusal (`motion_invalid`) now says why in its message: the code, the node, and the parts the node offers.

## Beyond the recipes

No recipe builds these yet. Write scenes with `motion.replace` (read the page's scenes first and send them all, yours added; `discover_operations` with `names: ["motion.replace"]` gives a worked example of the first four) and node metadata with `tree.commit` `set_meta` (it replaces the node's whole `meta`: send the current keys, a `reveal` included, with yours).

| Ask | Write | Limits and reduced motion |
|---|---|---|
| A logo that swings forever | a `load` scene (`{ "type": "event", "event": "load", "source": "page" }`), one entry from `rotate: "-6deg"` to `"6deg"`, `"easing": "gentle"`, scene field `"loop": { "repeat": "infinite", "yoyo": true }` | `repeat` 1 to 1000 or `"infinite"`. Refused on a scrubbed `scroll` and on `scroll-direction`, and `infinite` on `first-interaction`. Plays once under reduced motion. Holds still while a visitor drags its target. |
| A bar that rides up scrolling down, back scrolling up | trigger `{ "type": "scroll-direction", "distance": { "value": 60, "unit": "px" }, "idleSnapMs": 150, "from": { "anchor": <second section>, "start": { "edge": "top", "viewport": 1 } }, "holdWhile": { "name": "data-page-menu-open", "value": "on" } }`, one entry `to` `transform.y: "-60px"`, `"easing": "linear"`, `"reducedMotion": "instant"` | Without `distance` it plays down and back. `idleSnapMs` needs `distance`. Under reduced motion it jumps (down: end, up: start). |
| A full-screen menu | a click scene on the button: `"trigger": { "type": "event", "event": "click", "source": <button> }`, `"entries": []`, `"pageState": { "state": "menu-open", "lockScroll": true, "controls": <panel> }`; the panel's closed look in its base style, its open look under `pg:[data-page-menu-open="on"]`; its entrance a second scene with `{ "type": "page-state", "state": "menu-open" }` | Escape and a chosen link close it; the button gets `aria-expanded`. A menu dialog's `pageState` prop publishes its own open state under that name. Page states switch the same under reduced motion; keep the open look in styles, not in the tween. |
| A heading that enters line by line | a keyframe entry on the text or richtext node itself with `"split": { "by": "lines" }` (or `"words"`; `{ "by": "lines", "words": 40 }` staggers the words inside each line), `"stagger": 80`, optionally `"staggerWithin": 600` so a long text still ends in time | Any other target is refused (`INVALID_SPLIT_TARGET`). Lines are measured as laid out, again after fonts load and on resize. Never split under reduced motion: the text plays whole by its `reducedMotion`. |
| A node shown on some sections only | a node style, no scene: `display: none` in `base` and `display` back under `pg:[data-active-section="about"\|"contact"]` (or hide it under that scope) | The sections need an `anchor`. Works in the header, footer, `above` and `below` regions too, and with `bp:`. |
| A node that hides while the page scrolls down | a node style under `pg:[data-scroll-dir="down"]`, its `transition` under `mq:(prefers-reduced-motion:no-preference)` | |
| Sections that stack | `set_meta` on the page root `{ "meta": { "stack": { "base": true, "lg": false } } }` (per breakpoint, mobile first) | Each section needs its own background; `overflow: clip`, not `hidden`. Nothing stacks under reduced motion or without JavaScript. |
| A logo visitors may drag | `set_meta` `{ "meta": { "drag": { "breakpoints": { "base": true }, "offWhile": { "name": "data-page-menu-open", "value": "on" } } } }` (`holdMs` 0 to 2000, default 260; `lift` 0 to 0.5) | Kept for the visit. A finger holds still first, so a swipe still scrolls. Drags under reduced motion, without lifting. Not in the editor preview. |
| Motion in the header on every page | `motion.replace` with the header's page id (`region.read` answers it): the scenes name the region's own node ids, without `region` | A ref with `region`, or a node the region lacks, is refused (422 `motion_invalid`). The admin's motion panel does not author them. |

The attributes on `<html>` that `pg:` reads: `data-scroll-dir` (`up`, `down`), `data-active-section` (the anchor being read), `data-page-<state>` (`on`), `data-motion-gate` (`closed`, `playing`, `done`). A `pg:` scope on any other name never matches.

## Hover and transitions

A transition is a style: `set_style` in the node's state scope (for example `s::hover`) with `transition` and the properties that change, durations as tokens (`{motion.duration.fast}`, `{motion.duration.base}`, `{motion.duration.slow}`).

## Check

Motion cannot be judged from a still screenshot. `render_preview` and `compare_reference` capture with reduced motion by default, so each scene entry follows its `reducedMotion` mode: `skip` (the default) is not applied and the element shows at rest, as its styles paint it; `instant` shows its last keyframe, `fade-only` its opacity change alone, and a drawn line or a counter its final value. It is not every scene's end state: to see a scene land, give its entries `reducedMotion: "instant"` (on a scroll scene the entry jumps with the scroll step, so a capture at the top still shows its start). `"motion": "start"` captures with motion allowed, the first frame of each scene. A capture at a scene's progress is not offered. In Chrome, take two screenshots at different scroll positions in the preview, and tell the user to scroll the preview in the editor (Live mode) to see it. Respect reduced motion: the site plays reveals as plain content when the visitor asks for less motion; never make content depend on an animation to be visible.
