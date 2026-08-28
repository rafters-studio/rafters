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
 * static). `duration-fast` is the oracle's settled transition timing, ported
 * verbatim; `motion-reduce:transition-none` honours reduced-motion.
 */
export const scrollBarBaseClasses =
  'flex touch-none select-none transition-colors duration-fast motion-reduce:transition-none';

const scrollBarOrientationClasses: Record<ScrollBarOrientation, string> = {
  vertical: 'h-full w-2.5 border-l border-l-transparent p-px',
  horizontal: 'h-2.5 w-full flex-col border-t border-t-transparent p-px',
};

/** The draggable thumb inside a decorative ScrollBar. */
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
