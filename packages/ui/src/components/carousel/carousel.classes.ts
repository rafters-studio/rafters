import type { CarouselConfig } from './carousel.behavior';

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
// active slide. No transition class: the slide-advance motion has no semantic
// motion-* token yet (see carousel.behavior.ts and carousel.md), so the offset
// applies without a hardcoded duration.
const trackHorizontal = 'flex flex-row';
const trackVertical = 'flex flex-col';

const itemClasses = 'min-w-0 shrink-0 grow-0 basis-full';

// The prev/next controls share the round chrome; orientation only moves them.
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
