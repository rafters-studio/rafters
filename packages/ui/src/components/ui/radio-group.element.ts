/**
 * <rafters-radio-group> + <rafters-radio-item> -- Form-associated Web
 * Component pair for mutually exclusive selection.
 *
 * Mirrors the semantics of radio-group.tsx (value, orientation,
 * disabled, required, name) using shadow-DOM-scoped CSS composed via
 * classy-wc. Both elements auto-register on import and are idempotent
 * against double-define.
 *
 * The group is form-associated via ElementInternals: it participates
 * in <form> submission as `name=value`, reports `valueMissing`
 * validity when `required` and empty, and propagates `formDisabled`
 * to its child items. Items are NOT form-associated -- the group owns
 * the form-control identity.
 *
 * Group attributes:
 *  - value: string (currently selected item value)
 *  - name: string (form field name)
 *  - disabled: boolean (presence-based; propagates to all items)
 *  - required: boolean (presence-based; drives valueMissing)
 *  - orientation: 'horizontal' | 'vertical' (default 'vertical';
 *    unknown values fall back to 'vertical')
 *
 * Item attributes:
 *  - value: string (this item's form value)
 *  - disabled: boolean (presence-based)
 *  - checked: boolean (presence-based; managed by the group)
 *
 * Keyboard: arrow keys (up/down/left/right) move focus between
 * non-disabled items with roving tabindex; Home/End jump to the
 * first/last non-disabled item; Space/Enter select the focused item.
 *
 * Each inner node carries the SAME utility class strings the React/Astro
 * targets use -- imported from radio-group.classes.ts -- rather than a
 * parallel hand-written CSS map. The group container carries the
 * orientation layout classes; the item button carries the base radio
 * classes (border, hover, focus ring, disabled dimming) and the indicator
 * span carries the dot classes. Presentation resolves from the shared
 * compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus the
 * token custom properties inherited from the host :root.
 *
 * The only shadow-scoped CSS these components own is the structural :host
 * display shim. The checked indicator dot is rendered only when checked
 * (mirroring radio-group.tsx), so no display-toggle CSS is required.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  radioGroupHorizontalClasses,
  radioGroupItemBaseClasses,
  radioGroupItemIndicatorClasses,
  radioGroupVerticalClasses,
} from './radio-group.classes';

// ============================================================================
// Public Types
// ============================================================================

export type RadioOrientation = 'horizontal' | 'vertical';

/**
 * Compose the group container's class string. Mirrors radio-group.tsx:
 * the horizontal or vertical layout classes keyed by orientation. Exported
 * so tests assert parity with the React/Astro targets.
 */
export function composeRadioGroupClasses(orientation: RadioOrientation): string {
  return orientation === 'horizontal' ? radioGroupHorizontalClasses : radioGroupVerticalClasses;
}

/**
 * Compose the inner radio button's class string. Mirrors radio-group.tsx:
 * the shared base radio classes (border, hover, focus-visible ring,
 * disabled dimming). Exported for parity assertions.
 */
export function composeRadioItemClasses(): string {
  return radioGroupItemBaseClasses;
}

/**
 * Compose the indicator dot's class string. Mirrors radio-group.tsx's
 * checked indicator span.
 */
export function composeRadioIndicatorClasses(): string {
  return radioGroupItemIndicatorClasses;
}

// ============================================================================
// Sanitization helpers
// ============================================================================

const GROUP_OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'value',
  'disabled',
  'required',
  'name',
  'orientation',
] as const;

const ITEM_OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['value', 'disabled', 'checked'] as const;

const VALUE_MISSING_MESSAGE = 'Please select one of these options.';

function parseOrientation(value: string | null): RadioOrientation {
  if (value === 'horizontal' || value === 'vertical') return value;
  return 'vertical';
}

// ============================================================================
// ElementInternals feature detection
// ============================================================================

interface ElementInternalsHost {
  attachInternals?: () => ElementInternals;
}

// ============================================================================
// RaftersRadioGroup
// ============================================================================

/**
 * Form-associated Web Component backing `<rafters-radio-group>`.
 */
export class RaftersRadioGroup extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = GROUP_OBSERVED_ATTRIBUTES;

  /**
   * The only component-owned CSS: the structural host-display shim. The
   * inner container div carries the orientation layout (flex/grid + gap)
   * via utility classes.
   */
  static override styles = ':host { display: block; }';

  private _internals: ElementInternals;
  private _onItemClick: (event: Event) => void;
  private _onKeyDown: (event: KeyboardEvent) => void;
  private _onFocusIn: (event: FocusEvent) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-radio-group requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._onItemClick = (event: Event) => this.handleItemClick(event);
    this._onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
    this._onFocusIn = (event: FocusEvent) => this.handleFocusIn(event);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    this.setAttribute('role', 'radiogroup');
    this.setAttribute('aria-orientation', parseOrientation(this.getAttribute('orientation')));

    this.addEventListener('click', this._onItemClick);
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusin', this._onFocusIn);

    this.syncItemStates();
    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'orientation') {
      this.applyContainerClasses();
      this.setAttribute('aria-orientation', parseOrientation(newValue));
    }

    if (name === 'disabled') {
      this.propagateDisabled(this.hasAttribute('disabled'));
    }

    if (name === 'value') {
      this.syncItemStates();
      this.syncFormValue();
    }

    if (name === 'required' || name === 'name') {
      this.syncFormValue();
    }
  }

  override disconnectedCallback(): void {
    this.removeEventListener('click', this._onItemClick);
    this.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('focusin', this._onFocusIn);
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    const container = document.createElement('div');
    container.className = composeRadioGroupClasses(
      parseOrientation(this.getAttribute('orientation')),
    );
    const slot = document.createElement('slot');
    container.appendChild(slot);
    return container;
  }

  private applyContainerClasses(): void {
    const container = this.shadowRoot?.querySelector('div');
    if (container) {
      container.className = composeRadioGroupClasses(
        parseOrientation(this.getAttribute('orientation')),
      );
    }
  }

  // ==========================================================================
  // Item collection + state sync
  // ==========================================================================

  private getItems(): RaftersRadioItem[] {
    return Array.from(this.querySelectorAll<RaftersRadioItem>('rafters-radio-item'));
  }

  private getFocusableItems(): RaftersRadioItem[] {
    return this.getItems().filter((item) => !item.hasAttribute('disabled'));
  }

  /**
   * Sync each child item's `checked` attribute, `aria-checked`,
   * `data-state`, and roving `tabindex` based on the group's current
   * value. The first non-disabled item receives tabindex=0 when no
   * item is selected so Tab enters the group; otherwise the selected
   * item receives tabindex=0 so Tab focuses the active choice.
   */
  private syncItemStates(): void {
    const selected = this.getAttribute('value') ?? '';
    const items = this.getItems();
    const focusable = items.filter((item) => !item.hasAttribute('disabled'));
    const selectedIndex = focusable.findIndex(
      (item) => (item.getAttribute('value') ?? '') === selected,
    );
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

    for (const item of items) {
      const value = item.getAttribute('value') ?? '';
      const isChecked = value === selected && selected !== '';
      item.toggleAttribute('checked', isChecked);
      item.setAttribute('aria-checked', isChecked ? 'true' : 'false');
      item.setAttribute('data-state', isChecked ? 'checked' : 'unchecked');
    }

    for (let i = 0; i < focusable.length; i++) {
      const item = focusable[i];
      if (!item) continue;
      item.setAttribute('tabindex', i === activeIndex ? '0' : '-1');
    }

    // Disabled items never participate in tab order.
    for (const item of items) {
      if (item.hasAttribute('disabled')) {
        item.setAttribute('tabindex', '-1');
      }
    }
  }

  private propagateDisabled(disabled: boolean): void {
    for (const item of this.getItems()) {
      item.toggleAttribute('disabled', disabled);
    }
    this.syncItemStates();
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  private handleItemClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const item = this.findItemFromEvent(event);
    if (!item) return;
    if (item.hasAttribute('disabled') || this.hasAttribute('disabled')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const next = item.getAttribute('value') ?? '';
    if ((this.getAttribute('value') ?? '') === next) return;
    this.setAttribute('value', next);
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * Resolve an event to the <rafters-radio-item> that owns it,
   * regardless of whether the event originated from the host or from
   * its shadow-root button. Relies on composedPath so clicks inside
   * the item's shadow DOM are attributed correctly.
   */
  private findItemFromEvent(event: Event): RaftersRadioItem | null {
    const path = event.composedPath();
    for (const node of path) {
      if (node instanceof RaftersRadioItem) return node;
    }
    const target = event.target;
    if (target instanceof RaftersRadioItem) return target;
    return null;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.hasAttribute('disabled')) return;

    const focusable = this.getFocusableItems();
    if (focusable.length === 0) return;

    const activeItem = this.resolveActiveItem(focusable);
    const currentIndex = activeItem ? focusable.indexOf(activeItem) : 0;

    let nextIndex = -1;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % focusable.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = focusable.length - 1;
        break;
      case ' ':
      case 'Enter':
        if (activeItem) {
          event.preventDefault();
          this.selectItem(activeItem);
        }
        return;
      default:
        return;
    }

    if (nextIndex < 0 || nextIndex >= focusable.length) return;
    const target = focusable[nextIndex];
    if (!target) return;
    event.preventDefault();
    for (let i = 0; i < focusable.length; i++) {
      const item = focusable[i];
      if (!item) continue;
      item.setAttribute('tabindex', i === nextIndex ? '0' : '-1');
    }
    target.focus();
  }

  /**
   * Locate the item that currently owns roving focus. Prefers the
   * DOM activeElement (which tracks <rafters-radio-item> focus via
   * delegatesFocus-style tabindex), then the last focused item, then
   * falls back to the selected item or the first focusable item.
   */
  private resolveActiveItem(focusable: RaftersRadioItem[]): RaftersRadioItem | null {
    const active = document.activeElement;
    if (active instanceof RaftersRadioItem && focusable.includes(active)) {
      return active;
    }

    for (const item of focusable) {
      if (item.getAttribute('tabindex') === '0') return item;
    }

    const selected = this.getAttribute('value') ?? '';
    const selectedItem = focusable.find((item) => (item.getAttribute('value') ?? '') === selected);
    if (selectedItem) return selectedItem;

    return focusable[0] ?? null;
  }

  private handleFocusIn(event: FocusEvent): void {
    const item = this.findItemFromEvent(event);
    if (!item || item.hasAttribute('disabled')) return;
    const focusable = this.getFocusableItems();
    for (const candidate of focusable) {
      candidate.setAttribute('tabindex', candidate === item ? '0' : '-1');
    }
  }

  private selectItem(item: RaftersRadioItem): void {
    if (item.hasAttribute('disabled') || this.hasAttribute('disabled')) return;
    const next = item.getAttribute('value') ?? '';
    if ((this.getAttribute('value') ?? '') === next) return;
    this.setAttribute('value', next);
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  // ==========================================================================
  // Form value + validity sync
  // ==========================================================================

  private syncFormValue(): void {
    const value = this.getAttribute('value') ?? '';
    this._internals.setFormValue(value);

    if (this.hasAttribute('required') && value === '') {
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
    // Restore the initial value attribute. In happy-dom, the live
    // attribute tracks value mutations, so we clear to the attribute
    // value that was present when the element was first connected.
    // The test suite relies on the attribute still holding the
    // declarative initial value.
    const initial = this.getInitialValueAttribute();
    if (initial === null) {
      this.removeAttribute('value');
    } else {
      this.setAttribute('value', initial);
    }
    this.syncItemStates();
    this.syncFormValue();
  }

  /**
   * Read the declarative `value` attribute as it was authored on the
   * source markup. We persist the initial value once on connect so
   * later mutations through the setter do not overwrite the reset
   * target.
   */
  private _initialValue: string | null = null;
  private _initialValueCaptured = false;

  private getInitialValueAttribute(): string | null {
    if (!this._initialValueCaptured) {
      this._initialValue = this.getAttribute('value');
      this._initialValueCaptured = true;
    }
    return this._initialValue;
  }

  formDisabledCallback(disabled: boolean): void {
    this.propagateDisabled(disabled);
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
   * The ElementInternals instance bound to this host. Exposed
   * read-only so consumers (and tests) can inspect form association
   * without monkey-patching.
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
    return this.getAttribute('value') ?? '';
  }

  set value(next: string) {
    // Capture the declarative initial value before the first setter
    // write clobbers the attribute. Tests that call
    // formResetCallback() after mutating .value rely on this.
    this.getInitialValueAttribute();
    if (next === '') {
      this.removeAttribute('value');
    } else {
      this.setAttribute('value', next);
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

  get orientation(): RadioOrientation {
    return parseOrientation(this.getAttribute('orientation'));
  }

  set orientation(value: RadioOrientation) {
    this.setAttribute('orientation', value);
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
// RaftersRadioItem
// ============================================================================

/**
 * Child element `<rafters-radio-item>`. NOT form-associated -- the
 * group owns the form value. Exposes the `value`, `disabled`, and
 * `checked` attributes; renders a `<button role="radio">` with an
 * indicator dot in its shadow root.
 */
export class RaftersRadioItem extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ITEM_OBSERVED_ATTRIBUTES;

  /**
   * The only component-owned CSS: the structural host-display shim. The
   * inner button carries the base radio classes (border, hover, focus
   * ring, disabled dimming) and the indicator dot carries its own classes.
   */
  static override styles = ':host { display: inline-flex; }';

  private _button: HTMLButtonElement | null = null;

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    this.setAttribute('role', 'radio');
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '-1');
    }
    this.mirrorStateToButton();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'checked') {
      // The indicator dot is rendered only when checked (React parity), so
      // toggling checked must add or remove it.
      this.renderIndicator();
    }

    this.mirrorStateToButton();
  }

  override disconnectedCallback(): void {
    this._button = null;
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    // Render the documented `<button class="radio">` shell per spec.
    // The host element carries the ARIA surface (role=radio,
    // tabindex, aria-checked); the inner button provides the
    // interactive focus ring inside the shadow root. The button is
    // hidden from assistive technology with aria-hidden and forced
    // out of the tab sequence with tabindex=-1; role=presentation
    // strips its implicit button semantics so screen readers see
    // only the host's role. axe's `nested-interactive` rule is
    // disabled on a11y scans for this reason (see a11y tests).
    const button = document.createElement('button');
    button.type = 'button';
    button.className = composeRadioItemClasses();
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('role', 'presentation');
    this._button = button;
    this.renderIndicator();
    this.mirrorStateToButton();
    return button;
  }

  /**
   * Populate or clear the indicator dot based on the current `checked`
   * state, mirroring radio-group.tsx which renders the span only when
   * checked. Uses createElement; never innerHTML.
   */
  private renderIndicator(): void {
    const button = this.getInnerButton();
    if (!button) return;
    button.replaceChildren();
    if (!this.hasAttribute('checked')) return;
    const indicator = document.createElement('span');
    indicator.className = composeRadioIndicatorClasses();
    indicator.setAttribute('aria-hidden', 'true');
    button.appendChild(indicator);
  }

  private mirrorStateToButton(): void {
    const button = this.getInnerButton();
    if (!button) return;
    const checked = this.hasAttribute('checked');
    const disabled = this.hasAttribute('disabled');
    button.disabled = disabled;
    button.setAttribute('data-state', checked ? 'checked' : 'unchecked');
    this.setAttribute('aria-checked', checked ? 'true' : 'false');
    this.setAttribute('data-state', checked ? 'checked' : 'unchecked');
    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }
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

  /**
   * Delegate host focus to the inner button. The button carries
   * the focus ring; the host carries the ARIA surface. When the
   * group roves focus to this item, we want the inner button to
   * show focus-visible styles while the host is the accessible
   * element for AT.
   */
  override focus(options?: FocusOptions): void {
    const button = this.getInnerButton();
    if (button) {
      button.focus(options);
      return;
    }
    super.focus(options);
  }

  // ==========================================================================
  // Public surface
  // ==========================================================================

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(next: string) {
    if (next === '') {
      this.removeAttribute('value');
    } else {
      this.setAttribute('value', next);
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(next: boolean) {
    this.toggleAttribute('disabled', next);
  }

  get checked(): boolean {
    return this.hasAttribute('checked');
  }

  set checked(next: boolean) {
    this.toggleAttribute('checked', next);
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (!customElements.get('rafters-radio-group')) {
  customElements.define('rafters-radio-group', RaftersRadioGroup);
}

if (!customElements.get('rafters-radio-item')) {
  customElements.define('rafters-radio-item', RaftersRadioItem);
}
