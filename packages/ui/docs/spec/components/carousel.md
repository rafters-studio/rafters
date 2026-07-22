# Component Spec — Carousel

Status: DRAFT. Compound archetype (imitates navigation-menu). Behavior-layer
port of `src/old/ui/carousel.tsx`.

Files (`src/components/carousel/`):

```
carousel.classes.ts   carousel.behavior.ts   carousel.tsx
carousel.element.ts   carousel.astro
```

Tests mirror into `test/components/carousel/`: behavior (pure), classes, and
conformance across React + WC + Astro via the shared harness.

## Composition

```
carousel (slice)   state {index}, one action setIndex, region/slide/control aria,
                   axis-arrow keymap
keyboard-handler   createKeyboardHandler for the axis arrows, composed once by
                   composeCarouselInteractions (shared by bindCarousel + React effect)
```

The single state axis is `index`. `canScrollPrev`/`canScrollNext`,
`prevIndex`/`nextIndex`, and `clampIndex` are pure derivations against the slide
`count` and the `loop` flag -- not stored state. A reducer receives no config
(Spec 05), and prev/next/goto all need the count and loop flag to wrap or clamp,
so that math lives in the exported helpers and the ONE `setIndex` reducer stores
an already-resolved index -- the shape slider uses for `setThumb`.

The slide count is the DOM, not a cell: `bindCarousel` counts rendered
`[data-part="item"]` elements; the React `CarouselContent` counts its children
and reports the count up. This replaces the oracle's ref registry
(`itemIdsRef` + an `itemsVersion` bump cell).

Controlled/uncontrolled per boundary 4: `config.value` is the consumer's
controlled index, `state.index` is intrinsic, and every projection reads
`activeIndex(state, config)`. The React `request` compares the effective index
before against the intrinsic index after, so `onIndexChange` reports the target
even when a controlled prop pins the effective view.

## Config, state, actions

```ts
interface CarouselConfig {
  orientation?: 'horizontal' | 'vertical'; // default horizontal
  loop?: boolean;                          // wrap past the ends
  count?: number;                          // total slides (the clamp bound)
  label?: string;                          // region accessible name, default "Carousel"
  value?: number;                          // controlled index
  defaultValue?: number;                   // uncontrolled seed
}
interface CarouselState { index: number }  // intrinsic only
type CarouselActions = { setIndex: number } // payload = an already-clamped index
```

`prev`/`next`/`goto` are not separate actions: each is `setIndex` fed the result
of `prevIndex`/`nextIndex`/`clampIndex`, so the intrinsic index can never leave
`[0, count-1]` and a controlled consumer's callback stays honest.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="region"`, `aria-roledescription="carousel"`, `aria-label`, `data-orientation` |
| content | always | `data-orientation` (viewport; clips the track) |
| track | always | none (structural; carries the inline translate offset) |
| item | always (`many`) | `role="group"`, `aria-roledescription="slide"`, `aria-label="N of M"`, `data-state="active|inactive"` |
| previous | always | `aria-label="Previous slide"`, `data-disabled` (only at the start), native `disabled` |
| next | always | `aria-label="Next slide"`, `data-disabled` (only at the end), native `disabled` |
| indicators | optional | `role="group"`, `aria-label="Choose slide to display"` |
| indicator | optional (`many`) | `aria-label="Go to slide N"`, `aria-current="true"` (active only), `data-state` |

The `item` and `indicator` per-instance projections come from
`carouselInstanceAria(part, value, state, config)` (Spec 01
`BehaviorSpec.instanceAria`), keyed by the slide index carried in each
element's `data-value`; the harness's generic `assertInstanceAriaFulfillment`
drives them.

## Keyboard and motion

- `keymap`: on the root, the axis arrows claim `setIndex` -- Left/Right when
  horizontal, Up/Down when vertical. Only the axis's two keys are registered
  with `keyboard-handler` (via `composeCarouselInteractions`), so
  `preventDefault` never swallows the cross-axis scroll. The composed handler
  resolves the target index with `indexForKey` and dispatches; the region itself
  is NOT focusable, so arrows act while a carousel control (or slide content)
  holds focus.
- Motion (`slide-advance`, slide, axis x): **undeclared**. None of the thirteen
  semantic `motion-*` tokens expresses a horizontal slide, and raw numeric
  durations are prohibited (Spec 05). The track's translate offset
  (`trackStyle`) is applied as pure layout data with NO transition, so the
  active slide snaps into place; the animated transition lands when the slide
  token ships (motion layer rebuild, #1899). This is why the oracle's
  `transition-transform duration-300 ease-in-out` is not ported.

## Oracle dispositions (src/old/ui/carousel.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| orientation (horizontal/vertical), axis-mapped arrow keys | contract |
| loop (wrap prev/next) | contract |
| currentIndex + canScrollPrevious/canScrollNext | contract (index state; canScrollPrev/Next pure helpers) |
| scrollPrevious / scrollNext / scrollTo | contract (prevIndex/nextIndex + setIndex; `goto` is setIndex(clampIndex)) |
| Prev/Next: native `disabled`, aria-label, chevron default | contract; added `data-disabled` projection so CSS can style the bound without reading the DOM |
| item role=group + aria-roledescription="slide" | contract; added `aria-label="N of M"` (WAI-ARIA APG slide labelling) |
| useCarousel hook | contract (shadcn parity: activeIndex, count, canScrollPrev/Next, scrollPrev/scrollNext/scrollTo) |
| item ref registry (registerItem/unregisterItem + itemsVersion bump cell) | re-expressed: the DOM is the registry (bind counts items; React counts children). No second cell -- a cell-owning registry does not compose (Spec 05) |
| root `tabIndex={0}` on the region | dropped: a non-interactive focusable region is avoided; arrows act through the focusable controls instead |
| autoPlay + autoPlayInterval | dropped: a timer whose interval is a raw numeric duration the motion layer forbids, and transient non-navigation behavior outside the index axis |
| isPaused + hover/focus pause (mouseenter/leave/focus/blur) | dropped: only meaningful as autoplay's pause, and autoplay is dropped |
| `transition-transform duration-300 ease-in-out` on the track | dropped: the slide-advance motion has no semantic token yet; ported as an undeclared, transition-free offset (see Motion) |
| Indicators as `role="tablist"` / indicator `role="tab"` + `aria-selected` | defect-do-not-port: tablist/tab without tabpanel wiring is an ARIA misuse; re-expressed as a `role="group"` of slide-picker buttons with `aria-current` on the active dot |
| JSDoc claim "ARIA live region for announcements" | defect-do-not-port: the oracle code never rendered a live region; the port does not claim one. Slides stay in the accessibility tree (not `aria-hidden`), faithful to the oracle's actual DOM |
| touch/swipe gestures | dropped: the oracle JSDoc lists swipe but the code ships no touch handlers, and no primitive expresses carousel swipe without wrong ARIA -- `drag-drop` stamps `aria-grabbed`+`role=button`, `interactive` stamps `role=slider` on the surface |

## Deltas from the oracle

1. The region is not focusable (`tabIndex` removed); arrow navigation rides the
   focusable prev/next controls and any focusable slide content, avoiding a
   non-interactive tabindex.
2. Slides are labelled `N of M` and offscreen slides are left in the
   accessibility tree (the oracle's actual DOM behavior), not hidden.
3. The slide offset is a data-driven inline transform with no transition until
   the slide-advance motion token exists.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="region"` + `aria-roledescription="carousel"`, each slide
  a labelled `role="group"`, and the prev/next/indicator names are asserted
  against real DOM by the harness across all three performances.
- 2.1.1 Keyboard: axis arrows advance the carousel while a control holds focus;
  every control is a native `<button>`.
- 2.4.7 Focus Visible: token focus ring on the controls
  (`focus-visible:ring-ring`).
- 4.1.2 Name, Role, Value: the current slide carries `data-state="active"` and
  the current indicator `aria-current="true"`; disabled controls expose both
  native `disabled` and `data-disabled` at the bounds.
