# Component Spec — Radio Group

Status: DRAFT. Toggle-family article. Ports the imperative
`old/ui/radio-group.controller.ts` + `old/ui/radio-group.element.ts` onto the
behavior layer (selection state as reducer, focus movement as effect).

Files (`src/components/radio-group/`):

```
radio-group.classes.ts   radio-group.behavior.ts   radio-group.tsx
radio-group.element.ts   radio-group.astro
```

Tests mirror into `test/components/radio-group/`: `.behavior.test.ts` (pure),
`.classes.test.ts` (parity), `.conformance.test.tsx` (React),
`.element.conformance.test.ts` (WC), `.astro.conformance.test.ts` (Astro).

## Composition

```
radio slice        state {value}, action select, root + item parts,
                   radiogroup/radio roles, orientation/required/disabled aria,
                   Space/Enter keymap, roving-focus effect
```

A single slice — no glue. The score's only state axis is the selected value;
focus movement across items is NOT state, it is ephemeral DOM state owned by the
`roving-focus` effect (mirroring navigation-menu's `active` vs its roving
effect). Selection *follows* focus per the WAI-ARIA radio pattern: the bind and
the React controller add a keydown that selects whichever item roving just
focused.

Controlled/uncontrolled per the ownership-of-truth boundary applied to a string
(same shape as input/navigation-menu): `config.value` is the consumer's
controlled value (passed fresh, never stored); `state.value` is intrinsic,
seeded from `defaultValue`. Projections and the `onValueChange` callback read
the EFFECTIVE value via `selectedValue(state, config)`. Radios never deselect:
`select` returns the SAME state ref when the value is unchanged, so re-selecting
an item does not notify memory or re-fire the callback.

## Config, state, actions

```ts
interface RadioGroupConfig {
  value?: string;        // controlled ('' = none)
  defaultValue?: string; // uncontrolled seed
  orientation?: 'horizontal' | 'vertical'; // default 'vertical'
  disabled?: boolean;    // group-level; gates select, propagates to items
  required?: boolean;    // aria-required
  name?: string;         // inert form surface (see dispositions)
}
interface RadioGroupState { value: string | null } // intrinsic only
type RadioGroupActions = { select: string }        // radios never deselect
```

`canDispatch` rejects `select` when the group is disabled, so a controlled
consumer's callback never fires for a selection the group would refuse. Item
-level `disabled` is handled in the bind/decorator (and roving skips disabled
items) rather than in `canDispatch`, which cannot see the item value.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="radiogroup"`, `aria-orientation`, `aria-required` (when required), `aria-disabled` (when disabled) |
| item | many | `role="radio"`, `aria-checked` (`'true'`/`'false'`), `data-state` (`checked`/`unchecked`) |

`item` is a `many` part: its projection is the exported `radioItemAria(value,
state, config)`, driven per instance by React/Astro/the bind and asserted by
`assertInstanceContractFulfillment`. `tabindex` is deliberately ABSENT from the
projection — roving-focus owns it as ephemeral DOM state, so it must not appear
in a projection the conformance harness asserts against.

The item projection carries the resolved string `aria-checked: 'false'` in the
common unchecked case; the DOM binds apply it with `{ validate: false }` so
aria-manager does not coerce the string `'false'` truthy (Gotcha #2).

## Keyboard and effects

- `keymap`: Space/Enter on an `item` -> `select`. Arrow keys are NOT claimed by
  the keymap — the roving-focus effect owns them for movement, and select
  -follows-focus is wired on top in the client.
- Select-follows-focus: the roving-focus effect registers its keydown listener
  during the immediate first paint (`subscribe -> render -> apply`), which runs
  BEFORE the client attaches its own keydown listener. On an arrow key roving
  moves focus first; the client's handler then selects `document.activeElement`.
  Tab-in never routes through keydown, so it focuses without selecting.
- In React the selection keydown is a NATIVE listener registered in an effect
  that runs after `useBehaviorEffects`, for the same registration order — a
  React synthetic `onKeyDown` would fire before roving and read stale focus.
- `effects(state, config)`: always `roving-focus(root, orientation)`.

## Oracle dispositions (`src/old/ui/radio-group.*`)

| Oracle feature | Disposition |
| --- | --- |
| single-select, NOT collapsible (re-click keeps selection) | contract |
| controlled/uncontrolled + onValueChange (React `onChange`) | contract |
| orientation (horizontal/vertical), aria-orientation | contract |
| group + item `disabled`; roving skips disabled | contract |
| click selects; Space/Enter select the focused item | contract |
| aria-checked / data-state reflection on items | contract |
| `group` marker + `group-data-[state=unchecked]:hidden` indicator | contract (React parity: indicator always rendered, CSS-hidden — the old WC's render-only-when-checked is dropped for one class contract across all three) |
| arrow keys move focus ONLY (old controller + old WC) | defect-do-not-port — improved to WAI-ARIA APG "arrow moves AND selects" (the ticket's stated behavior); old move-only was the deviation |
| roving seeded to the checked item's index (`startIndex`) | dropped — the roving-focus effect starts at index 0; Tab enters at the first item, not the checked one. Minor APG divergence pending a seedable roving effect (Spec 03) |
| WC form-association via ElementInternals (`setFormValue`, `valueMissing`, `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`, `name`/`required` validity) | dropped — deferred to the `form-value` primitive, which does not yet exist (planned across the whole checkbox/switch/select family). `name`/`required` are preserved as an INERT surface (`data-name`, `aria-required`) so the wiring exists when form-value lands. The old React tsx never rendered hidden inputs either; form participation was WC-only |
| WC `input`/`change` events on selection | dropped — same deferral; the selection contract is `onValueChange` (React) and the projected `aria-checked`/`data-state` (all three) |
| shadow-DOM `<rafters-radio-group>` + `<rafters-radio-item>` pair | defect-do-not-port — replaced by a single light-DOM enhancer (`bindRadioGroup`), matching button/navigation-menu; the host provides real `role="radiogroup"`/`role="radio"` markup so roving and focus act on real document DOM |
| `createSelectionGroup` primitive for single-select state | framework-affordance — expressed instead as reducer state (`{ value }`), the behavior-layer equivalent, exactly as navigation-menu expresses its active-item selection as reducer state rather than composing the primitive |

## Deltas from the oracle

1. Arrow keys select (APG), not move-only — see disposition above.
2. Selection is reducer state driven through the effect runner + roving-focus
   effect, not the imperative `createRadioGroup` controller.
3. The indicator dot is always rendered and hidden via
   `group-data-[state=unchecked]:hidden` in all three performances (one class
   contract), rather than conditionally rendered in the WC.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="radiogroup"` with `aria-orientation`, and per-item
  `role="radio"` + `aria-checked`, asserted against real DOM by the harness.
- 2.1.1 Keyboard: arrows (per orientation) + Home/End move and select; Space
  /Enter select; disabled items are skipped by roving.
- 2.4.3 Focus Order: roving tabindex keeps exactly one item in the tab order;
  Tab enters the group and Tab leaves it (arrows move within).
- 2.4.7: token focus ring on the item (`focus-visible:ring-ring`).
