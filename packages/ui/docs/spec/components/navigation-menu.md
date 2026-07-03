# Component Spec — Navigation Menu

Status: DRAFT. Third test article: many-instance parts, effect-owned focus,
time-based interaction (hover intent), and the component whose oracle
controller was the exact pattern the behavior layer exists to replace.

Files (`src/components/navigation-menu/`):

```
navigation-menu.classes.ts    navigation-menu.behavior.ts    navigation-menu.tsx
```

Tests mirror into `test/components/navigation-menu/`. WC and Astro
performances not yet written (same debt as button and dialog).

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
