# Component Spec — Switch

Status: DRAFT. First toggle-family port. Validates the checked axis and the
form-value projection on the behavior layer.

Files (`src/components/switch/`):

```
switch.classes.ts   switch.behavior.ts   switch.tsx   switch.element.ts   switch.astro
```

Tests mirror into `test/components/switch/`: behavior (pure), classes parity,
and conformance across React + WC (`vitest.config.ts`) + Astro
(`vitest.config.astro.ts`).

## Composition

```
switch slice        state {checked}, action toggle, root/thumb parts,
                    role=switch / aria-checked / data-state projection,
                    Space+Enter keymap, disabled gate
```

Its own slice, not a fold of `pressable`: pressable owns the button surface
(`aria-pressed`/`aria-busy`, `spinner`/`label` parts); the switch axis is
`role=switch` + `aria-checked` + `data-state:checked|unchecked` over a `thumb`.
The shape imitates button (one slice + a `bindSwitch` modeled on `bindButton`);
the projection is the switch's own — the precedent `input.behavior.ts` set for
"my axis matches no existing slice".

Controlled/uncontrolled per boundary 4: `config.checked` is the consumer's
controlled value, `state.checked` is intrinsic (seeded from `defaultChecked`),
projections and the change callback read `effectiveChecked(state, config)`. A
toggle always flips, so intrinsic state can never drift from a controlled
consumer, and the callback fires once per real activation.

The form-value axis lives in the score as the pure `switchFormValue(state,
config)` projection: `{ value: checked ? (value ?? 'on') : null, validity:
{ valueMissing: required && !checked } }`. It is data, not a lifecycle machine
(see Oracle dispositions).

## Config, state, actions

```ts
interface SwitchConfig {
  variant: SwitchVariant;      // default | primary | secondary | destructive
                               // | success | warning | info | accent
  size: SwitchSize;            // sm | default | lg
  checked?: boolean;           // controlled
  defaultChecked?: boolean;    // uncontrolled seed
  disabled?: boolean;
  value?: string;              // form-value axis: submitted value (defaults 'on')
  name?: string;               // form-value axis: field name
  required?: boolean;          // constraint (aria-required + valueMissing)
}
interface SwitchState { checked: boolean } // intrinsic only
type SwitchActions = { toggle: undefined };
```

No `setChecked(payload)` action: the control has one gesture (flip), so `toggle`
suffices; the controlled consumer reads the intended value from the callback.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="switch"` (static, PartDecl), `aria-checked` (`true`/`false`, always present), `aria-required` (only when required), `data-state` (`checked`/`unchecked`) |
| thumb | always | `aria-hidden="true"`, `data-state` (mirrors root, drives the CSS travel) |

`role` is declared in the PartDecl and set once in the server/author markup
(like button's static `type="button"`), never re-projected — it never changes.
`aria-checked` is always `'true'`/`'false'`; the `'false'` string is why the DOM
bind applies the projection with `{validate:false}` (aria-manager would coerce
`'false'` truthy — gotcha #2).

The switch has no intrinsic text: consumers MUST supply an accessible name (a
paired `<label>`, `aria-label`, or `aria-labelledby`). The conformance suite
applies `aria-label` per scenario; axe fails a nameless switch.

Disabled is native `disabled` only — no `aria-disabled` duplication, matching
button's hard-disabled.

## Keyboard and effects

- `keymap`: Space / Spacebar / Enter on `root` -> `toggle`. The native
  `<button>` converts Enter/Space to a click, so `bindSwitch` wires `click` ->
  `toggle` ONLY; the keymap is the pure record of the activation keys. A keydown
  Space handler that also toggled would double-fire against the native click —
  the trap the old React code fought with `preventDefault`.
- `effects(state, config)`: always `[]`. No focus-trap, roving, or announce —
  the simplest bind shape, no runner. `bindSwitch` projects aria/data-state and
  dispatches a bubbling, composed `change` event on a real toggle (the old WC's
  change contract, preserved).

## Oracle dispositions (src/old/ui/switch.*, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + `onCheckedChange` | contract |
| `variant` (8) + `size` (3) | contract (rafters extension) |
| `role="switch"`, `aria-checked`, `data-state` | contract |
| Space toggles (keydown handler) | contract (moved to native click; keymap records Space+Enter) |
| React Space `preventDefault` to stop the native double-click | defect-avoidance — the new bind wires click only, so there is nothing to suppress |
| native `disabled` gate | contract |
| thumb travel + track color transition | contract (declared as `data-[state=checked]` CSS, not a swapped class string; durations/easing from tokens) |
| `aria-hidden` decorative thumb | contract |
| form-value axis: `name`/`value`/`required`, default `'on'`, omit-when-unchecked, `valueMissing` | contract — lives in the score as the pure `switchFormValue` projection |
| WC ElementInternals form association (`formAssociated`, `attachInternals`, `setFormValue`, `setValidity`, `checkValidity`/`reportValidity`, `formReset`/`formDisabled`/`formStateRestore` callbacks) | framework-affordance — the behavior-layer WC is a thin light-DOM enhancer; the axis is exposed as pure data a form adapter reads, not rebuilt as a lifecycle machine in a decorator. Native submission via a bubble input is a future form adapter, tracked here |
| WC `observedAttributes` + property setters + attribute reflection | framework-affordance — dropped; the light-DOM enhancer reads author/server markup and never owns attribute reflection |
| WC bubbling composed `change` event | contract (preserved in `bindSwitch`) |
| structural `:host { display: inline-flex }` shadow shim | dropped — no shadow tree; the enhancer decorates author light DOM |

## Deltas from the oracle

1. Checked presentation moved from swapped class strings
   (`bg-input` ↔ `bg-primary`, `translate-x-0` ↔ `translate-x-5`) to
   `data-[state=checked]:` selectors over one class set, so all three
   performances animate identically off the projected `data-state` with no
   per-framework class logic (the technique input uses for validity).
2. The React performance never participated in forms in the oracle either;
   form submission remains out of the React surface (checked axis + callback).

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2 Name, Role, Value: `role="switch"` + `aria-checked` asserted
  against real DOM by the harness; `aria-required` advertises the constraint;
  the consumer-supplied accessible name is required (axe-enforced).
- 2.1.1 Keyboard: Space and Enter toggle via native button activation; the
  control is a real `<button>`, focusable and operable without a pointer.
- 2.4.7 Focus Visible: token focus ring (`focus-visible:ring-2` +
  variant ring) on the track.
- 1.4.3 / non-text state: state is conveyed by `aria-checked` and thumb
  position, not color alone.
- prefers-reduced-motion: `motion-reduce:transition-none` on both the track
  color and the thumb travel.
