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
 * ```html
 * <!-- Button loading state -->
 * <rafters-spinner size="sm" variant="muted"></rafters-spinner>
 * ```
 */
import { RaftersElement } from '../../primitives/rafters-element';
import {
  spinner,
  type SpinnerConfig,
  type SpinnerSize,
  type SpinnerVariant,
} from './spinner.behavior';
import { spinnerClasses } from './spinner.classes';

const SIZES: ReadonlyArray<SpinnerSize> = ['sm', 'default', 'lg'];
const VARIANTS: ReadonlyArray<SpinnerVariant> = [
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

function isSize(value: string | null): value is SpinnerSize {
  return SIZES.some((size) => size === value);
}

function isVariant(value: string | null): value is SpinnerVariant {
  return VARIANTS.some((variant) => variant === value);
}

export class RaftersSpinner extends RaftersElement {
  static observedAttributes: string[] = ['size', 'variant'];

  override render(): Node {
    const size = this.getAttribute('size');
    const variant = this.getAttribute('variant');
    const config: SpinnerConfig = {
      size: isSize(size) ? size : 'default',
      variant: isVariant(variant) ? variant : 'default',
    };
    const classes = spinnerClasses(config, {});
    // The aria projection ignores ids, so pass an empty one.
    const { root: aria } = spinner.aria({}, config, { root: '' });

    const root = document.createElement('output');
    root.setAttribute('data-part', 'root');
    root.className = classes.root;
    for (const [key, value] of Object.entries(aria ?? {})) {
      if (value !== undefined) root.setAttribute(key, String(value));
    }
    return root;
  }
}

if (!customElements.get('rafters-spinner')) {
  customElements.define('rafters-spinner', RaftersSpinner);
}
