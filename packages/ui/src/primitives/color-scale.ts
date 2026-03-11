/**
 * Color Scale primitive
 * Renders an OKLCH color scale (11 positions) as a navigable swatch strip
 *
 * Framework-agnostic, SSR-safe. Creates swatch elements inside a container
 * with roving tabindex keyboard navigation, ARIA listbox semantics, and
 * data attributes for styling.
 *
 * @example
 * ```typescript
 * const cleanup = createColorScale(container, {
 *   scale: colorValue.scale,
 *   name: 'ocean-blue',
 *   onSwatchFocus: (position) => showDetails(position),
 * });
 * ```
 */

import type { CleanupFunction, GamutTier, OklchColor } from './types';

const SCALE_KEYS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;
export type ScalePosition = (typeof SCALE_KEYS)[number];

export interface ColorScaleOptions {
  /** Array of 11 OKLCH values mapping to scale positions 50-950 */
  scale: OklchColor[];
  /** Color family name for ARIA labels */
  name: string;
  /** Optional gamut tier for each swatch */
  tiers?: GamutTier[];
  /** Called when a swatch receives focus via keyboard navigation */
  onSwatchFocus?: (position: ScalePosition, index: number) => void;
  /** Called when a swatch is clicked */
  onSwatchClick?: (position: ScalePosition, index: number) => void;
}

function toOklchString(v: OklchColor): string {
  return `oklch(${v.l} ${v.c} ${v.h})`;
}

function formatLabel(name: string, position: string, v: OklchColor): string {
  return `${name} ${position}, L: ${v.l.toFixed(2)}, C: ${v.c.toFixed(3)}, H: ${v.h.toFixed(0)}`;
}

export function createColorScale(
  container: HTMLElement,
  options: ColorScaleOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const { scale, name, tiers, onSwatchFocus, onSwatchClick } = options;
  const prevRole = container.getAttribute('role');
  const prevAriaLabel = container.getAttribute('aria-label');
  const swatches: HTMLElement[] = [];
  let activeIndex = 0;

  container.setAttribute('role', 'listbox');
  container.setAttribute('aria-label', `${name} color scale`);
  container.setAttribute('aria-orientation', 'horizontal');

  for (let i = 0; i < SCALE_KEYS.length; i++) {
    const position = SCALE_KEYS[i];
    const value = scale[i];
    if (!position || !value) continue;

    const el = document.createElement('div');
    el.setAttribute('role', 'option');
    el.setAttribute('aria-label', formatLabel(name, position, value));
    el.setAttribute('data-scale-position', position);
    el.setAttribute('tabindex', i === 0 ? '0' : '-1');
    el.style.backgroundColor = toOklchString(value);

    const tier = tiers?.[i];
    if (tier) {
      el.setAttribute('data-gamut-tier', tier);
    }

    el.setAttribute('data-l', value.l.toFixed(3));
    el.setAttribute('data-c', value.c.toFixed(4));
    el.setAttribute('data-h', value.h.toFixed(1));

    el.addEventListener('click', () => {
      moveFocus(i);
      onSwatchClick?.(position, i);
    });

    swatches.push(el);
    container.appendChild(el);
  }

  function moveFocus(newIndex: number) {
    const prev = swatches[activeIndex];
    const next = swatches[newIndex];
    if (!prev || !next) return;
    prev.setAttribute('tabindex', '-1');
    next.setAttribute('tabindex', '0');
    next.focus();
    activeIndex = newIndex;

    const position = SCALE_KEYS[newIndex];
    if (position) {
      onSwatchFocus?.(position, newIndex);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    let newIndex = activeIndex;
    switch (event.key) {
      case 'ArrowRight':
        newIndex = activeIndex < swatches.length - 1 ? activeIndex + 1 : 0;
        break;
      case 'ArrowLeft':
        newIndex = activeIndex > 0 ? activeIndex - 1 : swatches.length - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = swatches.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    moveFocus(newIndex);
  }

  container.addEventListener('keydown', handleKeydown);

  return () => {
    container.removeEventListener('keydown', handleKeydown);
    for (const swatch of swatches) {
      swatch.remove();
    }
    restoreAttribute(container, 'role', prevRole);
    restoreAttribute(container, 'aria-label', prevAriaLabel);
    container.removeAttribute('aria-orientation');
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
