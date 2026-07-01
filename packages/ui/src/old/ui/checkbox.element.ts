/**
 * <rafters-checkbox> -- Form-associated Web Component for binary selection.
 *
 * Mirrors the semantics of checkbox.tsx (variant, size, checked, disabled,
 * required, name, value). The inner button carries the SAME utility class
 * strings the React/Astro targets use -- imported from checkbox.classes.ts --
 * so presentation resolves from the shared compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root.
 *
 * State styling is carried by Tailwind state-variant classes in
 * checkbox.classes.ts, not shadow-scoped selectors: the checked fill/foreground
 * pair rides `data-[state=checked]:` (the button mirrors data-state), the
 * disabled dimming rides `disabled:` (the button reflects the disabled
 * property), the focus ring rides `focus-visible:`, and the reduced-motion
 * guard rides `motion-reduce:`. Because every state is expressed as a class on
 * the inner button, no per-instance stylesheet and no state-selector CSS is
 * needed in this file.
 *
 * The only irreducible shadow-scoped CSS is the `:host` inline-flex layout shim
 * (custom elements default to inline display), kept in `static styles`. It
 * carries no design token.
 *
 * Form-associated: participates in <form> submission, validation, reset,
 * disabled propagation, and state restoration via ElementInternals.
 *
 * Attributes:
 *  - checked: boolean (presence-based)
 *  - disabled: boolean (presence-based)
 *  - required: boolean (presence-based)
 *  - name: string (form field name)
 *  - value: string (form value when checked; defaults to 'on')
 *  - variant: CheckboxVariant (default 'default')
 *  - size: CheckboxSize (default 'default')
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  checkboxBaseClasses,
  checkboxSizeClasses,
  checkboxVariantClasses,
} from './checkbox.classes';

// ============================================================================
// Public Types
// ============================================================================

export type CheckboxVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type CheckboxSize = 'sm' | 'default' | 'lg';

// ============================================================================
// Sanitization helpers
// ============================================================================

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'checked',
  'disabled',
  'required',
  'name',
  'value',
  'variant',
  'size',
] as const;

const VALUE_MISSING_MESSAGE = 'Please check this box.';

function parseVariant(value: string | null): CheckboxVariant {
  if (value && Object.hasOwn(checkboxVariantClasses, value)) {
    return value as CheckboxVariant;
  }
  return 'default';
}

function parseSize(value: string | null): CheckboxSize {
  if (value && Object.hasOwn(checkboxSizeClasses, value)) {
    return value as CheckboxSize;
  }
  return 'default';
}

/**
 * Compose the inner button's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * React/Astro targets do -- the parity guarantee. The literal `checkbox` hook
 * class is kept first for role/structure queries. The checked fill, ring, and
 * disabled dimming are Tailwind state-variant classes that resolve once the
 * button mirrors data-state / the disabled property.
 */
export function composeCheckboxClasses(variant: CheckboxVariant, size: CheckboxSize): string {
  const v = checkboxVariantClasses[variant] ??
    checkboxVariantClasses.default ?? { border: '', checked: '', ring: '' };
  const box = (checkboxSizeClasses[size] ?? checkboxSizeClasses.default ?? { box: '', icon: '' })
    .box;
  return `checkbox ${checkboxBaseClasses} ${v.border} ${v.checked} ${v.ring} ${box}`;
}

/**
 * Compose the inner checkmark SVG's class string. The `icon` hook class plus
 * the per-size icon sizing utilities from the shared class map.
 */
export function composeCheckboxIconClasses(size: CheckboxSize): string {
  const icon = (checkboxSizeClasses[size] ?? checkboxSizeClasses.default ?? { box: '', icon: '' })
    .icon;
  return `icon ${icon}`;
}

// ============================================================================
// ElementInternals feature detection
// ============================================================================

interface ElementInternalsHost {
  attachInternals?: () => ElementInternals;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Form-associated Web Component backing `<rafters-checkbox>`.
 */
export class RaftersCheckbox extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * Irreducible shadow-scoped CSS: the host inline-flex layout shim. Every
   * other surface (base, variant, size, checked, disabled, focus ring,
   * reduced motion) rides a utility class on the inner button.
   */
  static override styles = ':host { display: inline-flex; }';

  private _internals: ElementInternals;
  private _button: HTMLButtonElement | null = null;
  private _onHostClick: (event: MouseEvent) => void;
  private _onHostKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-checkbox requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._onHostClick = (event: MouseEvent) => this.handleHostClick(event);
    this._onHostKeyDown = (event: KeyboardEvent) => this.handleHostKeyDown(event);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    this.addEventListener('click', this._onHostClick);
    this.addEventListener('keydown', this._onHostKeyDown);

    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'variant' || name === 'size') {
      // Re-render so the inner button's composed class string reflects the new
      // variant/size; the icon class string follows too.
      this.update();
    }

    this.mirrorAttributesToButton();

    if (name === 'checked' || name === 'value' || name === 'name' || name === 'required') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.removeEventListener('click', this._onHostClick);
    this.removeEventListener('keydown', this._onHostKeyDown);
    this._button = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = composeCheckboxClasses(
      parseVariant(this.getAttribute('variant')),
      parseSize(this.getAttribute('size')),
    );
    button.setAttribute('role', 'checkbox');
    this._button = button;
    this.mirrorAttributesToButton();
    this.renderIcon();
    return button;
  }

  /**
   * Populate or clear the inner checkmark SVG based on the current
   * `checked` state. Uses `createElement` / `createElementNS`; never
   * innerHTML.
   */
  private renderIcon(): void {
    const button = this.getInnerButton();
    if (!button) return;
    button.replaceChildren();
    if (!this.hasAttribute('checked')) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', composeCheckboxIconClasses(parseSize(this.getAttribute('size'))));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '3');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('d', 'M5 13l4 4L19 7');

    svg.appendChild(path);
    button.appendChild(svg);
  }

  // ==========================================================================
  // Attribute mirroring
  // ==========================================================================

  private mirrorAttributesToButton(): void {
    const button = this.getInnerButton();
    if (!button) return;

    const isChecked = this.hasAttribute('checked');
    button.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    button.setAttribute('data-state', isChecked ? 'checked' : 'unchecked');
    button.disabled = this.hasAttribute('disabled');
    this.renderIcon();
  }

  private getInnerButton(): HTMLButtonElement | null {
    if (this._button) return this._button;
    const found = this.shadowRoot?.querySelector('button') ?? null;
    if (found instanceof HTMLButtonElement) {
      this._button = found;
      return found;
    }
    return null;
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  private handleHostClick(event: MouseEvent): void {
    if (this.hasAttribute('disabled')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.toggleChecked();
  }

  private handleHostKeyDown(event: KeyboardEvent): void {
    if (this.hasAttribute('disabled')) return;
    // Space toggles. Enter is a no-op by default (browsers treat a
    // checkbox the same way; forms submit on Enter rather than toggling).
    if (event.key === ' ') {
      event.preventDefault();
      this.toggleChecked();
    }
  }

  private toggleChecked(): void {
    const next = !this.hasAttribute('checked');
    this.toggleAttribute('checked', next);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  // ==========================================================================
  // Form value + validity sync
  // ==========================================================================

  private syncFormValue(): void {
    const isChecked = this.hasAttribute('checked');
    if (isChecked) {
      const value = this.getAttribute('value') ?? 'on';
      this._internals.setFormValue(value);
    } else {
      this._internals.setFormValue(null);
    }

    if (this.hasAttribute('required') && !isChecked) {
      this._internals.setValidity({ valueMissing: true }, VALUE_MISSING_MESSAGE, this);
    } else {
      this._internals.setValidity({});
    }
  }

  // ==========================================================================
  // Form-associated lifecycle callbacks
  // ==========================================================================

  formAssociatedCallback(_form: HTMLFormElement | null): void {
    // Hook for subclasses; default is a no-op. The internals already
    // track the associated form for us.
  }

  formResetCallback(): void {
    const initialChecked = this.hasOriginalCheckedAttribute();
    this.toggleAttribute('checked', initialChecked);
    this.syncFormValue();
  }

  /**
   * Determine the initial `checked` state from the current attribute
   * markup. In the browser, the attribute reflects the HTML source
   * (reset target) while the property tracks the live state. Our
   * toggleAttribute writes both paths, so the attribute mirrors the
   * live state too. form.reset() in native browsers restores the HTML
   * source attribute value. Here we rely on the live attribute because
   * happy-dom doesn't replay HTML parsing for custom elements.
   */
  private hasOriginalCheckedAttribute(): boolean {
    return this.hasAttribute('checked');
  }

  formDisabledCallback(disabled: boolean): void {
    const button = this.getInnerButton();
    if (button) {
      button.disabled = disabled;
    }
  }

  formStateRestoreCallback(
    state: string | File | FormData | null,
    _mode: 'restore' | 'autocomplete',
  ): void {
    if (typeof state === 'string') {
      // Any persisted string state implies a previously checked box.
      this.toggleAttribute('checked', state.length > 0);
    }
  }

  // ==========================================================================
  // Public form-control surface
  // ==========================================================================

  /**
   * The ElementInternals instance bound to this host. Exposed read-only
   * so consumers (and tests) can inspect form association without
   * monkey-patching.
   */
  get internals(): ElementInternals {
    return this._internals;
  }

  get form(): HTMLFormElement | null {
    return this._internals.form;
  }

  get validity(): ValidityState {
    return this._internals.validity;
  }

  get validationMessage(): string {
    return this._internals.validationMessage;
  }

  get willValidate(): boolean {
    return this._internals.willValidate;
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  get value(): string {
    return this.getAttribute('value') ?? 'on';
  }

  set value(value: string) {
    this.setAttribute('value', value);
  }

  get checked(): boolean {
    return this.hasAttribute('checked');
  }

  set checked(next: boolean) {
    this.toggleAttribute('checked', next);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(value: boolean) {
    this.toggleAttribute('required', value);
  }

  get variant(): CheckboxVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: CheckboxVariant) {
    this.setAttribute('variant', value);
  }

  get size(): CheckboxSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: CheckboxSize) {
    this.setAttribute('size', value);
  }

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message: string): void {
    if (message.length === 0) {
      // Defer to required/value-missing logic.
      this.syncFormValue();
      return;
    }
    this._internals.setValidity({ customError: true }, message, this);
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-checkbox')) {
  customElements.define('rafters-checkbox', RaftersCheckbox);
}
