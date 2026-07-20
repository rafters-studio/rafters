# Component Spec — Accordion

Status: DRAFT. Disclosure archetype -- the many-section member of the family
(collapsible is the single-region one; tabs folds the same set state onto an
always-one-active axis).

Files (`src/components/accordion/`):

```
accordion.behavior.ts   accordion.classes.ts   accordion.tsx
accordion.element.ts    accordion.astro
```

Tests mirror into `test/components/accordion/`: behavior (pure), classes
(parity), and conformance across React, WC, and Astro on the shared harness.

## Composition

```
accordion slice   state {value, multiple, collapsible}, action toggle,
                  parts root + item/heading/trigger/content (many)
roving-focus      composed directly, vertical axis -- ArrowUp/ArrowDown/Home/End
```

The score's only state axis is the SET of expanded values. Focus movement across
the header buttons is NOT state -- it is ephemeral DOM state owned by the
composed `roving-focus` primitive, the same split navigation-menu, radio-group,
and toggle-group make.

### Why selection-group and disclosure are not composed

The port issue named three primitives. `roving-focus` composes literally.
`selection-group` and `disclosure` do not, and the reason is structural rather
than preferential: both own a `createMemory` cell of their own
(`createSelectionGroup` returns `{ memory, ... }`; `createDisclosure` is a single
boolean cell), while `createBehavior` already owns THE memory cell for this
component. Composing either would place one logical state in two cells with no
reconciliation path, and `Slice` reducers are pure `(state, payload) => state`
over that one cell -- there is no seam through which a second cell could be
driven or read.

radio-group and toggle-group set the precedent (selection-as-reducer); the
`toggle` reducer here re-expresses `createSelectionGroup.toggle`'s exact
semantics -- multiple-mode membership, single-mode replacement, and the
`collapsible` close-to-empty rule -- as a reducer over the one cell. The
primitives remain the right shape for a framework-agnostic consumer that is NOT
a behavior-layer score; nothing about them is rewritten here.

## Config, state, actions

```ts
interface AccordionConfig {
  type?: 'single' | 'multiple';       // default 'single'
  value?: string | string[];          // controlled
  defaultValue?: string | string[];   // uncontrolled seed
  collapsible?: boolean;              // single mode: allow closing to empty
  disabled?: boolean;                 // gates toggling
  headingLevel?: number;              // default 3
}
interface AccordionState {
  value: string[];       // intrinsic expanded set
  multiple: boolean;     // seeded from config.type
  collapsible: boolean;  // seeded from config.collapsible (always true when multiple)
}
type AccordionActions = { toggle: string }; // payload: the section's value
```

The reducer receives `(state, payload)` with no config (Spec 01), so both mode
flags are seeded into state at `initialState`.

Controlled/uncontrolled per the ownership-of-truth boundary applied to a set:
`config.value` is the consumer's controlled value (passed fresh, never stored),
`state.value` is intrinsic, and projections plus the change callback read the
effective set via `expandedValues(state, config)`. `emitValue` reports a string
for single mode and an array for multiple -- the oracle's
`type === 'single' ? (values[0] ?? '') : values`.

Single, non-collapsible mode returns the SAME state object when the open section
is re-activated. That identity is load-bearing: each decorator compares the
effective set before against the intrinsic set after to decide whether the
consumer callback fires, so a refused edit must not look like a move.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-orientation="vertical"`, `data-type`, `data-collapsible`, `data-heading-level`, `data-disabled` (when disabled) |
| item (many) | one per section | `data-state` |
| heading (many) | one per section | `role="heading"`, `aria-level` |
| trigger (many) | one per section | `aria-expanded`, `aria-controls`, `data-state` |
| content (many) | one per section, always in the DOM | `role="region"`, `aria-labelledby`, `data-state`, `hidden` while collapsed |

`item`/`heading`/`trigger`/`content` are `many` parts, so their attributes come
from `BehaviorSpec.instanceAria(part, value, state, config, ids)` rather than
`aria()`, which projects one `AriaAttrs` per part NAME and cannot express N
instances. The shared harness drives `spec.instanceAria` generically
(`assertInstanceAriaFulfillment`), so every rendered instance in every framework
is asserted against the score with no per-component wiring.

`aria-controls` is projected unconditionally -- guarded only on the sibling id
being real, not on the open axis. Panels are present-but-hidden rather than
unmounted, so the reference is never dangling and the oracle advertised it while
collapsed too. This deliberately diverges from the `disclosable` slice's
`open && ids.content` guard, which exists for overlays whose content leaves the
DOM.

Item-level `disabled` is expressed by natively disabling that header button (the
React `disabled` prop, the Astro/author markup attribute), which also removes it
from the tab order and from roving. The reducer sees only a value and cannot
know which sections the author disabled; accordion-level `disabled` is the gate
it can express, via `canDispatch`.

## Keyboard

| Key | Owner | Effect |
| --- | --- | --- |
| Enter, Space | native `<button>` (declared in `keymap`) | toggle the focused section |
| ArrowDown, ArrowUp | roving-focus (vertical) | move focus to the next/previous enabled header, wrapping |
| Home, End | roving-focus | move focus to the first/last enabled header |
| Tab | native | leave the accordion -- exactly one header is in the tab order |

The score declares Enter/Space -> `toggle` for the pure keymap contract, but the
DOM binds rely on the native `<button>` converting them to a click; wiring the
keymap as well would double-toggle. Arrow and Home/End keys are deliberately NOT
claimed by the score -- the composed primitive owns focus movement, and
expansion never follows focus.

## Oracle dispositions (src/old/ui/accordion.*, boundary 9)

The oracle's behavior lived in a rejected `accordion.controller.ts`, which was
not read for this port; the dispositions below cover the surface the framework
files expose.

| Oracle feature | Disposition |
| --- | --- |
| `type` single/multiple + `collapsible` | contract |
| controlled/uncontrolled `value`/`defaultValue` + `onValueChange` (string for single, array for multiple) | contract |
| item-level `disabled` | contract (native `disabled` on the header button; roving skips it) |
| `role="heading"` wrapper with `aria-level={3}` around the header button | contract, generalized: the level is `config.headingLevel` and rides the `heading` instance projection instead of being hand-written per framework |
| header button `aria-expanded` + `aria-controls`, set while collapsed too | contract |
| panel `role="region"` + `aria-labelledby` back to its header | contract |
| panel always mounted, visibility toggled by `hidden` | contract (crawlable content, and the height transition runs on the same node) |
| ArrowUp/ArrowDown/Home/End roving tabindex over `[data-roving-item]` headers | contract (the same `roving-focus` primitive, composed directly on the vertical axis) |
| chevron `<svg>` rotating via `group-data-[state=open]:rotate-180` | contract |
| `data-accordion-item` / `data-accordion-trigger` / `data-accordion-content` markers | framework-affordance -- replaced by the layer-wide `data-part` + `data-value` registry the harness and the binds query |
| Astro `accordionId` prop threaded to every child to hand-template `${accordionId}-trigger-${value}` ids | framework-affordance -- the Astro decorator mints instance ids from the root `id`, as navigation-menu does; children no longer need the group id |
| React `AccordionItem` minting ids from `useId()` per item | framework-affordance -- ids now derive from one root `useId()` so the trigger/panel pair is resolvable without an item-local context of its own |
| `AccordionItemContext` throwing outside its provider | contract (both provider levels throw with a named message) |
| `data-[state=closed]:animate-accordion-up` / `data-[state=open]:animate-accordion-down` on the panel | defect-do-not-port -- those keyframes interpolate `var(--radix-accordion-content-height)`, a Radix-owned variable nothing in this system ever sets, so the animation runs to an undefined height; replaced by `overflow-hidden transition-all duration-300 motion-reduce:transition-none` (declared height-axis intent) |
| React root rendering a bare `classy(className)` with no root class | contract -- `accordionClasses().root` is deliberately empty: the root is the styling anchor for the projected `data-*`, not a visual |

## Motion

Expand/collapse along the height axis (y). Declared as intent only:
`overflow-hidden transition-all duration-300 motion-reduce:transition-none` on
the panel, plus `transition-transform duration-300` on the chevron. Duration and
easing come from the token scale; reduced motion disables both. Padding lives on
the panel's inner box, never on the panel itself, so the panel can collapse to
zero height. A keyframed height animation waits on a real content-height
utility in the token system.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: each header button is contained by a `role="heading"` element
  carrying `aria-level`, projects `aria-expanded`, and references its panel by
  real DOM id; each panel is a `role="region"` named by `aria-labelledby` back to
  its header. Asserted by the harness across all three performances, plus axe.
- 2.1.1: every section is fully operable from the keyboard -- Enter/Space
  activate natively, ArrowUp/ArrowDown/Home/End move focus. No pointer-only path.
- 2.4.3: roving tabindex keeps exactly one header in the tab order, so Tab enters
  and leaves the accordion once rather than stepping through every section.
- 2.4.7: a token focus ring on each header (`focus-visible:ring-ring` with an
  offset).
- Collapsed panels carry `hidden`, so they are inert and out of the tab order
  rather than merely invisible.
- A disabled section advertises the native `disabled` state, leaves the tab
  order, and cannot be toggled by pointer or keyboard.
