import type { PartIds } from '../../lib/contract';
import classy from '../../primitives/classy';
import { BehaviorElement } from '../../primitives/behavior-element';
import {
  button,
  type ButtonActions,
  type ButtonConfig,
  type ButtonPart,
  type ButtonSize,
  type ButtonState,
  type ButtonVariant,
} from './button.behavior';
import { buttonClasses } from './button.classes';

/**
 * <rafters-button> -- the WC performance (Spec 00 boundary 2/3: no
 * decisions here, mechanical execution over button.behavior.ts +
 * button.classes.ts, exactly like button.tsx). The first STATEFUL WC
 * performance in the new grain: press dispatch, Enter/Space (fulfilled by
 * the inner element being a real `<button>`, Spec 01 rule 5), the
 * aria-busy/aria-pressed projection, and the loading announce effect all
 * ride BehaviorElement's dispatch-and-callback protocol and effects seam
 * unchanged -- this file only assembles config from attributes and builds
 * the part DOM.
 *
 * The inner `<button>` is built INSIDE the shadow root with a default
 * `<slot>` passing the light-DOM label through, carrying the same utility
 * class strings button.tsx uses (including the exact spinner markup, an
 * already-ratified visual asset, not a local invention) -- one node removed
 * from the React shape, same as the WC Container port.
 */

const VARIANTS: ReadonlySet<string> = new Set([
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
]);

const SIZES: ReadonlySet<string> = new Set([
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
]);

const TYPES: ReadonlySet<string> = new Set(['button', 'submit', 'reset']);

function parseVariant(value: string | null): ButtonVariant {
  return value && VARIANTS.has(value) ? (value as ButtonVariant) : 'default';
}

function parseSize(value: string | null): ButtonSize {
  return value && SIZES.has(value) ? (value as ButtonSize) : 'default';
}

function parseType(value: string | null): 'button' | 'submit' | 'reset' {
  return value && TYPES.has(value) ? (value as 'button' | 'submit' | 'reset') : 'button';
}

export class RaftersButton extends BehaviorElement<
  ButtonConfig,
  ButtonState,
  ButtonActions,
  ButtonPart
> {
  static observedAttributes = [
    'variant',
    'size',
    'disabled',
    'soft-disabled',
    'loading',
    'toggle',
    'default-pressed',
    'loading-announcement',
    'loaded-announcement',
    'type',
    'class',
  ];

  /** Structural :host shim only -- native `<button>` establishes its own
   *  inline-flex box (button.classes.ts's baseClasses); the host wraps it
   *  and needs the same display so consumers see the same outer box the
   *  React target is, one node removed. */
  static override styles = ':host { display: inline-flex; }';

  protected override readonly spec = button;

  protected override readConfig(): ButtonConfig {
    return {
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
      toggle: this.hasAttribute('toggle'),
      defaultPressed: this.hasAttribute('default-pressed'),
      loadingAnnouncement: this.getAttribute('loading-announcement') ?? undefined,
      loadedAnnouncement: this.getAttribute('loaded-announcement') ?? undefined,
      disabled: this.hasAttribute('disabled'),
      softDisabled: this.hasAttribute('soft-disabled'),
      loading: this.hasAttribute('loading'),
    };
  }

  protected override buildParts(
    state: ButtonState,
    config: ButtonConfig,
    ids: PartIds<ButtonPart>,
  ): Node {
    const classes = buttonClasses(config, state);

    const root = document.createElement('button');
    root.setAttribute('data-part', 'root');
    root.id = ids.root;
    root.type = parseType(this.getAttribute('type'));
    root.disabled = config.disabled ?? false;
    // Consumer `class` merges via classy onto the inner semantic element,
    // the same channel Container uses (boundary 6: selection only).
    root.className = classy(classes.root, this.getAttribute('class')) || '';
    root.addEventListener('click', (event) => {
      if (!this.request('press')) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    if (config.loading) {
      const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      spinner.setAttribute('data-part', 'spinner');
      if (ids.spinner) spinner.id = ids.spinner;
      // SVGElement.className is an SVGAnimatedString, not a plain string --
      // setAttribute is the correct channel here (unlike the HTML root).
      spinner.setAttribute('class', classes.spinner ?? '');
      spinner.setAttribute('viewBox', '0 0 24 24');
      spinner.setAttribute('fill', 'none');
      spinner.setAttribute('stroke', 'currentColor');
      spinner.setAttribute('stroke-width', '2');
      spinner.setAttribute('stroke-linecap', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M21 12a9 9 0 1 1-6.219-8.56');
      spinner.appendChild(path);
      root.appendChild(spinner);
    }

    const label = document.createElement('span');
    label.setAttribute('data-part', 'label');
    label.id = ids.label;
    label.appendChild(document.createElement('slot'));
    root.appendChild(label);

    return root;
  }
}

if (!customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}

export default RaftersButton;
