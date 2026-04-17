/**
 * <rafters-input> -- Form-associated Web Component for text input.
 *
 * Mirrors the semantics of input.tsx (variant, size, native input attributes)
 * using shadow-DOM-scoped CSS composed via classy-wc. Auto-registers on
 * import and is idempotent against double-define.
 *
 * Form-associated: participates in <form> submission, validation, reset,
 * disabled propagation, and state restoration via ElementInternals.
 *
 * Attributes:
 *  - type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
 *          (default 'text'; unknown values silently fall back to 'text')
 *  - placeholder: string
 *  - value: string (initial value; live value lives on the inner <input>)
 *  - disabled: boolean (presence-based)
 *  - required: boolean (presence-based)
 *  - name: string (form field name)
 *  - variant: InputVariant (default 'default')
 *  - size: InputSize (default 'default')
 *
 * No raw CSS custom-property literals here -- all token references live in
 * input.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type InputSize,
  type InputVariant,
  inputSizeStyles,
  inputStylesheet,
  inputVariantStyles,
} from './input.styles';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

const ALLOWED_TYPES: ReadonlyArray<InputType> = [
  'text',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'search',
];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'type',
  'placeholder',
  'value',
  'disabled',
  'required',
  'name',
  'variant',
  'size',
] as const;

function parseType(value: string | null): InputType {
  if (value && (ALLOWED_TYPES as ReadonlyArray<string>).includes(value)) {
    return value as InputType;
  }
  return 'text';
}

function parseVariant(value: string | null): InputVariant {
  if (value && value in inputVariantStyles) {
    return value as InputVariant;
  }
  return 'default';
}

function parseSize(value: string | null): InputSize {
  if (value && value in inputSizeStyles) {
    return value as InputSize;
  }
  return 'default';
}

interface ElementInternalsHost {
  attachInternals?: () => ElementInternals;
}

export class RaftersInput extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  private _internals: ElementInternals;
  private _instanceSheet: CSSStyleSheet | null = null;
  private _inner: HTMLInputElement | null = null;
  private _onInput: (event: Event) => void;
  private _onChange: (event: Event) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-input requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._onInput = (event: Event) => this.handleInnerEvent(event);
    this._onChange = (event: Event) => this.handleInnerEvent(event);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());

    // Append our per-instance sheet on top of whatever the base set
    // (typically just the shared token sheet plus any static styles).
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

    if ((name === 'variant' || name === 'size') && this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }

    this.mirrorAttributesToInner();

    if (name === 'value') {
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
    const inner = document.createElement('input');
    inner.className = 'input';
    this._inner = inner;
    this.mirrorAttributesToInner();
    inner.addEventListener('input', this._onInput);
    inner.addEventListener('change', this._onChange);
    return inner;
  }

  private detachInnerListeners(): void {
    if (!this._inner) return;
    this._inner.removeEventListener('input', this._onInput);
    this._inner.removeEventListener('change', this._onChange);
  }

  private composeCss(): string {
    return inputStylesheet({
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
    });
  }

  // ==========================================================================
  // Attribute mirroring
  // ==========================================================================

  private mirrorAttributesToInner(): void {
    const inner = this.getInnerInput();
    if (!inner) return;

    inner.type = parseType(this.getAttribute('type'));

    const placeholder = this.getAttribute('placeholder');
    if (placeholder === null) {
      inner.removeAttribute('placeholder');
    } else {
      inner.setAttribute('placeholder', placeholder);
    }

    const name = this.getAttribute('name');
    if (name === null) {
      inner.removeAttribute('name');
    } else {
      inner.setAttribute('name', name);
    }

    const value = this.getAttribute('value');
    if (value !== null) {
      // Only force the inner value from the host attribute when the host
      // provides one. Live edits on the inner input are preserved otherwise.
      inner.value = value;
    }

    inner.disabled = this.hasAttribute('disabled');
    inner.required = this.hasAttribute('required');
  }

  private getInnerInput(): HTMLInputElement | null {
    if (this._inner) return this._inner;
    const found = this.shadowRoot?.querySelector('input') ?? null;
    if (found instanceof HTMLInputElement) {
      this._inner = found;
      return found;
    }
    return null;
  }

  // ==========================================================================
  // Event re-firing & validity sync
  // ==========================================================================

  private handleInnerEvent(event: Event): void {
    this.syncFormValue();
    this.dispatchEvent(new Event(event.type, { bubbles: true, composed: true }));
  }

  private syncFormValue(): void {
    const inner = this.getInnerInput();
    const value = inner ? inner.value : (this.getAttribute('value') ?? '');
    this._internals.setFormValue(value);
    if (inner) {
      this._internals.setValidity(inner.validity, inner.validationMessage, inner);
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
    const initial = this.getAttribute('value') ?? '';
    const inner = this.getInnerInput();
    if (inner) {
      inner.value = initial;
    }
    this._internals.setFormValue(initial);
    this._internals.setValidity({});
  }

  formDisabledCallback(disabled: boolean): void {
    const inner = this.getInnerInput();
    if (inner) {
      inner.disabled = disabled;
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
    const inner = this.getInnerInput();
    return inner ? inner.value : (this.getAttribute('value') ?? '');
  }

  set value(value: string) {
    const inner = this.getInnerInput();
    if (inner) {
      inner.value = value;
    }
    this._internals.setFormValue(value);
    if (inner) {
      this._internals.setValidity(inner.validity, inner.validationMessage, inner);
    }
  }

  get type(): InputType {
    return parseType(this.getAttribute('type'));
  }

  set type(value: InputType) {
    this.setAttribute('type', value);
  }

  get placeholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  set placeholder(value: string) {
    this.setAttribute('placeholder', value);
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

  get variant(): InputVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: InputVariant) {
    this.setAttribute('variant', value);
  }

  get size(): InputSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: InputSize) {
    this.setAttribute('size', value);
  }

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message: string): void {
    const inner = this.getInnerInput();
    if (inner) {
      inner.setCustomValidity(message);
      this._internals.setValidity(inner.validity, inner.validationMessage, inner);
    } else {
      this._internals.setValidity({ customError: message.length > 0 }, message);
    }
  }
}

if (!customElements.get('rafters-input')) {
  customElements.define('rafters-input', RaftersInput);
}
