/**
 * Toggle group component for grouped toggle selections
 *
 * @cognitive-load 3/10 - Multiple options with clear selection state
 * @attention-economics Option group: all options visible, selected state prominent
 * @trust-building Immediate visual feedback, clear selection state, reversible
 * @accessibility Roving focus for keyboard navigation, proper ARIA pressed states
 * @semantic-meaning Selection modes: single=mutually exclusive (like radio), multiple=independent (like checkboxes)
 *
 * @usage-patterns
 * DO: Use single mode for mutually exclusive view/format options
 * DO: Use multiple mode for independent feature toggles
 * DO: Keep options visually grouped and styled consistently
 * DO: Limit to 2-5 options for scannability
 * NEVER: More than 7 options, complex nested selections
 *
 * @example
 * ```tsx
 * // Single selection (view mode)
 * <ToggleGroup type="single" defaultValue="grid">
 *   <ToggleGroup.Item value="grid"><Grid /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="list"><List /></ToggleGroup.Item>
 * </ToggleGroup>
 *
 * // Multiple selection (text formatting)
 * <ToggleGroup type="multiple">
 *   <ToggleGroup.Item value="bold"><Bold /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="italic"><Italic /></ToggleGroup.Item>
 * </ToggleGroup>
 * ```
 */

/**
 * WC performance for toggle-group, in light DOM. The host's attributes are the
 * config (type, value as the seed, orientation, disabled, required, name,
 * variant, size, aria-label, aria-labelledby); its `data-part="item"` children
 * (each with `value` and optional `disabled`) are the items, and a child marked slot="start-icon"
 * or slot="end-icon" is the item's decorative icon. The element renders the tree
 * toggle-group.tsx renders, with the initial projection applied, then hands the
 * root to bindToggleGroup (roving focus, projections, delegated click). The bind
 * is deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed.
 */
import {
  bindToggleGroup,
  toggleGroup,
  toggleItemAria,
  wrapToggleGroupIcons,
  type ToggleGroupConfig,
  type ToggleGroupOrientation,
  type ToggleGroupPart,
  type ToggleGroupSize,
  type ToggleGroupType,
  type ToggleGroupVariant,
} from './toggle-group.behavior';
import { toggleGroupClasses } from './toggle-group.classes';

let instanceCount = 0;

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((entry) => entry === value) ?? fallback;
}

function applyAttrs(el: HTMLElement, attrs: Record<string, string | boolean | undefined>): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, String(value));
  }
}

export class RaftersToggleGroup extends HTMLElement {
  private teardown: (() => void) | null = null;
  private readonly uid = `rafters-toggle-group-${++instanceCount}`;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>(':scope > [data-part="root"]') ?? this.build();
      wrapToggleGroupIcons(root);
      this.teardown = bindToggleGroup(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  /** Render the root and items from the host's attributes and item children. */
  private build(): HTMLElement {
    const type: ToggleGroupType = this.getAttribute('type') === 'multiple' ? 'multiple' : 'single';
    const seed = (this.getAttribute('value') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '');
    const config: ToggleGroupConfig = {
      type,
      defaultValue: seed,
      orientation: oneOf<ToggleGroupOrientation>(
        this.getAttribute('orientation'),
        ['horizontal', 'vertical'],
        'horizontal',
      ),
      disabled: this.hasAttribute('disabled'),
      required: this.hasAttribute('required'),
      name: this.getAttribute('name') ?? undefined,
      variant: oneOf<ToggleGroupVariant>(
        this.getAttribute('variant'),
        ['default', 'outline'],
        'default',
      ),
      size: oneOf<ToggleGroupSize>(this.getAttribute('size'), ['default', 'sm', 'lg'], 'default'),
    };
    const state = toggleGroup.initialState(config);
    const classes = toggleGroupClasses(config, state);
    const ids = {} as Record<ToggleGroupPart, string>;
    for (const part of Object.keys(toggleGroup.parts) as ToggleGroupPart[]) {
      ids[part] = `${this.uid}-${part}`;
    }

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.id = ids.root;
    root.setAttribute('role', 'group');
    root.setAttribute('data-type', type);
    if (config.name !== undefined) root.setAttribute('data-name', config.name);
    root.className = classes.root;
    applyAttrs(root, toggleGroup.aria(state, config, ids).root ?? {});
    for (const name of ['aria-label', 'aria-labelledby']) {
      const value = this.getAttribute(name);
      if (value === null) continue;
      root.setAttribute(name, value);
      this.removeAttribute(name);
    }

    for (const source of Array.from(this.querySelectorAll(':scope > [data-part="item"]'))) {
      const value = source.getAttribute('value');
      if (value === null) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-part', 'item');
      button.setAttribute('data-value', value);
      button.setAttribute('data-roving-item', '');
      button.disabled = Boolean(config.disabled) || source.hasAttribute('disabled');
      button.className = classes.item;
      applyAttrs(button, toggleItemAria(value, state, config));
      button.append(...Array.from(source.childNodes));
      root.appendChild(button);
      source.remove();
    }

    this.appendChild(root);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-toggle-group')) {
  customElements.define('rafters-toggle-group', RaftersToggleGroup);
}
