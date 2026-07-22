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
loads. Below the `md` breakpoint the same panel becomes a dismissable overlay
over a scrim.

## Composition

```
sidebar (bespoke slice)   state {open, openMobile}, actions open/close/openMobile/closeMobile,
                          parts root/trigger/rail/panel/overlay, aria + Escape keymap
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
| trigger | optional | `aria-controls` (panel id, only when real), `data-state` (expanded/collapsed) |
| rail | optional | `aria-label="Toggle Sidebar"`, `data-state` |
| panel | always | `data-state` (expanded/collapsed), `data-collapsible` (mode, only while collapsed and not `none`), `data-mobile` (open/closed) |
| overlay | optional | `aria-label="Close sidebar"`, `data-state` (open/closed); present-but-hidden off the mobile axis |

The trigger carries NO `aria-expanded`. The gesture moves whichever axis the
viewport selects, so a single expanded value would misreport on the other
viewport; `aria-controls` (a stable relationship) is projected instead. Empty-id
convention: a part the binding did not render passes `''`, and the projection
emits `undefined` rather than a dangling reference.

The panel is a single `<nav>` carrying BOTH axes' hooks; the view keys the
desktop width collapse off `data-state`/`data-collapsible` (scoped `md:`) and the
mobile off-canvas slide off `data-mobile` (below `md`). One element, two
viewports -- never two panels with duplicated ids and duplicated AT content.

## Keyboard and dismissal

- **Cmd/Ctrl+B**: an imperative window listener (the shortcut is global, not
  part-scoped) routed through `toggleIntent`. Wired in `bindSidebar` (WC/Astro)
  and a React effect.
- **Escape** on the panel -> `closeMobile`, restoring focus to the trigger. The
  bind resolves the keydown part by CONTAINMENT (`panel.contains(target)`),
  never `target.closest('[data-part]')`: the latter misroutes when focus rests on
  a focusable descendant that carries its own `data-part` (the rail), the
  systemic dialog-family defect tracked in #1921. React hardcodes the part
  `'panel'` on the element it renders, the same resolution by construction.
- **Scrim click** -> `closeMobile`.

The mobile overlay is DISMISSABLE, not modal: no focus-trap, no scroll-lock, no
outside-click primitive. This is faithful to the oracle (its mobile panel had a
plain scrim button and no trap) and honors the port issue's "add no primitives".
See the dispositions below.

## Motion

UNDECLARED. The issue's motion intent is "expand/collapse: slide, axis x" -- a
horizontal collapse (width / off-canvas translate). The ratified animated-presence
pattern (`motion-expand`/`motion-collapse` + `grid-template-rows`
`minmax(0,0fr)<->minmax(0,1fr)` + `inert` on the collapsed panel) is the VERTICAL
accordion trick and does NOT transfer here:

- `grid-template-rows` animates the block (y) axis; sidebar collapse is the
  inline (x) axis. Applying it would animate height while width is what changes.
- `inert` on the collapsed panel is wrong: an `icon`-mode collapsed rail stays
  VISIBLE and its buttons remain clickable, so marking it `inert` would remove
  live, visible controls from the a11y tree.

No horizontal-slide/width semantic motion token exists yet (the token layer is
being rebuilt, #1899/#1902), so -- following the sheet precedent -- the from/to
states ride the `data-state`/`data-mobile` hooks while the timing is left to the
future token layer rather than hardcoded (`duration-200 ease-linear` etc. are
dropped). Small `duration-150` hover/press acknowledgments on the menu buttons
are kept (Spec 04 retains interaction feedback), never the layout motion.

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
| mobile overlay = scrim button (click closes) + sliding panel | contract; the dismissable (non-modal) overlay is preserved |
| mobile overlay had NO focus-trap / scroll-lock / outside-click / Escape | contract for the first three (deliberately add none -- issue: "add none"); Escape ADDED as an a11y hardening (panel keymap, containment-resolved) |
| shadcn wraps the mobile sidebar in a modal `Sheet` | dropped; the rafters oracle diverged to a non-modal scrim, and this port keeps that (documented divergence from shadcn, per issue point 7) |
| `side` / `variant` / `collapsible` props | contract; positional/surface decoration as `data-*` + classes, never ARIA |
| `collapsible="none"` non-collapsible branch | contract; `data-collapsible` is never projected for `none` |
| desktop "gap" element for a smooth width transition | dropped; it existed only to animate width, and motion is undeclared |
| Rail (desktop toggle, `tabIndex=-1`, labelled) | contract |
| Inset (`<main>` landmark) | contract |
| Header/Footer/Content/Group(+Label/Action/Content)/Menu(+Item/Button/Action/Badge/Skeleton/Sub/SubItem/SubButton)/Separator | contract; pure decoration (classes + `data-sidebar` attrs), no behavior |
| `asChild` on Trigger/GroupLabel/GroupAction/MenuButton/MenuAction/MenuSubButton | framework-affordance (React) |
| MenuButton `variant`/`size`, MenuSubButton `size`, `isActive` (`data-active`) | contract; decoration variants |
| MenuSkeleton random bar width (`Math.random`) | framework-affordance (React only); the WC/Astro shells do not render skeletons |
| JSDoc claimed a "nav role" landmark but rendered a `<div>` | defect-do-not-port; this port actually delivers `<nav>` for the panel (the landmark the oracle only aspired to) |
| trigger had no `aria-controls`/`aria-expanded` | contract, hardened: `aria-controls` -> panel added; `aria-expanded` deliberately omitted (viewport-ambiguous) |
| raw `duration-200 ease-linear`/`ease-in-out` collapse + slide transitions | defect-do-not-port; raw numeric durations, dropped -- motion left undeclared pending horizontal tokens (#1899/#1902) |
| accordion grid-rows/`inert` animated-presence (spawn point 5) | not applicable; horizontal collapse (axis x) and a visible `icon` rail must not be `inert` -- see Motion |

## Known limitations (honest not-delivered)

1. **Mobile-closed panel remains tab-reachable.** With one panel + CSS translate,
   a closed mobile overlay's links are translated off-screen but stay in the a11y
   tree. This is not hidden with reactive `inert` on purpose: the same element is
   the desktop `icon` rail, which must stay reachable, so a mode-dependent `inert`
   would wrongly hide it. A future fix belongs to the presence/token layer.
2. **No animation.** Collapse and slide are state-correct but not animated until
   horizontal-slide motion tokens land (#1899/#1902).
3. **Non-modal mobile overlay.** No focus containment or scroll lock on mobile;
   this matches the oracle and the "add no primitives" constraint. If a modal
   mobile sidebar is later wanted, compose the sheet modal trio then.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: the panel is a `<nav>` landmark; the trigger is a labelled
  control wired by real id (`aria-controls`) to the panel; the scrim is a
  labelled dismiss button. Asserted against real DOM by the conformance harness.
- 2.1.1 / 2.1.2: Escape dismisses the mobile overlay and restores focus to the
  trigger; the collapsed desktop rail stays keyboard-navigable (never removed
  from the tree, never `inert`).
- 2.4.7: token focus ring on the menu controls.
