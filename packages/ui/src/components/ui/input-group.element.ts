/**
 * <rafters-input-group> and <rafters-input-group-addon> -- layout-composition
 * Web Components for composing inputs with icon/text affixes.
 *
 * Mirrors the semantics of input-group.tsx (size, disabled). The inner
 * wrappers carry the SAME utility class strings the React/Astro targets use
 * -- imported from input-group.classes.ts -- rather than a parallel
 * hand-written CSS map. Presentation resolves from the shared compiled
 * utility sheet adopted by RaftersElement (setUtilityCSS) plus the token
 * custom properties inherited from the host :root.
 *
 * The shadow-scoped CSS this component owns is the irreducible set that no
 * utility class on the inner wrapper can express, because it crosses the
 * shadow boundary: the `:host` display shims, the `:host(:focus-within)`
 * ring (slotted focus lives in light DOM, not a real `.group` descendant),
 * the `:host([data-disabled])` mirror, and the `::slotted(...)` input
 * normalisation.
 *
 * Auto-registers on import and is idempotent against double-define.
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
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type InputGroupAddonPosition,
  type InputGroupAddonVariant,
  type InputGroupSize,
  inputGroupAddonBaseClasses,
  inputGroupAddonPositionClasses,
  inputGroupAddonVariantClasses,
  inputGroupBaseClasses,
  inputGroupDisabledClasses,
  inputGroupSizeClasses,
} from './input-group.classes';

export type {
  InputGroupAddonPosition,
  InputGroupAddonVariant,
  InputGroupSize,
} from './input-group.classes';

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

/**
 * Compose the inner group wrapper's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * React/Astro targets do -- the parity guarantee.
 */
export function composeInputGroupClasses(size: InputGroupSize, disabled: boolean): string {
  return [
    inputGroupBaseClasses,
    inputGroupSizeClasses[size] ?? inputGroupSizeClasses.default,
    disabled ? inputGroupDisabledClasses : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Compose the inner addon wrapper's class string from the shared class maps.
 * Exported for the same parity guarantee.
 */
export function composeInputGroupAddonClasses(
  position: InputGroupAddonPosition,
  variant: InputGroupAddonVariant,
): string {
  return [
    inputGroupAddonBaseClasses,
    inputGroupAddonPositionClasses[position] ?? inputGroupAddonPositionClasses.start,
    inputGroupAddonVariantClasses[variant] ?? inputGroupAddonVariantClasses.default,
  ].join(' ');
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

  /**
   * Irreducible shadow CSS that crosses the shadow boundary and therefore
   * cannot be carried by a utility class on the inner `.group` wrapper:
   *
   *  - `:host` display shim
   *  - `:host(:focus-within) .group` ring (slotted focus is light-DOM, so the
   *    inner wrapper's own `focus-within:` utility never fires for it)
   *  - `:host([data-disabled]) .group` host-driven disabled mirror
   *  - `::slotted(input), ::slotted(rafters-input)` and `::slotted([disabled])`
   *    normalisation of the projected control
   */
  static override styles = `:host {
  display: block;
}

:host(:focus-within) .group {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-background), 0 0 0 4px var(--color-ring);
}

:host([data-disabled]) .group {
  opacity: 0.5;
  cursor: not-allowed;
}

::slotted(input), ::slotted(rafters-input) {
  flex: 1;
  height: 100%;
  width: 100%;
  background-color: transparent;
  border: none;
  outline: none;
  padding-left: var(--spacing-3);
  padding-right: var(--spacing-3);
  border-radius: inherit;
}

::slotted([disabled]) {
  cursor: not-allowed;
}`;

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
    super.connectedCallback();
    this.syncDisabled();
    this.attachSlotListener();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.applyGroupClasses();
    if (name === 'disabled') {
      this.syncDisabled();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.detachSlotListener();
    this._groupRoot = null;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  override render(): Node {
    if (!this._groupRoot) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('group');
      const slot = document.createElement('slot');
      wrapper.appendChild(slot);
      this._groupRoot = wrapper;
    }
    this.applyGroupClasses();
    return this._groupRoot;
  }

  /**
   * Apply the composed utility classes onto the inner wrapper while keeping
   * the structural `group` marker the irreducible static rules target.
   */
  private applyGroupClasses(): void {
    if (!this._groupRoot) return;
    this._groupRoot.className = `group ${composeInputGroupClasses(
      parseSize(this.getAttribute('size')),
      this.hasAttribute('disabled'),
    )}`;
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

  /** The only component-owned CSS: the structural host-display shim. */
  static override styles = ':host { display: flex; }';

  /** Stable inner wrapper so attribute changes do not rebuild the tree. */
  private _addonRoot: HTMLDivElement | null = null;

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncPositionAttr();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.applyAddonClasses();
    if (name === 'position') {
      this.syncPositionAttr();
      this.updateInnerPositionAttr();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._addonRoot = null;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  override render(): Node {
    if (!this._addonRoot) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('addon');
      wrapper.setAttribute('data-position', parsePosition(this.getAttribute('position')));
      const slot = document.createElement('slot');
      wrapper.appendChild(slot);
      this._addonRoot = wrapper;
    }
    this.applyAddonClasses();
    return this._addonRoot;
  }

  /**
   * Apply the composed utility classes onto the inner wrapper while keeping
   * the structural `addon` marker stable for queries and assertions.
   */
  private applyAddonClasses(): void {
    if (!this._addonRoot) return;
    this._addonRoot.className = `addon ${composeInputGroupAddonClasses(
      parsePosition(this.getAttribute('position')),
      parseVariant(this.getAttribute('variant')),
    )}`;
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
