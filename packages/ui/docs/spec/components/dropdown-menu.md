# Component Spec — Dropdown Menu

Status: PORTED (wave-4). Archetype: `menu-collection-popup`.

An anchored action menu disclosed by a trigger. Opening lands focus on the first
item; roving-focus moves it with the arrow keys, typeahead jumps to the first
matching label, and activating an item runs its action and closes. The overlay
composes its dismissal DIRECTLY (outside-click + Escape via the keymap), the
canonical port-wave path -- never the `dismissable-layer` stack.

Files (`src/components/dropdown-menu/`):

```
dropdown-menu.classes.ts   dropdown-menu.behavior.ts
dropdown-menu.tsx          dropdown-menu.element.ts   dropdown-menu.astro
```

Tests mirror into `test/components/dropdown-menu/`: behavior (pure), classes
parity, and conformance across React + WC + Astro via the shared harness.

## Composition

```
disclosable (lib)        state {open}, actions open/close, trigger/content parts
dropdown-menu-structure  parts only: root, item (many)
dropdown-menu glue       trigger haspopup, menu role/orientation/labelledby, Escape keymap
```

`disclosable` is the reusable open/closed axis (dialog folds it too): a reducer
over the ONE `createBehavior` cell, never a second `createDisclosure`. Controlled
config shadows intrinsic state; projections and the idempotence gate read
`isOpen(state, config)`, so a controlled consumer's callback fires once per real
transition.

The impure work is composed directly by the bindings (there is no effect
runner): `startDropdownMenuEffects({ content, getTrigger, onDismiss })` starts
`createRovingFocus` (vertical) + `createTypeahead` + `onPointerDownOutside`
(sparing the trigger) on the open transition and tears them down on close.
`bindDropdownMenu` (WC/Astro) and a React `useEffect` call the same function.

### Highlighted item = roving-focus current item (not score state)

The issue lists "open, highlighted item" as the states. `open` is score state.
The highlighted item is NOT: it is ephemeral DOM focus owned by `roving-focus`,
styled via `:focus`, exactly the stance navigation-menu documents for its
trigger focus movement. The oracle carried no `data-highlighted` and no
pointer-move-to-focus; select tracks a highlight only because it projects
`data-highlighted` keyed by an option `value`, which menu action items do not
have. Reducing it to `:focus` is faithful extraction, not a dropped state.

## Config, state, actions

```ts
type DropdownMenuConfig = { open?: boolean; defaultOpen?: boolean }; // = DisclosableConfig
type DropdownMenuState = { open: boolean };                          // intrinsic only
type DropdownMenuActions = { open: undefined; close: undefined };
```

No `toggle` action: the trigger dispatches `open` or `close` computed from the
effective value, so intrinsic state can never drift from a controlled consumer.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-state` |
| trigger | always | `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` (only while the menu id is real and open), `data-state` |
| content | present, hidden while closed | `role="menu"`, `aria-orientation="vertical"`, `aria-labelledby` (the trigger, only when its id is real), `data-state` |
| item (many) | present | role is author markup (`menuitem` / `menuitemcheckbox` / `menuitemradio`); `data-roving-item`, `tabindex=-1`, `aria-disabled`/`data-disabled` when disabled; `aria-checked` + `data-state` on checkbox/radio items (consumer-controlled) |

The `item` PartDecl carries NO `role`, so checkbox/radio variants keep their own
role. Empty-id convention (ratified 2026-07-08): a binding passes `''` as the
PartId of a part it did not render; projections emit `undefined` for references
to empty ids, so `aria-controls`/`aria-labelledby` never dangle (an axe
violation). The menu stays in light DOM present-but-hidden so the
roving/typeahead/dismiss effects can read it and the markup is crawlable/SSR
stable.

## Keyboard

- Trigger `ArrowDown`/`ArrowUp`/`Enter`/`Space` -> `open` (score keymap). The
  decorator `preventDefault`s, suppressing the native button click Enter/Space
  would otherwise fire (which would toggle back closed).
- Content/item `Escape` -> `close` (score keymap); focus returns to the trigger.
- Arrow keys within the menu rove focus (roving-focus, vertical, looping),
  skipping disabled items; `Home`/`End` jump to the first/last.
- Typing jumps focus to the first item whose label matches (typeahead).
- `Enter`/`Space` on a focused item ACTIVATE it. This is the div-as-button
  affordance (the oracle's `handleKeyDown === handleClick`): the decorator routes
  it through the item's single click path, which runs the consumer action and
  dispatches the score's `close`. It is deliberately NOT a score keymap action --
  activation is a consumer concern; only its state effect (close) is the score's.

## Motion

Enter/exit and interaction motion are left UNDECLARED. The semantic
`motion-dropdown-in`/`-out` utilities are not yet emitted by the token layer
(#1899/#1902-1904), and the oracle's `animate-in`/`zoom`/`fade`/`slide` +
`duration-N` string is precisely the prohibited hand-rolled form
(05-authoring.md, MOTION.md). Per the issue, the motion is left undeclared rather
than hardcoded; the menu shows/hides via `hidden`. When the token layer ships,
`classes.content` gains `motion-dropdown-in`/`-out` with `data-[state]`-toggled
from/to values and a presence adapter to keep the exiting node mounted.

## Oracle dispositions (src/old/ui/dropdown-menu.tsx)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled open + onOpenChange | contract (reducer over the disclosable cell; the oracle's second `createDisclosure` cell dropped) |
| Trigger / Content / Group / Label / Item / Separator / Shortcut surface + `DropdownMenu.*` namespace | contract |
| CheckboxItem / RadioGroup / RadioItem | contract (React); `checked`/`value` are consumer-controlled state, NOT a score axis |
| roving focus + typeahead across all three item roles | contract (composed directly via startDropdownMenuEffects; `data-roving-item` on every item so checkbox/radio roles rove too) |
| Escape closes, focus returns to the trigger | contract (moved from a document listener to the content keymap) |
| outside-pointerdown closes, sparing the trigger | contract (`onPointerDownOutside`, trigger spared) |
| focus first item on open | contract |
| Enter/Space activates a menu item | contract (div-as-button click path; state effect is the score's `close`) |
| asChild on Trigger / Content / Item | framework affordance (React) |
| checkbox toggle / radio selection | framework affordance (React `onCheckedChange`/`onValueChange`); in WC/Astro `aria-checked` is author markup the bind does not own |
| Sub / SubTrigger / SubContent (nested submenus) | dropped -- the issue's state model is "open, highlighted item" (no submenu-open axis); faithful submenu open-on-hover needs `hover-delay` (the issue adds no primitives) or the oracle's raw `setTimeout` (a forbidden half-solution); neither cited reference has submenus. Tracked for a later wave |
| collision-aware positioning (computePosition on scroll/resize) | dropped -- positioning is not behavior state and not modelled here (same disposition select took); reduced positioning fidelity vs the old React-only path |
| Portal (portals the content to `document.body`) | framework affordance -> pass-through: the menu lives in light DOM present-but-hidden, so there is no portal to open; the API is preserved |
| `highlighted` as tracked state | not ported -- the highlight is the roving-focus current item via `:focus` (see above), matching navigation-menu; the oracle never tracked it either |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `aria-haspopup="menu"`, `role="menu"` + `aria-orientation`,
  `aria-controls`/`aria-labelledby` wired to real DOM ids, asserted by the
  harness against rendered markup in all three frameworks.
- 2.1.1: full keyboard operation -- open, arrow-rove, Home/End, typeahead,
  activate, Escape.
- 2.4.3 Focus Order: opening moves focus to the first item; Escape/activate
  restore focus to the trigger.
- 2.4.7: token focus ring on the trigger; the active item is visible via
  `focus:bg-accent`.
