/**
 * <rafters-checkbox> -- Form-associated Web Component for binary selection.
 *
 * Mirrors the semantics of checkbox.tsx (variant, size, checked, disabled,
 * required, name, value) using shadow-DOM-scoped CSS composed via
 * classy-wc. Auto-registers on import and is idempotent against
 * double-define.
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
 *
 * No raw CSS custom-property literals here -- all token references live
 * in checkbox.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type CheckboxSize,
  type CheckboxVariant,
  checkboxSizeStyles,
  checkboxStylesheet,
  checkboxVariantStyles,
} from './checkbox.styles';

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
  if (value && value in checkboxVariantStyles) {
    return value as CheckboxVariant;
  }
  return 'default';
}

function parseSize(value: string | null): CheckboxSize {
  if (value && value in checkboxSizeStyles) {
    return value as CheckboxSize;
  }
  return 'default';
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

  private _internals: ElementInternals;
  private _instanceSheet: CSSStyleSheet | null = null;
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

    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());

    const existing = this.shadowRoot.adoptedStyleSheets;
    this.shadowRoot.adoptedStyleSheets = [...existing, this._instanceSheet];

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

    if (
      (name === 'variant' || name === 'size' || name === 'checked' || name === 'disabled') &&
      this._instanceSheet
    ) {
      this._instanceSheet.replaceSync(this.composeCss());
    }

    this.mirrorAttributesToButton();

    if (name === 'checked' || name === 'value' || name === 'name' || name === 'required') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.removeEventListener('click', this._onHostClick);
    this.removeEventListener('keydown', this._onHostKeyDown);
    this._instanceSheet = null;
    this._button = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'checkbox';
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
    svg.setAttribute('class', 'icon');
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

  private composeCss(): string {
    return checkboxStylesheet({
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
      checked: this.hasAttribute('checked'),
      disabled: this.hasAttribute('disabled'),
    });
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
