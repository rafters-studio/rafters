# Component Spec — Sidebar

Status: DRAFT. Compound archetype. Collapsible application navigation rail.

Files (`src/components/sidebar/`):

```
sidebar.classes.ts    sidebar.behavior.ts    sidebar.tsx    sidebar.element.ts    sidebar.astro
```

Tests mirror into `test/components/sidebar/` (behavior + classes + React/WC/Astro
conformance).

## What it is

A persistent navigation rail. On desktop it expands to a full rail or collapses
(to an icon strip or fully off-canvas), and it remembers that choice across
loads. Below the `md` breakpoint the same navigation becomes a MODAL overlay --
the merged `sheet` -- matching shadcn's architecture.

## Composition

```
sidebar (bespoke slice)   state {open, openMobile}, actions open/close/openMobile/closeMobile,
                          parts root/trigger/rail/panel, aria + Escape keymap
sheet (merged component)  the mobile overlay: React renders <Sheet>/<SheetContent>;
                          WC/Astro compose startSheetModalEffects on the panel
```

The slice is bespoke, not `disclosable`: the sidebar has TWO independent axes
(`open`, the persistent desktop expand; `openMobile`, the transient mobile
overlay), and `disclosable` models a single open/closed axis. Both axes are
reducers over the ONE memory cell `createBehavior` owns -- no second cell, per
the cell-ownership rule (createSelectionGroup/createDisclosure do not compose).

Which axis a toggle gesture moves depends on the viewport, a media-query signal
the pure score cannot hold. The routing decision is a pure exported function,
`toggleIntent(state, config, isMobile)`, so it lives IN the behavior; each
performance supplies only the `isMobile` reading and calls it. `isMobile` never
enters the score's state.

The mobile overlay COMPOSES the merged `sheet` rather than re-deriving modality:
the React performance renders `<Sheet open={openMobile}>` + `<SheetContent>`; the
WC/Astro binds compose `startSheetModalEffects` (sheet's own exported modal trio)
on the panel. `openMobile` drives the sheet's open state either way.

## Config, state, actions

```ts
interface SidebarConfig {
  open?: boolean;        // controlled desktop expand
  defaultOpen?: boolean; // uncontrolled seed, default true
  side?: 'left' | 'right';                    // decoration
  variant?: 'sidebar' | 'floating' | 'inset'; // decoration
  collapsible?: 'offcanvas' | 'icon' | 'none';// collapse mode (data hook)
}
interface SidebarState { open: boolean; openMobile: boolean }
type SidebarActions = { open; close; openMobile; closeMobile } // all undefined payload
```

No `toggle` reducer: the trigger/rail/shortcut resolve the effective value and
dispatch `open`/`close` (or `openMobile`/`closeMobile`), so intrinsic state can
never drift from a controlled consumer. The per-axis idempotence gate (open only
when effectively closed, close only when effectively open, and likewise for the
mobile axis) makes `onOpenChange` fire once per real desktop transition and makes
`closeMobile` a no-op while the overlay is already closed.

Only the desktop `open` axis is controllable; the oracle exposed no controlled
mobile prop, so `openMobile` is always intrinsic and has no change callback.

## Parts and ARIA

| Part | Presence | ARIA / data |
| --- | --- | --- |
| root | always | none (the provider wrapper and bind root) |
| trigger | optional | `aria-controls` (desktop panel id, only when real; dropped on mobile where the panel is the Sheet), `data-state` |
| rail | optional | `aria-label="Toggle Sidebar"`, `data-state` |
| panel | always | `data-state` (expanded/collapsed), `data-collapsible` (mode, only while collapsed and not `none`), `data-mobile` (open/closed) |

`role="dialog"` + `aria-modal` + `aria-label="Sidebar"` are NOT in the score's
projection -- they are bind-managed on the panel while the mobile overlay is open
(they depend on the viewport signal, which the score does not hold), mirroring the
React `SheetContent` surface. On mobile in React the panel is not rendered at all
(the overlay is the portaled Sheet), so the trigger drops its `aria-controls`
there to avoid a dangling reference.

The trigger carries NO `aria-expanded`. The gesture moves whichever axis the
viewport selects, so a single expanded value would misreport on the other
viewport; `aria-controls` (a stable relationship, desktop only) is projected
instead. Empty-id convention: a part the binding did not render passes `''`, and
the projection emits `undefined` rather than a dangling reference.

The panel is a single `<nav>`. On desktop the view keys the width collapse off
`data-state`/`data-collapsible` (scoped `md:`). On mobile: in React the `Sidebar`
renders the merged `<Sheet>` instead of the nav (one runtime branch on
`isMobile`, no duplicated children); in WC/Astro the one `<nav>` is enhanced in
place into a modal by the bind, and `hidden` when the overlay is closed.

## Keyboard and dismissal

- **Cmd/Ctrl+B**: an imperative window listener (the shortcut is global, not
  part-scoped) routed through `toggleIntent`. Wired in `bindSidebar` (WC/Astro)
  and a React effect.
- **Escape** on the panel -> `closeMobile`. The bind resolves the keydown part by
  CONTAINMENT (`panel.contains(target)`), never `target.closest('[data-part]')`:
  the latter misroutes when focus rests on a focusable descendant that carries its
  own `data-part` (the rail), the systemic dialog-family defect tracked in #1921.
  React's desktop nav hardcodes the part `'panel'` (the same resolution by
  construction); React's mobile Escape is the Sheet's own. On close the sheet
  focus-trap teardown restores focus to the opener (the trigger).
- **Outside pointerdown** on mobile dismisses via the sheet modal trio's
  `onPointerDownOutside` (sparing the trigger) -- not a bespoke scrim handler.

The mobile overlay is MODAL, via the composed `sheet`: focus is trapped inside,
body scroll is locked, an outside pointerdown dismisses, and -- decisively for
focus management -- the overlay content is UNREACHABLE while closed (React
unmounts `SheetContent`; the WC/Astro bind `hidden`s the panel), so its links
leave the tab order and a11y tree.

## Motion

The DESKTOP horizontal collapse is UNDECLARED. The issue's motion intent is
"expand/collapse: slide, axis x" -- a horizontal collapse (width / off-canvas).
The ratified animated-presence pattern (`motion-expand`/`motion-collapse` +
`grid-template-rows` `minmax(0,0fr)<->minmax(0,1fr)` + `inert` on the collapsed
panel) is the VERTICAL accordion trick and does NOT transfer here:

- `grid-template-rows` animates the block (y) axis; sidebar collapse is the
  inline (x) axis. Applying it would animate height while width is what changes.
- `inert` on the collapsed panel is wrong: an `icon`-mode collapsed rail stays
  VISIBLE and its buttons remain clickable, so marking it `inert` would remove
  live, visible controls from the a11y tree.

No horizontal-slide/width semantic motion token exists yet (the token layer is
being rebuilt, #1899/#1902), so -- following the sheet precedent -- the from/to
states ride the `data-state` hooks while the timing is left to the future token
layer rather than hardcoded (`duration-200 ease-linear` etc. are dropped). The
MOBILE overlay's enter/exit is the merged `sheet`'s own concern, not the
sidebar's. Small `duration-150` hover/press acknowledgments on the menu buttons
are kept (docs/MOTION.md retains interaction feedback), never the layout motion.

## Oracle dispositions (src/old/ui/sidebar.tsx, boundary 9)

Legend: `contract` = preserved semantic; `framework-affordance` = React-only
surface; `dropped` = intentionally not ported; `defect-do-not-port` = oracle bug.

| Oracle feature | Disposition |
| --- | --- |
| `open`/`defaultOpen`/`onOpenChange` on the provider (desktop axis) | contract; dialog-style (no toggle reducer), callback on the desktop axis only |
| two booleans (`open`, `openMobile`) in one memory cell | contract; re-expressed as two axes/reducers over the single score cell |
| `isMobile` as a local media-query signal, not state | contract; kept OUTSIDE the score, consumed via pure `toggleIntent` |
| `toggleSidebar` routing to a viewport-appropriate axis | contract; moved into pure `toggleIntent(state, config, isMobile)` |
| cookie persistence: write on `open` change, seed from `defaultOpen`, never read back | contract; replicated write-only via `memory.select` in the bind and a React effect |
| Cmd/Ctrl+B window shortcut | contract; window listener routed through `toggleIntent` in all three performances |
| mobile overlay = plain scrim button + sliding panel (the rafters oracle's non-modal divergence) | defect-do-not-port; replaced by the merged modal `sheet` -- the non-modal scrim is exactly what left closed-overlay links tab-reachable |
| mobile overlay had NO focus-trap / scroll-lock / outside-dismiss | defect-do-not-port; the composed sheet modal trio supplies all three (WCAG 2.2 AAA focus management) |
| shadcn wraps the mobile sidebar in a modal `Sheet` | contract; now composed -- React renders `<Sheet>`/`<SheetContent>`, WC/Astro compose `startSheetModalEffects` on the panel |
| `side` / `variant` / `collapsible` props | contract; positional/surface decoration as `data-*` + classes, never ARIA |
| `collapsible="none"` non-collapsible branch | contract; `data-collapsible` is never projected for `none` |
| desktop "gap" element for a smooth width transition | dropped; it existed only to animate width, and desktop motion is undeclared |
| Rail (desktop toggle, `tabIndex=-1`, labelled) | contract |
| Inset (`<main>` landmark) | contract |
| Header/Footer/Content/Group(+Label/Action/Content)/Menu(+Item/Button/Action/Badge/Skeleton/Sub/SubItem/SubButton)/Separator | contract; pure decoration (classes + `data-sidebar` attrs), no behavior |
| `asChild` on Trigger/GroupLabel/GroupAction/MenuButton/MenuAction/MenuSubButton | framework-affordance (React) |
| MenuButton `variant`/`size`, MenuSubButton `size`, `isActive` (`data-active`) | contract; decoration variants |
| MenuSkeleton random bar width (`Math.random`) | framework-affordance (React only); the WC/Astro shells do not render skeletons |
| JSDoc claimed a "nav role" landmark but rendered a `<div>` | defect-do-not-port; this port actually delivers `<nav>` for the panel (the landmark the oracle only aspired to) |
| trigger had no `aria-controls`/`aria-expanded` | contract, hardened: desktop `aria-controls` -> panel added (dropped on mobile, where the panel is the Sheet); `aria-expanded` deliberately omitted (viewport-ambiguous) |
| raw `duration-200 ease-linear`/`ease-in-out` desktop collapse transition | defect-do-not-port; raw numeric durations, dropped -- desktop motion undeclared pending horizontal tokens (#1899/#1902) |
| accordion grid-rows/`inert` animated-presence (spawn point 5) | not applicable; horizontal collapse (axis x) and a visible `icon` rail must not be `inert` -- see Motion |

## Known limitations (honest not-delivered)

1. **No desktop collapse animation.** The horizontal expand/collapse is
   state-correct but unanimated until a horizontal-slide / width motion token
   lands (#1899/#1902). The mobile overlay's enter/exit is animated by the merged
   `sheet` (its own concern).

## WCAG obligations

- 1.3.1 / 4.1.2: on desktop the panel is a `<nav>` landmark and the trigger is a
  labelled control wired by real id (`aria-controls`) to it; on mobile the overlay
  is `role="dialog"` + `aria-modal` with an accessible name (`aria-label="Sidebar"`).
  Asserted against real DOM by the conformance harness.
- 2.1.1 / 2.1.2: Escape dismisses the mobile overlay and restores focus to the
  trigger; focus is trapped inside the open overlay and cycles without escaping;
  the collapsed desktop rail stays keyboard-navigable (never removed, never
  `inert`).
- 2.4.3 Focus Order (AAA-grade management): the mobile overlay traps focus while
  open and, while CLOSED, is unreachable -- its links are not in the tab order or
  a11y tree (React unmounts the content; WC/Astro `hidden` the panel), each
  asserted per framework in the conformance suites.
- 2.4.7: token focus ring on the menu controls.
