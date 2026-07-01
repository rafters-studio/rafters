/**
 * <rafters-button> -- Web Component binding. Wiring only (Spec 01).
 *
 * The inner <button> carries the SAME class strings and the SAME behavior
 * projection the React and Astro targets use. Attributes map to behavior
 * actions; effects run through the shared runner. Presentation comes from
 * the adopted utility sheet (RaftersElement.setUtilityCSS) plus token
 * custom properties.
 *
 * State changes PATCH the existing inner button in place instead of
 * rebuilding the shadow DOM: a wholesale rebuild destroys keyboard focus at
 * the exact moment of activation (press Enter, aria-pressed flips, focus
 * falls to body) -- a conformance-harness finding. Full rebuilds happen
 * only for config attribute changes (variant/size/type).
 *
 * Attributes: variant, size, type, disabled, soft-disabled, loading,
 * toggle, pressed, loading-announcement, loaded-announcement.
 * Events: press (accepted activations), pressed-change (toggle mode).
 */
import { RaftersElement } from '../../primitives/rafters-element';
import { runEffects } from '../../behavior/effects';
import type { PartIds } from '../../behavior/contract';
import {
  buttonBehavior,
  createButtonBehavior,
  type ButtonBehaviorInstance,
  type ButtonConfig,
  type ButtonPart,
  type ButtonSize,
  type ButtonState,
  type ButtonVariant,
} from './button.behavior';
import { buttonClasses } from './button.classes';

const VARIANTS: ReadonlyArray<ButtonVariant> = [
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
];

const SIZES: ReadonlyArray<ButtonSize> = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
];

const TYPES = ['button', 'submit', 'reset'] as const;

function parseEnum<T extends string>(
  value: string | null,
  allowed: ReadonlyArray<T>,
  fallback: T,
): T {
  return value !== null && (allowed as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : fallback;
}

let instanceCounter = 0;

export class RaftersButton extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = [
    'variant',
    'size',
    'type',
    'disabled',
    'soft-disabled',
    'loading',
    'pressed',
  ];

  static override styles = ':host { display: inline-flex; }';

  private behavior: ButtonBehaviorInstance | null = null;
  private cleanups: Array<() => void> = [];
  private readonly ids: PartIds<ButtonPart>;

  constructor() {
    super();
    instanceCounter += 1;
    const uid = `rafters-button-${instanceCounter}`;
    this.ids = { root: uid, label: `${uid}-label`, spinner: `${uid}-spinner` };
  }

  private readConfig(): ButtonConfig {
    return {
      variant: parseEnum(this.getAttribute('variant'), VARIANTS, 'default'),
      size: parseEnum(this.getAttribute('size'), SIZES, 'default'),
      toggle: this.hasAttribute('toggle'),
      loadingAnnouncement: this.getAttribute('loading-announcement') ?? undefined,
      loadedAnnouncement: this.getAttribute('loaded-announcement') ?? undefined,
      disabled: this.hasAttribute('disabled'),
      softDisabled: this.hasAttribute('soft-disabled'),
      loading: this.hasAttribute('loading'),
      pressed: this.hasAttribute('pressed'),
    };
  }

  override connectedCallback(): void {
    this.behavior = createButtonBehavior(this.readConfig());
    this.cleanups.push(this.behavior.memory.subscribe(() => this.patch()));
    this.cleanups.push(runEffects(this.behavior));
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.behavior = null;
    super.disconnectedCallback();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    const behavior = this.behavior;
    if (behavior) {
      switch (name) {
        case 'disabled':
          behavior.dispatch('setDisabled', newValue !== null);
          return; // memory subscription patches
        case 'soft-disabled':
          behavior.dispatch('setSoftDisabled', newValue !== null);
          return;
        case 'loading':
          behavior.dispatch('setLoading', newValue !== null);
          return;
        case 'pressed':
          behavior.dispatch('setPressed', newValue !== null);
          return;
      }
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }

  private currentState(config: ButtonConfig): ButtonState {
    return this.behavior ? this.behavior.memory.get() : buttonBehavior.initialState(config);
  }

  private innerButton(): HTMLButtonElement | null {
    return this.shadowRoot?.querySelector('button[data-part="root"]') ?? null;
  }

  private buildSpinner(className: string): SVGSVGElement {
    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spinner.setAttribute('class', className);
    spinner.setAttribute('data-part', 'spinner');
    spinner.setAttribute('id', this.ids.spinner);
    spinner.setAttribute('viewBox', '0 0 24 24');
    spinner.setAttribute('fill', 'none');
    spinner.setAttribute('stroke', 'currentColor');
    spinner.setAttribute('stroke-width', '2');
    spinner.setAttribute('stroke-linecap', 'round');
    spinner.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21 12a9 9 0 1 1-6.219-8.56');
    spinner.appendChild(path);
    return spinner;
  }

  /** Reflect current state onto the EXISTING inner button (focus-safe). */
  private patch(): void {
    const inner = this.innerButton();
    if (!inner) return; // not rendered yet; render() reads current state
    const config = this.readConfig();
    const state = this.currentState(config);
    const aria = buttonBehavior.aria(state, config, this.ids);
    const classes = buttonClasses(config, state);

    inner.disabled = state.disabled;
    for (const [attr, value] of Object.entries(aria.root ?? {})) {
      if (value === undefined) inner.removeAttribute(attr);
      else inner.setAttribute(attr, String(value));
    }

    const existingSpinner = inner.querySelector('[data-part="spinner"]');
    if (state.loading && !existingSpinner) {
      inner.insertBefore(this.buildSpinner(classes.spinner), inner.firstChild);
    } else if (!state.loading && existingSpinner) {
      existingSpinner.remove();
    }
  }

  override render(): Node {
    const config = this.readConfig();
    const state = this.currentState(config);
    const aria = buttonBehavior.aria(state, config, this.ids);
    const classes = buttonClasses(config, state);

    const inner = document.createElement('button');
    inner.className = classes.root;
    inner.setAttribute('type', parseEnum(this.getAttribute('type'), TYPES, 'button'));
    inner.setAttribute('data-part', 'root');
    inner.disabled = state.disabled;
    for (const [attr, value] of Object.entries(aria.root ?? {})) {
      if (value !== undefined) inner.setAttribute(attr, String(value));
    }

    inner.addEventListener('click', (event) => {
      const behavior = this.behavior;
      if (!behavior) return;
      if (!behavior.dispatch('press')) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.dispatchEvent(new CustomEvent('press', { bubbles: true, composed: true }));
      const pressed = behavior.memory.get().pressed;
      if (pressed !== undefined) {
        this.dispatchEvent(
          new CustomEvent('pressed-change', {
            detail: { pressed },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    if (state.loading) {
      inner.appendChild(this.buildSpinner(classes.spinner));
    }

    const label = document.createElement('span');
    label.setAttribute('data-part', 'label');
    label.setAttribute('id', this.ids.label);
    label.appendChild(document.createElement('slot'));
    inner.appendChild(label);

    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
