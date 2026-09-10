# Component Spec — Sidebar

Status: DRAFT. Compound archetype. Collapsible application navigation rail.

Files (`src/components/sidebar/`):

```
sidebar.classes.ts    sidebar.behavior.ts    sidebar.tsx    sidebar.element.ts    sidebar.astro
```

Plus one `.astro` part file per sub-component `sidebar.tsx` exports (#2324;
see Astro composition below): `sidebar-header.astro`, `sidebar-footer.astro`,
`sidebar-content.astro`, `sidebar-group.astro`, `sidebar-group-label.astro`,
`sidebar-group-action.astro`, `sidebar-group-content.astro`,
`sidebar-menu.astro`, `sidebar-menu-item.astro`, `sidebar-menu-button.astro`,
`sidebar-menu-action.astro`, `sidebar-menu-badge.astro`,
`sidebar-menu-skeleton.astro`, `sidebar-menu-sub.astro`,
`sidebar-menu-sub-item.astro`, `sidebar-menu-sub-button.astro`,
`sidebar-separator.astro`, `sidebar-inset.astro`, `sidebar-trigger.astro`,
`sidebar-rail.astro`. `Sidebar` itself is `sidebar.astro`; `SidebarProvider`
has no Astro equivalent (see Astro composition).

Tests mirror into `test/components/sidebar/` (behavior + classes + React/WC/Astro
conformance; the part files' own conformance is
`sidebar-subcomponents.astro.conformance.test.ts`).

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
| dialog | optional (WC/Astro only) | `role="dialog"` + `aria-modal` + `aria-label` while the mobile overlay is open, bind-managed (#2324, Decision 6, 2026-09-09) |

`role="dialog"` + `aria-modal` + `aria-label="Sidebar"` are NOT in the score's
projection -- they are bind-managed while the mobile overlay is open (they
depend on the viewport signal, which the score does not hold), mirroring the
React `SheetContent` surface. **They live on the `dialog` part, never on the
panel** (corrected #2324, Decision 6, 2026-09-09): `role="dialog"` is not an
allowed ARIA role on `<nav>` (axe `aria-allowed-role`; found by the #2222
sweep, filed as #2338). WC/Astro render the panel (`<nav>`) INSIDE a `dialog`
wrapper `<div>` (Astro: `sidebar.astro`'s own markup; WC: authored by the
consumer, since a WC light-DOM enhancer has no template of its own) -- the
wrapper carries the dialog
identity, the `<nav>` stays a `<nav>` on every viewport. The wrapper is
optional in the score (`sidebar.parts.dialog.optional`) so hand-authored WC
markup predating this fix degrades to no dialog role rather than reintroducing
it on the nav. On mobile in React the panel is not rendered at all (the
overlay is the portaled Sheet), so the trigger drops its `aria-controls` there
to avoid a dangling reference.

The trigger carries NO `aria-expanded`. The gesture moves whichever axis the
viewport selects, so a single expanded value would misreport on the other
viewport; `aria-controls` (a stable relationship, desktop only) is projected
instead. Empty-id convention: a part the binding did not render passes `''`, and
the projection emits `undefined` rather than a dangling reference.

The panel is a single `<nav>`. On desktop the view keys the width collapse off
`data-state`/`data-collapsible` (scoped `md:`). On mobile: in React the `Sidebar`
renders the merged `<Sheet>` instead of the nav (one runtime branch on
`isMobile`, no duplicated children); in WC/Astro the one `<nav>` renders inside
a `dialog` wrapper and is `hidden` when the overlay is closed -- the bind puts
the dialog identity on the WRAPPER (never the `<nav>`) and composes the sheet
modal trio's focus-trap on the wrapper too, so a click on the nav's own links
is INSIDE the trap boundary, never a dismiss.

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

## Astro composition (#2324, 2026-09-09)

Sidebar's Astro surface was, until #2324, two named slots (`trigger` and the
default slot) against the 22 sub-components `sidebar.tsx` exports -- the
largest drop-in gap in the tree (spec `00-boundaries.md`'s shadcn-parity
guideline: the composition pattern is part of the API, and named slots alone
are not parity). #2324 ships one `.astro` part file per sub-component, in
shadcn's flat spelling (`SidebarHeader`, not the React-only `Sidebar.Header`
namespaced object at `sidebar.tsx:634-653`, per Decision 1). An Astro tree now
composes exactly like the React tree:

```astro
<Sidebar id="app">
  <SidebarHeader><Logo /></SidebarHeader>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive>
            <a href="/dashboard">Dashboard</a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  <SidebarFooter><UserMenu /></SidebarFooter>
</Sidebar>
<SidebarInset><main>Content here</main></SidebarInset>
```

`sidebar.astro`'s `trigger` and default slots remain as a convenience, matching
card's model -- not the parity surface.

**Two omissions, no part file:** `Sidebar` itself IS `sidebar.astro`.
`SidebarProvider` is React's controlled-state holder (`open`/`defaultOpen`/
`onOpenChange`); Astro has nowhere to put it, so `sidebar.astro`'s own props
already absorb it.

**Eighteen pure-decoration parts** (`SidebarHeader`, `SidebarFooter`,
`SidebarContent`, `SidebarGroup`, `SidebarGroupContent`, `SidebarMenu`,
`SidebarMenuItem`, `SidebarMenuBadge`, `SidebarMenuSkeleton`, `SidebarMenuSub`,
`SidebarMenuSubItem`, `SidebarSeparator`, `SidebarInset`, plus the five
`asChild` parts below) read their class string from `sidebar.classes.ts` --
the SAME projection `sidebar.tsx` reads -- and carry no class of their own,
modelled verbatim on `card-header.astro`: `Props = Omit<HTMLAttributes<T>,
'class'>`, a `class: _discardedClass` destructure, and a rest spread (the
`card-header.astro` passthrough model, per Decision 5 -- no allowlist
introduced here).

**Five `asChild` parts** (`SidebarGroupLabel`, `SidebarGroupAction`,
`SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuSubButton`), per Decision
2 (2026-09-09): "the asChild makes it mirror react and is what people expect."
When `asChild` is true, the part renders its default slot to a string, parses
it with `ultrahtml` (added to `@rafters/ui` dependencies for this), places its
own class string and `data-*` attributes on the FIRST element, drops that
element's own `class`, forwards the caller's passthrough attributes, and emits
with `set:html`; when false or absent, the part renders its own element with a
default `<slot />`. The parse/merge logic is shared once, in
`primitives/astro-as-child.ts`, rather than five times. Consumer syntax
matches shadcn's exactly (the example above). Proven on Astro 6.4.8 and 7.3.2
(legion reflection `01a08406`; `astro check` types `asChild` as `boolean` on
both -- a non-boolean value is a compile error). A slot-function form was
tried and rejected: it works only on the default slot and cannot make the
part's class win without string surgery.

**Attribute precedence on the `asChild` path**, lowest to highest: the props
the caller put on the PART, then the child's own attributes, then the part's
decoration. The first two match React's `mergeProps`, which ends with "default:
child value overrides" -- a child that states its own `id` or `aria-label`
keeps it. Decoration deliberately does NOT: the class and `data-*` projection
IS the contract (Spec 00, boundary 6), so a child cannot make the component look
right while announcing wrong. The child's `class` is dropped rather than merged,
the same discard rafters applies on every target.

Two mechanical points the implementation owns. Values injected into the child
are HTML-escaped first: `ultrahtml` escapes text nodes and never attributes, so
an unescaped value could close the attribute and land a live element in the
`set:html` output. Values PARSED from the child are left alone, because that
parser returns them still encoded and a round trip is lossless; escaping them
again would double-encode. And a slot rendering more than one top-level element
throws, as React's own `asChild` does through `Children.only` -- injecting into
the first and emitting the rest untouched would render markup that escapes both
the decoration and the contract.

React's `SidebarTrigger` also carries `asChild` (`sidebar.tsx:273`); Decision 2
named only the five parts above, so `SidebarTrigger.astro` does not carry it --
a discrepancy between the decision and the React source, flagged rather than
silently extended.

**Trigger and Rail are behavior-connected, not pure decoration.** Their React
performances read `useSidebar()` for `aria-controls`/`data-state`
(`sidebar.astro:92-99`'s own inline computation). Astro has no shared
client-side context, so `sidebar-trigger.astro` and `sidebar-rail.astro`
recompute the SAME projection from the SAME exported pure
`sidebar.initialState`/`sidebar.aria` functions, given an `id` (and
`open`/`defaultOpen`) matching the parent `<Sidebar id="...">` -- the honest
cost of no runtime; a mismatched id produces a trigger whose `aria-controls`
does not resolve. `bindSidebar` resolves parts by
`root.querySelector('[data-part="trigger"]')` inside the `<rafters-sidebar>`
root, so a `<SidebarTrigger>` rendered as a DESCENDANT of that root is found
and kept live by the same bind the built-in inline trigger uses; placed
OUTSIDE the root (shadcn's common pattern of a trigger living in the page
header, beside `SidebarInset`) it still server-renders correctly but does not
receive live updates after a toggle -- a known limitation (below), not a
second binding. `sidebar.astro` has no slot for `SidebarRail` (the inline rail
is hardcoded, with no named-slot escape hatch); its part file exists for the
enumeration and standalone-render requirements, not as a wired alternative to
the inline rail.

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
| shadcn wraps the mobile sidebar in a modal `Sheet` | contract; now composed -- React renders `<Sheet>`/`<SheetContent>`, WC/Astro compose `startSheetModalEffects` on a `dialog` wrapper around the panel (#2324, Decision 6, 2026-09-09 -- corrected from an earlier build that put `role="dialog"` on the panel/`<nav>` itself, an axe `aria-allowed-role` violation, #2338) |
| `side` / `variant` / `collapsible` props | contract; positional/surface decoration as `data-*` + classes, never ARIA |
| `collapsible="none"` non-collapsible branch | contract; `data-collapsible` is never projected for `none` |
| desktop "gap" element for a smooth width transition | dropped; it existed only to animate width, and desktop motion is undeclared |
| Rail (desktop toggle, `tabIndex=-1`, labelled) | contract |
| Inset (`<main>` landmark) | contract |
| Header/Footer/Content/Group(+Label/Action/Content)/Menu(+Item/Button/Action/Badge/Skeleton/Sub/SubItem/SubButton)/Separator | contract; pure decoration (classes + `data-sidebar` attrs), no behavior; importable on every target under shadcn's flat names per the 00-boundaries shadcn-parity guideline. #2324 carries the Astro part files (see Astro composition); the WC surface has no issue carrying it yet |
| `asChild` on GroupLabel/GroupAction/MenuButton/MenuAction/MenuSubButton | contract; React expresses it via `cloneElement`+`mergeProps`, Astro via render-then-inject (#2324, Decision 2, 2026-09-09 -- see Astro composition). React's `SidebarTrigger` also carries `asChild` (`sidebar.tsx:273`); Decision 2 named only these five for Astro and Trigger is not one of them, a discrepancy flagged rather than resolved here |
| MenuButton `variant`/`size`, MenuSubButton `size`, `isActive` (`data-active`) | contract; decoration variants |
| MenuSkeleton random bar width (`Math.random`) | contract; `MenuSkeleton` itself is importable on every target under shadcn's flat name per the 00-boundaries shadcn-parity guideline. #2324 carries the Astro part file (a fresh per-render server value, close enough to the React mount-once value that neither jitters within its own lifetime); the WC surface has no issue carrying it yet |
| JSDoc claimed a "nav role" landmark but rendered a `<div>` | defect-do-not-port; this port actually delivers `<nav>` for the panel (the landmark the oracle only aspired to) |
| trigger had no `aria-controls`/`aria-expanded` | contract, hardened: desktop `aria-controls` -> panel added (dropped on mobile, where the panel is the Sheet); `aria-expanded` deliberately omitted (viewport-ambiguous) |
| raw `duration-200 ease-linear`/`ease-in-out` desktop collapse transition | defect-do-not-port; raw numeric durations, dropped -- desktop motion undeclared pending horizontal tokens (#1899/#1902) |
| accordion grid-rows/`inert` animated-presence (spawn point 5) | not applicable; horizontal collapse (axis x) and a visible `icon` rail must not be `inert` -- see Motion |

## Known limitations (honest not-delivered)

1. **No desktop collapse animation.** The horizontal expand/collapse is
   state-correct but unanimated until a horizontal-slide / width motion token
   lands (#1899/#1902). The mobile overlay's enter/exit is animated by the merged
   `sheet` (its own concern).
2. **`SidebarTrigger`/`SidebarRail` placed outside the `<rafters-sidebar>`
   root do not receive live updates.** `bindSidebar` resolves parts by
   `root.querySelector`, scoped to its own root; a standalone trigger in the
   page header (shadcn's common pattern) server-renders correctly but its
   `data-state`/`aria-controls` go stale after a toggle. Fixing this would mean
   `bindSidebar` searching the whole document by a shared root id -- a
   deliberately out-of-scope change for #2324 (no second binding, no behavior
   change beyond the mobile-dialog fix).
3. **`SidebarRail.astro` has no consumer-facing slot.** `sidebar.astro`
   renders its own rail inline with no named-slot escape hatch, so the part
   file is importable and correct in isolation but not wired into the shipped
   `<Sidebar>` composition.

## WCAG obligations

- 1.3.1 / 4.1.2: on desktop the panel is a `<nav>` landmark and the trigger is a
  labelled control wired by real id (`aria-controls`) to it; on mobile the overlay
  is `role="dialog"` + `aria-modal` with an accessible name (`aria-label="Sidebar"`)
  -- on the `dialog` wrapper in WC/Astro (never the `<nav>`, which does not allow
  `role="dialog"`; the merged `<SheetContent>` in React). Asserted against real
  DOM by the conformance suites.
- 2.1.1 / 2.1.2: Escape dismisses the mobile overlay and restores focus to the
  trigger; focus is trapped inside the open overlay and cycles without escaping;
  the collapsed desktop rail stays keyboard-navigable (never removed, never
  `inert`).
- 2.4.3 Focus Order (AAA-grade management): the mobile overlay traps focus while
  open and, while CLOSED, is unreachable -- its links are not in the tab order or
  a11y tree (React unmounts the content; WC/Astro `hidden` the panel), each
  asserted per framework in the conformance suites.
- 2.4.7: token focus ring on the menu controls.
