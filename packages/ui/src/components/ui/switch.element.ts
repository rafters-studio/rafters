/**
 * <rafters-switch> -- Form-associated Web Component for binary toggle state.
 *
 * Mirrors the semantics of switch.tsx (variant, size, checked, disabled,
 * required) using shadow-DOM-scoped CSS composed via classy-wc. Auto-
 * registers on import and is idempotent against double-define.
 *
 * Form-associated: participates in <form> submission, validation, reset,
 * disabled propagation, and state restoration via ElementInternals.
 * Submits `name=value` when checked (defaulting `value` to `"on"` per
 * HTML checkbox convention); omits the field entirely when unchecked.
 *
 * Attributes:
 *  - checked: boolean (presence-based)
 *  - disabled: boolean (presence-based)
 *  - required: boolean (presence-based)
 *  - name: string (form field name)
 *  - value: string (submitted value when checked; defaults to "on")
 *  - variant: SwitchVariant (default 'default')
 *  - size: SwitchSize (default 'default')
 *
 * No raw CSS custom-property literals here -- all token references live in
 * switch.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type SwitchSize,
  type SwitchVariant,
  switchSizeStyles,
  switchStylesheet,
  switchVariantChecked,
} from './switch.styles';

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

function parseVariant(value: string | null): SwitchVariant {
  if (value && value in switchVariantChecked) {
    return value as SwitchVariant;
  }
  return 'default';
}

function parseSize(value: string | null): SwitchSize {
  if (value && value in switchSizeStyles) {
    return value as SwitchSize;
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
 * Form-associated Web Component backing `<rafters-switch>`.
 */
export class RaftersSwitch extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  private _internals: ElementInternals;
  private _instanceSheet: CSSStyleSheet | null = null;
  private _button: HTMLButtonElement | null = null;
  private _initialChecked: boolean;
  private _onClick: (event: MouseEvent) => void;
  private _onKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-switch requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._initialChecked = this.hasAttribute('checked');
    this._onClick = (event: MouseEvent) => this.handleClick(event);
    this._onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    // Capture initial checked once the element is in the DOM so formReset
    // restores the author-supplied attribute presence even if the host was
    // constructed before the attribute was set.
    this._initialChecked = this.hasAttribute('checked');

    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());

    const existing = this.shadowRoot.adoptedStyleSheets;
    this.shadowRoot.adoptedStyleSheets = [...existing, this._instanceSheet];

    this.syncButtonState();
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

    if (name === 'checked' || name === 'disabled') {
      this.syncButtonState();
    }

    if (name === 'checked' || name === 'value' || name === 'name' || name === 'required') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.detachButtonListeners();
    this._instanceSheet = null;
    this._button = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachButtonListeners();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'track';
    button.setAttribute('role', 'switch');
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    thumb.setAttribute('aria-hidden', 'true');
    button.append(thumb);
    this._button = button;

    button.addEventListener('click', this._onClick);
    button.addEventListener('keydown', this._onKeyDown);

    // Initial aria/data sync so the inner button reflects the host state
    // from the very first frame, without waiting for the first
    // attributeChangedCallback.
    this.syncButtonState();
    return button;
  }

  private detachButtonListeners(): void {
    if (!this._button) return;
    this._button.removeEventListener('click', this._onClick);
    this._button.removeEventListener('keydown', this._onKeyDown);
  }

  private composeCss(): string {
    return switchStylesheet({
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
      checked: this.hasAttribute('checked'),
      disabled: this.hasAttribute('disabled'),
    });
  }

  // ==========================================================================
  // Inner button state sync
  // ==========================================================================

  private getButton(): HTMLButtonElement | null {
    if (this._button) return this._button;
    const found = this.shadowRoot?.querySelector('button') ?? null;
    if (found instanceof HTMLButtonElement) {
      this._button = found;
      return found;
    }
    return null;
  }

  private syncButtonState(): void {
    const button = this.getButton();
    if (!button) return;
    const checked = this.hasAttribute('checked');
    const disabled = this.hasAttribute('disabled');
    button.setAttribute('aria-checked', checked ? 'true' : 'false');
    button.setAttribute('data-state', checked ? 'checked' : 'unchecked');
    button.disabled = disabled;
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  private handleClick(event: MouseEvent): void {
    if (this.hasAttribute('disabled')) {
      event.preventDefault();
      return;
    }
    this.toggleChecked();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    if (this.hasAttribute('disabled')) return;
    this.toggleChecked();
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
    const checked = this.hasAttribute('checked');
    const value = this.getAttribute('value') ?? 'on';
    if (checked) {
      this._internals.setFormValue(value);
    } else {
      this._internals.setFormValue(null);
    }
    this.syncValidity();
  }

  private syncValidity(): void {
    const required = this.hasAttribute('required');
    const checked = this.hasAttribute('checked');
    if (required && !checked) {
      this._internals.setValidity({ valueMissing: true }, 'Please check this switch.');
    } else {
      this._internals.setValidity({});
    }
  }

  // ==========================================================================
  // Form-associated lifecycle callbacks
  // ==========================================================================

  formAssociatedCallback(_form: HTMLFormElement | null): void {
    // Hook for subclasses; default is a no-op. The internals already track
    // the associated form for us.
  }

  formResetCallback(): void {
    this.toggleAttribute('checked', this._initialChecked);
    this.syncButtonState();
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean): void {
    const button = this.getButton();
    if (button) {
      button.disabled = disabled;
    }
  }

  formStateRestoreCallback(
    state: string | File | FormData | null,
    _mode: 'restore' | 'autocomplete',
  ): void {
    // Restoration protocol: the form-control state we emit via setFormValue
    // is either the submitted string value or null. If we get a string back
    // the switch was checked; anything else (null, non-string) means
    // unchecked.
    const shouldBeChecked = typeof state === 'string';
    this.toggleAttribute('checked', shouldBeChecked);
    this.syncButtonState();
    this.syncFormValue();
  }

  // ==========================================================================
  // Public form-control surface
  // ==========================================================================

  /**
   * The ElementInternals instance bound to this host. Exposed read-only so
   * consumers (and tests) can inspect form association without monkey-
   * patching. Mutation is intentionally not supported -- use the
   * setCustomValidity and form lifecycle methods instead.
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

  get checked(): boolean {
    return this.hasAttribute('checked');
  }

  set checked(next: boolean) {
    this.toggleAttribute('checked', next);
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

  get variant(): SwitchVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: SwitchVariant) {
    this.setAttribute('variant', value);
  }

  get size(): SwitchSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: SwitchSize) {
    this.setAttribute('size', value);
  }

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message: string): void {
    if (message.length > 0) {
      this._internals.setValidity({ customError: true }, message);
    } else {
      this.syncValidity();
    }
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-switch')) {
  customElements.define('rafters-switch', RaftersSwitch);
}
