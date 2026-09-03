import type {
  ScrollAreaConfig,
  ScrollAreaOrientation,
  ScrollAreaState,
  ScrollBarOrientation,
} from './scroll-area.behavior';

export interface ScrollAreaClassSet {
  root: string;
}

/**
 * Structure the scroll surface always carries: fills its box, rounds its
 * corners (container-query responsive). Ported verbatim from the oracle.
 */
const scrollAreaBaseClasses = 'h-full w-full rounded-sm @md:rounded-md @lg:rounded-lg';

/**
 * The custom scrollbar over native overflow -- WebKit pseudo-element styling.
 * `bg-border` is the semantic thumb colour; `w-2.5`/`h-2.5` are the oracle's
 * settled track thickness (a decoration disposition, ported verbatim, not a
 * new raw-utility choice).
 */
const scrollAreaScrollbarBaseClasses =
  '[&::-webkit-scrollbar]:w-2.5 ' +
  '[&::-webkit-scrollbar]:h-2.5 ' +
  '[&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full ' +
  '[&::-webkit-scrollbar-thumb]:bg-border ' +
  '[&::-webkit-scrollbar-corner]:bg-transparent';

/** Which axis overflows. `both` is the rafters extension. */
const scrollAreaOrientationClasses: Record<ScrollAreaOrientation, string> = {
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
};

/**
 * Decorative ScrollBar track (shadcn's ScrollBar). Config-independent literals,
 * so the framework files import them directly (no context/provider for a flat
 * static).
 *
 * motion.jsonl `scroll-area / scrollbar / hover` -- color (background, text,
 * border), fast, standard. The curve was missing before (a bare `duration-fast`
 * ported from the oracle left the browser's default ease in place), and
 * `motion-reduce:transition-none` is gone: the reduced-motion law is written
 * once on the duration leaf and a component-level escape only fights it.
 *
 * NO MOMENT for `scroll-area / scrollbar / show` (fade, fast*, standard*) or
 * `scroll-area / scrollbar / hide` (fade, fast*, standard*, delay-linger). Both
 * rows carry `provenance: proposed`, and the hide row's own `notes` field says
 * "proposed, unimplemented". Nothing in this component can key them: ScrollArea
 * is the static archetype -- `ScrollAreaState` is `Record<never, never>`, its
 * aria projection is `{ root: {} }`, and the bar is always visible. Deciding
 * WHAT reveals a scrollbar (pointer over the surface? a scroll in flight?) is a
 * design decision no row makes, so the generator's emitted
 * `animate-fade-in-fast-standard` / `animate-fade-out-fast-standard` cells go
 * unconsumed here rather than being hung off an invented trigger. Two findings
 * reported on #2299: the missing state, and the fact that the hide row's
 * `delay-linger` could not attach even with one -- `delay-*` bridges onto
 * Tailwind's `--transition-delay-*` and sets `transition-delay` only, so it
 * cannot delay a keyframe animation.
 */
export const scrollBarBaseClasses =
  'flex touch-none select-none transition-colors duration-fast ease-standard';

const scrollBarOrientationClasses: Record<ScrollBarOrientation, string> = {
  vertical: 'h-full w-2.5 border-l border-l-transparent p-px',
  horizontal: 'h-2.5 w-full flex-col border-t border-t-transparent p-px',
};

/**
 * The draggable thumb inside a decorative ScrollBar.
 *
 * motion.jsonl `scroll-area / thumb / drag` -- travel (position along a track),
 * `duration: {"kind":"pointer-rule"}`, curve none. Consumed BY ABSENCE, which is
 * the only way to consume it: while the pointer drives the thumb it must track
 * the pointer exactly, and any nonzero duration is a defect. No transition
 * utility here, deliberately.
 */
export const scrollBarThumbClasses = 'flex-1 rounded-full bg-border';

export function scrollAreaClasses(
  config: ScrollAreaConfig,
  _state: ScrollAreaState,
): ScrollAreaClassSet {
  const orientation = config.orientation ?? 'vertical';
  return {
    root: [
      scrollAreaBaseClasses,
      scrollAreaScrollbarBaseClasses,
      scrollAreaOrientationClasses[orientation],
    ].join(' '),
  };
}

export interface ScrollBarClassSet {
  bar: string;
  thumb: string;
}

/** One source for the decorative ScrollBar classes -- all three frameworks
 *  draw from here, zero drift. */
export function scrollBarClasses(
  orientation: ScrollBarOrientation = 'vertical',
): ScrollBarClassSet {
  return {
    bar: [scrollBarBaseClasses, scrollBarOrientationClasses[orientation]].join(' '),
    thumb: scrollBarThumbClasses,
  };
}
