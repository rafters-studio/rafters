import type { AspectRatioConfig, AspectRatioState } from './aspect-ratio.behavior';

/**
 * AspectRatio classes: the view. No logic, no config branches -- the wrapper
 * is a constant structural surface, and the one data-driven datum (`ratio`)
 * is painted through the inline style channel, never a class. The signature
 * still takes `(config, state)` so the projection reads like every other
 * component's and the conformance harness can call it uniformly.
 */
export interface AspectRatioClassSet {
  root: string;
}

/** The wrapper: positioned, full-width, so the ratio governs its height. */
export const aspectRatioBaseClasses = 'relative w-full';

/**
 * Child fill: every direct child stretches to cover the ratio box. The
 * consumer supplies `object-fit` on the child (matching shadcn/Radix, whose
 * examples pass `className="object-cover"` on the image) -- the box never
 * forces a fit mode on content it does not own.
 */
export const aspectRatioChildFillClasses = '[&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full';

export function aspectRatioClasses(
  _config: AspectRatioConfig,
  _state: AspectRatioState,
): AspectRatioClassSet {
  return { root: `${aspectRatioBaseClasses} ${aspectRatioChildFillClasses}` };
}
