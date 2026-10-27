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

## Hover and transitions

A transition is a style: `set_style` in the node's state scope (for example `s::hover`) with `transition` and the properties that change, durations as tokens (`{motion.duration.fast}`, `{motion.duration.base}`, `{motion.duration.slow}`).

## Check

Motion cannot be judged from a still screenshot. Take two screenshots at different scroll positions in the preview, and tell the user to scroll the preview in the editor (Live mode) to see it. Respect reduced motion: the site plays reveals as plain content when the visitor asks for less motion; never make content depend on an animation to be visible.
