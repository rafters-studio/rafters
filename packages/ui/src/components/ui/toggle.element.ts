/**
 * <rafters-toggle> -- Form-associated Web Component for press-toggle buttons.
 *
 * Mirrors the semantics of toggle.tsx (variant, size, pressed state) using
 * shadow-DOM-scoped CSS composed via classy-wc. Auto-registers on import and
 * is idempotent against double-define.
 *
 * Form-associated: participates in <form> submission, reset, disabled
 * propagation, and state restoration via ElementInternals. When pressed,
 * contributes `name=value` to FormData; when unpressed, contributes nothing.
 *
 * Attributes:
 *  - pressed:  boolean (presence-based; mirrors to aria-pressed + data-state)
 *  - disabled: boolean (presence-based)
 *  - name:     string  (form field name)
 *  - value:    string  (form-submitted value when pressed; defaults to 'on')
 *  - variant:  ToggleVariant (default 'default')
 *  - size:     ToggleSize    (default 'default')
 *
 * Interaction model:
 *  - Click on the inner <button> flips `pressed` (unless disabled).
 *  - Space/Enter keys are handled by the native button (click synthesis).
 *  - After a state change, dispatches `change` at the host (bubbles/composed).
 *
 * No raw CSS custom-property literals here -- all token references live in
 * toggle.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type ToggleSize,
  type ToggleVariant,
  toggleSizeStyles,
  toggleStylesheet,
  toggleVariantStyles,
} from './toggle.styles';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'pressed',
  'disabled',
  'name',
  'value',
  'variant',
  'size',
] as const;

function parseVariant(value: string | null): ToggleVariant {
  if (value && value in toggleVariantStyles) {
    return value as ToggleVariant;
  }
  return 'default';
}

function parseSize(value: string | null): ToggleSize {
  if (value && value in toggleSizeStyles) {
    return value as ToggleSize;
  }
  return 'default';
}

interface ElementInternalsHost {
  attachInternals?: () => ElementInternals;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Form-associated Web Component backing `<rafters-toggle>`.
 */
export class RaftersToggle extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  private _internals: ElementInternals;
  private _instanceSheet: CSSStyleSheet | null = null;
  private _inner: HTMLButtonElement | null = null;
  private _onClick: (event: Event) => void;
  private _initialPressed: boolean;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-toggle requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._onClick = (event: Event) => this.handleInnerClick(event);
    // Remember the initial pressed state declared via markup so formResetCallback
    // can restore it. Updated only on connection when the element is first
    // inserted; explicit property/attribute mutations post-connect do not change
    // the "declared" starting value.
    this._initialPressed = this.hasAttribute('pressed');
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    // Re-capture the declared initial state in case the element was
    // constructed programmatically and had its `pressed` attribute set
    // before the first connection.
    this._initialPressed = this.hasAttribute('pressed');

    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());

    const existing = this.shadowRoot.adoptedStyleSheets;
    this.shadowRoot.adoptedStyleSheets = [...existing, this._instanceSheet];

    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (
      (name === 'variant' || name === 'size' || name === 'pressed' || name === 'disabled') &&
      this._instanceSheet
    ) {
      this._instanceSheet.replaceSync(this.composeCss());
    }

    this.mirrorStateToInner();

    if (name === 'pressed' || name === 'value' || name === 'name') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.detachInnerListeners();
    this._instanceSheet = null;
    this._inner = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachInnerListeners();
    const inner = document.createElement('button');
    inner.className = 'toggle';
    inner.setAttribute('type', 'button');
    this._inner = inner;

    const slot = document.createElement('slot');
    inner.appendChild(slot);

    this.mirrorStateToInner();
    inner.addEventListener('click', this._onClick);
    return inner;
  }

  private detachInnerListeners(): void {
    if (!this._inner) return;
    this._inner.removeEventListener('click', this._onClick);
  }

  private composeCss(): string {
    return toggleStylesheet({
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
      pressed: this.hasAttribute('pressed'),
      disabled: this.hasAttribute('disabled'),
    });
  }

  // ==========================================================================
  // State mirroring
  // ==========================================================================

  private mirrorStateToInner(): void {
    const inner = this.getInnerButton();
    if (!inner) return;
    const pressed = this.hasAttribute('pressed');
    inner.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    inner.setAttribute('data-state', pressed ? 'on' : 'off');
    inner.disabled = this.hasAttribute('disabled');
  }

  private getInnerButton(): HTMLButtonElement | null {
    if (this._inner) return this._inner;
    const found = this.shadowRoot?.querySelector('button') ?? null;
    if (found instanceof HTMLButtonElement) {
      this._inner = found;
      return found;
    }
    return null;
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  private handleInnerClick(_event: Event): void {
    if (this.hasAttribute('disabled')) return;
    const next = !this.hasAttribute('pressed');
    this.toggleAttribute('pressed', next);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private syncFormValue(): void {
    const pressed = this.hasAttribute('pressed');
    if (pressed) {
      const value = this.getAttribute('value') ?? 'on';
      this._internals.setFormValue(value);
    } else {
      this._internals.setFormValue(null);
    }
  }

  // ==========================================================================
  // Form-associated lifecycle callbacks
  // ==========================================================================

  formAssociatedCallback(_form: HTMLFormElement | null): void {
    // Hook for subclasses; default is a no-op. The internals already track the
    // associated form for us.
  }

  formResetCallback(): void {
    this.toggleAttribute('pressed', this._initialPressed);
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean): void {
    const inner = this.getInnerButton();
    if (inner) {
      inner.disabled = disabled;
    }
  }

  formStateRestoreCallback(
    state: string | File | FormData | null,
    _mode: 'restore' | 'autocomplete',
  ): void {
    // A non-null state means the toggle was pressed when the state was
    // captured. Null means it was unpressed.
    this.toggleAttribute('pressed', state !== null);
  }

  // ==========================================================================
  // Public form-control surface
  // ==========================================================================

  /**
   * The ElementInternals instance bound to this host. Exposed read-only so
   * consumers (and tests) can inspect form association without
   * monkey-patching. Mutation is intentionally not supported -- use the
   * setCustomValidity and form lifecycle methods instead.
   */
  get internals(): ElementInternals {
    return this._internals;
  }

  get pressed(): boolean {
    return this.hasAttribute('pressed');
  }

  set pressed(next: boolean) {
    this.toggleAttribute('pressed', next);
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

  set value(next: string) {
    this.setAttribute('value', next);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }

  get variant(): ToggleVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: ToggleVariant) {
    this.setAttribute('variant', value);
  }

  get size(): ToggleSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: ToggleSize) {
    this.setAttribute('size', value);
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

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message: string): void {
    this._internals.setValidity({ customError: message.length > 0 }, message);
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-toggle')) {
  customElements.define('rafters-toggle', RaftersToggle);
}
