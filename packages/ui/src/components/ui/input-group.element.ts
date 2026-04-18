/**
 * <rafters-input-group> and <rafters-input-group-addon> -- layout-composition
 * Web Components for composing inputs with icon/text affixes.
 *
 * Mirrors the semantics of input-group.tsx (size, disabled) using
 * shadow-DOM-scoped CSS composed via classy-wc. Auto-registers on import and
 * is idempotent against double-define.
 *
 * InputGroup is NOT form-associated -- the slotted input owns form
 * participation. The group contributes visual chrome and a focus-within ring
 * around the composed control.
 *
 * `<rafters-input-group>` attributes:
 *   size      'sm' | 'default' | 'lg'  (default 'default')
 *   disabled  boolean (presence-based; also propagates to slotted inputs)
 *
 * `<rafters-input-group-addon>` attributes:
 *   position  'start' | 'end'          (default 'start')
 *   variant   'default' | 'filled'     (default 'default')
 *
 * Unknown attribute values silently fall back to the documented defaults.
 *
 * No raw CSS custom-property literals here -- all token references live in
 * input-group.styles.ts and resolve through tokenVar().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type InputGroupAddonPosition,
  type InputGroupAddonVariant,
  type InputGroupSize,
  inputGroupAddonStylesheet,
  inputGroupStylesheet,
} from './input-group.styles';

// ============================================================================
// Allowed value sets & parsers
// ============================================================================

const INPUT_GROUP_SIZES: ReadonlyArray<InputGroupSize> = ['sm', 'default', 'lg'];

const INPUT_GROUP_ADDON_POSITIONS: ReadonlyArray<InputGroupAddonPosition> = ['start', 'end'];

const INPUT_GROUP_ADDON_VARIANTS: ReadonlyArray<InputGroupAddonVariant> = ['default', 'filled'];

const INPUT_GROUP_OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['size', 'disabled'] as const;

const INPUT_GROUP_ADDON_OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'position',
  'variant',
] as const;

function parseSize(value: string | null): InputGroupSize {
  if (value && (INPUT_GROUP_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as InputGroupSize;
  }
  return 'default';
}

function parsePosition(value: string | null): InputGroupAddonPosition {
  if (value && (INPUT_GROUP_ADDON_POSITIONS as ReadonlyArray<string>).includes(value)) {
    return value as InputGroupAddonPosition;
  }
  return 'start';
}

function parseVariant(value: string | null): InputGroupAddonVariant {
  if (value && (INPUT_GROUP_ADDON_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as InputGroupAddonVariant;
  }
  return 'default';
}

// ============================================================================
// <rafters-input-group>
// ============================================================================

/**
 * Type guard helper for elements that expose a boolean `disabled` property.
 * Used to propagate the group's disabled state onto slotted native inputs
 * (`HTMLInputElement`) and to our own `<rafters-input>` form-associated
 * custom element, without relying on `any`.
 */
interface DisableableElement extends Element {
  disabled: boolean;
}

function isDisableable(node: Node): node is DisableableElement {
  if (!(node instanceof Element)) return false;
  const candidate = node as Element & { disabled?: unknown };
  return typeof candidate.disabled === 'boolean';
}

export class RaftersInputGroup extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = INPUT_GROUP_OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt on every attribute change. */
  private _instanceSheet: CSSStyleSheet | null = null;

  /** Stable inner wrapper so attribute changes do not rebuild the tree. */
  private _groupRoot: HTMLDivElement | null = null;

  /** Bound slotchange listener so we can cleanly detach on disconnect. */
  private _onSlotChange: (event: Event) => void;

  constructor() {
    super();
    this._onSlotChange = (_event: Event) => this.propagateDisabledToSlotted();
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
    this.syncDisabled();
    this.attachSlotListener();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    if (name === 'disabled') {
      this.syncDisabled();
    }
  }

  override disconnectedCallback(): void {
    this.detachSlotListener();
    this._instanceSheet = null;
    this._groupRoot = null;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  override render(): Node {
    if (!this._groupRoot) {
      const wrapper = document.createElement('div');
      wrapper.className = 'group';
      const slot = document.createElement('slot');
      wrapper.appendChild(slot);
      this._groupRoot = wrapper;
    }
    return this._groupRoot;
  }

  // --------------------------------------------------------------------------
  // Stylesheet composition
  // --------------------------------------------------------------------------

  private composeCss(): string {
    return inputGroupStylesheet({
      size: parseSize(this.getAttribute('size')),
      disabled: this.hasAttribute('disabled'),
    });
  }

  // --------------------------------------------------------------------------
  // Disabled propagation
  // --------------------------------------------------------------------------

  private syncDisabled(): void {
    const disabled = this.hasAttribute('disabled');
    if (disabled) {
      this.setAttribute('data-disabled', '');
    } else {
      this.removeAttribute('data-disabled');
    }
    this.propagateDisabledToSlotted();
  }

  private attachSlotListener(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', this._onSlotChange);
    }
  }

  private detachSlotListener(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.removeEventListener('slotchange', this._onSlotChange);
    }
  }

  /**
   * Mirror the host's `disabled` state onto every slotted element that carries
   * a boolean `disabled` property (native <input>, <rafters-input>, etc.).
   * Silent no-op when nothing is slotted yet.
   */
  private propagateDisabledToSlotted(): void {
    const disabled = this.hasAttribute('disabled');
    // Read light-DOM children directly so propagation works even before the
    // shadow slot's slotchange fires (e.g. when children are appended after
    // the host is connected but before the microtask that flushes slots).
    for (const child of Array.from(this.children)) {
      if (isDisableable(child)) {
        child.disabled = disabled;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Public surface
  // --------------------------------------------------------------------------

  get size(): InputGroupSize {
    return parseSize(this.getAttribute('size'));
  }

  set size(next: InputGroupSize) {
    this.setAttribute('size', next);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(next: boolean) {
    this.toggleAttribute('disabled', next);
  }
}

// ============================================================================
// <rafters-input-group-addon>
// ============================================================================

export class RaftersInputGroupAddon extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = INPUT_GROUP_ADDON_OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt on every attribute change. */
  private _instanceSheet: CSSStyleSheet | null = null;

  /** Stable inner wrapper so attribute changes do not rebuild the tree. */
  private _addonRoot: HTMLDivElement | null = null;

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
    this.syncPositionAttr();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    if (name === 'position') {
      this.syncPositionAttr();
      this.updateInnerPositionAttr();
    }
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
    this._addonRoot = null;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  override render(): Node {
    if (!this._addonRoot) {
      const wrapper = document.createElement('div');
      wrapper.className = 'addon';
      wrapper.setAttribute('data-position', parsePosition(this.getAttribute('position')));
      const slot = document.createElement('slot');
      wrapper.appendChild(slot);
      this._addonRoot = wrapper;
    }
    return this._addonRoot;
  }

  // --------------------------------------------------------------------------
  // Stylesheet composition
  // --------------------------------------------------------------------------

  private composeCss(): string {
    return inputGroupAddonStylesheet({
      position: parsePosition(this.getAttribute('position')),
      variant: parseVariant(this.getAttribute('variant')),
    });
  }

  private syncPositionAttr(): void {
    const position = parsePosition(this.getAttribute('position'));
    if (this.getAttribute('data-position') !== position) {
      this.setAttribute('data-position', position);
    }
  }

  private updateInnerPositionAttr(): void {
    if (this._addonRoot) {
      this._addonRoot.setAttribute('data-position', parsePosition(this.getAttribute('position')));
    }
  }

  // --------------------------------------------------------------------------
  // Public surface
  // --------------------------------------------------------------------------

  get position(): InputGroupAddonPosition {
    return parsePosition(this.getAttribute('position'));
  }

  set position(next: InputGroupAddonPosition) {
    this.setAttribute('position', next);
  }

  get variant(): InputGroupAddonVariant {
    return parseVariant(this.getAttribute('variant'));
  }

  set variant(next: InputGroupAddonVariant) {
    this.setAttribute('variant', next);
  }
}

// ============================================================================
// Registration
// ============================================================================

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input-group')) {
  customElements.define('rafters-input-group', RaftersInputGroup);
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input-group-addon')) {
  customElements.define('rafters-input-group-addon', RaftersInputGroupAddon);
}
