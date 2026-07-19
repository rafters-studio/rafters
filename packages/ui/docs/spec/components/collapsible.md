# Component Spec — Collapsible

Status: DRAFT. Disclosure archetype -- the simplest member of the disclosable
family (dialog, popover, sheet fold the same axis).

Files (`src/components/collapsible/`):

```
collapsible.behavior.ts   collapsible.classes.ts   collapsible.tsx
collapsible.element.ts     collapsible.astro
```

Tests mirror into `test/components/collapsible/`: behavior (pure), classes
(parity), and conformance across React, WC, and Astro on the shared harness.

## Composition

```
disclosable (lib)      state {open}, actions open/close, trigger/content parts
collapsible-surface    part only: root
collapsible glue       disabled gate, data-state/data-disabled styling hooks
```

`disclosable` is the reusable open/closed axis. Controlled/uncontrolled per
boundary 4: `config.open` is the consumer's controlled value, `state.open` is
intrinsic, projections and gates read `isOpen(state, config)`. The idempotence
gate (open only when effectively closed, close only when effectively open) makes
consumer callbacks fire once per real transition. The collapsible glue adds one
gate of its own -- a disabled region rejects both actions.

There is no impure work: no overlay, no focus trap, no scroll lock, no
light-dismiss, no announcement. So the score composes no primitive beyond the
disclosable slice, and neither `bindCollapsible` nor the React root runs an
effect. The trigger is a native `<button>`, so Enter and Space arrive as click
and the score declares no keymap.

## Config, state, actions

```ts
interface CollapsibleConfig {
  open?: boolean;        // controlled
  defaultOpen?: boolean; // uncontrolled seed
  disabled?: boolean;    // gates the toggle
}
interface CollapsibleState { open: boolean } // intrinsic only
type CollapsibleActions = { open: undefined; close: undefined };
```

No `toggle` action: the trigger dispatches `open` or `close` computed from the
effective value, so intrinsic state can never drift from a controlled consumer.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-state`, `data-disabled` (when disabled) |
| trigger | always | `aria-expanded`, `aria-controls` (only while content is in the DOM), `data-state`, `data-disabled` (when disabled) |
| content | while open (or forceMount) | `data-state`, `data-disabled` (when disabled) |

The trigger's `aria-expanded` + `aria-controls` is the complete WAI-ARIA
disclosure wiring; `aria-controls` follows the empty-id convention (ratified
2026-07-08) -- projected only when the content id is real and the region is open,
so an initially-closed collapsible never leaks a dangling reference. Native
`disabled` on the trigger is set structurally by each performance (the React
`disabled` prop, the Astro/author markup attribute); the score reads it into
`config.disabled` for the gate.

## Keyboard and effects

- `keymap`: none. The native `<button>` fulfils Enter/Space as click; a disabled
  button suppresses both, and `canDispatch` is the belt-and-suspenders.
- Effects: none. Presence is a pure DOM concern -- the content is
  present-but-hidden in the WC/Astro bind (toggled on the open axis) and mounts
  on open in React (`forceMount` keeps it mounted, hidden, while closed).

## Oracle dispositions (src/old/ui/collapsible.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| disabled prop (gates onOpenChange) | contract (moved from an imperative `if (disabled) return` to the score's `canDispatch` gate) |
| Trigger / Content surface | contract |
| asChild on Trigger and Content | framework affordance (React) |
| forceMount | contract, with a divergence: a force-mounted closed region carries `hidden` (it must stay inert and out of the tab order) |
| root `data-state` / `data-disabled` | contract (projected via the root part) |
| content `aria-labelledby={triggerId}` | defect-do-not-port -- name-from-author is prohibited on a role-less div (axe `aria-prohibited-attr`); the trigger's aria-expanded + aria-controls is the complete disclosure wiring, and Radix omits it too |
| `animate-collapsible-up/down` on content | defect-do-not-port -- those utilities were never defined in the token system, so porting them is dead classes; replaced by `overflow-hidden transition-all duration-200 motion-reduce:transition-none` (declared height-axis intent) |
| exported-but-unwired `collapsibleTriggerClasses` / `collapsibleDisabledClasses` | dropped -- the oracle exported them without applying them; the behavior-layer `collapsibleClasses` returns one coherent set |

## Motion

Expand/collapse along the height axis (y). Declared as intent only:
`overflow-hidden transition-all duration-200 motion-reduce:transition-none`.
Duration and easing come from the token scale; reduced-motion disables the
transition. A keyframed height animation waits on a real
`--collapsible-content-height` utility in the token system.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: the trigger's `aria-expanded` and (while open) `aria-controls`
  are wired to the content's real DOM id, asserted by the harness across all
  three performances.
- 2.1.1: the region is fully operable from the keyboard via the native button
  (Enter/Space); no pointer-only path.
- 2.4.7: a token focus ring on the trigger (`focus-visible:ring-ring` with a
  `ring-offset-background` offset).
- A disabled collapsible advertises the native `disabled` state and cannot be
  toggled by pointer or keyboard.
