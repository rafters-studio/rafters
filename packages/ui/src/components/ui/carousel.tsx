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
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { createMemory } from '../../primitives/memory';

// ==================== Types ====================

type Orientation = 'horizontal' | 'vertical';

/**
 * Reactive navigation/transient state for a carousel instance.
 *
 * `currentIndex` and `isPaused` are the shareable navigation state. `itemsVersion`
 * is a bump counter incremented on register/unregister; the item count itself lives
 * in a ref (see {@link Carousel}) so registration churn does not force a broad
 * Map/array-in-cell re-render -- consumers re-render via the version bump, then read
 * the live count from the ref.
 */
interface CarouselState {
  currentIndex: number;
  isPaused: boolean;
  itemsVersion: number;
}

// ==================== Context ====================

interface CarouselContextValue {
  orientation: Orientation;
  currentIndex: number;
  totalItems: number;
  canScrollPrevious: boolean;
  canScrollNext: boolean;
  scrollPrevious: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  registerItem: (id: string) => void;
  unregisterItem: (id: string) => void;
  carouselRef: React.RefObject<HTMLDivElement | null>;
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarouselContext() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error('Carousel components must be used within Carousel');
  }
  return context;
}

// ==================== Carousel (Root) ====================

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
  loop?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function Carousel({
  orientation = 'horizontal',
  loop = false,
  autoPlay = false,
  autoPlayInterval = 5000,
  className,
  children,
  ...props
}: CarouselProps) {
  // Navigation/transient state lives in one reactive cell per instance. The whole
  // value is subscribed via useMemory (state is small); a change to any field
  // (including the itemsVersion bump) re-renders so totalItems is recomputed.
  const [memory] = React.useState(() =>
    createMemory<CarouselState>(() => ({ currentIndex: 0, isPaused: false, itemsVersion: 0 })),
  );
  const { currentIndex, isPaused } = useMemory(memory);

  // The item registry is a bottom-up child registry keyed by id. The count lives
  // here (a ref) instead of the cell; register/unregister bump itemsVersion to
  // signal consumers without putting the array in the cell.
  const itemIdsRef = React.useRef<string[]>([]);
  const totalItems = itemIdsRef.current.length;

  const carouselRef = React.useRef<HTMLDivElement | null>(null);

  const canScrollPrevious = loop || currentIndex > 0;
  const canScrollNext = loop || currentIndex < totalItems - 1;

  const scrollPrevious = React.useCallback(() => {
    const total = itemIdsRef.current.length;
    const prev = memory.get().currentIndex;
    const next = prev === 0 ? (loop ? total - 1 : 0) : prev - 1;
    memory.patch({ currentIndex: next });
  }, [loop, memory]);

  const scrollNext = React.useCallback(() => {
    const total = itemIdsRef.current.length;
    const prev = memory.get().currentIndex;
    const next = prev === total - 1 ? (loop ? 0 : total - 1) : prev + 1;
    memory.patch({ currentIndex: next });
  }, [loop, memory]);

  const scrollTo = React.useCallback(
    (index: number) => {
      const total = itemIdsRef.current.length;
      memory.patch({ currentIndex: Math.max(0, Math.min(index, total - 1)) });
    },
    [memory],
  );

  // Registration is idempotent-by-id (filter-then-set) so StrictMode's
  // double-invoked mount effect does not double-count a single item.
  const registerItem = React.useCallback(
    (id: string) => {
      itemIdsRef.current = [...itemIdsRef.current.filter((entry) => entry !== id), id];
      memory.patch({ itemsVersion: memory.get().itemsVersion + 1 });
    },
    [memory],
  );

  const unregisterItem = React.useCallback(
    (id: string) => {
      itemIdsRef.current = itemIdsRef.current.filter((entry) => entry !== id);
      memory.patch({ itemsVersion: memory.get().itemsVersion + 1 });
    },
    [memory],
  );

  // Auto-play
  React.useEffect(() => {
    if (!autoPlay || isPaused || totalItems === 0) return;

    const interval = setInterval(() => {
      scrollNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isPaused, scrollNext, totalItems]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (orientation === 'horizontal') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          scrollPrevious();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          scrollNext();
        }
      } else {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          scrollPrevious();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          scrollNext();
        }
      }
    },
    [orientation, scrollPrevious, scrollNext],
  );

  const contextValue = React.useMemo<CarouselContextValue>(
    () => ({
      orientation,
      currentIndex,
      totalItems,
      canScrollPrevious,
      canScrollNext,
      scrollPrevious,
      scrollNext,
      scrollTo,
      registerItem,
      unregisterItem,
      carouselRef,
    }),
    [
      orientation,
      currentIndex,
      totalItems,
      canScrollPrevious,
      canScrollNext,
      scrollPrevious,
      scrollNext,
      scrollTo,
      registerItem,
      unregisterItem,
    ],
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="region" with aria-roledescription="carousel" is the standard pattern for carousels per WAI-ARIA practices */}
      <div
        ref={carouselRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Carousel"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Carousel requires focus for keyboard navigation (arrow keys to switch slides)
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => memory.patch({ isPaused: true })}
        onMouseLeave={() => memory.patch({ isPaused: false })}
        onFocus={() => memory.patch({ isPaused: true })}
        onBlur={() => memory.patch({ isPaused: false })}
        data-carousel=""
        data-orientation={orientation}
        className={classy('relative', className)}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

// ==================== CarouselContent ====================

export interface CarouselContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CarouselContent({ className, children, ...props }: CarouselContentProps) {
  const { orientation, currentIndex } = useCarouselContext();

  const translateValue =
    orientation === 'horizontal'
      ? `translateX(-${currentIndex * 100}%)`
      : `translateY(-${currentIndex * 100}%)`;

  return (
    <div data-carousel-content="" className={classy('overflow-hidden', className)} {...props}>
      <div
        className={classy(
          'flex transition-transform duration-300 ease-in-out',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        )}
        style={{ transform: translateValue }}
      >
        {children}
      </div>
    </div>
  );
}

// ==================== CarouselItem ====================

export interface CarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CarouselItem({ className, children, ...props }: CarouselItemProps) {
  const { registerItem, unregisterItem } = useCarouselContext();
  const id = React.useId();

  React.useEffect(() => {
    registerItem(id);
    return () => unregisterItem(id);
  }, [registerItem, unregisterItem, id]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" with aria-roledescription="slide" is the standard pattern for carousel slides per WAI-ARIA practices
    <div
      role="group"
      aria-roledescription="slide"
      data-carousel-item=""
      className={classy('min-w-0 shrink-0 grow-0', 'basis-full', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ==================== CarouselPrevious ====================

export interface CarouselPreviousProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function CarouselPrevious({ className, children, ...props }: CarouselPreviousProps) {
  const { orientation, canScrollPrevious, scrollPrevious } = useCarouselContext();

  return (
    <button
      type="button"
      disabled={!canScrollPrevious}
      onClick={scrollPrevious}
      aria-label="Previous slide"
      data-carousel-previous=""
      className={classy(
        'absolute flex h-8 w-8 items-center justify-center rounded-full',
        'border bg-background shadow-sm',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        orientation === 'horizontal'
          ? 'left-2 top-1/2 -translate-y-1/2'
          : 'left-1/2 top-2 -translate-x-1/2 rotate-90',
        className,
      )}
      {...props}
    >
      {children || (
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
      )}
    </button>
  );
}

// ==================== CarouselNext ====================

export interface CarouselNextProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function CarouselNext({ className, children, ...props }: CarouselNextProps) {
  const { orientation, canScrollNext, scrollNext } = useCarouselContext();

  return (
    <button
      type="button"
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label="Next slide"
      data-carousel-next=""
      className={classy(
        'absolute flex h-8 w-8 items-center justify-center rounded-full',
        'border bg-background shadow-sm',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        orientation === 'horizontal'
          ? 'right-2 top-1/2 -translate-y-1/2'
          : 'bottom-2 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      {...props}
    >
      {children || (
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
      )}
    </button>
  );
}

// ==================== CarouselIndicators ====================

export interface CarouselIndicatorsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CarouselIndicators({ className, ...props }: CarouselIndicatorsProps) {
  const { currentIndex, totalItems, scrollTo } = useCarouselContext();

  return (
    <div
      role="tablist"
      aria-label="Carousel navigation"
      data-carousel-indicators=""
      className={classy('flex justify-center gap-2 py-2', className)}
      {...props}
    >
      {Array.from({ length: totalItems }).map((_, index) => (
        <button
          key={`slide-${index}`}
          type="button"
          role="tab"
          aria-selected={index === currentIndex}
          aria-label={`Go to slide ${index + 1}`}
          onClick={() => scrollTo(index)}
          data-carousel-indicator=""
          data-active={index === currentIndex || undefined}
          className={classy(
            'h-2 w-2 rounded-full transition-colors',
            index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

// ==================== useCarousel Hook ====================

export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within Carousel');
  }
  return {
    currentIndex: context.currentIndex,
    totalItems: context.totalItems,
    canScrollPrevious: context.canScrollPrevious,
    canScrollNext: context.canScrollNext,
    scrollPrevious: context.scrollPrevious,
    scrollNext: context.scrollNext,
    scrollTo: context.scrollTo,
  };
}

// ==================== Display Names ====================

Carousel.displayName = 'Carousel';
CarouselContent.displayName = 'CarouselContent';
CarouselItem.displayName = 'CarouselItem';
CarouselPrevious.displayName = 'CarouselPrevious';
CarouselNext.displayName = 'CarouselNext';
CarouselIndicators.displayName = 'CarouselIndicators';

// ==================== Namespaced Export ====================

Carousel.Content = CarouselContent;
Carousel.Item = CarouselItem;
Carousel.Previous = CarouselPrevious;
Carousel.Next = CarouselNext;
Carousel.Indicators = CarouselIndicators;
