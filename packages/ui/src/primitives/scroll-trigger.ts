/**
 * Scroll-trigger primitive
 *
 * Fires when an element reaches a point on the screen. Built on
 * IntersectionObserver: the "point" is the trigger line defined by `rootMargin`
 * against `root` (the viewport by default). The handler runs each time the
 * element crosses that line, with `active` = whether it is currently
 * intersecting. Client-only, a no-op during SSR (or where IntersectionObserver
 * is unavailable), and returns a cleanup function.
 *
 * The primitive owns observation and teardown; the consumer owns the reaction.
 * The handler can do anything -- pin a header, start an animation, lazy-load --
 * or use `toggleClassOnScroll` for the common "switch a class" case.
 */

import type { CleanupFunction, ScrollTriggerHandler } from './types';

export interface ScrollTriggerOptions {
  /** Scroll container to observe within. Defaults to the viewport. */
  root?: Element | Document | null;
  /** Shifts the trigger line. Standard IntersectionObserver rootMargin syntax. */
  rootMargin?: string;
  /** Intersection ratio(s) that count as crossing the line. Default 0. */
  threshold?: number | number[];
}

/**
 * Run `handler` whenever `element` crosses the trigger line. Returns a cleanup
 * function that disconnects the observer.
 */
export function onScrollTrigger(
  element: Element,
  handler: ScrollTriggerHandler,
  options: ScrollTriggerOptions = {},
): CleanupFunction {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return () => {};
  }

  const init: IntersectionObserverInit = {
    root: options.root ?? null,
    threshold: options.threshold ?? 0,
  };
  // exactOptionalPropertyTypes: only set rootMargin when actually provided.
  if (options.rootMargin !== undefined) {
    init.rootMargin = options.rootMargin;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      handler(entry.isIntersecting, entry);
    }
  }, init);

  observer.observe(element);
  return () => observer.disconnect();
}

export interface ToggleClassOnScrollOptions extends ScrollTriggerOptions {
  /** Class to switch. */
  className: string;
  /** Element to switch the class on. Defaults to the observed element. */
  target?: Element;
  /**
   * Present the class while the element is in view (default). Set false to
   * invert -- class present while it is OUT of view, e.g. a top sentinel that
   * pins a header once you have scrolled past it.
   */
  whileInView?: boolean;
}

/**
 * Convenience over onScrollTrigger: switch a class on/off as the element crosses
 * the trigger line.
 */
export function toggleClassOnScroll(
  element: Element,
  options: ToggleClassOnScrollOptions,
): CleanupFunction {
  const { className, target, whileInView = true, ...triggerOptions } = options;
  const subject = target ?? element;
  return onScrollTrigger(
    element,
    (active) => {
      subject.classList.toggle(className, whileInView ? active : !active);
    },
    triggerOptions,
  );
}
