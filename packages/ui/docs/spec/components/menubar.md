# Component Spec -- Menubar

Status: PORTED. Archetype: `menu-collection-popup` (compound).

A horizontal application menu bar: a row of triggers, each opening a menu of
actions. Almost nothing here is new. Each menu is dropdown-menu's behavior, and
the row of triggers is the roving-focus bar navigation-menu already runs. The new
work is the glue between the menus: one menu open at a time, and moving between
menus while one is open.

Files (`src/components/menubar/`):

```
menubar.classes.ts   menubar.behavior.ts
menubar.tsx          menubar.element.ts   menubar.astro
```

Tests mirror into `test/components/menubar/`: behavior (pure), classes, and a
`.spec` and `.a11y` file per framework (React, WC, Astro), each asserting the
rendered ARIA against the score's projection.

## Composition

```
menubar-bar (slice)   state {active, pointerOpened}, actions open/follow/toggle/close/next/prev,
                      parts root (menubar), trigger/content/item (many), root aria
menubar (glue)        keymap: dropdown-menu's trigger and menu keys, plus ArrowLeft/Right
                      inside a menu stepping to the neighbouring menu
instanceAria          per trigger/content: dropdown-menu's own projection at open = (active === value)
```

What is reused, and how:

- **Each menu's ARIA** is `dropdownMenu.aria`, called per menu with
  `{ open: active === value }` and that menu's trigger/content ids. That is the
  disclosable projection (`aria-expanded`, `aria-controls` only while open and
  real, `data-state`) plus dropdown-menu's glue (`aria-haspopup="menu"`,
  `role="menu"`, `aria-orientation="vertical"`, `aria-labelledby`). Menubar adds
  one attribute: `role="menuitem"` on the trigger, because inside a menubar the
  menu button is a menuitem of the bar (WAI-ARIA APG).
- **Each menu's keys** are `dropdownMenu.keymap`: ArrowDown/ArrowUp/Enter/Space
  on a trigger open, Escape inside a menu closes.
- **Each open menu's effects** are `startDropdownMenuEffects`, unchanged:
  vertical roving focus, typeahead, and outside-pointerdown dismissal. Its
  dismiss handler spares a pointerdown on any trigger of the bar, leaving it to
  the click path (switch or close); a pointerdown on the bar's blank space
  still dismisses.
  `focusFirstItem` is reused for open-focus.
- **The bar** is `createRovingFocus(bar, { orientation: 'horizontal' })`, the
  shape navigation-menu runs over its trigger list.

Why a value axis and not N disclosable cells: disclosable's state is one
`open` boolean. N copies collide on that key in the one cell (Spec 02) and could
not express "at most one open". The score owns which menu is open; each menu's
disclosable projection is evaluated from it.

`startMenubarBar` (the bar rove plus following) and `startMenubarMenu`
(position one open menu, then dropdown-menu's trio) are the composition
functions. `bindMenubar` (WC and Astro) and the React `useEffect`s call the same
two.

### The menus live outside the bar

`createRovingFocus` collects every `[role="menuitem"]` beneath its container,
and a descendant of a `hidden` element still reports its own computed `display`,
so a menu left inside the bar pours its items into the trigger rove. The menus
therefore leave the bar, the context-menu submenu precedent:

- `bindMenubar` moves every menu out of the root to sit right after it, and
  restores each to its authored place on teardown.
- React portals each `MenubarContent` into a host `Menubar` renders right after
  the bar (`display: contents`, no box of its own). The host exists only after
  mount, so until then -- the server render and the hydration pass -- each menu
  renders in place inside the bar, always closed and inert. React server HTML therefore
  carries every menu, as the Astro performance does, every trigger's
  `aria-controls` resolves, and hydration matches (a unit test hydrates the
  server string and asserts no recoverable error). The host's ref callback
  runs in the first commit and its synchronous re-render moves the menus into
  the host. The bar rove initialises in that first commit's effects, while the
  closed menu items are still in the bar. That is harmless: the rove only sets
  their `tabindex` to -1, which they already carry, and it re-reads its items
  on every keydown, and no input can arrive in that window.

Both performances end in the same DOM: the bar, then its menus as the
following siblings. Alternatives considered and not taken:

- Menus inside the bar: the rove above breaks, and `role="menu"` sits inside
  `role="menubar"` (the oracle's defect).
- Excluding the menu items from the rove: needs a selector option on
  `roving-focus`, a shared primitive this port may not edit.
- The end of the body (the context-menu precedent): fails axe `region`,
  because the menus leave the landmark that holds the bar.
- navigation-menu's shape: rove a trigger-only row, with the panels outside
  that row. navigation-menu itself does not quite do this. Its panels sit inside
  the roved `list` and escape the rove only because they hold links, not
  menuitems. For menubar the shape would mean a `role="menubar"` row part
  holding only triggers and the menus as its siblings. The authoring surface
  cannot produce that. shadcn's `Menubar.Menu` wraps each Trigger with its
  Content, so in React they render at the same place in the tree, and a
  Content can only get out of the trigger row by being portaled -- which is
  the relocation this doc already makes. The only difference would be an
  extra wrapper element for the row, and the menus would still need
  positioning under their triggers, so it adds a part and buys nothing. For
  Astro and WC, authored markup could place the menus beside the row, but
  keeping one markup contract (menus next to their triggers, moved on bind)
  keeps the three performances the same.

Right after the bar, not the end of the body, keeps each menu inside whatever
landmark holds the bar (axe `region`). The cost: the bind rearranges author
markup (restored on teardown), and a consumer styling the menubar's parent sees
the menus as its children. Outside the bar the menus no longer
bubble native events to the root, so the bind listens on each menu too; React
events still bubble through the portal to the root's `onKeyDown`. An open menu
is anchored under its trigger by `positionMenubarContent`
(`collision-detector`'s `computePosition`, side bottom, align start, fixed
left/top).

### Highlighted item is not state

The highlighted item is ephemeral DOM focus owned by roving-focus and styled via
`:focus`, the stance dropdown-menu documents. The issue's states list one axis,
which menu is open.

### `pointerOpened` is gesture memory, not a second axis

A mouse click on another trigger always crosses onto it first, and crossing
onto a trigger while a menu is open switches to that menu. Without memory of
that, the click in the same gesture then toggles the menu it just opened closed
(the React spec caught this). `follow` marks a pointer-made switch and `toggle`
absorbs exactly one click on that trigger; the next click closes it, as a
desktop menubar title click does. navigation-menu's `pointerOpened` exists for
the same defect. Crossing onto the open menu's own trigger changes nothing, so a
stray pointer move never arms it for a click-opened menu.

The pointer follows on `pointermove`, not `pointerover`: browsers fire boundary
events at a resting cursor when the element under it changes (a re-render, a
menu hiding), and a menu must not switch because the page moved under the
cursor. A stress run under CPU load reproduced exactly that with `pointerover`.

## Config, state, actions

```ts
interface MenubarConfig {
  value?: string;        // controlled open menu ('' = none)
  defaultValue?: string; // uncontrolled seed
  loop?: boolean;        // wrap at the ends of the trigger row, default true
}
interface MenubarState { active: string | null; pointerOpened: boolean }
interface MenubarTarget { value: string; from: string | null }
interface MenubarStep { values: readonly string[]; from: string | null; loop: boolean }
type MenubarActions = {
  open: string;          // open or switch deliberately (keyboard, focus follow)
  follow: MenubarTarget; // the pointer crossed onto another trigger while open
  toggle: MenubarTarget; // a trigger click
  close: undefined;
  next: MenubarStep;     // ArrowRight inside a menu
  prev: MenubarStep;     // ArrowLeft inside a menu
};
```

`from` in every payload is the EFFECTIVE open menu, so a controlled menubar
decides from what the consumer shows rather than a drifted intrinsic cell.
`next`/`prev` carry the enabled trigger values in DOM order, so the step stays a
pure function (`stepMenu`). `canDispatch`: `open` and `toggle` always; `close`,
`follow`, `next` and `prev` only while a menu is open (a closed menubar opens on
neither hover nor focus movement). The React `onValueChange` compares the
effective value before against the intrinsic value after (the controlled
callback gotcha).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="menubar"`, `aria-orientation="horizontal"`, `data-state` (open while any menu is) |
| trigger (many) | always | `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` (only while its menu is open and the id is real), `data-state`; `data-value` names the menu |
| content (many) | present, `inert` while closed (never `hidden`, so the exit can play), outside the bar | `role="menu"`, `aria-orientation="vertical"`, `aria-labelledby` (its trigger, only when the id is real), `data-state`; `data-value` |
| item (many) | present | role is author markup (`menuitem` / `menuitemcheckbox` / `menuitemradio`); `data-roving-item`, `tabindex=-1`, `aria-disabled`/`data-disabled` when disabled; `aria-checked` + `data-state` on checkbox/radio items (consumer-controlled) |

The trigger and content projections are `menubar.instanceAria`
(`menubarInstanceAria`), the generic many-part contract member. Empty-id
convention: a projection referencing an empty id emits `undefined`, so
`aria-controls`/`aria-labelledby` never dangle.

## Keyboard

- Trigger `ArrowLeft`/`ArrowRight` rove the triggers (roving-focus), wrapping
  unless `loop` is false; `Home`/`End` jump to the first/last. With a menu open,
  focus reaching another trigger switches to its menu (`open`).
- Trigger `ArrowDown`/`ArrowUp`/`Enter`/`Space` open its menu (dropdown-menu's
  keymap) and land focus on the first enabled item. The decorator
  `preventDefault`s so the native button click does not also fire.
- Inside a menu, `ArrowDown`/`ArrowUp` rove the items (skipping disabled),
  `Home`/`End` jump, and typing jumps to the first matching item.
- Inside a menu, `ArrowRight`/`ArrowLeft` switch to the next/previous menu
  (`next`/`prev`), wrapping, and focus lands on its first item.
- Inside a menu, `Escape` closes and returns focus to the trigger.
- `Enter`/`Space` on an item activate it through its click path (the
  div-as-button affordance dropdown-menu documents): the action runs, the menu
  closes, focus returns to the trigger.

## Pointer

- Clicking a trigger opens its menu; clicking another trigger switches; clicking
  the open menu's trigger closes it (after the one absorbed click above).
- With a menu open, moving the pointer onto another trigger switches to its
  menu. With every menu closed, hovering opens nothing.
- A pointerdown outside the open menu closes it, unless it lands on a trigger
  (the click path handles that). The bar's blank space counts as outside.

## Motion

#2292 consumes the five motion.jsonl rows in `menubar.classes.ts` as
transitions keyed off `data-state`, the drawer pattern: content fades and zooms
(`extent-pop`) between a closed pose (fast, exit) and an open pose (moderate,
enter); items carry the highlight move (micro, standard; proposed, unreviewed)
and `delay-stagger-step`; the trigger carries its colour row (fast, standard).
Every menu stays present and out of flow (`fixed`); closed, the performances
make it `inert`. The classes file reports the moments with no row and the row
with no pose of its own.

## Oracle dispositions (src/old/ui/menubar.*)

| Oracle feature | Disposition |
| --- | --- |
| `createMenubar` controller (selection-group cell + imperative wiring) | not ported -- rejected architecture; replaced by the score and `bindMenubar` |
| one menu open at a time, closable | contract (`active` axis) |
| Trigger / Content / Group / Label / Item / Separator / Shortcut surface + `Menubar.*` namespace | contract |
| `MenubarMenu` identity from `useId` | contract; `value` is now an optional prop (the controlled `value` names menus), `useId` when omitted |
| CheckboxItem / RadioGroup / RadioItem | contract (React); `checked`/`value` are consumer-controlled, not score state. In WC/Astro `aria-checked` is author markup the bind does not own |
| Arrow Left/Right + Home/End across triggers, roving tabindex | contract (`createRovingFocus` on the bar) |
| open menu follows focus across triggers | contract (`onNavigate` -> `open` while a menu is open) |
| hover switches the open menu, never opens the first | contract (`follow`, on pointermove) |
| `openedByHover` absorbs the click of the same gesture | contract (`pointerOpened` + `toggle`) |
| ArrowDown/Enter/Space on a trigger opens | contract (dropdown-menu's keymap) |
| Arrow Up/Down + typeahead within the open menu | contract (`startDropdownMenuEffects`) |
| focus first item on open, return to trigger on close | contract |
| Escape closes via a document `escape-keydown` listener | contract, moved to the menu keymap (dropdown-menu's) -- no `escape-keydown` primitive |
| outside pointerdown closes, sparing triggers | contract (dropdown-menu's `onPointerDownOutside`; `startMenubarMenu` spares a pointerdown on a trigger only) |
| Enter/Space on an item synthesizes a click; selecting closes | contract |
| ArrowLeft/Right inside a menu | contract, new in the score (`next`/`prev`); the oracle let these bubble into the trigger rove, whose item list included the menu items |
| `loop` prop | contract (`config.loop`: the bar rove and `next`/`prev`); menus always wrap, as dropdown-menu's do |
| programmatic `setValue` without `onValueChange` | framework affordance -> React controlled `value` |
| menus mounted inside the menubar | defect-do-not-port -- their menuitems joined the trigger rove, and `role="menu"` sat inside `role="menubar"`; the menus now live outside the bar |
| `aria-controls` always set on triggers | defect-do-not-port -- dangling while closed; now only while open |
| asChild on Trigger / Content | framework affordance (React); also on Item |
| Portal (`container`, `forceMount`) | framework affordance -> pass-through: Content already portals out of the bar |
| `React.forwardRef` on every React part | dropped -- consistent with dropdown-menu, whose parts do not forward refs either; React 19 passes `ref` as a prop to function components, and the parts spread props onto their element |
| seven slot-composed Astro parts (`menubar-menu`/`-trigger`/`-content`/`-item`/`-label`/`-separator`/`-shortcut.astro`) | reduced -- one data-driven `menubar.astro` taking `menus: { value, label, items: { label, disabled?, shortcut? }[] }[]`, the shape dropdown-menu.astro and navigation-menu.astro take. The Astro surface has no label, separator, group, checkbox or radio items; those remain React-only, as dropdown-menu's are |
| Content `loop` prop | dropped -- menus always wrap (dropdown-menu's trio) |
| Sub / SubTrigger / SubContent (nested submenus with `setTimeout` hover) | dropped -- dropdown-menu, which each menu is, has no submenu (its doc drops it for the same reasons: no submenu axis in the issue, and the raw `setTimeout` is a forbidden half-solution). Building one here would be a menu reimplemented, which the issue rules out |
| `animate-in`/`zoom`/`fade`/`slide` + `duration-100` + `motion-reduce:` classes | dropped -- #2292 names the matrix generics instead |
| collision-aware side flipping (`data-side`) | reduced -- the open menu is placed under its trigger by `computePosition` (which flips/clamps); no `data-side` is projected |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="menubar"` with `menuitem` triggers owning only the bar;
  each menu `role="menu"` + `aria-orientation`, wired by `aria-controls` /
  `aria-labelledby` to real ids. Asserted against rendered markup in all three
  frameworks, and axe runs closed and open scenes per framework (plus the Astro
  server markup before the script).
- 2.1.1: full keyboard operation -- rove the bar, open, rove the menu, Home/End,
  typeahead, move between menus, activate, Escape.
- 2.4.3 Focus Order: opening lands focus on the first item; Escape and
  activation return focus to the trigger; the bar is one Tab stop (roving
  tabindex).
- 2.4.7: the focused trigger and item are visible via `focus:bg-accent`; the open
  menu's trigger keeps `data-[state=open]:bg-accent`.
