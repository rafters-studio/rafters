/**
 * <rafters-progress> -- Web Component progress primitive.
 *
 * Mirrors the semantics of progress.tsx (value, max, variant, size). The
 * inner track and indicator carry the SAME utility class strings the React
 * and Astro targets use -- imported from progress.classes.ts -- rather than a
 * parallel hand-written CSS map. Visual presentation comes from the shared
 * compiled utility stylesheet adopted by RaftersElement (see setUtilityCSS)
 * plus the token custom properties inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim. The indeterminate slide animation rides on the shared
 * progress-indeterminate animation utility (its keyframes live in the
 * compiled utility sheet, exactly as in the React/Astro targets), so no
 * per-instance keyframes machinery is needed here.
 *
 * Attributes:
 *  - value:   number in [0, max] (default: absent = indeterminate)
 *  - max:     number > 0 (default 100; non-numeric or non-positive falls back to 100)
 *  - variant: 'default' | 'primary' | 'secondary' | 'destructive'
 *             | 'success' | 'warning' | 'info' | 'accent' (default 'default')
 *  - size:    'sm' | 'default' | 'lg' (default 'default')
 *
 * Shadow DOM structure: a track div carrying role progressbar and the
 * aria-value attributes wraps an indicator div whose width is set inline when
 * determinate.
 *
 * When indeterminate the host gets aria-busy true, the indicator carries a
 * data-indeterminate attribute plus the indeterminate animation utility, and
 * no inline width is set.
 *
 * DOM APIs only -- never innerHTML.
 *
 * @cognitive-load 4/10
 * @accessibility role="progressbar" with aria-valuemin/max/now/text.
 *                Host aria-busy="true" when indeterminate.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  progressContainerClasses,
  progressIndeterminateClasses,
  progressIndicatorBaseClasses,
  progressSizeClasses,
  progressVariantClasses,
} from './progress.classes';

export type ProgressVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type ProgressSize = 'sm' | 'default' | 'lg';

const ALLOWED_VARIANTS: ReadonlyArray<ProgressVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
];

const ALLOWED_SIZES: ReadonlyArray<ProgressSize> = ['sm', 'default', 'lg'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['value', 'max', 'variant', 'size'] as const;

function parseVariant(value: string | null): ProgressVariant {
  if (value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as ProgressVariant;
  }
  return 'default';
}

function parseSize(value: string | null): ProgressSize {
  if (value && (ALLOWED_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as ProgressSize;
  }
  return 'default';
}

function parseMax(raw: string | null): number {
  if (raw === null) return 100;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return n;
}

interface ParsedValue {
  indeterminate: boolean;
  clamped: number;
}

function parseValue(raw: string | null, max: number): ParsedValue {
  if (raw === null) return { indeterminate: true, clamped: 0 };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { indeterminate: true, clamped: 0 };
  const clamped = Math.min(Math.max(n, 0), max);
  return { indeterminate: false, clamped };
}

/**
 * Compose the track's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro/React targets do -- the parity guarantee.
 */
export function composeProgressTrackClasses(size: ProgressSize): string {
  return `${progressContainerClasses} ${progressSizeClasses[size]}`;
}

/**
 * Compose the indicator's class string from the shared class maps. When
 * indeterminate the indicator also carries the animation utility, mirroring
 * the React/Astro indicator composition.
 */
export function composeProgressIndicatorClasses(
  variant: ProgressVariant,
  indeterminate: boolean,
): string {
  const base = `${progressIndicatorBaseClasses} ${progressVariantClasses[variant]}`;
  return indeterminate ? `${base} ${progressIndeterminateClasses}` : base;
}

export class RaftersProgress extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * The only component-owned CSS: the structural host-display shim. Custom
   * elements default to inline display; the progress track needs the host to
   * behave as the block-level box the React/Astro element is.
   */
  static override styles = ':host { display: block; }';

  /**
   * Render the track and indicator. DOM APIs only -- never innerHTML.
   *
   * Host ARIA state is written on the element itself so it surfaces on the
   * light DOM side. The inner track carries role progressbar and the
   * aria-value attributes so assistive tech that pierces through to the
   * shadow DOM still finds a compliant node.
   */
  override render(): Node {
    const max = parseMax(this.getAttribute('max'));
    const { indeterminate, clamped } = parseValue(this.getAttribute('value'), max);
    const variant = parseVariant(this.getAttribute('variant'));
    const size = parseSize(this.getAttribute('size'));

    // Host-level ARIA state for screen readers that read the light tree.
    if (indeterminate) {
      this.setAttribute('aria-busy', 'true');
    } else {
      this.removeAttribute('aria-busy');
    }

    const track = document.createElement('div');
    track.className = composeProgressTrackClasses(size);
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(max));

    if (!indeterminate) {
      track.setAttribute('aria-valuenow', String(clamped));
      const percent = Math.round((clamped / max) * 100);
      track.setAttribute('aria-valuetext', `${percent}%`);
    }

    const indicator = document.createElement('div');
    indicator.className = composeProgressIndicatorClasses(variant, indeterminate);
    if (indeterminate) {
      indicator.setAttribute('data-indeterminate', '');
    } else {
      const percent = (clamped / max) * 100;
      indicator.setAttribute('style', `width: ${percent}%`);
    }

    track.appendChild(indicator);
    return track;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-progress')) {
  customElements.define('rafters-progress', RaftersProgress);
}
