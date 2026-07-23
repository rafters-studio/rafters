import { compose, type Slice } from '@/lib/compose';
import { createBehavior, type AriaAttrs, type BehaviorSpec, type PartIds } from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import { createKeyboardHandler } from '@/lib/primitives/keyboard-handler';

/**
 * Carousel: a sequence of slides advanced one at a time. The single state axis
 * is the current slide `index`; `canScrollPrev`/`canScrollNext` are pure
 * derivations of that index against the slide count and the loop flag, not
 * stored state. Replaces the ref-registry controller in old/ui/carousel.tsx.
 *
 * Composition (Spec 05, "compose the primitive, never reimplement it"):
 * - arrow-key navigation rides `keyboard-handler` (`createKeyboardHandler`),
 *   composed once by `composeCarouselInteractions`, which BOTH the DOM-native
 *   `bindCarousel` and the React controller call. The `keymap` projection is the
 *   pure claim record (Spec 01); the composed handler computes the target index
 *   via `indexForKey`, mirroring slider's `stepForKey`.
 *
 * A reducer receives no config (Spec 05), and prev/next/goto all need the count
 * and loop flag to clamp or wrap. So the wrap/clamp math lives in the exported
 * pure helpers (`prevIndex`/`nextIndex`/`clampIndex`) and the ONE `setIndex`
 * reducer just stores an already-resolved index -- the exact shape slider uses
 * for `setThumb`.
 *
 * Not ported (see carousel.md dispositions): auto-play (a timer whose interval
 * is a raw numeric duration the motion-token layer forbids -- #1899) and touch
 * swipe (the oracle never shipped it, and `drag-drop`/`interactive` both stamp
 * ARIA that is wrong for a slide surface: `aria-grabbed`+`role=button` /
 * `role=slider`). The animated slide transition itself is undeclared: no
 * `motion-*` semantic token expresses a horizontal slide yet, so the track's
 * position updates without a transition rather than with a hardcoded duration.
 */
export type CarouselOrientation = 'horizontal' | 'vertical';

export interface CarouselConfig {
  orientation?: CarouselOrientation | undefined;
  /** Wrap from the last slide back to the first (and vice versa). */
  loop?: boolean | undefined;
  /** Total slide count -- the bound the index clamps against. */
  count?: number | undefined;
  /** Accessible name of the carousel region. */
  label?: string | undefined;
  /** Controlled index: shadows the intrinsic state when present. */
  value?: number | undefined;
  /** Uncontrolled seed for the intrinsic index. */
  defaultValue?: number | undefined;
}

export interface CarouselState {
  index: number;
}

export type CarouselActions = {
  /** Move to an already-clamped/wrapped index (the pure helpers own the math). */
  setIndex: number;
};

export type CarouselPart =
  | 'root'
  | 'content'
  | 'track'
  | 'item'
  | 'previous'
  | 'next'
  | 'indicators'
  | 'indicator';

export function orientationOf(config: CarouselConfig): CarouselOrientation {
  return config.orientation ?? 'horizontal';
}

export function countOf(config: CarouselConfig): number {
  return Math.max(0, config.count ?? 0);
}

function labelOf(config: CarouselConfig): string {
  return config.label ?? 'Carousel';
}

/** Clamp a raw index into [0, count - 1] (or 0 when there are no slides). */
export function clampIndex(index: number, config: CarouselConfig): number {
  const count = countOf(config);
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

/** The effective index: a controlled `config.value` shadows intrinsic state. */
export function activeIndex(state: CarouselState, config: CarouselConfig): number {
  return clampIndex(config.value ?? state.index, config);
}

/** The index a "previous" step lands on: wraps under loop, else clamps at 0. */
export function prevIndex(state: CarouselState, config: CarouselConfig): number {
  const count = countOf(config);
  if (count <= 0) return 0;
  const current = activeIndex(state, config);
  if (current > 0) return current - 1;
  return config.loop ? count - 1 : 0;
}

/** The index a "next" step lands on: wraps under loop, else clamps at count-1. */
export function nextIndex(state: CarouselState, config: CarouselConfig): number {
  const count = countOf(config);
  if (count <= 0) return 0;
  const current = activeIndex(state, config);
  if (current < count - 1) return current + 1;
  return config.loop ? 0 : count - 1;
}

/** Whether a previous step would move: a slide exists and we are not pinned. */
export function canScrollPrev(state: CarouselState, config: CarouselConfig): boolean {
  return countOf(config) > 0 && (Boolean(config.loop) || activeIndex(state, config) > 0);
}

/** Whether a next step would move: a slide exists and we are not pinned. */
export function canScrollNext(state: CarouselState, config: CarouselConfig): boolean {
  return (
    countOf(config) > 0 &&
    (Boolean(config.loop) || activeIndex(state, config) < countOf(config) - 1)
  );
}

/**
 * The target index for a navigation key, or null when the key does not steer
 * the carousel. Horizontal maps Left/Right to prev/next; vertical maps Up/Down.
 * The bind and React effect feed this the current state and dispatch the result,
 * mirroring slider's `stepForKey`.
 */
export function indexForKey(
  key: string,
  state: CarouselState,
  config: CarouselConfig,
): number | null {
  const vertical = orientationOf(config) === 'vertical';
  const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
  if (key === prevKey) return prevIndex(state, config);
  if (key === nextKey) return nextIndex(state, config);
  return null;
}

/**
 * The track's translate offset for the active index. Pure layout data -- NOT a
 * motion declaration: the three decorators apply it as an inline style and the
 * bind writes it in render(), exactly as slider paints its thumb geometry. The
 * transition that would animate this offset is deliberately absent (no semantic
 * slide token exists yet -- see the file header and carousel.md).
 */
export function trackStyle(state: CarouselState, config: CarouselConfig): { transform: string } {
  const offset = activeIndex(state, config) * 100;
  return {
    transform:
      orientationOf(config) === 'vertical' ? `translateY(-${offset}%)` : `translateX(-${offset}%)`,
  };
}

const carousel: Slice<CarouselConfig, CarouselState, CarouselActions, CarouselPart> = {
  name: 'carousel',
  parts: {
    root: { role: 'region' },
    // The viewport clips the track; the track lays the slides in a row/column
    // and translates. Both are structural, carrying no role.
    content: {},
    track: {},
    item: { role: 'group', many: true },
    previous: {},
    next: {},
    // The slide picker (goto UI) -- a group of buttons, one per slide.
    indicators: { role: 'group', optional: true },
    indicator: { many: true, optional: true },
  },
  initialState: (config) => ({
    index: clampIndex(config.value ?? config.defaultValue ?? 0, config),
  }),
  actions: {
    // The index arrives already clamped/wrapped from the pure helpers (a reducer
    // gets no config, so it cannot bound the value itself).
    setIndex: (state, index) => ({ ...state, index }),
  },
  canDispatch: () => true,
  aria: (state, config) => ({
    root: {
      'aria-roledescription': 'carousel',
      'aria-label': labelOf(config),
      'data-orientation': orientationOf(config),
    },
    content: { 'data-orientation': orientationOf(config) },
    previous: {
      'aria-label': 'Previous slide',
      'data-disabled': canScrollPrev(state, config) ? undefined : 'true',
    },
    next: {
      'aria-label': 'Next slide',
      'data-disabled': canScrollNext(state, config) ? undefined : 'true',
    },
    indicators: { 'aria-label': 'Choose slide to display' },
  }),
  // The pure claim record (Spec 01): these keys move the carousel. The composed
  // keyboard-handler resolves the target index via indexForKey.
  keymap: (event, _state, part, config) => {
    if (part !== 'root') return null;
    const vertical = orientationOf(config) === 'vertical';
    const keys = vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    return keys.includes(event.key) ? 'setIndex' : null;
  },
};

/**
 * Per-instance ARIA for the `many` parts (Spec 01: BehaviorSpec.instanceAria).
 * `aria()` projects one AriaAttrs per part NAME; slides and indicators occur
 * once per index, so their projection takes the instance value (the index as a
 * string). The generic harness reads `carouselBehavior.instanceAria` and drives
 * every rendered instance; the decorators call the concrete function directly.
 */
export function carouselInstanceAria(
  part: CarouselPart,
  value: string,
  state: CarouselState,
  config: CarouselConfig,
): AriaAttrs {
  const index = Number(value);
  const current = activeIndex(state, config) === index;
  if (part === 'item') {
    return {
      'aria-roledescription': 'slide',
      'aria-label': `${index + 1} of ${countOf(config)}`,
      'data-state': current ? 'active' : 'inactive',
    };
  }
  if (part === 'indicator') {
    return {
      'aria-label': `Go to slide ${index + 1}`,
      'aria-current': current ? 'true' : undefined,
      'data-state': current ? 'active' : 'inactive',
    };
  }
  return {};
}

export const carouselBehavior: BehaviorSpec<
  CarouselConfig,
  CarouselState,
  CarouselActions,
  CarouselPart
> = {
  ...compose('carousel', carousel),
  instanceAria: (part, value, state, config) => carouselInstanceAria(part, value, state, config),
};

/** The root and the dispatch the arrow-key handler composes against. */
export interface CarouselInteractionOptions {
  /** The keyboard host -- the region root; a focused control's keydown bubbles up. */
  root: HTMLElement;
  getState: () => CarouselState;
  getConfig: () => CarouselConfig;
  /** Commit a move to an already-resolved index. */
  request: (index: number) => void;
}

/**
 * Compose the impure keyboard surface directly from `keyboard-handler`. Shared
 * verbatim by `bindCarousel` (WC + Astro) and the React controller's effect --
 * one composition, three performances, so the navigation rules cannot drift.
 * Only the orientation's two arrow keys are registered, so preventDefault never
 * swallows the cross-axis scroll.
 */
export function composeCarouselInteractions(options: CarouselInteractionOptions): () => void {
  const { root, getState, getConfig, request } = options;
  const vertical = orientationOf(getConfig()) === 'vertical';
  const keys = vertical
    ? (['ArrowUp', 'ArrowDown'] as const)
    : (['ArrowLeft', 'ArrowRight'] as const);
  return createKeyboardHandler(root, {
    key: [...keys],
    preventDefault: true,
    handler: (event) => {
      const config = getConfig();
      const state = getState();
      const target = indexForKey(event.key, state, config);
      if (target === null) return;
      if (target === activeIndex(state, config)) return;
      request(target);
    },
  });
}

/**
 * The DOM-native binding of the carousel score -- the client the Web Component
 * and the Astro <script> both import. React (retained-mode) reads the
 * projections declaratively instead, but composes the SAME
 * `composeCarouselInteractions`. Uncontrolled: WC/Astro carry no reactive prop,
 * so `config.value` is undefined and the effective index is the intrinsic state,
 * seeded from `data-active-index`.
 */
export function bindCarousel(root: HTMLElement): () => void {
  const items = root.querySelectorAll<HTMLElement>('[data-part="item"]');
  const config: CarouselConfig = {
    orientation: root.getAttribute('data-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    loop: root.getAttribute('data-loop') === 'true',
    count: items.length,
    label: root.getAttribute('aria-label') ?? undefined,
    defaultValue: Number.parseInt(root.getAttribute('data-active-index') ?? '', 10) || 0,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(carouselBehavior, config);

  const ids = {} as PartIds<CarouselPart>;
  for (const part of Object.keys(carouselBehavior.parts) as CarouselPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const manyParts = (Object.keys(carouselBehavior.parts) as CarouselPart[]).filter(
    (part) => carouselBehavior.parts[part].many,
  );

  const projectInstances = (state: CarouselState) => {
    for (const part of manyParts) {
      for (const el of root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)) {
        const value = el.dataset['value'];
        if (value === undefined) continue;
        applyProjection(el, carouselInstanceAria(part, value, state, config));
      }
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = carouselBehavior.aria(state, config, ids);
    for (const part of Object.keys(projection) as CarouselPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }

    const track = getPart('track');
    if (track) track.style.transform = trackStyle(state, config).transform;

    const previous = getPart('previous') as HTMLButtonElement | null;
    if (previous) previous.disabled = !canScrollPrev(state, config);
    const next = getPart('next') as HTMLButtonElement | null;
    if (next) next.disabled = !canScrollNext(state, config);

    projectInstances(state);
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const request = (index: number): void => {
    dispatch('setIndex', config, clampIndex(index, config));
  };

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-part="previous"]')) {
      request(prevIndex(memory.get(), config));
      return;
    }
    if (target.closest('[data-part="next"]')) {
      request(nextIndex(memory.get(), config));
      return;
    }
    const indicator = target.closest<HTMLElement>('[data-part="indicator"]');
    if (indicator && root.contains(indicator)) {
      const value = indicator.dataset['value'];
      if (value !== undefined) request(Number(value));
    }
  };
  root.addEventListener('click', onClick);

  const stopInteractions = composeCarouselInteractions({
    root,
    getState: () => memory.get(),
    getConfig: () => config,
    request,
  });

  return () => {
    unsubscribe();
    stopInteractions();
    root.removeEventListener('click', onClick);
  };
}
