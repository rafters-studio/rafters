# Component Spec — Slider

Status: DRAFT. Archetype `simple-interactive` (value axis), imitates `switch`
for the score/decorator shape and `radio-group` for the many-part projection.

Files (`src/components/slider/`):

```
slider.classes.ts    slider.behavior.ts    slider.tsx
slider.element.ts     slider.astro
```

Tests mirror into `test/components/slider/` (behavior, classes, and React / WC /
Astro conformance on the shared harness).

## Composition

The score is pure and multi-thumb; the impure surface is COMPOSED from three
primitives directly (Spec 05, no effects layer):

```
interactive        the mouse/touch drag surface -> normalized {left, top}
keyboard-handler   arrow / Page / Home / End keydown on the focused thumb
form-value         the hidden mirrored inputs a <form> submits under `name`
```

`composeSliderInteractions({ root, getConfig, getValues, getFocusedIndex,
request, setDragging })` folds `createInteractive` + `createKeyboardHandler` into
one teardown, shared verbatim by `bindSlider` (WC + Astro) and the React
controller's effect. The value math that turns interactive's raw point (or a key)
into a stepped, clamped value is COMPONENT-INTERNAL pure state — the exported
`valueFromPoint` / `stepForKey` / `clampToStep` / `nearestThumbIndex` helpers,
never a reducer (a reducer receives no config, and the math needs min/max/step).

`interactive` stamps `role="slider"` + `tabindex` on its surface (it assumes it
IS the widget). Here the surface is the container and the THUMBS are the sliders,
so `neutralizeInteractiveAria` strips that stamp immediately after every
create/update (`applyAria` runs only there, never on a pointer event).

Controlled/uncontrolled per the ownership-of-truth boundary: `config.value`
shadows `state.values`; projections and the callback read `effectiveValues`.

## Config, state, actions

```ts
interface SliderConfig {
  variant; size;                 // rafters extensions (classes only)
  min; max; step;                // the range and its grid
  orientation;                   // 'horizontal' | 'vertical'
  value?: number[];              // controlled
  defaultValue?: number[];       // uncontrolled seed
  disabled?: boolean;
  name?: string;                 // form-value axis
}
interface SliderState { values: number[] } // intrinsic only; always ascending
type SliderActions = { setThumb: { index: number; value: number } };
```

One action: `setThumb` receives an ALREADY-clamped value (the pure helpers own
the math) and re-sorts a range so thumbs never cross. Which thumb is dragging
(`active`) and the `data-dragging` flag are EPHEMERAL — bind-local closure and a
DOM attribute, like radio-group's roving focus — not score state.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-orientation`, `data-disabled` (only when disabled); no role (not the widget); the `interactive` pointer surface |
| track | always | `aria-hidden="true"`, `data-orientation` |
| range | always | `aria-hidden="true"` (decorative fill) |
| thumb | one per value | `role="slider"`, `aria-valuemin/valuemax/valuenow`, `aria-orientation`, `aria-disabled` (only when disabled); consumer supplies the accessible name |

The thumb is a `many` part, so its projection lives in `sliderThumbAria(value,
state, config)`, first-classed onto `sliderBehavior.instanceAria` so the harness's
generic `assertInstanceAriaFulfillment` drives it (each instance keyed by
`data-value`). `aria-valuenow` equals the thumb's own value string, so the
data-value-keyed driver and the projection agree by construction. Every thumb is
a tab stop (`tabindex=0`, `-1` while disabled); the container is never a tab stop.

## Keyboard

`keymap` is the pure claim record (Spec 01): the eight slider keys on a `thumb`
claim `setThumb`. The bind resolves WHICH thumb (the focused one, via
`focusedThumbIndex`) and the target value via `stepForKey`, then dispatches.

| Key | Effect |
| --- | --- |
| ArrowRight / ArrowUp | + step |
| ArrowLeft / ArrowDown | − step |
| PageUp / PageDown | ± ten steps |
| Home / End | jump to min / max |

Orientation does NOT remap the keys (oracle rule: Right/Up always increase,
Left/Down always decrease). `data-dragging` is toggled on the root during a
pointer gesture for the CSS to read; it is not projected (ephemeral).

## Motion

`thumb-travel`: the thumb transitions on the x/bottom axis. Intent only —
`transition-all duration-150 motion-reduce:transition-none`; durations/easing
come from tokens.

## Oracle dispositions (src/old/ui/slider.{tsx,element.ts,classes.ts})

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled `value`/`defaultValue` + `onValueChange` | contract |
| multi-thumb range (`defaultValue={[25,75]}`), values kept sorted | contract |
| drag a thumb / press the track to move the nearest thumb | contract (via `interactive` + `nearestThumbIndex`) |
| Arrow / Page / Home / End keymap, step + 10×step, orientation-invariant keys | contract |
| `aria-valuemin/max/now`, `aria-orientation` per thumb; `role="slider"` | contract |
| horizontal + vertical orientation | contract |
| `variant` / `size` (rafters extensions) | contract (classes only; `default`=`primary`) |
| `disabled` gate (native path + programmatic) | contract (score `canDispatch` + thumb `tabindex=-1`) |
| form submission | contract (form-value primitive: one hidden input per thumb under `name`); the oracle had no form association — an ADD, not a port |
| per-thumb `aria-valuemin/max` clamped to the neighbour thumb | dropped — the oracle used the GLOBAL min/max for every thumb; preserved faithfully. A future enhancement, not a port. |
| `aria-valuetext` | dropped — the oracle never set it; a consumer-supplied label is the escape until a formatter axis lands |
| separate `onValueCommit` (release vs. move) | dropped — the oracle had none; `onValueChange` fires per committed move, and the bind emits a bubbling `input` event |
| pointer capture on the thumb (`setPointerCapture`) | framework-affordance — `interactive` tracks the drag at the document level instead, so capture is unnecessary |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="slider"` with `aria-valuemin/max/now` and
  `aria-orientation` per thumb, asserted against real DOM by the harness across
  React / WC / Astro.
- 2.1.1 Keyboard: every thumb is operable by Arrow / Page / Home / End; disabled
  removes the thumbs from the tab order and gates all movement.
- 2.4.7 Focus Visible: token focus ring on the thumb
  (`focus-visible:ring-2 ring-<variant>-ring`).
- 2.5.3 / naming: the control has no intrinsic text, so a consumer MUST supply an
  accessible name (`aria-label` / `aria-labelledby`) on the thumbs; the
  conformance suite supplies one per scenario and axe verifies it.
- 1.4.13 / motion: thumb travel honours `motion-reduce:transition-none`.
