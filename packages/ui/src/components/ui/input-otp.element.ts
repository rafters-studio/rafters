/**
 * <rafters-input-otp> -- Form-associated Web Component for one-time-password
 * and verification-code segmented input.
 *
 * Mirrors the semantics of input-otp.tsx (segmented display, paste, auto-
 * advance, keyboard navigation) using shadow-DOM-scoped CSS composed via
 * classy-wc. Auto-registers on import and is idempotent against double-define.
 *
 * Form-associated: participates in <form> submission, validation, reset,
 * disabled propagation, and state restoration via ElementInternals. The
 * concatenated string value submits as `name=value` in FormData.
 *
 * Attributes:
 *  - value: string (initial value; live value lives on the inner hidden input)
 *  - maxlength: positive integer (default 6; unparseable falls back to 6)
 *  - disabled: boolean (presence-based)
 *  - required: boolean (presence-based)
 *  - name: string (form field name)
 *  - pattern: regex source string (default '^[0-9]$'; malformed silently
 *    falls back to digits-only)
 *  - autofocus: boolean (presence-based; focuses the hidden input on
 *    connect)
 *
 * Events:
 *  - input: bubbles+composed; dispatched on every value change
 *  - change: bubbles+composed; dispatched when value reaches maxLength
 *  - rafters-otp-complete: bubbles+composed CustomEvent with detail.value
 *    set to the completed string; dispatched when value reaches maxLength
 *
 * No raw CSS custom-property literals here -- all token references live in
 * input-otp.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { inputOtpStylesheet } from './input-otp.styles';

// ============================================================================
// Constants & helpers
// ============================================================================

const DEFAULT_MAX_LENGTH = 6;
const DEFAULT_PATTERN_SOURCE = '^[0-9]$';
const DEFAULT_PATTERN: RegExp = /^[0-9]$/;

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'value',
  'maxlength',
  'disabled',
  'required',
  'name',
  'pattern',
  'autofocus',
] as const;

function parseMaxLength(value: string | null): number {
  if (value == null) return DEFAULT_MAX_LENGTH;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_LENGTH;
  return parsed;
}

function parsePattern(value: string | null): RegExp {
  if (value == null || value.length === 0) return DEFAULT_PATTERN;
  try {
    return new RegExp(value);
  } catch {
    return DEFAULT_PATTERN;
  }
}

interface ElementInternalsHost {
  attachInternals?: () => ElementInternals;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Form-associated Web Component backing `<rafters-input-otp>`.
 */
export class RaftersInputOtp extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  private _internals: ElementInternals;
  private _instanceSheet: CSSStyleSheet | null = null;
  private _container: HTMLDivElement | null = null;
  private _hiddenInput: HTMLInputElement | null = null;
  private _slotEls: HTMLDivElement[] = [];
  private _activeIndex = 0;
  private _onContainerClick: (event: Event) => void;
  private _onHiddenInput: (event: Event) => void;
  private _onHiddenKeyDown: (event: KeyboardEvent) => void;
  private _onHiddenPaste: (event: ClipboardEvent) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-input-otp requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._onContainerClick = (_event: Event) => this.handleContainerClick();
    this._onHiddenInput = (event: Event) => this.handleHiddenInput(event);
    this._onHiddenKeyDown = (event: KeyboardEvent) => this.handleHiddenKeyDown(event);
    this._onHiddenPaste = (event: ClipboardEvent) => this.handleHiddenPaste(event);
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

    // Initial value sync: hidden input may have just been created in render().
    const initial = this.getAttribute('value') ?? '';
    if (this._hiddenInput) {
      this._hiddenInput.value = this.filterAndTruncate(initial);
    }
    this._activeIndex = Math.min(this.value.length, this.maxLength - 1);
    this.refreshSlotState();
    this.syncFormValue();
    this.updateDisabledFlag();

    if (this.hasAttribute('autofocus')) {
      this._hiddenInput?.focus();
    }
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'maxlength' || name === 'pattern') {
      // Re-render slot count + re-filter current value.
      if (this.shadowRoot) {
        this.update();
      }
      // Re-apply value through filter (pattern may be stricter).
      const current = this.value;
      const refiltered = this.filterAndTruncate(current);
      if (this._hiddenInput) {
        this._hiddenInput.value = refiltered;
      }
      this._activeIndex = Math.min(refiltered.length, this.maxLength - 1);
      this.refreshSlotState();
      this.syncFormValue();
      return;
    }

    if (name === 'disabled' && this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
      this.updateDisabledFlag();
      if (this._hiddenInput) {
        this._hiddenInput.disabled = this.hasAttribute('disabled');
      }
      return;
    }

    if (name === 'value') {
      const next = newValue ?? '';
      const filtered = this.filterAndTruncate(next);
      if (this._hiddenInput) {
        this._hiddenInput.value = filtered;
      }
      this._activeIndex = Math.min(filtered.length, this.maxLength - 1);
      this.refreshSlotState();
      this.syncFormValue();
      return;
    }

    if (name === 'name') {
      this.syncFormValue();
      return;
    }

    if (name === 'required') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.detachListeners();
    this._instanceSheet = null;
    this._container = null;
    this._hiddenInput = null;
    this._slotEls = [];
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachListeners();

    const container = document.createElement('div');
    container.className = 'container';
    container.setAttribute('data-input-otp-container', '');

    const hidden = document.createElement('input');
    hidden.className = 'hidden-input';
    hidden.type = 'text';
    hidden.setAttribute('inputmode', 'numeric');
    hidden.setAttribute('autocomplete', 'one-time-code');
    hidden.setAttribute('aria-label', `Enter ${this.maxLength} character code`);
    hidden.disabled = this.hasAttribute('disabled');
    hidden.required = this.hasAttribute('required');

    const initial = this.getAttribute('value') ?? '';
    hidden.value = this.filterAndTruncate(initial);

    container.append(hidden);

    const group = document.createElement('div');
    group.className = 'group';
    group.setAttribute('data-input-otp-group', '');

    const slotCount = this.maxLength;
    const slots: HTMLDivElement[] = [];
    for (let i = 0; i < slotCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.setAttribute('data-input-otp-slot', '');
      slot.setAttribute('data-index', String(i));

      const caret = document.createElement('div');
      caret.className = 'caret';
      caret.setAttribute('aria-hidden', 'true');
      const caretBar = document.createElement('div');
      caretBar.className = 'caret-bar';
      caret.append(caretBar);
      slot.append(caret);

      group.append(slot);
      slots.push(slot);
    }

    container.append(group);

    this._container = container;
    this._hiddenInput = hidden;
    this._slotEls = slots;

    container.addEventListener('click', this._onContainerClick);
    hidden.addEventListener('input', this._onHiddenInput);
    hidden.addEventListener('keydown', this._onHiddenKeyDown);
    hidden.addEventListener('paste', this._onHiddenPaste);

    return container;
  }

  private detachListeners(): void {
    if (this._container) {
      this._container.removeEventListener('click', this._onContainerClick);
    }
    if (this._hiddenInput) {
      this._hiddenInput.removeEventListener('input', this._onHiddenInput);
      this._hiddenInput.removeEventListener('keydown', this._onHiddenKeyDown);
      this._hiddenInput.removeEventListener('paste', this._onHiddenPaste);
    }
  }

  private composeCss(): string {
    return inputOtpStylesheet({ disabled: this.hasAttribute('disabled') });
  }

  // ==========================================================================
  // Filtering & state refresh
  // ==========================================================================

  private get pattern(): RegExp {
    return parsePattern(this.getAttribute('pattern'));
  }

  private filterAndTruncate(input: string): string {
    if (!input) return '';
    const pattern = this.pattern;
    const max = this.maxLength;
    let out = '';
    for (const char of input) {
      if (out.length >= max) break;
      if (pattern.test(char)) out += char;
    }
    return out;
  }

  private refreshSlotState(): void {
    const value = this.value;
    const max = this.maxLength;
    const active = Math.min(this._activeIndex, max - 1);

    for (let i = 0; i < this._slotEls.length; i++) {
      const slot = this._slotEls[i];
      if (!slot) continue;
      const char = value[i];
      const isFilled = typeof char === 'string';
      const isActive = i === active || (value.length === max && i === max - 1);

      // Char text node: replace whatever text the slot currently holds
      // without disturbing the caret child.
      const caret = slot.querySelector<HTMLElement>('.caret');
      // Remove any prior text nodes (keep only the caret element).
      const toRemove: ChildNode[] = [];
      for (const node of Array.from(slot.childNodes)) {
        if (node !== caret) toRemove.push(node);
      }
      for (const node of toRemove) {
        slot.removeChild(node);
      }
      if (isFilled && typeof char === 'string') {
        slot.insertBefore(document.createTextNode(char), caret);
      }

      if (isActive) {
        slot.setAttribute('data-active', '');
      } else {
        slot.removeAttribute('data-active');
      }
      if (isFilled) {
        slot.setAttribute('data-filled', '');
      } else {
        slot.removeAttribute('data-filled');
      }

      // Caret only visible when slot is the active empty slot.
      const showCaret = isActive && !isFilled;
      if (caret) {
        caret.style.display = showCaret ? '' : 'none';
      }
    }
  }

  private updateDisabledFlag(): void {
    const disabled = this.hasAttribute('disabled');
    if (this._container) {
      if (disabled) {
        this._container.setAttribute('data-disabled', '');
      } else {
        this._container.removeAttribute('data-disabled');
      }
    }
  }

  // ==========================================================================
  // Interaction handlers
  // ==========================================================================

  private handleContainerClick(): void {
    if (this.hasAttribute('disabled')) return;
    this._hiddenInput?.focus();
  }

  private handleHiddenInput(_event: Event): void {
    if (!this._hiddenInput) return;
    const raw = this._hiddenInput.value;
    const filtered = this.filterAndTruncate(raw);
    if (filtered !== raw) {
      this._hiddenInput.value = filtered;
    }
    this._activeIndex = Math.min(filtered.length, this.maxLength - 1);
    this.refreshSlotState();
    this.syncFormValue();

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    if (filtered.length === this.maxLength) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.dispatchEvent(
        new CustomEvent('rafters-otp-complete', {
          bubbles: true,
          composed: true,
          detail: { value: filtered },
        }),
      );
    }
  }

  private handleHiddenKeyDown(event: KeyboardEvent): void {
    if (this.hasAttribute('disabled')) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this._activeIndex = Math.max(0, this._activeIndex - 1);
      this.refreshSlotState();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const max = this.maxLength;
      this._activeIndex = Math.min(this.value.length, max - 1);
      this.refreshSlotState();
      return;
    }
    if (event.key === 'Backspace') {
      // Let the native input handle backspace deletion; the resulting input
      // event drives the active-index update via handleHiddenInput.
      // No preventDefault so the value actually changes.
      return;
    }
  }

  private handleHiddenPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const filtered = this.filterAndTruncate(text);
    if (this._hiddenInput) {
      this._hiddenInput.value = filtered;
    }
    this._activeIndex = Math.min(filtered.length, this.maxLength - 1);
    this.refreshSlotState();
    this.syncFormValue();

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    if (filtered.length === this.maxLength) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.dispatchEvent(
        new CustomEvent('rafters-otp-complete', {
          bubbles: true,
          composed: true,
          detail: { value: filtered },
        }),
      );
    }
  }

  // ==========================================================================
  // Form value & validity sync
  // ==========================================================================

  private syncFormValue(): void {
    const value = this.value;
    this._internals.setFormValue(value);

    const max = this.maxLength;
    const isRequired = this.hasAttribute('required');
    if (isRequired && value.length < max) {
      this._internals.setValidity({ tooShort: true }, `Please enter all ${max} characters.`);
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
    const initial = this.getAttribute('value') ?? '';
    const filtered = this.filterAndTruncate(initial);
    if (this._hiddenInput) {
      this._hiddenInput.value = filtered;
    }
    this._activeIndex = Math.min(filtered.length, this.maxLength - 1);
    this.refreshSlotState();
    this._internals.setFormValue(filtered);
    this._internals.setValidity({});
  }

  formDisabledCallback(disabled: boolean): void {
    if (this._hiddenInput) {
      this._hiddenInput.disabled = disabled;
    }
    if (this._container) {
      if (disabled) {
        this._container.setAttribute('data-disabled', '');
      } else {
        this._container.removeAttribute('data-disabled');
      }
    }
  }

  formStateRestoreCallback(
    state: string | File | FormData | null,
    _mode: 'restore' | 'autocomplete',
  ): void {
    if (typeof state === 'string') {
      this.value = state;
    }
  }

  // ==========================================================================
  // Public form-control surface
  // ==========================================================================

  /**
   * The ElementInternals instance bound to this host. Exposed read-only so
   * consumers (and tests) can inspect form association without monkey-
   * patching.
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
    if (this._hiddenInput) return this._hiddenInput.value;
    return this.filterAndTruncate(this.getAttribute('value') ?? '');
  }

  set value(value: string) {
    const filtered = this.filterAndTruncate(value);
    if (this._hiddenInput) {
      this._hiddenInput.value = filtered;
    }
    this._activeIndex = Math.min(filtered.length, this.maxLength - 1);
    this.refreshSlotState();
    this.syncFormValue();
  }

  get maxLength(): number {
    return parseMaxLength(this.getAttribute('maxlength'));
  }

  set maxLength(value: number) {
    if (Number.isFinite(value) && value > 0) {
      this.setAttribute('maxlength', String(Math.floor(value)));
    }
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
      // Re-run our standard validity logic so tooShort (etc.) re-asserts.
      this._internals.setValidity({});
      this.syncFormValue();
    }
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-input-otp')) {
  customElements.define('rafters-input-otp', RaftersInputOtp);
}

// Also re-export DEFAULT_PATTERN_SOURCE for documentation/test use.
export { DEFAULT_PATTERN_SOURCE };
