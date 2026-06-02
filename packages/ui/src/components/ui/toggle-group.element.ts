/**
 * <rafters-toggle-group> and <rafters-toggle-group-item> --
 * Form-associated Web Component pair for grouped toggle selections.
 *
 * Mirrors the semantics of toggle-group.tsx (type, variant, size, pressed).
 * The group div and each item button carry the SAME utility class strings the
 * React/Astro targets use -- imported from toggle-group.classes.ts -- rather
 * than a parallel hand-written CSS map. Variant/size/pressed/hover/disabled
 * presentation resolves from those utility classes against the shared compiled
 * utility sheet adopted by RaftersElement (setUtilityCSS) plus inherited token
 * props. Auto-registers on import and is idempotent against double-define.
 *
 * The only shadow-scoped CSS this pair owns is structural: the group's :host
 * display + vertical-orientation flex-direction shim, and each item's :host
 * display shim. Everything else is carried by utility classes.
 *
 * The group (`<rafters-toggle-group>`) owns form submission via
 * ElementInternals. Individual items (`<rafters-toggle-group-item>`) are
 * not form-associated -- they bubble clicks to the group, which updates
 * its `value` attribute and calls `setFormValue` appropriately.
 *
 * Attributes (group):
 *  - type:        'single' | 'multiple' (default 'single'; unknown -> 'single')
 *  - value:       string (single: the selected item's value; multiple: CSV)
 *  - disabled:    boolean (presence-based)
 *  - required:    boolean (presence-based)
 *  - name:        string (form field name)
 *  - variant:     ToggleGroupVariant (default 'default')
 *  - size:        ToggleGroupSize    (default 'default')
 *  - orientation: ToggleGroupOrientation (default 'horizontal')
 *
 * Attributes (item):
 *  - value:    string (identifies this item within its group)
 *  - pressed:  boolean (presence-based; mirrors to aria-pressed + data-state)
 *  - disabled: boolean (presence-based)
 *
 * Keyboard (roving focus on the group):
 *  - ArrowRight/ArrowDown moves focus to the next enabled item (loops).
 *  - ArrowLeft/ArrowUp moves to the previous enabled item (loops).
 *  - Space/Enter toggles the focused item (via native button click synthesis).
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  toggleGroupClasses,
  toggleGroupDefaultVariantClasses,
  toggleGroupItemBaseClasses,
  toggleGroupItemDefaultClasses,
  toggleGroupItemDefaultPressedClasses,
  toggleGroupItemOutlineClasses,
  toggleGroupItemOutlinePressedClasses,
  toggleGroupItemSizeClasses,
} from './toggle-group.classes';

// ============================================================================
// Public types
// ============================================================================

export type ToggleGroupType = 'single' | 'multiple';

export type ToggleGroupVariant = 'default' | 'outline';

export type ToggleGroupSize = 'sm' | 'default' | 'lg';

export type ToggleGroupOrientation = 'horizontal' | 'vertical';

// ============================================================================
// Sanitization helpers
// ============================================================================

const GROUP_OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'type',
  'value',
  'disabled',
  'required',
  'name',
  'variant',
  'size',
  'orientation',
] as const;

const ITEM_OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['value', 'pressed', 'disabled'] as const;

function parseType(value: string | null): ToggleGroupType {
  return value === 'multiple' ? 'multiple' : 'single';
}

function parseVariant(value: string | null): ToggleGroupVariant {
  return value === 'outline' ? 'outline' : 'default';
}

function parseSize(value: string | null): ToggleGroupSize {
  if (value && value in toggleGroupItemSizeClasses) {
    return value as ToggleGroupSize;
  }
  return 'default';
}

function parseOrientation(value: string | null): ToggleGroupOrientation {
  return value === 'vertical' ? 'vertical' : 'horizontal';
}

function splitCsv(value: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Compose the group div's class string from the shared class maps.
 * Mirrors toggle-group.tsx: base group classes plus the default-variant
 * chrome when the default variant is active.
 */
export function composeToggleGroupClasses(variant: ToggleGroupVariant): string {
  if (variant === 'default') {
    return `${toggleGroupClasses} ${toggleGroupDefaultVariantClasses}`;
  }
  return toggleGroupClasses;
}

/**
 * Compose an item button's class string from the shared class maps.
 * Mirrors toggle-group.tsx: base + size + variant-specific classes, with the
 * pressed variant of those classes layered on when `pressed` is true.
 */
export function composeToggleGroupItemClasses(
  variant: ToggleGroupVariant,
  size: ToggleGroupSize,
  pressed: boolean,
): string {
  const variantClasses =
    variant === 'outline'
      ? `${toggleGroupItemOutlineClasses}${pressed ? ` ${toggleGroupItemOutlinePressedClasses}` : ''}`
      : `${toggleGroupItemDefaultClasses}${pressed ? ` ${toggleGroupItemDefaultPressedClasses}` : ''}`;
  return `${toggleGroupItemBaseClasses} ${toggleGroupItemSizeClasses[size]} ${variantClasses}`;
}

interface ElementInternalsHost {
  attachInternals?: () => ElementInternals;
}

// ============================================================================
// Group component
// ============================================================================

/**
 * Form-associated Web Component backing `<rafters-toggle-group>`.
 */
export class RaftersToggleGroup extends RaftersElement {
  static formAssociated = true;
  static observedAttributes: ReadonlyArray<string> = GROUP_OBSERVED_ATTRIBUTES;

  /**
   * Structural-only component CSS. The group's box presentation is carried by
   * utility classes; the only irreducible rule is the vertical-orientation
   * flex-direction, which no utility class on the host expresses.
   */
  static override styles =
    ':host { display: inline-flex; }\n' +
    ':host([data-orientation="vertical"]) { flex-direction: column; }\n' +
    ':host([data-orientation="vertical"]) .group { flex-direction: column; }';

  private _internals: ElementInternals;
  private _initialValue: string;
  private _onItemClick: (event: Event) => void;
  private _onKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    super();
    const host = this as unknown as ElementInternalsHost;
    if (typeof host.attachInternals !== 'function') {
      throw new TypeError('rafters-toggle-group requires ElementInternals support');
    }
    this._internals = host.attachInternals();
    this._initialValue = this.getAttribute('value') ?? '';
    this._onItemClick = (event: Event) => this.handleItemClick(event);
    this._onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    this._initialValue = this.getAttribute('value') ?? '';

    this.applyHostAttributes();
    this.attachListeners();
    this.syncItems();
    this.syncFormValue();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'variant') {
      this.applyGroupClasses();
    }

    if (name === 'orientation') {
      this.applyHostAttributes();
    }

    if (name === 'type' || name === 'value') {
      this.syncItems();
      this.syncFormValue();
    }

    if (name === 'required' || name === 'name') {
      this.syncFormValue();
    }

    if (name === 'disabled') {
      this.propagateDisabled(this.hasAttribute('disabled'));
    }

    if (name === 'variant' || name === 'size') {
      // Propagate inherited attributes to child items so their class strings
      // refresh.
      this.syncItemsStyle();
    }
  }

  override disconnectedCallback(): void {
    this.detachListeners();
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  override render(): Node {
    this.detachListeners();
    const group = document.createElement('div');
    group.className = composeToggleGroupClasses(parseVariant(this.getAttribute('variant')));
    const slot = document.createElement('slot');
    group.appendChild(slot);
    this.applyHostAttributes();
    return group;
  }

  private applyHostAttributes(): void {
    const orientation = parseOrientation(this.getAttribute('orientation'));
    this.setAttribute('role', 'group');
    this.setAttribute('data-orientation', orientation);
  }

  private applyGroupClasses(): void {
    const group = this.shadowRoot?.querySelector('div');
    if (!group) return;
    group.className = composeToggleGroupClasses(parseVariant(this.getAttribute('variant')));
  }

  // ==========================================================================
  // Listeners
  // ==========================================================================

  private attachListeners(): void {
    this.addEventListener('click', this._onItemClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  private detachListeners(): void {
    this.removeEventListener('click', this._onItemClick);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  private handleItemClick(event: Event): void {
    const target = this.resolveItemFromEvent(event);
    if (!target) return;
    if (target.hasAttribute('disabled') || this.hasAttribute('disabled')) return;
    const value = target.getAttribute('value') ?? '';
    this.toggleItemValue(value);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const orientation = parseOrientation(this.getAttribute('orientation'));
    const key = event.key;

    const horizontalKeys = new Set(['ArrowRight', 'ArrowLeft']);
    const verticalKeys = new Set(['ArrowDown', 'ArrowUp']);
    const allNavKeys = new Set([...horizontalKeys, ...verticalKeys, 'Home', 'End']);

    if (key === ' ' || key === 'Enter') {
      const focused = this.resolveFocusedItem();
      if (!focused) return;
      if (focused.hasAttribute('disabled') || this.hasAttribute('disabled')) return;
      event.preventDefault();
      const value = focused.getAttribute('value') ?? '';
      this.toggleItemValue(value);
      return;
    }

    if (!allNavKeys.has(key)) return;

    if (orientation === 'horizontal' && verticalKeys.has(key)) return;
    if (orientation === 'vertical' && horizontalKeys.has(key)) return;

    const items = this.getEnabledItems();
    if (items.length === 0) return;

    event.preventDefault();

    const current = this.resolveFocusedItem();
    const currentIndex = current ? items.indexOf(current) : -1;

    let nextIndex = currentIndex;
    if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = items.length - 1;
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex =
        currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    }

    const next = items[nextIndex];
    if (!next) return;
    next.focus();
  }

  // ==========================================================================
  // State
  // ==========================================================================

  private toggleItemValue(itemValue: string): void {
    if (!itemValue) return;
    const type = parseType(this.getAttribute('type'));
    const current = this.getAttribute('value') ?? '';
    let nextValue: string;

    if (type === 'single') {
      nextValue = current === itemValue ? '' : itemValue;
    } else {
      const list = splitCsv(current);
      const index = list.indexOf(itemValue);
      if (index === -1) {
        list.push(itemValue);
      } else {
        list.splice(index, 1);
      }
      nextValue = list.join(',');
    }

    if (nextValue === current) return;

    this.setAttribute('value', nextValue);
    // attributeChangedCallback handles sync + events below, but we still want
    // a single change+input dispatch per user interaction.
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(
      new CustomEvent('rafters-toggle-group-change', {
        bubbles: true,
        composed: true,
        detail: { value: nextValue, type },
      }),
    );
  }

  private syncItems(): void {
    const type = parseType(this.getAttribute('type'));
    const current = this.getAttribute('value') ?? '';
    const selected =
      type === 'single' ? new Set([current].filter(Boolean)) : new Set(splitCsv(current));

    for (const item of this.getAllItems()) {
      const itemValue = item.getAttribute('value') ?? '';
      const pressed = selected.has(itemValue);
      if (pressed) {
        item.setAttribute('pressed', '');
      } else {
        item.removeAttribute('pressed');
      }
    }
  }

  private syncItemsStyle(): void {
    // Child items inherit group variant/size at connect time; when the
    // group's variant/size changes after connect, notify each item so it
    // can rebuild its class string.
    for (const item of this.getAllItems()) {
      if (item instanceof RaftersToggleGroupItem) {
        item.refreshFromGroup();
      }
    }
  }

  private propagateDisabled(disabled: boolean): void {
    for (const item of this.getAllItems()) {
      if (disabled) {
        item.setAttribute('data-group-disabled', '');
      } else {
        item.removeAttribute('data-group-disabled');
      }
      if (item instanceof RaftersToggleGroupItem) {
        item.refreshFromGroup();
      }
    }
  }

  private syncFormValue(): void {
    const name = this.getAttribute('name') ?? '';
    const type = parseType(this.getAttribute('type'));
    const current = this.getAttribute('value') ?? '';

    if (type === 'multiple') {
      if (name) {
        const formData = new FormData();
        for (const entry of splitCsv(current)) {
          formData.append(name, entry);
        }
        this._internals.setFormValue(formData);
      } else {
        this._internals.setFormValue(current);
      }
    } else {
      this._internals.setFormValue(current);
    }

    const required = this.hasAttribute('required');
    const empty = current.length === 0 || (type === 'multiple' && splitCsv(current).length === 0);
    if (required && empty) {
      this._internals.setValidity({ valueMissing: true }, 'Please select at least one option.');
    } else {
      this._internals.setValidity({});
    }
  }

  // ==========================================================================
  // DOM lookup helpers
  // ==========================================================================

  private getAllItems(): HTMLElement[] {
    const nodes = this.querySelectorAll('rafters-toggle-group-item');
    const result: HTMLElement[] = [];
    for (const node of Array.from(nodes)) {
      if (node instanceof HTMLElement) result.push(node);
    }
    return result;
  }

  private getEnabledItems(): HTMLElement[] {
    return this.getAllItems().filter((item) => !item.hasAttribute('disabled'));
  }

  private resolveFocusedItem(): HTMLElement | null {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    if (active.tagName.toLowerCase() !== 'rafters-toggle-group-item') return null;
    if (!this.contains(active)) return null;
    return active;
  }

  private resolveItemFromEvent(event: Event): HTMLElement | null {
    const path = event.composedPath();
    for (const node of path) {
      if (
        node instanceof HTMLElement &&
        node.tagName.toLowerCase() === 'rafters-toggle-group-item'
      ) {
        if (this.contains(node)) return node;
        return null;
      }
    }
    return null;
  }

  // ==========================================================================
  // Form-associated lifecycle callbacks
  // ==========================================================================

  formAssociatedCallback(_form: HTMLFormElement | null): void {
    // Hook for subclasses; default is a no-op. The internals already track
    // the associated form for us.
  }

  formResetCallback(): void {
    this.setAttribute('value', this._initialValue);
    this.syncItems();
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean): void {
    this.propagateDisabled(disabled);
  }

  formStateRestoreCallback(
    state: string | File | FormData | null,
    _mode: 'restore' | 'autocomplete',
  ): void {
    if (typeof state === 'string') {
      this.setAttribute('value', state);
    } else if (state === null) {
      this.setAttribute('value', '');
    }
  }

  // ==========================================================================
  // Public form-control surface
  // ==========================================================================

  get internals(): ElementInternals {
    return this._internals;
  }

  get type(): ToggleGroupType {
    return parseType(this.getAttribute('type'));
  }

  set type(next: ToggleGroupType) {
    this.setAttribute('type', next);
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(next: string) {
    this.setAttribute('value', next);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
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

  get variant(): ToggleGroupVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(value: ToggleGroupVariant) {
    this.setAttribute('variant', value);
  }

  get size(): ToggleGroupSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(value: ToggleGroupSize) {
    this.setAttribute('size', value);
  }

  get orientation(): ToggleGroupOrientation {
    return parseOrientation(this.getAttribute('orientation'));
  }

  set orientation(value: ToggleGroupOrientation) {
    this.setAttribute('orientation', value);
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
// Item component
// ============================================================================

/**
 * Web Component backing `<rafters-toggle-group-item>`. Not form-associated
 * on its own -- the parent group owns submission. Items render an inner
 * <button type="button"> carrying role + aria-pressed + data-state plus the
 * shared item utility classes.
 */
export class RaftersToggleGroupItem extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ITEM_OBSERVED_ATTRIBUTES;

  /**
   * The only component-owned CSS: the structural host-display shim. The inner
   * button's variant/size/pressed/hover/disabled presentation is carried by
   * the shared utility classes.
   */
  static override styles = ':host { display: inline-flex; }';

  private _button: HTMLButtonElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;

    this.applyHostAttributes();
    this.mirrorStateToInner();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'pressed') {
      this.applyClasses();
    }

    this.mirrorStateToInner();
  }

  override disconnectedCallback(): void {
    this._button = null;
  }

  override render(): Node {
    const inner = document.createElement('button');
    inner.className = this.composeClasses();
    inner.setAttribute('type', 'button');
    inner.setAttribute('data-roving-item', '');
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    this._button = inner;
    this.mirrorStateToInner();
    return inner;
  }

  private applyHostAttributes(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }

  private composeClasses(): string {
    const group = this.closestGroup();
    const variant = group
      ? parseVariant(group.getAttribute('variant'))
      : parseVariant(this.getAttribute('variant'));
    const size = group
      ? parseSize(group.getAttribute('size'))
      : parseSize(this.getAttribute('size'));
    return composeToggleGroupItemClasses(variant, size, this.hasAttribute('pressed'));
  }

  private applyClasses(): void {
    const inner = this.getInnerButton();
    if (!inner) return;
    inner.className = this.composeClasses();
  }

  private mirrorStateToInner(): void {
    const inner = this.getInnerButton();
    if (!inner) return;
    const pressed = this.hasAttribute('pressed');
    const disabled = this.isEffectivelyDisabled();
    inner.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    inner.setAttribute('data-state', pressed ? 'on' : 'off');
    inner.disabled = disabled;
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

  private closestGroup(): RaftersToggleGroup | null {
    let node: Node | null = this.parentNode;
    while (node) {
      if (node instanceof RaftersToggleGroup) return node;
      node = node.parentNode;
    }
    return null;
  }

  private isEffectivelyDisabled(): boolean {
    if (this.hasAttribute('disabled')) return true;
    if (this.hasAttribute('data-group-disabled')) return true;
    const group = this.closestGroup();
    if (group?.hasAttribute('disabled')) return true;
    return false;
  }

  /**
   * Called by the parent group when its own variant/size/disabled changes.
   * Rebuilds the item's class string using the latest inherited values.
   */
  refreshFromGroup(): void {
    this.applyClasses();
    this.mirrorStateToInner();
  }

  // ==========================================================================
  // Public surface
  // ==========================================================================

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(next: string) {
    this.setAttribute('value', next);
  }

  get pressed(): boolean {
    return this.hasAttribute('pressed');
  }

  set pressed(next: boolean) {
    this.toggleAttribute('pressed', next);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(next: boolean) {
    this.toggleAttribute('disabled', next);
  }
}

// ============================================================================
// Registration (module side-effect, guarded for re-import safety)
// ============================================================================

if (typeof customElements !== 'undefined') {
  if (!customElements.get('rafters-toggle-group')) {
    customElements.define('rafters-toggle-group', RaftersToggleGroup);
  }
  if (!customElements.get('rafters-toggle-group-item')) {
    customElements.define('rafters-toggle-group-item', RaftersToggleGroupItem);
  }
}
