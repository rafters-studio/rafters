# Component Spec -- Context Menu

Status: PORTED (wave-4). The first menu-collection-popup on the behavior layer.

Right-click contextual action popup. Same menu machinery as a dropdown -- a
`role="menu"` surface of items with roving focus, typeahead, and dismissal -- but
summoned by a pointer gesture AT the cursor point instead of anchored to a
trigger. Replaces the imperative `old/ui/context-menu.tsx` effects wholesale.

Files (`src/components/context-menu/`):

```
context-menu.classes.ts   context-menu.behavior.ts
context-menu.tsx          context-menu.element.ts   context-menu.astro
```

Tests mirror into `test/components/context-menu/`: behavior (pure), classes,
and React + WC + Astro conformance via the shared harness.

## Composition

One custom slice (not `disclosable`, because the open action carries the pointer
point): `context-menu` owns the whole score. Impure work is composed DIRECTLY
from the primitives -- effects-as-data is retired (Spec 03).

```
context-menu slice     state {open, x, y}, actions openAt/close, trigger/content parts,
                       aria (menu orientation + presence), Escape keymap
collision-detector     computePosition at a {x, y} point anchor (cursor placement)
roving-focus           vertical roving tabindex across the items
typeahead              type-to-search over the items
outside-click          onPointerDownOutside dismissal
```

`startContextMenuEffects({ content, loop, onDismiss })` composes the
roving/typeahead/dismiss trio and returns one cleanup; both `bindContextMenu`
(WC/Astro) and a React `useEffect` call it on the open transition and tear it
down on close. `positionContextMenuContent(content, point, config)` runs the
collision math once, shared by every client so placement lives in ONE place.

Submenus are a SECOND score, `contextSubMenu` -- a nested disclosure widget gets
its own `createBehavior` instance (a distinct behavior, NOT a second cell folded
into the parent's one cell). It has the same menu machinery, opened from a
sub-trigger that is itself a menuitem of the parent and anchored to the RIGHT of
that trigger via `positionSubContent`. The sub-content is moved to `document.body`
so it escapes the parent's `overflow-hidden` AND leaves the parent's roving and
keyboard scope (nested menuitems would otherwise pollute the parent's item list).
`bindContextSubMenu` binds one submenu and recurses into nested ones; the React
`ContextMenu.Sub`/`SubTrigger`/`SubContent` mirror it. Hover-open/close is CSS
and tokens only (#2152, following #2148's shape): pointerenter/pointerleave
dispatch `open`/`close` the instant the event fires, with no JS timer of any
kind, and the perceived hover-intent delay is a `transition-delay` on
`subContent`'s reveal rule, consuming `--rafters-delay-hover-intent`. The
reveal is native `:hover`/`:focus-within` over the sub-trigger/sub-content
siblings the SSR markup authors, so nothing but CSS decides when it fires (not
a no-JS floor -- spec correction 2026-08-28: the parent menu itself opens only
on the `contextmenu` event, which requires script); once bound (sub-content
moves to `document.body`, below), `data-[state=open]` -- carrying the identical
duration/curve/delay -- is what governs it instead. Keyboard is the required
floor either way.

Highlighted item is NOT score state: it is ephemeral DOM state owned by
roving-focus (the focused item's tabindex), exactly as navigation-menu keeps
focus movement out of the score. The pointer point IS score state (`openAt`
records it), because a controlled/SSR client must be able to project it.

## Config, state, actions

```ts
interface ContextMenuConfig {
  open?: boolean;            // controlled
  defaultOpen?: boolean;    // uncontrolled seed
  loop?: boolean;           // roving wrap, default true
  avoidCollisions?: boolean; // flip/clamp off viewport edges, default true
}
interface ContextMenuState { open: boolean; x: number; y: number }
type ContextMenuActions = {
  openAt: { x: number; y: number }; // right-click opens/repositions at the point
  close: undefined;
};
```

Controlled/uncontrolled per boundary 4: `config.open` shadows intrinsic
`state.open`; projections and gates read `isContextMenuOpen(state, config)`. The
idempotence gate rejects `close` when already closed, so a consumer callback
fires once per real close. `openAt` is never gated: re-opening at a new point is
a legitimate move (the menu follows the cursor).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `data-state`; no role (a right-click region has no keyboard equivalent, so an `aria-haspopup` on a non-interactive host would mislead AT). `tabindex="-1"` so focus can be restored here on close |
| content | while open (React unmounts; WC/Astro `hidden`-toggle) | `role="menu"`, `aria-orientation="vertical"`, `data-state`, `hidden` (absent while open) |
| sub-trigger | always (a menuitem of the parent) | `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` (only while the submenu is open), `data-state` |
| sub-content | always (WC/Astro); while open in React (`usePresence` unmounts once the close transition finishes) -- never `hidden` (#2152: a hidden node cannot transition, and the CSS reveal must run once the menu is open) | `role="menu"`, `aria-orientation="vertical"`, `data-state`, `data-open-source` (`pointer` or `discrete` while open, reflecting the input that opened it; absent while closed or on a controlled/never-dispatched open), `aria-hidden` (while closed) |

Items are `menuitem` / `menuitemcheckbox` / `menuitemradio` in the decorators;
they carry no per-instance sibling ids, so the score declares no `instanceAria`
(roving owns their tabindex; typeahead owns their search). Disabled items carry
`data-disabled` and are skipped by both primitives.

## Keyboard and effects

- `keymap`: Escape -> `close` (idempotence-gated). Focus opens inside the menu,
  so a content-scoped listener is sufficient.
- Arrow Up/Down, Home/End: roving-focus (vertical), wrapping when `loop`.
- Printable keys: typeahead focuses the first matching item.
- Enter/Space on a focused item: activate it (native `<div>` items emit no
  click), then the click path selects-and-closes.
- Outside pointerdown: `onPointerDownOutside(content, close)`.
- On open: focus moves to the first enabled item. On close: focus restores to
  the trigger.
- Submenu: ArrowRight (or Enter/Space) on a sub-trigger opens the submenu and
  focuses its first item; ArrowLeft or Escape from the sub-content closes it and
  restores focus to the sub-trigger; hover/focus opens and closes it too, with
  the hover-intent delay living entirely in CSS (`context-menu.classes.ts`,
  #2152) rather than a JS timer. Selecting a submenu item collapses the whole
  tree; closing the parent collapses any open submenu.

## Motion

The content enters on the semantic `motion-dropdown-in` token (fade + zoom, the
dropdown duration tier and enter curve), toggled by `data-[state=open]`. No raw
numeric durations or hand-picked easings (Spec 05). Positioning uses `left`/`top`
(not `transform`) so the enter transform (scale) is free for the token to drive.

Exit motion (`motion-dropdown-out`) is intentionally NOT declared: the content
toggles `hidden` when closed, so the exiting node leaves the box model before an
out transition can play. A played exit awaits the Presence layer (docs/MOTION.md);
declaring it now would be a silent no-op. No motion token is missing -- both
`motion-dropdown-in` and `-out` exist; only the presence plumbing to run the exit
does not yet.

## Oracle dispositions (src/old/ui/context-menu.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| right-click opens at the cursor `{clientX, clientY}` | contract (now score state `openAt`, placed via collision-detector's point anchor) |
| controlled/uncontrolled + onOpenChange | contract |
| Trigger / Content / Item / CheckboxItem / RadioGroup / RadioItem / Separator / Label / Group / Shortcut | contract |
| Portal | contract (thin passthrough; Content brings its own portal) |
| Escape closes | contract (moved from a document listener to the content keymap) |
| outside pointerdown closes | contract (composed via outside-click, not the standalone dismissable-layer stack) |
| roving focus + typeahead + focus-first-on-open | contract (composed from the primitives on the open transition) |
| avoidCollisions / viewport-edge clamp | contract (hand-rolled edge math replaced by collision-detector `computePosition`) |
| `asChild` on Trigger | framework affordance (React) |
| CheckboxItem/RadioItem check + dot indicator SVGs | framework affordance (React markup) |
| `onSelect` cancelable event, `onCheckedChange`, radio `onValueChange` | contract (consumer callbacks at the React boundary) |
| Sub / SubTrigger / SubContent (nested submenu, hover-intent) | contract -- its own `contextSubMenu` score, composed from the same primitives (roving/typeahead + collision-detector anchored to the sub-trigger). The oracle's `setTimeout` hover-open is GONE (#2152): hover/focus dispatch open/close immediately and the hover-intent delay is a CSS `transition-delay` on `subContent`, the same shape #2148 gave tooltip/hover-card. Bound in all three frameworks; supports arbitrary nesting |
| `alignOffset` prop on Content | dropped -- cursor placement uses side='bottom' align='start' at the point; the offset knob had no wave-4 consumer and no oracle test exercised a non-zero value |
| raw `duration-100` transitions and `animate-in`/`zoom-*` utilities | defect-do-not-port -- replaced by the semantic motion tokens (Spec 05 prohibits raw numeric durations) |

## Deltas from the oracle

1. `tabindex="-1"` on the trigger so `focus()` can restore focus to the
   right-click region when the menu closes, without adding it to the Tab order.
2. Positioning via `left`/`top` rather than the oracle's `left`/`top` on a React
   state object -- the point now lives in the score, read by every client.
3. Content presence: React unmounts the closed menu; WC/Astro keep it in light
   DOM and toggle `hidden` (the bind reads it for the composed primitives) --
   the same split dialog uses.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="menu"`, `aria-orientation`, and the menuitem roles are
  asserted against real DOM by the harness; disabled items carry `aria-disabled`.
- 2.1.1: full keyboard operation -- arrows/Home/End (roving), typeahead,
  Enter/Space (activate), Escape (dismiss).
- 2.4.3 Focus Order: focus moves into the menu on open (first enabled item) and
  restores to the trigger on close.
- 4.1.2 name/role/value: the menu carries an accessible name (consumer
  `aria-label` in React/WC, the trigger label in the Astro SSR harness).
