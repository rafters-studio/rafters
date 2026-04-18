/**
 * <rafters-slider> -- Form-associated Web Component for range value selection.
 *
 * Mirrors the semantics of slider.tsx (variant, size, orientation,
 * single-thumb and multi-thumb range) using shadow-DOM-scoped CSS composed
 * via classy-wc. Auto-registers on import and is idempotent against
 * double-define.
 *
 * Form-associated: participates in <form> submission, validation, reset,
 * disabled propagation, and state restoration via ElementInternals. The
 * `value` attribute is a comma-separated list of numbers -- one thumb per
 * list entry. Single-value sliders submit as `name=value`; range sliders
 * submit each entry under `name` so `FormData.getAll(name)` returns the
 * list.
 *
 * Attributes:
 *  - value: comma-separated numbers (default '0'); unparseable entries are
 *    silently dropped
 *  - min: number (default 0); unparseable -> 0
 *  - max: number (default 100); unparseable -> 100
 *  - step: positive number (default 1); unparseable or <=0 -> 1
 *  - orientation: 'horizontal' | 'vertical' (default 'horizontal')
 *  - disabled: boolean (presence-based)
 *  - required: boolean (presence-based)
 *  - name: string (form field name)
 *  - variant: SliderVariant (default 'default')
 *  - size: SliderSize (default 'default')
 *
 * Keyboard interaction (focused thumb):
 *  - ArrowLeft / ArrowDown: decrement by step
 *  - ArrowRight / ArrowUp: increment by step
 *  - PageDown / PageUp: step * 10
 *  - Home: min
 *  - End: max
 *
 * Pointer interaction:
 *  - Track pointerdown: moves the closest thumb to the pointer position
 *  - Thumb pointerdown: starts drag (setPointerCapture); pointermove
 *    updates the thumb value; pointerup releases.
 *
 * No raw CSS custom-property literals here -- all token references live in
 * slider.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type SliderOrientation,
  type SliderSize,
  type SliderVariant,
  sliderSizeStyles,
  sliderStylesheet,
  sliderVariantStyles,
} from './slider.styles';

// ============================================================================
// Sanitization helpers
// ============================================================================

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'value',
  'min',
  'max',
  'step',
  'disabled',
  'required',
  'name',
  'orientation',
  'variant',
  'size',
] as const;

function parseNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function parseStep(value: string | null): number {
  const parsed = parseNumber(value, 1);
  if (parsed <= 0) return 1;
  return parsed;
}

function parseOrientation(value: string | null): SliderOrientation {
  return value === 'vertical' ? 'vertical' : 'horizontal';
}

function parseVariant(value: string | null): SliderVariant {
  if (value && value in sliderVariantStyles) {
    return value as SliderVariant;
  }
  return 'default';
}

function parseSize(value: string | null): SliderSize {
  if (value && value in sliderSizeStyles) {
    return value as SliderSize;
  }
  return 'default';
}

function parseValueList(value: string | null): number[] {
  if (value == null || value === '') return [];
  const parts = value.split(',');
  const out: number[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const n = Number.parseFloat(trimmed);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

function snapToStep(value: number, min: number, step: number): number {
  if (step <= 0) return value;
  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

function percentFromValue(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
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
 * Form-associated Web Component backing `<rafters-slider>`.
 */
export class RaftersSlider extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  private _internals: ElementInternals;
  private _instanceSheet: CSSStyleSheet | null = null;
  private _container: HTMLDivElement | null = null;
  private _track: HTMLDivElement | null = null;
  private _range: HTMLDivElement | null = null;
  private _thumbs: HTMLSpanElement[] = [];
  private _values: number[] = [];
  private _draggingIndex: number | null = null;

  private _onTrackPointerDown: (event: PointerEvent) => void;
  private _onThumbPointerDown: (event: PointerEvent) => void;
  private _onThumbPointerMove: (event: PointerEvent) => void;
  private _onThumbPointerUp: (event: PointerEvent) => void;
  private _onThumbKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-slider requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._onTrackPointerDown = (event: PointerEvent) => this.handleTrackPointerDown(event);
    this._onThumbPointerDown = (event: PointerEvent) => this.handleThumbPointerDown(event);
    this._onThumbPointerMove = (event: PointerEvent) => this.handleThumbPointerMove(event);
    this._onThumbPointerUp = (event: PointerEvent) => this.handleThumbPointerUp(event);
    this._onThumbKeyDown = (event: KeyboardEvent) => this.handleThumbKeyDown(event);
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

    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (
      (name === 'variant' || name === 'size' || name === 'orientation' || name === 'disabled') &&
      this._instanceSheet
    ) {
      this._instanceSheet.replaceSync(this.composeCss());
    }

    if (name === 'value' || name === 'min' || name === 'max' || name === 'step') {
      this._values = this.sanitizeValues(parseValueList(this.getAttribute('value')));
      this.renderThumbs();
      this.updatePositions();
      this.updateThumbAria();
      this.syncFormValue();
      return;
    }

    if (name === 'disabled') {
      this.updateDisabledState();
      return;
    }

    if (name === 'orientation') {
      this.updateThumbAria();
      this.updatePositions();
      return;
    }

    if (name === 'required' || name === 'name') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.detachTrackListeners();
    this.detachThumbListeners();
    this._instanceSheet = null;
    this._container = null;
    this._track = null;
    this._range = null;
    this._thumbs = [];
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachTrackListeners();
    this.detachThumbListeners();

    const container = document.createElement('div');
    container.className = 'container';
    container.setAttribute('data-orientation', parseOrientation(this.getAttribute('orientation')));
    if (this.hasAttribute('disabled')) {
      container.setAttribute('data-disabled', '');
    }

    const track = document.createElement('div');
    track.className = 'track';

    const range = document.createElement('div');
    range.className = 'range';
    track.appendChild(range);

    container.appendChild(track);

    this._container = container;
    this._track = track;
    this._range = range;
    this._thumbs = [];

    this._values = this.sanitizeValues(parseValueList(this.getAttribute('value')));
    this.createThumbs(container);
    track.addEventListener('pointerdown', this._onTrackPointerDown);
    this.updatePositions();
    this.updateThumbAria();

    return container;
  }

  private renderThumbs(): void {
    if (!this._container) return;
    this.detachThumbListeners();
    for (const thumb of this._thumbs) {
      thumb.remove();
    }
    this._thumbs = [];
    this.createThumbs(this._container);
  }

  private createThumbs(container: HTMLElement): void {
    const count = Math.max(1, this._values.length);
    if (this._values.length === 0) {
      this._values = [0];
    }
    const disabled = this.hasAttribute('disabled');
    for (let i = 0; i < count; i++) {
      const thumb = document.createElement('span');
      thumb.className = 'thumb';
      thumb.setAttribute('role', 'slider');
      thumb.setAttribute('tabindex', disabled ? '-1' : '0');
      thumb.dataset.index = String(i);
      thumb.addEventListener('pointerdown', this._onThumbPointerDown);
      thumb.addEventListener('pointermove', this._onThumbPointerMove);
      thumb.addEventListener('pointerup', this._onThumbPointerUp);
      thumb.addEventListener('keydown', this._onThumbKeyDown);
      container.appendChild(thumb);
      this._thumbs.push(thumb);
    }
  }

  private detachTrackListeners(): void {
    if (!this._track) return;
    this._track.removeEventListener('pointerdown', this._onTrackPointerDown);
  }

  private detachThumbListeners(): void {
    for (const thumb of this._thumbs) {
      thumb.removeEventListener('pointerdown', this._onThumbPointerDown);
      thumb.removeEventListener('pointermove', this._onThumbPointerMove);
      thumb.removeEventListener('pointerup', this._onThumbPointerUp);
      thumb.removeEventListener('keydown', this._onThumbKeyDown);
    }
  }

  private composeCss(): string {
    return sliderStylesheet({
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
      orientation: parseOrientation(this.getAttribute('orientation')),
      disabled: this.hasAttribute('disabled'),
    });
  }

  // ==========================================================================
  // Value sanitization and positioning
  // ==========================================================================

  private sanitizeValues(values: number[]): number[] {
    const min = this.min;
    const max = this.max;
    const step = this.step;
    const out: number[] = [];
    if (values.length === 0) {
      out.push(clamp(snapToStep(0, min, step), min, max));
    } else {
      for (const v of values) {
        out.push(clamp(snapToStep(v, min, step), min, max));
      }
    }
    if (out.length > 1) {
      out.sort((a, b) => a - b);
    }
    return out;
  }

  private updatePositions(): void {
    if (!this._range) return;
    const min = this.min;
    const max = this.max;
    const orientation = parseOrientation(this.getAttribute('orientation'));
    const isHorizontal = orientation === 'horizontal';

    let rangeStart: number;
    let rangeEnd: number;
    if (this._values.length > 1) {
      const minV = Math.min(...this._values);
      const maxV = Math.max(...this._values);
      rangeStart = percentFromValue(minV, min, max);
      rangeEnd = percentFromValue(maxV, min, max);
    } else {
      rangeStart = 0;
      const v = this._values[0] ?? min;
      rangeEnd = percentFromValue(v, min, max);
    }

    if (isHorizontal) {
      this._range.style.left = `${rangeStart}%`;
      this._range.style.right = `${100 - rangeEnd}%`;
      this._range.style.top = '0';
      this._range.style.bottom = '0';
    } else {
      this._range.style.bottom = `${rangeStart}%`;
      this._range.style.top = `${100 - rangeEnd}%`;
      this._range.style.left = '0';
      this._range.style.right = '0';
    }

    for (let i = 0; i < this._thumbs.length; i++) {
      const thumb = this._thumbs[i];
      if (!thumb) continue;
      const val = this._values[i] ?? min;
      const pct = percentFromValue(val, min, max);
      if (isHorizontal) {
        thumb.style.left = `${pct}%`;
        thumb.style.top = '50%';
        thumb.style.transform = 'translate(-50%, -50%)';
      } else {
        thumb.style.bottom = `${pct}%`;
        thumb.style.left = '50%';
        thumb.style.transform = 'translate(-50%, 50%)';
      }
    }
  }

  private updateThumbAria(): void {
    const min = this.min;
    const max = this.max;
    const orientation = parseOrientation(this.getAttribute('orientation'));
    const disabled = this.hasAttribute('disabled');
    const hostAriaLabel = this.getAttribute('aria-label');
    const hostAriaLabelledby = this.getAttribute('aria-labelledby');
    const hostAriaDescribedby = this.getAttribute('aria-describedby');
    const isRange = this._thumbs.length > 1;

    for (let i = 0; i < this._thumbs.length; i++) {
      const thumb = this._thumbs[i];
      if (!thumb) continue;
      const val = this._values[i] ?? min;
      thumb.setAttribute('aria-valuemin', String(min));
      thumb.setAttribute('aria-valuemax', String(max));
      thumb.setAttribute('aria-valuenow', String(val));
      thumb.setAttribute('aria-orientation', orientation);
      if (disabled) {
        thumb.setAttribute('aria-disabled', 'true');
        thumb.setAttribute('tabindex', '-1');
      } else {
        thumb.removeAttribute('aria-disabled');
        thumb.setAttribute('tabindex', '0');
      }

      // Mirror the host's a11y naming attributes onto each thumb. For range
      // sliders, append a Minimum/Maximum suffix so screen readers can
      // distinguish the two handles. WAI-ARIA authoring practices recommend
      // per-thumb naming for range sliders.
      if (hostAriaLabel) {
        const suffix = isRange ? (i === 0 ? ' minimum' : ' maximum') : '';
        thumb.setAttribute('aria-label', `${hostAriaLabel}${suffix}`);
      } else {
        thumb.setAttribute('aria-label', isRange ? (i === 0 ? 'Minimum' : 'Maximum') : 'Value');
      }

      if (hostAriaLabelledby) {
        thumb.setAttribute('aria-labelledby', hostAriaLabelledby);
      } else {
        thumb.removeAttribute('aria-labelledby');
      }

      if (hostAriaDescribedby) {
        thumb.setAttribute('aria-describedby', hostAriaDescribedby);
      } else {
        thumb.removeAttribute('aria-describedby');
      }
    }
  }

  private updateDisabledState(): void {
    if (!this._container) return;
    if (this.hasAttribute('disabled')) {
      this._container.setAttribute('data-disabled', '');
    } else {
      this._container.removeAttribute('data-disabled');
    }
    this.updateThumbAria();
  }

  // ==========================================================================
  // Pointer interaction
  // ==========================================================================

  private handleTrackPointerDown(event: PointerEvent): void {
    if (this.hasAttribute('disabled')) return;
    const value = this.getValueFromPointer(event);
    if (value == null) return;
    const index = this.findClosestThumbIndex(value);
    this.setValueAt(index, value);
  }

  private handleThumbPointerDown(event: PointerEvent): void {
    if (this.hasAttribute('disabled')) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const index = Number.parseInt(target.dataset.index ?? '0', 10);
    this._draggingIndex = Number.isFinite(index) ? index : null;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // happy-dom and some test envs do not implement pointer capture;
        // silent fallback leaves drag state alone.
      }
    }
  }

  private handleThumbPointerMove(event: PointerEvent): void {
    if (this._draggingIndex == null) return;
    if (this.hasAttribute('disabled')) return;
    const value = this.getValueFromPointer(event);
    if (value == null) return;
    this.setValueAt(this._draggingIndex, value);
  }

  private handleThumbPointerUp(event: PointerEvent): void {
    if (this._draggingIndex == null) return;
    const target = event.currentTarget;
    if (target instanceof HTMLElement && typeof target.releasePointerCapture === 'function') {
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // Silent fallback for environments without pointer capture.
      }
    }
    this._draggingIndex = null;
  }

  private getValueFromPointer(event: PointerEvent): number | null {
    if (!this._track) return null;
    const rect = this._track.getBoundingClientRect();
    const orientation = parseOrientation(this.getAttribute('orientation'));
    let pct: number;
    if (orientation === 'vertical') {
      if (rect.height === 0) return null;
      pct = 1 - (event.clientY - rect.top) / rect.height;
    } else {
      if (rect.width === 0) return null;
      pct = (event.clientX - rect.left) / rect.width;
    }
    pct = Math.min(Math.max(pct, 0), 1);
    const min = this.min;
    const max = this.max;
    const step = this.step;
    const raw = min + pct * (max - min);
    return clamp(snapToStep(raw, min, step), min, max);
  }

  private findClosestThumbIndex(target: number): number {
    if (this._values.length <= 1) return 0;
    let closest = 0;
    let minDist = Math.abs((this._values[0] ?? 0) - target);
    for (let i = 1; i < this._values.length; i++) {
      const v = this._values[i];
      if (v == null) continue;
      const d = Math.abs(v - target);
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    }
    return closest;
  }

  // ==========================================================================
  // Keyboard interaction
  // ==========================================================================

  private handleThumbKeyDown(event: KeyboardEvent): void {
    if (this.hasAttribute('disabled')) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const index = Number.parseInt(target.dataset.index ?? '0', 10);
    if (!Number.isFinite(index)) return;
    const current = this._values[index];
    if (current == null) return;

    const min = this.min;
    const max = this.max;
    const step = this.step;
    const largeStep = step * 10;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        next = clamp(current + step, min, max);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        next = clamp(current - step, min, max);
        break;
      case 'PageUp':
        event.preventDefault();
        next = clamp(current + largeStep, min, max);
        break;
      case 'PageDown':
        event.preventDefault();
        next = clamp(current - largeStep, min, max);
        break;
      case 'Home':
        event.preventDefault();
        next = min;
        break;
      case 'End':
        event.preventDefault();
        next = max;
        break;
      default:
        return;
    }

    if (next !== null && next !== current) {
      this.setValueAt(index, next);
    }
  }

  private setValueAt(index: number, value: number): void {
    if (index < 0 || index >= this._values.length) return;
    const min = this.min;
    const max = this.max;
    const step = this.step;
    const clamped = clamp(snapToStep(value, min, step), min, max);
    if (this._values[index] === clamped) return;

    const next = [...this._values];
    next[index] = clamped;
    if (next.length > 1) {
      next.sort((a, b) => a - b);
      const newIndex = next.indexOf(clamped);
      if (newIndex !== -1 && newIndex !== index && this._draggingIndex === index) {
        this._draggingIndex = newIndex;
      }
    }

    this._values = next;
    this.updatePositions();
    this.updateThumbAria();
    this.syncFormValue();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  // ==========================================================================
  // Form value sync
  // ==========================================================================

  private syncFormValue(): void {
    const name = this.name;
    if (this._values.length === 0) {
      this._internals.setFormValue('');
    } else if (this._values.length === 1) {
      const v = this._values[0];
      this._internals.setFormValue(v != null ? String(v) : '');
    } else if (name) {
      const fd = new FormData();
      for (const v of this._values) {
        fd.append(name, String(v));
      }
      this._internals.setFormValue(fd);
    } else {
      this._internals.setFormValue(this._values.map((v) => String(v)).join(','));
    }

    if (this.hasAttribute('required') && this._values.length === 0) {
      this._internals.setValidity({ valueMissing: true }, 'Please select a value.');
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
    this._values = this.sanitizeValues(parseValueList(initial));
    this.renderThumbs();
    this.updatePositions();
    this.updateThumbAria();
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean): void {
    this.toggleAttribute('disabled', disabled);
    this.updateDisabledState();
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
   * consumers (and tests) can inspect form association without
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
    if (this._values.length === 0) return '';
    return this._values.map((v) => String(v)).join(',');
  }

  set value(next: string) {
    // Live value updates via the setter do NOT mutate the `value` host
    // attribute so that formResetCallback can restore the attribute-defined
    // initial value. Match the textarea/input element pattern.
    this._values = this.sanitizeValues(parseValueList(next));
    this.renderThumbs();
    this.updatePositions();
    this.updateThumbAria();
    this.syncFormValue();
  }

  get valueAsArray(): number[] {
    return [...this._values];
  }

  set valueAsArray(next: number[]) {
    this._values = this.sanitizeValues(next);
    this.renderThumbs();
    this.updatePositions();
    this.updateThumbAria();
    this.syncFormValue();
  }

  get min(): number {
    return parseNumber(this.getAttribute('min'), 0);
  }

  set min(value: number) {
    this.setAttribute('min', String(value));
  }

  get max(): number {
    return parseNumber(this.getAttribute('max'), 100);
  }

  set max(value: number) {
    this.setAttribute('max', String(value));
  }

  get step(): number {
    return parseStep(this.getAttribute('step'));
  }

  set step(value: number) {
    this.setAttribute('step', String(value));
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

  get orientation(): SliderOrientation {
    return parseOrientation(this.getAttribute('orientation'));
  }

  set orientation(value: SliderOrientation) {
    this.setAttribute('orientation', value);
  }

  get variant(): SliderVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: SliderVariant) {
    this.setAttribute('variant', value);
  }

  get size(): SliderSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: SliderSize) {
    this.setAttribute('size', value);
  }

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message: string): void {
    if (message) {
      this._internals.setValidity({ customError: true }, message);
    } else {
      this._internals.setValidity({});
    }
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-slider')) {
  customElements.define('rafters-slider', RaftersSlider);
}
