# Component Spec — Resizable

Status: PORTED (wave 5). Compound archetype; the split-panel control.

Files (`src/components/resizable/`):

```
resizable.classes.ts   resizable.behavior.ts   resizable.tsx
resizable.element.ts    resizable.astro
```

Tests mirror into `test/components/resizable/` (behavior, classes, and
conformance across React + WC + Astro via the shared harness).

## Composition

```
resizable (slice)   state {sizes}, action setSizes, parts root/panel/handle
resizeSizes (pure)  the clamp/redistribute math a reducer cannot hold (needs config)
interactive         the mouse/touch pointer surface on the group root
keyboard-handler    arrow/Home/End resize on the focused handle
```

The score's only state axis is `sizes` (percent per panel). Which handle is
being dragged and the `data-dragging` flag the CSS reads are ephemeral
(bind-local closure), never score state -- the same split slider draws between
its `values` and the active-thumb closure. Uncontrolled only:
react-resizable-panels reports layout through `onLayout` rather than shadowing an
external `sizes` prop, so there is no controlled boundary to cross.

The pointer axis is COMPOSED onto `interactive`, not hand-rolled: `interactive`
owns the mouse/touch surface and document-level drag tracking on the group root,
and a separate `pointerdown` gate honours a press only when it lands on a handle
(a 1px handle has no meaningful rect of its own, so the surface is the group).
The percent math lives in the pure `resizeSizes` helper because a reducer gets no
config and the constraint math needs each panel's min/max.

## Config, state, actions

```ts
interface ResizablePanelConfig { defaultSize: number; minSize: number; maxSize: number }
interface ResizableConfig {
  direction: 'horizontal' | 'vertical';
  panels: ResizablePanelConfig[]; // one per panel, DOM order
  disabled?: boolean;             // gates every resize
}
interface ResizableState { sizes: number[] } // percent per panel
type ResizableActions = { setSizes: { sizes: number[] } };
```

One `setSizes` action: the pure `resizeSizes` helper computes the clamped,
redistributed array (both the pointer path and the keyboard path call it), and
the reducer replaces wholesale. `canDispatch` rejects `setSizes` while disabled,
so `onLayout` never fires for a move the control would refuse.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-orientation`, `data-disabled` (only when disabled) |
| panel | one per panel | none (geometry); `flex-basis` carries its size percent |
| handle | one fewer than panels | `role="separator"`, `aria-orientation`, `aria-valuenow`/`min`/`max`, `aria-disabled` (when disabled), accessible name (decorator), `tabindex` |

`aria-valuenow` is the size of the panel BEFORE the handle, rounded, bounded by
that panel's `minSize`/`maxSize`. Per-instance ARIA rides the score's
`instanceAria` (`resizableHandleAria`) keyed by the handle's `data-value` (= its
index), so the conformance harness drives it generically. The accessible name is
a decorator concern (a separator has no intrinsic text) -- each decorator applies
`aria-label` (default "Resize"), not projected by the score.

`aria-orientation` follows the WAI-ARIA Window Splitter pattern: the separator
line is perpendicular to the group axis, so a horizontally-arranged group (panels
side by side) has a **vertical** separator and a vertical group a horizontal one.

## Keyboard

- `keymap`: on a `handle`, the along-axis arrows plus `Home`/`End` -> `setSizes`.
  Horizontal claims `ArrowLeft`/`ArrowRight`; vertical claims
  `ArrowUp`/`ArrowDown`. The bind resolves WHICH handle (the focused one) and the
  delta via `keyDelta`.
- `keyDelta`: Right/Down grow the leading panel, Left/Up shrink it (the visible
  drag direction); step 1, or 10 with Shift. `Home` shrinks the leading panel to
  its min, `End` grows it to its max.

## Motion

None. The oracle carried `transition-shadow duration-100` on the handle; the raw
numeric duration is prohibited (Spec 05) and no semantic `motion-*` token yet
fits a separator hover/focus transition (the motion-token layer is being rebuilt,
#1899/#1902). Motion is left **undeclared** rather than hardcoded -- the focus
ring and the `data-dragging` colour swap apply instantly. Reinstate a
`motion-hover`/`motion-focus` token here when one lands.

## Oracle dispositions (src/old/ui/resizable.tsx)

| Oracle feature | Disposition |
| --- | --- |
| PanelGroup / Panel / Handle compositional surface (direction, defaultSize, minSize, maxSize, withHandle, handle disabled) | contract |
| drag-to-resize with min/max redistribution (`resizePanels`) | contract -- ported verbatim into the pure `resizeSizes`; the mouse `movementX` mechanism is reframed onto the `interactive` primitive (composed, not reimplemented) |
| arrow-key resize, Shift x10 | contract; `Home`/`End` to the leading panel's bounds added (WAI-ARIA Window Splitter) |
| `onLayout(sizes)` | contract |
| per-instance `aria-valuenow`/`min`/`max` | contract (now the score's `instanceAria`) |
| `data-dragging` styling | contract -- now per-handle (only the dragged separator flags), not a group flag |
| `withHandle` grip affordance | contract (decorative chip) |
| `role="slider"` on the handle | defect-do-not-port -- a focusable window splitter is `role="separator"` (WAI-ARIA Window Splitter), replaced |
| `aria-orientation = horizontal for a horizontal group` | defect-do-not-port -- inverted vs the splitter pattern (the separator line is perpendicular to the group axis); replaced with `separatorOrientation` |
| `transition-shadow duration-100` on the handle | defect-do-not-port -- raw numeric duration (Spec 05); motion left undeclared |
| collapse/expand (`collapsible`, `collapsedSize`, `onCollapse`, `onExpand`, `collapsePanel`/`expandPanel`) | dropped -- outside the drag-resize contract the issue enumerates (`States: sizes, dragging`); the unwired props are not accepted in the API |
| `autoSaveId` localStorage persistence (+ `sizesEqual` dedup export) | dropped -- persistence is a consumer concern and a localStorage side effect has no place in the pure score; the `autoSaveId` prop is not accepted |
| runtime panel/handle registration via a second `createMemory` cell | dropped -- the behavior owns the single `sizes` cell; React derives indices from its children (cloneElement), the DOM-native binds read them from `data-index`/`data-value` |

## Astro content limitation

Astro forbids a dynamic `slot name`, so per-panel content rides the `panels`
prop data (`content?: string`), the same shape `navigation-menu.astro` uses for
its structured items -- not N named slots. The React performance keeps the full
compositional children API; the WC is a light-DOM enhancer over author markup.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="separator"` with `aria-orientation` and
  `aria-valuenow`/`min`/`max`, asserted against real DOM by the harness; each
  handle carries an accessible name.
- 2.1.1 Keyboard (Level A): every handle is a tab stop and resizes by arrow keys;
  `Home`/`End` reach the leading panel's bounds. Disabled removes the handles
  from the tab order and gates all movement.
- 2.4.7 Focus Visible: token focus ring (`focus-visible:ring-ring`) on the
  handle.
