# Spec 03 — Effects (RETIRED)

Status: **RETIRED 2026-07-19.** Supersedes FROZEN-2026-07-09. The effects-as-data
vocabulary this spec defined (`EffectSpec[]` returned from `effects()`, reconciled by a
runner, mapped to primitives by executors) is removed. Behaviors now compose the
primitives **directly**. This file is kept as the record of what changed and why, and to
carry forward the two rulings that are still true (temporal kinds, non-modal).

## Why it was retired

Every `EffectSpec` arm wrapped a primitive that already existed (`sr-announcer`,
`focus-trap`, `roving-focus`, `typeahead`, `outside-click`, `hover-delay`). The layer
added nothing but a translation step — and its blank executor slot was a honeypot: two
executors (`grid-roving`, `hover-intent`) **reimplemented** their primitives
(`roving-focus`, `hover-delay`) instead of composing them, because a `case` in a switch is
a place to write a half-solution, whereas `createRovingFocus(root, { columns })` is not.

The mandate here ("a component that needs an effect the vocabulary cannot express is a
change request against THIS spec") is exactly what caused the accretion: it told every port
to ADD an arm rather than reach for — or extend — a primitive.

## The rule now

A behavior **composes primitives directly**. Impure work lives in a composition function in
the behavior file; each framework boundary calls it and nothing more:

- The composition (start the primitives, hold their cleanups) lives in `x.behavior.ts` — a
  plain function (e.g. `startDialogModalEffects({ content, getTrigger, onDismiss })`) when
  it composes more than one primitive, or an inline call when it is one.
- **WC / Astro**: `bindX` calls it on the relevant transition, holds the cleanup, tears down.
- **React**: a `useEffect` calls the SAME function, returns its cleanup.

There is no `EffectSpec`, no `effects()` member, no `createEffectRunner`, no `EffectHost`,
no `use-behavior-effects`. Need a capability → compose the primitive from the primitives
matrix. Need a capability no primitive has → **extend or add a PRIMITIVE**, never a local
executor. See `05-authoring.md`; references: `radio-group` (one primitive, direct call) and
`dialog` (multi-primitive composition function).

## Carried forward — still true

**Temporal kinds** (the composition function owns this lifecycle, not a runner):
- **One-shot / edge-triggered** (e.g. a screen-reader announce): fire once on the state
  TRANSITION, not on baseline mount — a component that mounts already-loading must not
  announce "Loading". The composition tracks the previous value and fires only on the edge.
- **Ongoing / level-triggered** (focus-trap, scroll-lock, dismiss, roving): start when the
  condition becomes true (including a component that mounts already-open — a dialog that
  mounts open IS trapped), and tear down when it becomes false or on unmount. The primitive
  returns the cleanup.

**Which primitive each old effect composed** (use this as the composition map):

| old effect | compose this primitive |
| --- | --- |
| announce | `sr-announcer` (`announceToScreenReader` / `createPoliteAnnouncer`) |
| focus-trap | `focus-trap` (`createFocusTrap`) — cleanup restores focus |
| scroll-lock | `focus-trap` (`preventBodyScroll`) |
| dismiss-on-outside | `outside-click` (`onPointerDownOutside`) — spare `exceptParts`; a layer's own trigger must not dismiss then re-activate on one gesture |
| roving-focus | `roving-focus` (`createRovingFocus`) |
| grid-roving | `roving-focus` extended to 2D (`{ columns }`) — do NOT reimplement it |
| hover-intent | `hover-delay` (`createHoverIntent` / `createControlledHoverDelay`) — do NOT reimplement it |
| typeahead | `typeahead` (`createTypeahead`) |

**Non-modal ruling (2026-07-08, still holds):** a non-modal overlay composes NO focus-trap
and NO scroll-lock; pointer events pass through; outside-dismiss still applies. Modality
selects which primitives the behavior composes; it never changes a primitive's meaning.
