/**
 * Carousel component for cycling through content slides
 *
 * @cognitive-load 4/10 - Familiar slideshow pattern; left/right navigation intuitive
 * @attention-economics Medium attention: viewing content, navigating between slides
 * @trust-building Clear navigation affordances, visible progress indicators, keyboard accessible
 * @accessibility Keyboard navigation (arrows), ARIA live region for announcements, focus management
 * @semantic-meaning Content showcase: image galleries, testimonials, feature tours
 *
 * @usage-patterns
 * DO: Provide clear navigation controls (arrows, dots)
 * DO: Show current position indicator
 * DO: Support keyboard navigation
 * DO: Pause auto-play on hover/focus
 * DO: Support touch/swipe gestures
 * NEVER: Auto-advance too quickly (allow content consumption)
 * NEVER: Hide all navigation controls
 * NEVER: Loop without clear indication
 *
 * @example
 * ```tsx
 * <Carousel>
 *   <Carousel.Content>
 *     <Carousel.Item>Slide 1</Carousel.Item>
 *     <Carousel.Item>Slide 2</Carousel.Item>
 *     <Carousel.Item>Slide 3</Carousel.Item>
 *   </Carousel.Content>
 *   <Carousel.Previous />
 *   <Carousel.Next />
 * </Carousel>
 * ```
 */
import * as React from 'react';
import { createBehavior, type AriaAttrs, type PartIds, type PayloadArgs } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  activeIndex,
  canScrollNext,
  canScrollPrev,
  carouselBehavior,
  carouselInstanceAria,
  clampIndex,
  composeCarouselInteractions,
  nextIndex,
  prevIndex,
  trackStyle,
  type CarouselActions,
  type CarouselConfig,
  type CarouselPart,
  type CarouselState,
} from '@/components/ui/carousel.behavior';
import { carouselClasses, type CarouselClassSet } from '@/components/ui/carousel.classes';

/**
 * Carousel -- a slide sequence advanced one at a time by prev/next controls,
 * arrow keys, or the indicator picker (goto).
 *
 * @cognitive-load
 * - intrinsic: 3/10 -- a slideshow is a universally learned pattern.
 * - extraneous: 2/10 -- two arrows and a row of dots, nothing to decode.
 * - germane: 2/10 -- position ("N of M") is announced, not inferred.
 * - working-memory: 2/10 -- one slide holds attention at a time.
 * - overall: 3/10 -- familiar, low-friction navigation.
 * @attention-economics Medium draw: content is the focus; the chrome recedes
 * until a control is hovered or focused. No auto-advance steals attention.
 * @trust-building Disabled arrows at the ends and a highlighted current dot make
 * the sequence's bounds and position honest and predictable.
 * @accessibility role=region + aria-roledescription="carousel"; each slide is a
 * labelled group ("N of M"); prev/next carry names and disable at the bounds;
 * arrow keys steer along the orientation axis; the current dot is aria-current.
 */
interface CarouselContextValue {
  state: CarouselState;
  config: CarouselConfig;
  count: number;
  setCount: (count: number) => void;
  classes: CarouselClassSet;
  aria: Partial<Record<string, AriaAttrs>>;
  request: <K extends keyof CarouselActions>(
    action: K,
    ...payload: PayloadArgs<CarouselActions[K]>
  ) => void;
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarouselContext(component: string): CarouselContextValue {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error(`${component} must be used within <Carousel>`);
  }
  return context;
}

const CarouselItemIndexContext = React.createContext<number>(0);

export interface CarouselProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  /** Controlled active slide index. */
  value?: number;
  /** Uncontrolled seed for the active slide index. */
  defaultValue?: number;
  onIndexChange?: (index: number) => void;
  /** Accessible name of the region (default "Carousel"). */
  label?: string;
}

export function Carousel({
  orientation = 'horizontal',
  loop = false,
  value,
  defaultValue = 0,
  onIndexChange,
  label,
  className,
  children,
  ...props
}: CarouselProps) {
  const [count, setCount] = React.useState(0);
  const config: CarouselConfig = { orientation, loop, count, label, value, defaultValue };

  // createBehavior is the model (memory + dispatch); useMemory subscribes React
  // to it. The only React plumbing on top is the reported slide count and ids.
  const { memory, dispatch } = React.useMemo(() => createBehavior(carouselBehavior, config), []);
  const state = useMemory(memory);

  const uid = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);

  // ids are derived once from the root uid -- the projection never generates
  // them (Spec 01), and no part cross-references another here.
  const ids = React.useMemo(() => {
    const out = {} as PartIds<CarouselPart>;
    for (const part of Object.keys(carouselBehavior.parts) as CarouselPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);

  // Effect-initiated moves (keyboard) must read the CURRENT config and callback,
  // so those ride in a ref rather than being captured stale.
  const latest = React.useRef({ config, onIndexChange });
  latest.current = { config, onIndexChange };

  const request = React.useCallback(
    <K extends keyof CarouselActions>(
      action: K,
      ...payload: PayloadArgs<CarouselActions[K]>
    ): void => {
      const { config: cfg, onIndexChange: cb } = latest.current;
      // Effective index before vs the INTRINSIC index after: a controlled
      // carousel's effective index never moves (config.value shadows it), but
      // the consumer callback must still report the index it should set next.
      const before = activeIndex(memory.get(), cfg);
      if (!dispatch(action, cfg, ...payload)) return;
      const nextIntrinsic = clampIndex(memory.get().index, cfg);
      if (nextIntrinsic !== before) cb?.(nextIntrinsic);
    },
    [memory, dispatch],
  );

  // Compose the arrow-key handler directly, rebuilt only when the orientation
  // changes (it selects the axis's two keys). getConfig/getState read live.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return composeCarouselInteractions({
      root,
      getState: () => memory.get(),
      getConfig: () => latest.current.config,
      request: (index) => request('setIndex', clampIndex(index, latest.current.config)),
    });
  }, [orientation, memory, request]);

  const aria = carouselBehavior.aria(state, config, ids);

  const contextValue: CarouselContextValue = {
    state,
    config,
    count,
    setCount,
    classes: carouselClasses(config),
    aria,
    request,
  };

  return (
    <CarouselContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="region" + aria-roledescription="carousel" is the WAI-ARIA carousel pattern */}
      <div
        ref={rootRef}
        role="region"
        data-part="root"
        id={`${uid}-root`}
        data-orientation={orientation}
        className={classy(contextValue.classes.root, className)}
        {...aria.root}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

export type CarouselContentProps = React.HTMLAttributes<HTMLDivElement>;

export function CarouselContent({ className, children, ...props }: CarouselContentProps) {
  const { state, config, classes, setCount } = useCarouselContext('CarouselContent');
  const items = React.Children.toArray(children);

  // The DOM (the rendered slides) is the registry; report the count up so the
  // root can bound the index and disable the controls at the ends.
  React.useEffect(() => {
    setCount(items.length);
  }, [items.length, setCount]);

  return (
    <div data-part="content" className={classes.content} data-orientation={config.orientation}>
      <div
        data-part="track"
        className={classy(classes.track, className)}
        style={trackStyle(state, config)}
        {...props}
      >
        {items.map((child, index) => (
          <CarouselItemIndexContext.Provider key={`slide-${index}`} value={index}>
            {child}
          </CarouselItemIndexContext.Provider>
        ))}
      </div>
    </div>
  );
}

export type CarouselItemProps = React.HTMLAttributes<HTMLDivElement>;

export function CarouselItem({ className, ...props }: CarouselItemProps) {
  const { state, config, classes } = useCarouselContext('CarouselItem');
  const index = React.useContext(CarouselItemIndexContext);
  const aria = carouselInstanceAria('item', String(index), state, config);

  return (
    <div
      role="group"
      data-part="item"
      data-value={index}
      className={classy(classes.item, className)}
      {...aria}
      {...props}
    />
  );
}

export type CarouselPreviousProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function CarouselPrevious({
  className,
  children,
  onClick,
  ...props
}: CarouselPreviousProps) {
  const { state, config, classes, aria, request } = useCarouselContext('CarouselPrevious');

  return (
    <button
      type="button"
      data-part="previous"
      disabled={!canScrollPrev(state, config)}
      className={classy(classes.previous, className)}
      {...aria.previous}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        request('setIndex', prevIndex(state, config));
      }}
      {...props}
    >
      {children ?? <ChevronPrevious />}
    </button>
  );
}

export type CarouselNextProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function CarouselNext({ className, children, onClick, ...props }: CarouselNextProps) {
  const { state, config, classes, aria, request } = useCarouselContext('CarouselNext');

  return (
    <button
      type="button"
      data-part="next"
      disabled={!canScrollNext(state, config)}
      className={classy(classes.next, className)}
      {...aria.next}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        request('setIndex', nextIndex(state, config));
      }}
      {...props}
    >
      {children ?? <ChevronNext />}
    </button>
  );
}

export type CarouselIndicatorsProps = React.HTMLAttributes<HTMLDivElement>;

export function CarouselIndicators({ className, ...props }: CarouselIndicatorsProps) {
  const { state, config, count, classes, aria, request } = useCarouselContext('CarouselIndicators');

  return (
    <div
      role="group"
      data-part="indicators"
      className={classy(classes.indicators, className)}
      {...aria.indicators}
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => {
        const instance = carouselInstanceAria('indicator', String(index), state, config);
        return (
          <button
            key={`indicator-${index}`}
            type="button"
            data-part="indicator"
            data-value={index}
            className={classes.indicator}
            {...instance}
            onClick={() => request('setIndex', index)}
          />
        );
      })}
    </div>
  );
}

/**
 * The imperative slide controls, for consumers driving the carousel from outside
 * a control (shadcn's `useCarousel` shape, minus the Embla instance).
 */
export function useCarousel() {
  const { state, config, count, request } = useCarouselContext('useCarousel');
  return {
    activeIndex: activeIndex(state, config),
    count,
    canScrollPrev: canScrollPrev(state, config),
    canScrollNext: canScrollNext(state, config),
    scrollPrev: () => request('setIndex', prevIndex(state, config)),
    scrollNext: () => request('setIndex', nextIndex(state, config)),
    scrollTo: (index: number) => request('setIndex', clampIndex(index, config)),
  };
}

function ChevronPrevious() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronNext() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

Carousel.displayName = 'Carousel';
CarouselContent.displayName = 'CarouselContent';
CarouselItem.displayName = 'CarouselItem';
CarouselPrevious.displayName = 'CarouselPrevious';
CarouselNext.displayName = 'CarouselNext';
CarouselIndicators.displayName = 'CarouselIndicators';

Carousel.Content = CarouselContent;
Carousel.Item = CarouselItem;
Carousel.Previous = CarouselPrevious;
Carousel.Next = CarouselNext;
Carousel.Indicators = CarouselIndicators;
