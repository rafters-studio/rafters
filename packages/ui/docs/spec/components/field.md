# Component Spec -- Field

Status: DRAFT. The id-association / ARIA archetype. A field wraps a native
control with a label and optional helper/error text, and its whole job is
WIRING: associating the label with the control and projecting validity /
description ARIA onto the control. There is no state axis -- the score is a
total function from config (+ the rendered part ids) to the control's ARIA.

Files (`src/components/field/`):

```
field.classes.ts    field.behavior.ts    field.tsx
field.element.ts     field.astro
```

Tests mirror into `test/components/field/`. React, WC, and Astro are all
conformance-verified against the shared harness.

## The archetype question

Every prior interactive component owned a state axis (open, pressed, value).
Field owns none: it is a static score, like `label`, but with a NON-empty
projection. The answer it settles: a component whose only contract is ARIA
wiring is a projection-only score plus a near-empty client -- no
`createBehavior`, no memory, no dispatch, no keymap.

Field wires ARIA onto a control it does not own (a slotted/child control the
consumer supplies), which is the one shape no prior component had. The control
is a declared part (`data-part="control"`); the client stamps that marker on the
control it locates so the harness and any re-query can find it.

## Composition

- **React** (`field.tsx`): the shadcn Field surface. Container + label +
  slotted control + helper/error, driven declaratively. It clones the control
  child to inject the id and the score's `fieldControlAria`, renders a `<label>`
  with the native `for` association (using the Label score's own decoration),
  and paints the required marker + disabled dim from `field.classes.ts`. No
  bind.
- **WC** (`field.element.ts`): a light-DOM enhancer. The author supplies the
  label / control / helper markup; the element defers one microtask (children
  may not have parsed) and calls `bindField`.
- **Astro** (`field.astro`): SSR-renders label + `<slot/>` control +
  helper/error, then the `<script>` hands each instance to the SAME
  `bindField`. One score, three performances, zero drift.

## Config, state, actions

```ts
interface FieldConfig {
  required?: boolean; // -> aria-required on the control + the required marker
  disabled?: boolean; // -> native disabled on the control + label dim
}
type FieldState = Record<never, never>;   // no state axis
type FieldActions = Record<never, never>; // no actions
```

`canDispatch` is constant `true`, `keymap` is constant `null`, `actions` is
empty: the slotted control owns every keystroke and there is nothing to move.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| label | always | none projected -- the `for`/`id` association is native, wired by the client (or React's `htmlFor`), not an ARIA attribute |
| control | always | `aria-describedby` (error id first, then description id; only rendered ids), `aria-invalid` (`true` while an error is present), `aria-required` (while required) |
| description | consumer renders (hidden while an error is shown) | an `aria-describedby` id target only; carries no aria of its own |
| error | consumer renders | `role="alert"` (a PartDecl role) + an `aria-describedby` id target |

The id scheme: the field id IS the control id; the sibling ids are
`${id}-description` and `${id}-error` (`descriptionId()` / `errorId()`
helpers). The client never generates an id -- it reads them off the rendered
parts (Spec 01). The label's `for` tracks whatever id the control actually
carries (author-supplied ids win).

**Empty-id / no-dangle convention** (ratified 2026-07-08, same as `input.md`):
the score reads presence from the ids the harness reads off the DOM, so a
reference is emitted only for a rendered element. `aria-describedby` can never
dangle (a dangling IDREF is an axe `aria-valid-attr-value` violation).

**description-hidden-while-error**: the React and Astro decorators render the
description node only when there is no error, so at most one helper node exists.
Because presence is read from rendered ids, the hidden description contributes
no id and is never referenced -- the ordering rule (error first) and the
hide-while-error rule reconcile with no dangle.

## Not ARIA: what the client/decorator owns, not the projection

- **`disabled` propagation** is a native attribute + property on the control
  (mirrors `input`, whose `disabled` is a native prop), NOT an ARIA projection.
  It reads a host-level signal (`data-disabled`) because the control is slotted
  and SSR cannot reach into it.
- **the `for`/`id` association** is native; `bindField` sets `label[for]` to the
  control's real id (React uses `htmlFor`).
- **the required marker** (an `aria-hidden` glyph) and the **disabled label
  dim** are view/markup, painted from `field.classes.ts`.

## Keyboard and effects

- `keymap`: `null` for every key -- the slotted control owns editing/activation.
- effects: none. No focus-trap, roving, or dismissal. The client is the
  near-empty shape: locate the control, wire the association, apply the ARIA
  projection, propagate `disabled` -- no `createBehavior`, no subscription, no
  keydown listener.

## Oracle dispositions (`src/old/ui/field.*`)

Field's old tree shipped React + a shadow-DOM WC (`field.element.ts`) driven by
host attributes. The semantics carried across; the shadow machinery did not.

| Item | Disposition |
| --- | --- |
| shadcn Field surface (label/description/error props, slotted control, `id` association) | contract -- React is a drop-in |
| id-association scheme (`for`/`id`, `${id}-description`, `${id}-error`) | contract -- the score's id scheme |
| `aria-describedby` composition (error id first, then description id) | contract -- hardened to reference only rendered ids (no dangle) |
| `aria-invalid` on error, `aria-required` on required | contract -- the control ARIA projection |
| `disabled` propagation to the control | contract -- native attribute + property (a decorator/client concern, not ARIA) |
| required marker (`aria-hidden`), `role="alert"` on the error, description-hidden-while-error | contract -- markup/PartDecl role + the decorators' view rule |
| shadow-DOM render (label/desc/error built from host attributes) | dropped -- field is now a light-DOM enhancer; the author/SSR supplies markup, the client only wires (per the authoring guide) |
| `aria-label` mirror onto the control (the shadow label could not cross the tree-scope boundary via `for`/`id`) | defect-do-not-port -- a shadow-boundary workaround; a light-DOM `for`/`id` association needs no mirror |
| runtime attribute re-toggling on the WC (`error`/`disabled` observed, re-wired on change) | framework-affordance -- React re-renders declaratively; the light-DOM client binds once (input/radio-group parity) |
| respecting an author-supplied `aria-describedby` on the control | dropped -- the field OWNS the control's validity/description wiring, so the score's projection is authoritative across all three performances (zero drift). Consumers extend description via the field's `description`, not a manual attribute |
| raw `text-sm` on helper/error text | replaced -- the `text-body-small` typography role token (semantic classes only) |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: the label<->control association (`for`/`id`), `aria-invalid`,
  `aria-required`, and `aria-describedby` are asserted against real DOM ids by
  the harness across React / WC / Astro; `aria-describedby` never dangles.
- 3.3.1 / 3.3.3 (error identification): the error is a real element the invalid
  control references, carrying `role="alert"` so it announces on appearance.
- 1.4.1: the required state is not colour-only -- the visual `*` marker is
  `aria-hidden` and the requirement reaches AT through `aria-required`.
- 1.4.3: the error text uses the destructive token, paired with the programmatic
  `aria-invalid` / error association, never colour alone.
