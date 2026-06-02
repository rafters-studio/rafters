/**
 * <rafters-textarea> -- Form-associated Web Component for multi-line text.
 *
 * Mirrors the semantics of textarea.tsx (variant, size, resize, native
 * textarea attributes) using shadow-DOM-scoped CSS composed via
 * classy-wc. Auto-registers on import and is idempotent against
 * double-define.
 *
 * Form-associated: participates in <form> submission, validation,
 * reset, disabled propagation, and state restoration via
 * ElementInternals.
 *
 * Attributes:
 *  - placeholder: string
 *  - value: string (initial value; live value lives on the inner <textarea>)
 *  - disabled: boolean (presence-based)
 *  - required: boolean (presence-based)
 *  - name: string (form field name)
 *  - rows, cols, maxlength: positive integers; unparseable values are
 *    silently dropped rather than propagated
 *  - wrap: 'soft' | 'hard' | 'off' (unknown values fall back to 'soft')
 *  - resize: 'none' | 'vertical' | 'horizontal' | 'both' (unknown values
 *    fall back to 'none'); maps to CSS `resize` on the inner textarea
 *  - variant: TextareaVariant (default 'default')
 *  - size: TextareaSize (default 'default')
 *  - aria-invalid: reflected to the inner textarea
 *
 * The inner <textarea> carries the SAME utility class strings the React/Astro
 * targets use -- imported from textarea.classes.ts -- rather than a parallel
 * hand-written CSS map. Variant border, focus ring, size, hover, placeholder,
 * disabled dimming, and the reduced-motion guard all ride utility classes
 * resolved against the shared compiled utility sheet adopted by RaftersElement
 * (setUtilityCSS) plus inherited token props.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim. The resize behavior is applied directly as an inline CSS
 * `resize` property on the inner textarea, independent of any class.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  textareaBaseClasses,
  textareaSizeClasses,
  textareaVariantClasses,
} from './textarea.classes';

// ============================================================================
// Public Types
// ============================================================================

export type TextareaVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

export type TextareaSize = 'sm' | 'default' | 'lg';

export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

// ============================================================================
// Sanitization helpers
// ============================================================================

type WrapValue = 'soft' | 'hard' | 'off';

const WRAP_VALUES: ReadonlyArray<WrapValue> = ['soft', 'hard', 'off'];

const RESIZE_VALUES: ReadonlyArray<TextareaResize> = ['none', 'vertical', 'horizontal', 'both'];

/**
 * Compose the inner textarea's class string from the shared class maps.
 * Mirrors textarea.tsx: base + variant + size. Exported so tests assert the
 * WC renders the exact same composition the React/Astro targets do -- the
 * parity guarantee.
 */
export function composeTextareaClasses(variant: TextareaVariant, size: TextareaSize): string {
  return `${textareaBaseClasses} ${textareaVariantClasses[variant] ?? textareaVariantClasses.default} ${textareaSizeClasses[size] ?? textareaSizeClasses.default}`;
}

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'placeholder',
  'value',
  'disabled',
  'required',
  'name',
  'rows',
  'cols',
  'maxlength',
  'wrap',
  'resize',
  'variant',
  'size',
  'aria-invalid',
] as const;

function parseWrap(value: string | null): WrapValue {
  if (value && (WRAP_VALUES as ReadonlyArray<string>).includes(value)) {
    return value as WrapValue;
  }
  return 'soft';
}

function parseResize(value: string | null): TextareaResize {
  if (value && (RESIZE_VALUES as ReadonlyArray<string>).includes(value)) {
    return value as TextareaResize;
  }
  return 'none';
}

function parseVariant(value: string | null): TextareaVariant {
  if (value && value in textareaVariantClasses) {
    return value as TextareaVariant;
  }
  return 'default';
}

function parseSize(value: string | null): TextareaSize {
  if (value && value in textareaSizeClasses) {
    return value as TextareaSize;
  }
  return 'default';
}

function parsePositiveInt(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
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
 * Form-associated Web Component backing `<rafters-textarea>`.
 */
export class RaftersTextarea extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * The only component-owned CSS: the structural host-display shim. Every
   * other surface (variant border, focus ring, size, hover, placeholder,
   * disabled, reduced motion) rides a utility class on the inner textarea.
   */
  static override styles = ':host { display: block; }';

  private _internals: ElementInternals;
  private _inner: HTMLTextAreaElement | null = null;
  private _onInput: (event: Event) => void;
  private _onChange: (event: Event) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-textarea requires ElementInternals support');
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
    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'variant' || name === 'size') {
      this.applyInnerClasses();
    }

    this.mirrorAttributesToInner();

    if (name === 'value' || name === 'required') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.detachInnerListeners();
    this._inner = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachInnerListeners();
    const inner = document.createElement('textarea');
    inner.className = this.composeClasses();
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

  private composeClasses(): string {
    return composeTextareaClasses(
      parseVariant(this.getAttribute('variant')),
      parseSize(this.getAttribute('size')),
    );
  }

  private applyInnerClasses(): void {
    const inner = this.getInnerTextarea();
    if (inner) inner.className = this.composeClasses();
  }

  // ==========================================================================
  // Attribute mirroring
  // ==========================================================================

  /**
   * Mirror observed attributes to the inner <textarea>. Unknown values
   * fall back to documented defaults. Numeric attrs that fail to parse
   * as positive integers are silently dropped.
   */
  private mirrorAttributesToInner(): void {
    const inner = this.getInnerTextarea();
    if (!inner) return;

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

    const rows = parsePositiveInt(this.getAttribute('rows'));
    if (rows != null) {
      inner.rows = rows;
    } else {
      inner.removeAttribute('rows');
    }

    const cols = parsePositiveInt(this.getAttribute('cols'));
    if (cols != null) {
      inner.cols = cols;
    } else {
      inner.removeAttribute('cols');
    }

    const maxlength = parsePositiveInt(this.getAttribute('maxlength'));
    if (maxlength != null) {
      inner.maxLength = maxlength;
    } else {
      inner.removeAttribute('maxlength');
    }

    inner.wrap = parseWrap(this.getAttribute('wrap'));

    inner.style.setProperty('resize', parseResize(this.getAttribute('resize')));

    const ariaInvalid = this.getAttribute('aria-invalid');
    if (ariaInvalid === null) {
      inner.removeAttribute('aria-invalid');
    } else {
      inner.setAttribute('aria-invalid', ariaInvalid);
    }

    inner.disabled = this.hasAttribute('disabled');
    inner.required = this.hasAttribute('required');

    const value = this.getAttribute('value');
    if (value !== null) {
      // Only force the inner value from the host attribute when the host
      // provides one. Live edits on the inner textarea are preserved
      // otherwise.
      inner.value = value;
    }
  }

  private getInnerTextarea(): HTMLTextAreaElement | null {
    if (this._inner) return this._inner;
    const found = this.shadowRoot?.querySelector('textarea') ?? null;
    if (found instanceof HTMLTextAreaElement) {
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
    this.dispatchEvent(
      event.type === 'input'
        ? new InputEvent('input', { bubbles: true, composed: true })
        : new Event(event.type, { bubbles: true, composed: true }),
    );
  }

  private syncFormValue(): void {
    const inner = this.getInnerTextarea();
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
    // Hook for subclasses; default is a no-op. The internals already
    // track the associated form for us.
  }

  formResetCallback(): void {
    const initial = this.getAttribute('value') ?? '';
    const inner = this.getInnerTextarea();
    if (inner) {
      inner.value = initial;
    }
    this._internals.setFormValue(initial);
    this._internals.setValidity({});
  }

  formDisabledCallback(disabled: boolean): void {
    const inner = this.getInnerTextarea();
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

  /**
   * The ElementInternals instance bound to this host. Exposed read-only
   * so consumers (and tests) can inspect form association without
   * monkey-patching. Mutation is intentionally not supported -- use the
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

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  get value(): string {
    const inner = this.getInnerTextarea();
    return inner ? inner.value : (this.getAttribute('value') ?? '');
  }

  set value(value: string) {
    const inner = this.getInnerTextarea();
    if (inner) {
      inner.value = value;
    }
    this._internals.setFormValue(value);
    if (inner) {
      this._internals.setValidity(inner.validity, inner.validationMessage, inner);
    }
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

  get variant(): TextareaVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: TextareaVariant) {
    this.setAttribute('variant', value);
  }

  get size(): TextareaSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: TextareaSize) {
    this.setAttribute('size', value);
  }

  get resize(): TextareaResize {
    return parseResize(this.getAttribute('resize'));
  }

  set resize(value: TextareaResize) {
    this.setAttribute('resize', value);
  }

  get wrap(): WrapValue {
    return parseWrap(this.getAttribute('wrap'));
  }

  set wrap(value: WrapValue) {
    this.setAttribute('wrap', value);
  }

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message: string): void {
    const inner = this.getInnerTextarea();
    if (inner) {
      inner.setCustomValidity(message);
      this._internals.setValidity(inner.validity, inner.validationMessage, inner);
    } else {
      this._internals.setValidity({ customError: message.length > 0 }, message);
    }
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-textarea')) {
  customElements.define('rafters-textarea', RaftersTextarea);
}
