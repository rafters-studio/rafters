import type { CarouselConfig } from '@/components/ui/carousel.behavior';

export interface CarouselClassSet {
  root: string;
  content: string;
  track: string;
  item: string;
  previous: string;
  next: string;
  indicators: string;
  indicator: string;
}

const rootClasses = 'relative';

const contentClasses = 'overflow-hidden';

// The track lays the slides along the orientation axis and translates to the
// active slide. `trackStyle` writes the offset as an inline transform; the
// transition that animates it is declared here (#2275).
//
// TRACK / INDEX CHANGE -- "travel (x, item width)" at duration-normal,
// ease-spring-smooth, extent structural (item width), marked `proposed`
// (unreviewed) in motion.jsonl. A DISCRETE step, not a pointer drag: the index
// moves by a next/prev click, an indicator click, or an arrow key, and the
// travel is the item width the offset already encodes. So it animates, and the
// transition is unconditional -- there is no pointer-driven state on this track
// to suppress it for (see the two absent rows below).
//
// A TRANSITION, and the row's `movement` is what decides that. `travel` and
// `slide` are separate entries in the movement vocabulary: `slide` is a
// transform-translate on something that mounts or unmounts, and is a keyframe;
// `travel` is position along a track on an element that stays present, and is a
// transition (motion.md, Movement vocabulary). This track never unmounts, so
// this row never wanted a slide keyframe -- the same shape as resizable's
// keyboard step and slider's, both `travel` rows consumed as transitions.
//
// The axis is not named here and must not be: `trackStyle` picks translateX or
// translateY from `orientation` (carousel.behavior.ts), which is logical, not
// physical. A class naming a physical side would be a defect.
//
// TRACK / SWIPE -- "travel", and its `duration.kind` in motion.jsonl is
// literally "pointer-rule", not a tier. THE SILENCE ON THIS PART IS THE
// ASSIGNMENT, not an oversight: a pointer-rule row says the part tracks the
// pointer exactly, no class expresses "instant", and any nonzero duration is
// the defect. The row is consumed by writing nothing.
//
// It is doubly silent here, because this carousel has no swipe to begin with.
// Touch swipe was deliberately not ported (carousel.behavior.ts header), so no
// pointer ever drives the track. Even a suppression rule would be machinery for
// a gesture that cannot happen.
//
// TRACK / SETTLE ON RELEASE -- "travel (to index)" at the fast tier on the
// spring-smooth curve, marked `proposed`. Reported the same way and for the
// same reason: a settle-on-release exists only after a release, and there is no
// drag to release. When swipe lands, this row is its snap, scoped to the
// release state. Its two utility names are described rather than spelled --
// Tailwind extracts candidates from this file's whole SOURCE TEXT, comments
// included, so naming a class the file does not use ships a dead rule to every
// consumer that installs the component.
const trackHorizontal = 'flex flex-row transition-transform duration-normal ease-spring-smooth';
const trackVertical = 'flex flex-col transition-transform duration-normal ease-spring-smooth';

const itemClasses = 'min-w-0 shrink-0 grow-0 basis-full';

// The prev/next controls share the round chrome; orientation only moves them.
//
// MOMENTS WITH NO ROW, reported rather than assigned: the controls' and the
// indicators' `transition-colors` below are hover/active moments the matrix
// gives carousel no cell for -- the interactive-surface section carries rows for
// button, badge, table rows and kin, none for a carousel control or indicator.
// They are left on Tailwind's own default timing rather than given a tier this
// file would be inventing; contest it by adding the rows, not by picking here.
const controlBase =
  'absolute inline-flex h-8 w-8 items-center justify-center rounded-full border ' +
  'bg-background text-foreground shadow-sm transition-colors ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
  'disabled:pointer-events-none disabled:opacity-50';

const previousHorizontal = 'left-2 top-1/2 -translate-y-1/2';
const previousVertical = 'left-1/2 top-2 -translate-x-1/2 rotate-90';
const nextHorizontal = 'right-2 top-1/2 -translate-y-1/2';
const nextVertical = 'bottom-2 left-1/2 -translate-x-1/2 rotate-90';

const indicatorsClasses = 'flex justify-center gap-2 py-2';

const indicatorClasses =
  'h-2 w-2 rounded-full bg-muted-foreground/30 transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
  'data-[state=active]:bg-primary';

export function carouselClasses(config: CarouselConfig): CarouselClassSet {
  const vertical = config.orientation === 'vertical';
  return {
    root: rootClasses,
    content: contentClasses,
    track: vertical ? trackVertical : trackHorizontal,
    item: itemClasses,
    previous: `${controlBase} ${vertical ? previousVertical : previousHorizontal}`,
    next: `${controlBase} ${vertical ? nextVertical : nextHorizontal}`,
    indicators: indicatorsClasses,
    indicator: indicatorClasses,
  };
}
