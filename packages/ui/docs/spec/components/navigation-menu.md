# Component Spec — Navigation Menu

Status: DRAFT. Third test article: many-instance parts, effect-owned focus,
time-based interaction (hover intent), and the component whose oracle
controller was the exact pattern the behavior layer exists to replace.

Files (`src/components/navigation-menu/`):

```
navigation-menu.classes.ts    navigation-menu.behavior.ts    navigation-menu.tsx
navigation-menu.astro    navigation-menu-list.astro    navigation-menu-item.astro
navigation-menu-link.astro
```

Tests mirror into `test/components/navigation-menu/`. WC performance not yet
written (same debt as button and dialog).

## Astro performance: closed panels, correlated ids, folded item

`navigation-menu.astro` (root `<nav>`), `navigation-menu-list.astro`
(`<ul>`), `navigation-menu-item.astro` (`<li>` holding one trigger/content
pair), and `navigation-menu-link.astro` (`<a>`) join `navigation-menu.tsx`
as the score's second render target. Unlike dialog.astro, content is not
dropped: `content` is declared "ALWAYS in the DOM, hidden when closed" so
navigation links stay crawlable, and that presence needs no effect to be
honest. What IS dropped is ever being open: `toggle`/`hoverOpen` dispatch
through a click/hover loop this tier does not have, backed by
`dismiss-on-outside` and an Escape `keymap` this tier cannot honor either.
An SSR-open item would show `aria-expanded="true"` with no way for a
keyboard or screen-reader user to close it -- the same lie dialog.astro's
dropped `open` state was ruled against -- so `value`/`defaultValue` are not
exposed as config anywhere in this directory's Astro surface, and every
panel renders `hidden`/`data-state="closed"`. `delayDuration` is dropped
too: it only feeds `hover-intent`, which never runs here, and a knob with no
observable effect is its own dishonesty (dialog.astro precedent).
`orientation` stays, since it drives a real `data-orientation` projection
on both root and list.

`navigation-menu-item.astro` renders BOTH the `trigger` and `content` parts
from one file, unlike the React tree's Item/Trigger/Content three-way split.
Astro's slot model has no context: a component cannot hand computed ids to
independently-rendered slotted children the way React's
`NavigationMenuItemContext` hands `triggerId`/`contentId` down. Splitting
trigger and content into two sibling files would force the same
`nav-trigger-${value}` / `nav-content-${value}` id-format string into two
places with no shared source -- the "two performances share a line beyond
the adapter" drift boundary 3 rules against, since Astro has no adapter to
hold it once. Folding both parts into one file computes the id pair ONCE.
`navTriggerAria`/`navContentAria` still run for real against the closed
state, so the projected `aria-expanded`/`aria-controls`/`aria-labelledby`/
`hidden` are score-derived, not hand-authored.

`data-roving-item` is dropped, not carried over: it exists so the
`roving-focus` effect can enumerate triggers, and that effect never runs
here. `aria-haspopup="menu"` is not ported (disposition below:
defect-do-not-port). Viewport and Indicator are dropped entirely, not
un-rendered for some inputs: both only render while open or `forceMount`,
and this tier's `open` is never true, so they contribute nothing but inert
markup -- consistent with the spec's own note that they have "no
consumers exist." The chevron glyph and `NavigationMenuLink`'s `data-active`
passthrough are ported (`asChild` is not: no Astro equivalent, and the
plain `<a>` covers the one real use).

Conformance (`navigation-menu.astro.conformance.test.ts`, container's
standalone `AstroContainer` pattern since navigation-menu has no shared
adapter suite the way button does) ports the closed-panel and
correlated-id scenarios from the React suite; click/roving-focus/
ArrowDown-open/Escape/dismiss/hover-intent scenarios drop along with the
interaction, not skip-registered.

## What the score owns vs what effects own

The score's ONLY state axis is which item is open (`active`), plus one
bookkeeping bit (`pointerOpened`, below). Focus position across triggers is
NOT state — it is ephemeral DOM state owned by the `roving-focus` effect.
Hover timing lives in the `hover-intent` effect. The oracle's 250-line
imperative controller (selection group + DOM reflection + timers + listener
delegation, mounted via callback ref with a mirror store) reduces to: three
reducers, one keymap, one effects function.

## Config, state, actions

```ts
interface NavigationMenuConfig {
  value?: string;          // controlled ('' = none)
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical'; // default horizontal
  delayDuration?: number;  // hover-intent ms, default 200
}
interface NavigationMenuState {
  active: string | null;   // intrinsic open item
  pointerOpened: boolean;  // opened-by-hover bookkeeping
}
type Actions = { open: string; hoverOpen: string; toggle: string; close: undefined };
```

`pointerOpened` exists because pointerenter precedes pointerdown in the same
gesture: hover-intent switches to the hovered trigger immediately, and the
click that lands milliseconds later must not close what the hover just
opened. `toggle` absorbs exactly one post-hover click. The oracle closed on
that click — live defect, found by the conformance suite.

Callback protocol (binding, mechanical): fire `onValueChange` only when an
accepted dispatch actually moved the effective value — read intrinsic state
after the reducer, compare with effective before. No duplicated reducer
logic in the binding.

## Parts

| Part | Multiplicity | Notes |
| --- | --- | --- |
| root | one | `<nav>`, `aria-label="Main navigation"` (overridable), data-orientation, data-state |
| list | one | `<ul>`, roving-focus region |
| trigger | many | native button; data-value, data-roving-item; per-instance aria via `navTriggerAria` |
| content | many | ALWAYS in the DOM, `hidden` when closed — navigation links must be crawlable and SSR-stable |

Item/Link/chevron are presentation (no behavior state). Viewport and
Indicator: deferred, needs ruling (decorative chrome; no consumers exist).

**Contract amendment discovered:** Spec 01 `aria()` projects one AriaAttrs
per part NAME; `many` parts need per-instance projection. Interim: the score
exports pure `navTriggerAria(value, state, config, ids)` /
`navContentAria(...)` beside the spec. Amendment candidate: instance-keyed
projections for `many` parts.

**Second amendment (applied):** `keymap` now takes `config` — ArrowDown
opens only when the roving axis is horizontal, which is a config fact.

## Keyboard

- Arrow/Home/End across triggers: roving-focus effect (manual activation —
  moving focus does not open).
- ArrowDown on a trigger (horizontal axis): `open`.
- Enter/Space on a trigger: `toggle` — declared in the keymap, fulfilled by
  the native button's click (Spec 01 rule 5); the binding must NOT also
  dispatch on keydown or every keyboard activation double-fires.
- Escape from anywhere inside: `close`; the binding refocuses the trigger
  that was open (mechanical: it knows the value it just closed).

## Effects

| When | Effects |
| --- | --- |
| always | `roving-focus(list, orientation)`, `hover-intent(root, delay, immediate=isOpen, hoverOpen/close)` |
| open | + `dismiss-on-outside(root, close)` |

Hover-intent semantics (executor): enter trigger -> open after `delay` when
nothing is open, immediately when something is (menubar switching); enter
content cancels the pending close; leave triggers/content -> close after
`delay`. Effect identity includes `immediate`, so crossing open/closed
restarts the executor with fresh timers.

## Oracle dispositions (src/old/ui/navigation-menu.{tsx,controller.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| single-open collapsible selection, controlled/uncontrolled | contract |
| roving focus across triggers (arrows/Home/End, wrap) | contract (as effect) |
| hover intent: delayed open, immediate switch, shared close timer, content-hover keeps open | contract (as effect) |
| Escape closes + refocuses trigger; outside pointerdown closes | contract |
| ArrowDown opens (horizontal only) | contract |
| content stays mounted, hidden when closed | contract |
| Link `active` prop -> `data-active` styling | contract |
| asChild on Link | framework affordance (React) |
| trigger chevron glyph | port (oracle-traceable) |
| `aria-haspopup="menu"` on triggers | defect-do-not-port — content is not `role="menu"`; haspopup promises menu semantics (4.1.2) |
| click-after-hover-switch closes the just-opened menu | defect-do-not-port — fixed via `pointerOpened` absorb |
| inline `visibility/height/overflow` hide-state on content | defect-do-not-port — controller-era SSR workaround; `hidden` from the projection does the job |
| `aria-hidden` alongside `hidden` on content | simplified — `hidden` suffices |
| Viewport / Indicator components, `forceMount` | contract (ruled 2026-07-03: shadcn surface is the floor). Declared as optional parts; chrome state projected by the score (viewport data-state open/closed, indicator visible/hidden, aria-hidden). Oracle's inline visibility/height hide-state not ported; `hidden` while closed under forceMount |
| `navigationMenuTriggerStyle()` | contract (shadcn export; thin view over the trigger classes) |
| typeahead | never existed in the oracle; menubar-pattern concern, not disclosure nav — not ported |

## Deltas that need Sean's eye

1. Content panel styling: the oracle's panels were bare (`absolute left-0
   top-0 w-full`) and relied on the Viewport component for the popover
   surface. With Viewport deferred, the panel carries the surface styles
   (border, bg-popover, shadow, top-full) — agent-assembled from the
   oracle's viewport classes, needs a designer ruling.
2. Trigger touch floor: `h-11` touch, `@md:h-10` desktop per the CQ rule
   (oracle was fixed `h-10`).

## WCAG 2.1 AA obligations

- 4.1.2: aria-expanded/aria-controls wired by real ids, no false haspopup.
- 2.1.1: full keyboard operation (roving arrows, ArrowDown open, Enter/Space
  toggle, Escape close) asserted in conformance.
- 2.4.3: roving tabindex keeps one tab stop for the bar; Escape restores
  focus to the trigger.
- 2.4.7: token focus ring on triggers and links.
