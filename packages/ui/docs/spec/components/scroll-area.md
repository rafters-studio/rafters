# Component Spec — ScrollArea

Status: DRAFT. Wave-1 port. A pure static (Spec 02 composition, no Spec 03
effects) -- the Container/Card family.

Files (`src/components/scroll-area/`):

```
scroll-area.classes.ts   scroll-area.behavior.ts   scroll-area.tsx
scroll-area.element.ts    scroll-area.astro
```

Tests mirror into `test/components/scroll-area/`: behavior (pure, no DOM),
classes parity, and conformance across React + WC + Astro.

## Composition

```
scroll-area score      static: no state, no actions, no keymap, no effects, empty ARIA
scroll-area classes    base surface + WebKit scrollbar + orientation overflow switch
ScrollBar (companion)  decorative custom-scrollbar track; literal classes, not a part
```

ScrollArea is a pure static: native scroll owns every semantic (momentum,
keyboard scrolling, focus order), so the score projects nothing and needs no
client. There is no `bindScrollArea`, no `useBehavior`/`useMemory`, no Astro
`<script>`, and the Web Component performs no binding. The score is declared
only so the conformance harness asserts the one real contract (root renders,
projects no ARIA) identically across the three frameworks.

The oracle (`src/old/ui/scroll-area.tsx`) was CSS-only -- no handlers, no
state, no scroll-position tracking, no `scroll-area.controller.ts`. Porting a
scrolling reducer would reinvent what the oracle deliberately left to the
platform, so the score stays static and faithful.

## Config, state, actions

```ts
type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

interface ScrollAreaConfig {
  orientation?: ScrollAreaOrientation; // default 'vertical'
}
type ScrollAreaState = Record<never, never>;   // nothing to remember
type ScrollAreaActions = Record<never, never>; // nothing to dispatch
```

`orientation` selects which axis overflows. `both` is the rafters extension
over the shadcn base's vertical/horizontal.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- native scroll owns every semantic; the projection is empty |

`ScrollBar` is a decorative companion (shadcn's custom-scrollbar track), not a
declared part (boundary 5): it carries `data-slot="scroll-bar"` and a
`data-orientation` marker but no `data-part`, and conformance never asserts it.

## Keyboard and effects

- `keymap`: none. Arrow/Page/Home/End keyboard scrolling stays native and
  untouched -- the score claims no keys.
- `effects(state, config)`: `[]`. No focus-trap, no dismiss, no scroll-lock;
  the surface only decorates native overflow.

## Oracle dispositions (src/old/ui/scroll-area.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| ScrollArea with `orientation` (vertical/horizontal/both) | contract |
| WebKit `::-webkit-scrollbar*` custom-scrollbar styling | contract (verbatim decoration) |
| `overflow-*` orientation switch | contract |
| `ScrollBar` decorative track + thumb, single-axis orientation | contract (React wrapper; shadcn ships React only; not a declared part) |
| `duration-150` / `w-2.5` / raw scrollbar sizing | contract (verbatim from the oracle's settled decoration; a designer pass may repoint at motion/spacing tokens, flagged, not an agent call) |
| `motion-reduce:transition-none` on the ScrollBar transition | contract |
| native keyboard scrolling / momentum / focus order | contract (left to the platform; the score adds nothing) |
| `{...props}` spread on the root | framework affordance (React/WC/Astro pass consumer attributes through) |

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: the root projects no ARIA; the empty contract is asserted
  against real DOM by the harness across React, WC, and Astro.
- 1.4.13 / never hide scrollbars: the custom scrollbar is styled, never
  hidden -- scroll affordance stays visible when content overflows.
- 2.1.1 Keyboard: native keyboard scrolling is preserved untouched; the score
  claims no keys and installs no listeners.
- Reduced motion: the decorative ScrollBar transition carries
  `motion-reduce:transition-none`.

### Known gap (not a regression)

A scroll container whose content overflows but holds no focusable child is not
reachable by keyboard alone (WCAG 2.1.1, axe `scrollable-region-focusable`).
The oracle never added `tabindex="0"` to earn keyboard focus, so this port does
not either -- adding it would be semantics the oracle never established. In the
happy-dom test environment layout is not computed, so no overflow is detected
and axe does not flag it. Repointing this (a focusable-viewport rule) is a
tracked follow-up, not an agent call to make in a faithful port.
