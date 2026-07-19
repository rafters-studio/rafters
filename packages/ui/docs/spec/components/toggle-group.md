# Component Spec — Toggle Group

Status: DRAFT. Toggle-family article. Ports the imperative
`old/ui/toggle-group.controller.ts` + `old/ui/toggle-group.element.ts` onto the
behavior layer (selection state as reducer, focus movement as the composed
`roving-focus` primitive).

Files (`src/components/toggle-group/`):

```
toggle-group.classes.ts   toggle-group.behavior.ts   toggle-group.tsx
toggle-group.element.ts   toggle-group.astro
```

Tests mirror into `test/components/toggle-group/`: `.behavior.test.ts` (pure),
`.classes.test.ts` (parity), `.conformance.test.tsx` (React),
`.element.conformance.test.ts` (WC), `.astro.conformance.test.ts` (Astro).

## Composition

```
toggle-group slice   state {value, multiple}, action toggle, root + item parts,
                     group role, data-orientation/data-disabled aria,
                     Space/Enter keymap; roving-focus composed in the client
```

A single slice — no glue. The score's only state axis is the set of selected
values; focus movement across items is NOT state, it is ephemeral DOM state
owned by the `roving-focus` primitive (mirroring radio-group/navigation-menu).
Unlike radio-group, selection does NOT follow focus: arrow keys move focus only,
and activation (Space/Enter/click, fulfilled natively by the item `<button>`s)
toggles the focused item. This is the WAI-ARIA toolbar pattern, not the radio
pattern.

`roving-focus` is composed DIRECTLY — the WC/Astro `bindToggleGroup` and the
React controller each call `createRovingFocus(root, { orientation })`. There is
no effect vocabulary and no runner: the client composes the primitive against
real document DOM. The item buttons carry `data-roving-item` so the primitive
finds them (they are plain buttons, not one of the roles roving matches by
default).

Two modes over one action. The reducer receives `(state, payload)` with no
config (Spec 01), so the mode is seeded into state (`multiple`) at
`initialState` from `config.type`:

- **single** (default) is COLLAPSIBLE — re-activating the selected item clears
  it (the oracle's `current === itemValue ? '' : itemValue`).
- **multiple** is additive — activation toggles the value in/out of the set.

Controlled/uncontrolled per the ownership-of-truth boundary applied to a set
(the same shape as radio-group applied to a string): `config.value` is the
consumer's controlled value (passed fresh, never stored); `state.value` is
intrinsic, seeded from `defaultValue`. Projections and the `onValueChange`
callback read the EFFECTIVE value via `selectedValues(state, config)`;
`emitValue(values, config)` shapes the callback payload (`string` for single,
`string[]` for multiple).

## Config, state, actions

```ts
interface ToggleGroupConfig {
  type?: 'single' | 'multiple';        // default 'single'
  value?: string | string[];           // controlled
  defaultValue?: string | string[];    // uncontrolled seed
  orientation?: 'horizontal' | 'vertical'; // default 'horizontal'
  disabled?: boolean;    // group-level; gates toggle, propagates to items
  required?: boolean;    // inert form surface (see dispositions)
  name?: string;         // inert form surface (see dispositions)
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}
interface ToggleGroupState { value: string[]; multiple: boolean } // intrinsic
type ToggleGroupActions = { toggle: string }
```

`canDispatch` rejects `toggle` when the group is disabled, so a controlled
consumer's callback never fires for an edit the group would refuse. Item-level
`disabled` is handled in the bind/decorator (native `disabled` + roving skips
disabled items) rather than in `canDispatch`, which cannot see the item value.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="group"`, `data-orientation`, `data-disabled` (when disabled) |
| item | many | `aria-pressed` (`'true'`/`'false'`), `data-state` (`on`/`off`) |

The root is `role="group"`, which does NOT support `aria-orientation`,
`aria-disabled`, or `aria-required` (they are outside its allowed-attribute set
— axe flags them). So the group advertises orientation via `data-orientation`
and expresses group-disabled by natively disabling its items, matching the
oracle WC. Items are native `<button type="button">` toggle buttons carrying
`aria-pressed` — valid on a button regardless of mode.

`item` is a `many` part: its projection is the exported `toggleItemAria(value,
state, config)`, driven per instance by React/Astro/the bind and asserted by
`assertInstanceContractFulfillment`. `tabindex` is deliberately ABSENT from the
projection — roving-focus owns it as ephemeral DOM state, so it must not appear
in a projection the conformance harness asserts against.

The item projection carries the resolved string `aria-pressed: 'false'` in the
common unpressed case; the DOM binds apply it with `{ validate: false }` so
aria-manager does not coerce the string `'false'` truthy (Gotcha #2).

## Keyboard and effects

- `keymap`: Space/Enter on an `item` -> `toggle`. Declared for the pure keymap
  contract; the DOM binds do NOT wire it — the native `<button>` converts
  Space/Enter to a click that the delegated click handler dispatches (wiring
  keymap too would double-toggle: select-then-deselect in single mode). Arrow
  keys are NOT claimed — the roving-focus primitive owns them for movement.
- Roving: `bindToggleGroup` and the React effect each compose
  `createRovingFocus(root, { orientation })` directly. It owns the roving
  tabindex and arrow/Home/End movement across the `[data-roving-item]` item
  buttons, and skips disabled items.
- Activation is delegated click only (bind) / item `onClick` (React). No keydown
  branch — selection does not follow focus, so there is nothing to wire on top
  of roving (contrast radio-group, which adds a select-follows-focus keydown).

## Oracle dispositions (`src/old/ui/toggle-group.*`)

| Oracle feature | Disposition |
| --- | --- |
| single (collapsible) + multiple selection modes | contract |
| single re-click clears; multiple adds/removes | contract |
| controlled/uncontrolled + onValueChange (`string` \| `string[]`) | contract |
| orientation (horizontal/vertical) drives roving + layout | contract |
| group + item `disabled`; roving skips disabled items | contract |
| click / Space / Enter toggle the focused item | contract |
| `aria-pressed` + `data-state` (on/off) reflection on items | contract |
| variant (default/outline) + size (default/sm/lg) | contract |
| arrow keys move focus ONLY, no select-follows-focus | contract — the toolbar pattern (this component's correct behavior, unlike radio-group which improved to arrow-selects) |
| WC form-association via ElementInternals (`setFormValue`, `valueMissing`, CSV/FormData submission, `name`/`required` validity) | dropped — deferred to the `form-value` primitive, which does not yet exist (planned across the checkbox/switch/select family). `name`/`required` are preserved as an INERT surface (`data-name`, and `required` accepted on config) so the wiring exists when form-value lands. The old React tsx never rendered hidden inputs either; form participation was WC-only |
| WC `input`/`change`/`rafters-toggle-group-change` events | dropped — same deferral; the selection contract is `onValueChange` (React) and the projected `aria-pressed`/`data-state` (all three) |
| shadow-DOM `<rafters-toggle-group>` + `<rafters-toggle-group-item>` pair | defect-do-not-port — replaced by a single light-DOM enhancer (`bindToggleGroup`), matching button/radio-group; the host provides the real `role="group"` markup with `<button data-part="item">` children so roving and focus act on real document DOM |
| `createSelectionGroup` primitive for single/multiple state | framework-affordance — expressed instead as reducer state (`{ value, multiple }`), the behavior-layer equivalent, exactly as radio-group expresses its single-select state as reducer state rather than composing the primitive (no behavior-layer component composes `createSelectionGroup`) |

## Deltas from the oracle

1. Selection is reducer state driven through the score + the composed
   `roving-focus` primitive, not the imperative `createToggleGroup` controller.
2. Group-disabled is expressed by natively disabling items plus a `data-disabled`
   marker on the root, rather than `aria-disabled` on the group (invalid on
   `role="group"`).
3. A single light-DOM enhancer replaces the shadow-DOM element pair; the item
   buttons are the real focusable/roving targets.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="group"` on the container with per-item `aria-pressed` +
  `data-state`, asserted against real DOM by the harness. The group is given an
  accessible name by the consumer (`aria-label` / `aria-labelledby`).
- 2.1.1 Keyboard: arrows (per orientation) + Home/End move focus; Space/Enter
  and click activate the focused item; disabled items are skipped by roving.
- 2.4.3 Focus Order: roving tabindex keeps exactly one item in the tab order;
  Tab enters the group and Tab leaves it (arrows move within).
- 2.4.7: token focus ring on the item (`focus-visible:ring-ring`).
