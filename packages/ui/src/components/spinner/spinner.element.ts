/**
 * Spinning loading indicator for active operations
 *
 * @cognitive-load 2/10 - Simple activity indicator, brief attention capture
 * @attention-economics Activity feedback: indicates system is working, maintains user confidence
 * @trust-building Immediate feedback that action is processing, prevents double-submission anxiety
 * @accessibility aria-label for screen readers, motion-reduce respects preferences, sr-only text
 * @semantic-meaning Processing state: indeterminate loading for actions without progress measurement
 *
 * @usage-patterns
 * DO: Use for button loading states
 * DO: Use for inline loading indicators
 * DO: Size appropriately for context (sm for buttons, lg for page loading)
 * DO: Combine with text feedback for longer operations
 * NEVER: Use for content loading (use Skeleton instead), use without accessible label
 *
 * @example
 * ```tsx
 * // Button loading state
 * <Button disabled>
 *   <Spinner size="sm" />
 *   Saving...
 * </Button>
 * ```
 */

/**
 * <rafters-spinner> -- the Web Component performance of the Spinner score.
 *
 * Spinner is a PURE STATIC: the score projects a single constant ARIA
 * attribute (`aria-label="Loading"`), holds no state, and runs no effects, so
 * there is nothing to bind. This element imports no `bindSpinner` (there is
 * none) -- it renders the ring markup once from `spinnerClasses` and applies
 * the projected label from `spinner.aria`, so the accessible name is defined
 * in exactly one place across all three performances.
 *
 * Structure: a single `<output data-part="root">` carrying the composed
 * spinner classes and the projected label. `<output>` supplies the implicit
 * `role="status"` polite live region natively, so the score never states a
 * role. No sr-only span (the same simplification dialog and progress made:
 * the projected label is the single accessible name).
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { spinner, type SpinnerSize, type SpinnerVariant } from './spinner.behavior';
import { spinnerClasses } from './spinner.classes';

const ALLOWED_SIZES: ReadonlyArray<SpinnerSize> = ['sm', 'default', 'lg'];

const ALLOWED_VARIANTS: ReadonlyArray<SpinnerVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
  'muted',
];

function parseSize(value: string | null): SpinnerSize {
  return value && (ALLOWED_SIZES as ReadonlyArray<string>).includes(value)
    ? (value as SpinnerSize)
    : 'default';
}

function parseVariant(value: string | null): SpinnerVariant {
  return value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)
    ? (value as SpinnerVariant)
    : 'default';
}

export class RaftersSpinner extends RaftersElement {
  static observedAttributes = ['size', 'variant'];

  /** The only component-owned CSS: the structural host-display shim. */
  static override styles = ':host { display: inline-block; }';

  override render(): Node {
    const size = parseSize(this.getAttribute('size'));
    const variant = parseVariant(this.getAttribute('variant'));

    const output = document.createElement('output');
    output.setAttribute('data-part', 'root');
    output.className = spinnerClasses({ size, variant }, {}).root;

    // The projected label -- the same aria the React/Astro targets apply, so
    // the accessible name lives in the score, not three parallel literals.
    const { root: aria } = spinner.aria({}, { size, variant }, { root: '' });
    for (const [name, value] of Object.entries(aria ?? {})) {
      if (value !== undefined) output.setAttribute(name, String(value));
    }

    return output;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-spinner')) {
  customElements.define('rafters-spinner', RaftersSpinner);
}
