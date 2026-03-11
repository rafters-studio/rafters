/**
 * Color Weight primitive
 * Displays perceptual weight, atmospheric weight, and balancing
 * recommendation data for a color family.
 *
 * Framework-agnostic, SSR-safe. The caller provides the container
 * element and weight data; the primitive sets data attributes and
 * creates child elements with appropriate ARIA labels.
 *
 * @example
 * ```typescript
 * const cleanup = createColorWeight(el, {
 *   perceptualWeight: {
 *     weight: 0.72,
 *     density: 'medium',
 *     balancingRecommendation: 'Pair with a lighter element.',
 *   },
 *   atmosphericWeight: {
 *     distanceWeight: 0.45,
 *     temperature: 'warm',
 *     atmosphericRole: 'midground',
 *   },
 * });
 *
 * // teardown
 * cleanup();
 * ```
 */

import type { CleanupFunction } from './types';

export interface ColorWeightOptions {
  perceptualWeight: {
    /** Weight score 0-1 */
    weight: number;
    /** Density classification */
    density: 'light' | 'medium' | 'heavy';
    /** Human-readable balancing recommendation */
    balancingRecommendation: string;
  };
  atmosphericWeight: {
    /** Distance weight 0-1 */
    distanceWeight: number;
    /** Color temperature */
    temperature: 'warm' | 'neutral' | 'cool';
    /** Atmospheric role */
    atmosphericRole: 'background' | 'midground' | 'foreground';
  };
}

const DATA_ATTRS = [
  'data-perceptual-weight',
  'data-density',
  'data-atmospheric-role',
  'data-distance-weight',
  'data-temperature',
] as const;

/**
 * Apply color weight data to a container element.
 * Sets data attributes and creates child sections for perceptual weight,
 * atmospheric weight, and a balancing recommendation.
 * Returns a cleanup function that restores the container to its original state.
 */
export function createColorWeight(
  element: HTMLElement,
  options: ColorWeightOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const previousValues = new Map<string, string | null>();
  for (const attr of DATA_ATTRS) {
    previousValues.set(attr, element.getAttribute(attr));
  }

  element.setAttribute('data-perceptual-weight', String(options.perceptualWeight.weight));
  element.setAttribute('data-density', options.perceptualWeight.density);
  element.setAttribute('data-atmospheric-role', options.atmosphericWeight.atmosphericRole);
  element.setAttribute('data-distance-weight', String(options.atmosphericWeight.distanceWeight));
  element.setAttribute('data-temperature', options.atmosphericWeight.temperature);

  const perceptualSection = document.createElement('div');
  perceptualSection.setAttribute('aria-label', 'Perceptual weight');
  perceptualSection.textContent = `${options.perceptualWeight.weight} ${options.perceptualWeight.density}`;
  element.appendChild(perceptualSection);

  const atmosphericSection = document.createElement('div');
  atmosphericSection.setAttribute('aria-label', 'Atmospheric weight');
  atmosphericSection.textContent = `${options.atmosphericWeight.atmosphericRole} ${options.atmosphericWeight.distanceWeight}`;
  element.appendChild(atmosphericSection);

  const recommendation = document.createElement('div');
  recommendation.setAttribute('role', 'note');
  recommendation.setAttribute('aria-label', 'Balancing recommendation');
  recommendation.textContent = options.perceptualWeight.balancingRecommendation;
  element.appendChild(recommendation);

  return () => {
    perceptualSection.remove();
    atmosphericSection.remove();
    recommendation.remove();

    for (const attr of DATA_ATTRS) {
      restoreAttribute(element, attr, previousValues.get(attr) ?? null);
    }
  };
}

/**
 * Restore an attribute to its previous value, or remove it if it was absent
 */
function restoreAttribute(element: HTMLElement, name: string, previous: string | null): void {
  if (previous === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, previous);
  }
}
