# Motion: parts that move

Use when the user wants a part to appear, slide, fade, follow the scroll, react to a click or a hover, or a sequence when the page opens.

Ops: [motion](../operations/motion.md) (`timeline.*`, `track.*`, `state.*`, `motionRecipe.*`), [components](../operations/components.md) (`component.setTimeline`). Motion is a Designer's or an Administrator's: a Content author is refused with who can.

## 1. Read

`motion/<pageId>`: the page's timelines (each with its trigger and tracks), its states, and `recipes`: the starting motions of the site and of the platform, each a timeline without its part, with knobs (sliders, choices) and their defaults. Start from a recipe whenever one fits; Editor › Motion lists the same ones.

`page/<pageId>` gives the id of the part to animate.

## 2. Animate a part from a recipe

The guide's recipe, one batch: `timeline.create` with the recipe's timeline, the part as its trigger's `node` (when the trigger watches one) and as each track's `target`, and `recipe` naming the recipe and the knob values used:

```json
{ "name": "timeline.create", "input": { "pageId": "<pageId>", "id": "reveal-title", "timeline": {
  "label": "Comparsa del titolo",
  "recipe": { "key": "<the recipe's key>", "knobs": { "distance": 40 } },
  "trigger": { "kind": "view", "node": "<partId>", "threshold": 0.15 },
  "duration": 600, "reducedMotion": "end", "print": "end",
  "tracks": [
    { "id": "fade", "target": "<partId>", "property": "opacity", "keyframes": [{ "at": 0, "value": "0" }, { "at": 1, "value": "1" }] },
    { "id": "rise", "target": "<partId>", "property": "translate", "keyframes": [{ "at": 0, "value": "0px 40px" }, { "at": 1, "value": "0px 0px" }] }
  ]
} } }
```

`reducedMotion` says what a visitor who asks for less motion sees (`end`: the part at rest), `print` what a printed page shows. Keep both.

## 3. Change it after

| Goal | Op |
|---|---|
| What starts it: the page loading, a delay, the part coming into view, a scroll range, a click, a hover, a state | `timeline.setTrigger` `{ "pageId", "id", "trigger": { "kind": "event", "on": "click", "node": "<buttonId>" } }` |
| Another property animated | `track.add` `{ "pageId", "timeline": "<id>", "track": { "id", "target", "property", "keyframes" } }` |
| Its keyframes, or other keyframes from a breakpoint up | `track.setKeyframes` (`scope: { "bp:md": [...] }`) |
| A value that flips at random moments, like a sign that flickers | `track.setSchedule` |
| Its name in Editor › Motion | `timeline.setLabel` |
| Take it off | `timeline.delete`, `track.remove` (the parts stay as they are) |

## States: a value a visitor's action sets

A button that opens and closes a panel (a disclosure), a choice, a form input, a gate that holds the page, the scroll direction, a part scrolling past: `state.define` `{ "pageId", "name", "source": { "kind": "disclosure", "control": "<buttonId>", "controls": "<panelId>", ... } }`. Styles read it in a `pg:<state>=<value>` scope (`tree.set_style`), timelines with a `state` trigger. `state.remove` takes it off once nothing reads it.

## Motion on every page

The header's or a component's own motion plays in every instance, on that instance's parts: `component.setTimeline` `{ "key": "<component>", "id", "timeline" }` (an Administrator's). Its trigger and durations may read the instance's props.

## The site's own starting motions

`motionRecipe.save` `{ "key", "recipe": { "kind": "motion", "label", "knobs", "timeline" } }` saves one for the site (it is listed first in Editor › Motion and in `motion/<pageId>`); `motionRecipe.remove` takes it off, and the timelines made from it keep their tracks.

## Check: does it play?

No read says why a motion does not play. Read the timeline back in `motion/<pageId>` (its trigger and each track's `target` must be the part's id), then look:

- `render_preview` with `"motion": "start"`: the first frame, motion allowed; the default (`end`) is every part at rest, as a visitor with reduced motion sees it.
- `render_preview` with `"scroll": { "nodeId": "<partId>" }` or `{ "progress": 0.5 }`: the screen further down, for a scroll or view trigger.

Tell the user what a visitor with reduced motion sees, too. In the user's Chrome, Editor › Motion shows why it does not play.
