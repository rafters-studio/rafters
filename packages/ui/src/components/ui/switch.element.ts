/**
 * <rafters-switch> -- Form-associated Web Component for binary toggle state.
 *
 * Mirrors the semantics of switch.tsx (variant, size, checked, disabled,
 * required). The inner track <button> and thumb <span> carry the SAME utility
 * class strings the React/Astro targets use -- imported from switch.classes.ts
 * -- rather than a parallel hand-written CSS map. Track color, thumb
 * translation, focus ring, and disabled presentation resolve from those
 * utility classes against the shared compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus inherited token props. Auto-registers on
 * import and is idempotent against double-define.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
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
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  switchSizeClasses,
  switchThumbBaseClasses,
  switchThumbTransitionClasses,
  switchThumbUncheckedClasses,
  switchTrackBaseClasses,
  switchTrackDisabledClasses,
  switchTrackFocusClasses,
  switchTrackShapeClasses,
  switchTrackTransitionClasses,
  switchTrackUncheckedClasses,
  switchVariantClasses,
} from './switch.classes';

export type SwitchVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type SwitchSize = 'sm' | 'default' | 'lg';

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
  if (value && Object.hasOwn(switchVariantClasses, value)) {
    return value as SwitchVariant;
  }
  return 'default';
}

function parseSize(value: string | null): SwitchSize {
  if (value && Object.hasOwn(switchSizeClasses, value)) {
    return value as SwitchSize;
  }
  return 'default';
}

/**
 * Compose the track button's class string from the shared class maps.
 * Mirrors switch.tsx: base + size.track + shape + transition + focus +
 * variant.ring + disabled + (checked ? variant.checked : unchecked).
 * Exported so tests assert parity with the React/Astro targets.
 */
export function composeSwitchTrackClasses(
  variant: SwitchVariant,
  size: SwitchSize,
  checked: boolean,
): string {
  const v = switchVariantClasses[variant] ??
    switchVariantClasses.default ?? { ring: '', checked: '' };
  const s = switchSizeClasses[size] ??
    switchSizeClasses.default ?? { track: '', thumb: '', translate: '' };
  return [
    switchTrackBaseClasses,
    s.track,
    switchTrackShapeClasses,
    switchTrackTransitionClasses,
    switchTrackFocusClasses,
    v.ring,
    switchTrackDisabledClasses,
    checked ? v.checked : switchTrackUncheckedClasses,
  ].join(' ');
}

/**
 * Compose the thumb span's class string from the shared class maps.
 * Mirrors switch.tsx: base + size.thumb + transition +
 * (checked ? size.translate : unchecked).
 */
export function composeSwitchThumbClasses(size: SwitchSize, checked: boolean): string {
  const s = switchSizeClasses[size] ??
    switchSizeClasses.default ?? { track: '', thumb: '', translate: '' };
  return [
    switchThumbBaseClasses,
    s.thumb,
    switchThumbTransitionClasses,
    checked ? s.translate : switchThumbUncheckedClasses,
  ].join(' ');
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

  /**
   * The only component-owned CSS: the structural host-display shim. The track
   * and thumb presentation is carried by the shared utility classes.
   */
  static override styles = ':host { display: inline-flex; }';

  private _internals: ElementInternals;
  private _button: HTMLButtonElement | null = null;
  private _thumb: HTMLSpanElement | null = null;
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

    this.syncButtonState();
    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'variant' || name === 'size' || name === 'checked') {
      this.applyClasses();
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
    this._button = null;
    this._thumb = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachButtonListeners();
    const variant = parseVariant(this.getAttribute('variant'));
    const size = parseSize(this.getAttribute('size'));
    const checked = this.hasAttribute('checked');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = composeSwitchTrackClasses(variant, size, checked);
    button.setAttribute('role', 'switch');
    const thumb = document.createElement('span');
    thumb.className = composeSwitchThumbClasses(size, checked);
    thumb.setAttribute('aria-hidden', 'true');
    button.append(thumb);
    this._button = button;
    this._thumb = thumb;

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

  private applyClasses(): void {
    const button = this.getButton();
    if (!button) return;
    const variant = parseVariant(this.getAttribute('variant'));
    const size = parseSize(this.getAttribute('size'));
    const checked = this.hasAttribute('checked');
    button.className = composeSwitchTrackClasses(variant, size, checked);
    const thumb = this.getThumb();
    if (thumb) {
      thumb.className = composeSwitchThumbClasses(size, checked);
    }
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

  private getThumb(): HTMLSpanElement | null {
    if (this._thumb) return this._thumb;
    const found = this.shadowRoot?.querySelector('span') ?? null;
    if (found instanceof HTMLSpanElement) {
      this._thumb = found;
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
