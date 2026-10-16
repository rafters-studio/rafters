/**
 * Combobox component for searchable selection with typeahead filtering
 *
 * @cognitive-load 6/10 - Combines input + dropdown; requires typing and visual scanning
 * @attention-economics Medium-high attention: keyboard input, list scanning, selection confirmation
 * @trust-building Immediate filtering feedback, clear match highlighting, keyboard accessible
 * @accessibility Full ARIA combobox pattern, listbox role, option roles, live region announcements
 * @semantic-meaning Filtered selection: choosing from large datasets, typeahead search
 *
 * @usage-patterns
 * DO: Use for selection from large option sets (>10 items)
 * DO: Provide clear empty state and no-results messaging
 * DO: Support both mouse and keyboard selection
 * DO: Highlight matching text in filtered results
 * DO: Allow clearing the selection
 * NEVER: Use for small option sets (<5 items) - use Select instead
 * NEVER: Require exact match when approximate would help
 * NEVER: Hide the clear button when a selection exists
 *
 * @example
 * ```tsx
 * <Combobox value={value} onValueChange={setValue}>
 *   <Combobox.Input placeholder="Select framework..." />
 *   <Combobox.Content>
 *     <Combobox.Empty>No framework found.</Combobox.Empty>
 *     <Combobox.Group>
 *       <Combobox.Item value="react">React</Combobox.Item>
 *       <Combobox.Item value="vue">Vue</Combobox.Item>
 *       <Combobox.Item value="angular">Angular</Combobox.Item>
 *     </Combobox.Group>
 *   </Combobox.Content>
 * </Combobox>
 * ```
 */

/**
 * Web Component performance for combobox, in light DOM. The score AND the
 * DOM-native binding (bindCombobox) live in combobox.behavior.ts, shared with
 * the React and Astro performances. This file adds the view
 * (combobox.classes.ts) and the custom-element wiring, and nothing else.
 *
 * Written in plain HTML, the way combobox.tsx composes:
 *
 *   <rafters-combobox value="vue">
 *     <svg slot="start-icon">...</svg>
 *     <rafters-combobox-input aria-label="Framework" name="fw" placeholder="Search...">
 *     </rafters-combobox-input>
 *     <rafters-combobox-content>
 *       <rafters-combobox-empty>No framework found.</rafters-combobox-empty>
 *       <rafters-combobox-group heading="Frameworks">
 *         <rafters-combobox-item value="react">React</rafters-combobox-item>
 *         <rafters-combobox-item value="vue"><svg slot="start-icon">...</svg>Vue
 *         </rafters-combobox-item>
 *       </rafters-combobox-group>
 *       <rafters-combobox-separator></rafters-combobox-separator>
 *     </rafters-combobox-content>
 *   </rafters-combobox>
 *
 * The host is the root part. Its attributes are the ComboboxProps names: `value`
 * (the seed) and `disabled`. Content, empty, group, item and separator are each
 * the part they name; the input element holds the field, the native input and
 * the toggle, and forwards its own attributes (`placeholder`, `name`,
 * `aria-label`, ...) to the native input, which is the only form field. Nothing
 * is mirrored into a hidden input.
 *
 * Part ids come from a per-instance counter. The root assembles every part one
 * microtask after connecting (connectedCallback can fire before the light-DOM
 * children are parsed), then hands itself to bindCombobox.
 */
import type { AriaAttrs, PartIds } from '../../lib/contract';
import {
  bindCombobox,
  combobox,
  comboboxItemAria,
  wrapComboboxIcons,
  type ComboboxConfig,
  type ComboboxPart,
  type ComboboxState,
} from './combobox.behavior';
import { comboboxClasses, type ComboboxClassSet } from './combobox.classes';

const ROOT_TAG = 'rafters-combobox';
const PART_SELECTOR = [
  'rafters-combobox-input',
  'rafters-combobox-content',
  'rafters-combobox-empty',
  'rafters-combobox-group',
  'rafters-combobox-item',
  'rafters-combobox-separator',
].join(',');

let rootCounter = 0;
let headingCounter = 0;

interface Assemblable {
  assemble(): void;
}

function isAssemblable(el: Element): el is Element & Assemblable {
  return 'assemble' in el && typeof el.assemble === 'function';
}

/** The score seeded from the root's attributes, with the view for it. */
interface Scene {
  config: ComboboxConfig;
  state: ComboboxState;
  ids: PartIds<ComboboxPart>;
  classes: ComboboxClassSet;
  aria: Partial<Record<ComboboxPart, AriaAttrs>>;
}

function ensureId(root: HTMLElement): string {
  if (!root.id) {
    rootCounter += 1;
    root.id = `${ROOT_TAG}-${rootCounter}`;
  }
  return root.id;
}

function sceneOf(root: HTMLElement): Scene {
  const rootId = ensureId(root);
  const content = root.querySelector<HTMLElement>('rafters-combobox-content');
  const config: ComboboxConfig = {
    disabled: root.hasAttribute('disabled') || root.dataset['disabled'] === '',
    defaultValue: root.getAttribute('value') ?? undefined,
    defaultOpen: content?.dataset['state'] === 'open',
  };
  const state = combobox.initialState(config);
  const ids = {} as PartIds<ComboboxPart>;
  for (const part of Object.keys(combobox.parts) as ComboboxPart[]) ids[part] = '';
  ids.root = rootId;
  ids.input =
    root.querySelector<HTMLElement>('[data-part="input"]')?.id ||
    root.querySelector<HTMLElement>('rafters-combobox-input')?.id ||
    `${rootId}-input`;
  ids.content = content?.id || `${rootId}-content`;
  return {
    config,
    state,
    ids,
    classes: comboboxClasses(config, state),
    aria: combobox.aria(state, config, ids),
  };
}

function rootOf(el: HTMLElement, component: string): HTMLElement {
  const root = el.closest<HTMLElement>(ROOT_TAG);
  if (!root) throw new Error(`${component} must be used within <${ROOT_TAG}>`);
  return root;
}

function applyAria(el: HTMLElement, attrs: AriaAttrs | undefined): void {
  if (!attrs) return;
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A decorative 24x24 stroke icon: the chevron and the check. */
function svgIcon(
  className: string | undefined,
  tag: 'path' | 'polyline',
  attr: string,
  value: string,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const shape = document.createElementNS(SVG_NS, tag);
  shape.setAttribute(attr, value);
  svg.appendChild(shape);
  return svg;
}

/** The root part. Assembles its parts, then binds. */
export class RaftersCombobox extends HTMLElement {
  private teardown: (() => void) | null = null;
  private assembled = false;

  connectedCallback(): void {
    ensureId(this);
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      this.assemble();
      this.teardown = bindCombobox(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private assemble(): void {
    if (this.assembled) return;
    this.assembled = true;
    const { classes, aria } = sceneOf(this);
    this.dataset['part'] = 'root';
    this.className = classes.root;
    applyAria(this, aria.root);
    for (const part of this.querySelectorAll(PART_SELECTOR)) {
      if (isAssemblable(part)) part.assemble();
    }
    wrapComboboxIcons(this);
  }
}

/** The field: the native input, the optional start icon and the toggle. */
export class RaftersComboboxInput extends HTMLElement implements Assemblable {
  private assembled = false;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected) this.assemble();
    });
  }

  assemble(): void {
    if (this.assembled) return;
    const root = rootOf(this, 'rafters-combobox-input');
    this.assembled = true;
    const { config, ids, classes, aria } = sceneOf(root);

    const input = document.createElement('input');
    input.dataset['part'] = 'input';
    input.id = ids.input;
    input.type = 'text';
    input.autocomplete = 'off';
    input.disabled = config.disabled ?? false;
    input.className = classes.input;
    applyAria(input, aria.input);
    // The host's own attributes are the ComboboxInput props: they belong on the
    // native input, the only field.
    for (const { name, value } of Array.from(this.attributes)) {
      if (name === 'class' || name === 'slot' || name === 'style' || name === 'data-part') continue;
      input.setAttribute(name, value);
      this.removeAttribute(name);
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.dataset['part'] = 'trigger';
    trigger.tabIndex = -1;
    trigger.className = classes.trigger;
    applyAria(trigger, aria.trigger);
    trigger.appendChild(svgIcon(classes.chevron, 'path', 'd', 'm6 9 6 6 6-6'));

    this.dataset['part'] = 'field';
    this.className = classes.field;
    this.replaceChildren(input, trigger);
  }
}

/** The listbox. Present in light DOM, hidden when closed. */
export class RaftersComboboxContent extends HTMLElement implements Assemblable {
  private assembled = false;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected) this.assemble();
    });
  }

  assemble(): void {
    if (this.assembled) return;
    const root = rootOf(this, 'rafters-combobox-content');
    this.assembled = true;
    const { state, ids, classes, aria } = sceneOf(root);
    this.dataset['part'] = 'content';
    this.id = ids.content;
    this.className = classes.content;
    this.hidden = !state.open;
    applyAria(this, aria.content);
  }
}

/** The no-results message. The bind shows it when the filter empties. */
export class RaftersComboboxEmpty extends HTMLElement implements Assemblable {
  private assembled = false;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected) this.assemble();
    });
  }

  assemble(): void {
    if (this.assembled) return;
    const root = rootOf(this, 'rafters-combobox-empty');
    this.assembled = true;
    this.dataset['part'] = 'empty';
    this.className = sceneOf(root).classes.empty;
    this.hidden = true;
  }
}

/** A labelled group of options. */
export class RaftersComboboxGroup extends HTMLElement implements Assemblable {
  private assembled = false;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected) this.assemble();
    });
  }

  assemble(): void {
    if (this.assembled) return;
    const root = rootOf(this, 'rafters-combobox-group');
    this.assembled = true;
    const { classes } = sceneOf(root);
    this.setAttribute('role', 'group');
    this.className = classes.group;
    const heading = this.getAttribute('heading');
    if (heading) {
      headingCounter += 1;
      const label = document.createElement('div');
      label.id = `${ensureId(root)}-heading-${headingCounter}`;
      label.className = classes.groupLabel;
      label.textContent = heading;
      this.prepend(label);
      this.setAttribute('aria-labelledby', label.id);
    }
  }
}

/** One option. Its text is the label; a `slot="start-icon"` child is its icon. */
export class RaftersComboboxItem extends HTMLElement implements Assemblable {
  static readonly observedAttributes: ReadonlyArray<string> = ['data-state'];

  private assembled = false;
  private indicator: HTMLElement | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected) this.assemble();
    });
  }

  // The check shows while the item is the committed one. The bind projects
  // data-state, so the glyph follows it.
  attributeChangedCallback(): void {
    this.syncCheck();
  }

  private syncCheck(): void {
    if (!this.indicator) return;
    const checked = this.getAttribute('data-state') === 'checked';
    const mounted = this.indicator.firstElementChild !== null;
    if (checked && !mounted) {
      this.indicator.appendChild(svgIcon(undefined, 'polyline', 'points', '20 6 9 17 4 12'));
    } else if (!checked && mounted) {
      this.indicator.replaceChildren();
    }
  }

  assemble(): void {
    if (this.assembled) return;
    const root = rootOf(this, 'rafters-combobox-item');
    this.assembled = true;
    const { config, state, ids, classes } = sceneOf(root);
    const value = this.getAttribute('value') ?? '';

    const icon = this.querySelector(':scope > [slot="start-icon"]');
    const indicator = document.createElement('span');
    indicator.className = classes.itemIndicator;
    const text = document.createElement('span');
    text.className = classes.itemText;
    for (const node of Array.from(this.childNodes)) {
      if (node !== icon) text.appendChild(node);
    }
    this.replaceChildren(...(icon ? [indicator, icon, text] : [indicator, text]));
    this.indicator = indicator;

    this.setAttribute('role', 'option');
    this.dataset['part'] = 'item';
    this.id = `${ids.content}-option-${value}`;
    this.dataset['value'] = value;
    if (this.hasAttribute('disabled')) {
      this.dataset['disabled'] = '';
      this.setAttribute('aria-disabled', 'true');
    }
    this.className = classes.item;
    applyAria(this, comboboxItemAria(value, state, config));
    this.syncCheck();
    wrapComboboxIcons(root);
  }
}

/** A rule between options. */
export class RaftersComboboxSeparator extends HTMLElement implements Assemblable {
  private assembled = false;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected) this.assemble();
    });
  }

  assemble(): void {
    if (this.assembled) return;
    const root = rootOf(this, 'rafters-combobox-separator');
    this.assembled = true;
    this.setAttribute('aria-hidden', 'true');
    this.className = sceneOf(root).classes.separator;
  }
}

// The root registers first, so it connects before the parts it assembles.
const ELEMENTS: ReadonlyArray<readonly [string, CustomElementConstructor]> = [
  [ROOT_TAG, RaftersCombobox],
  ['rafters-combobox-input', RaftersComboboxInput],
  ['rafters-combobox-content', RaftersComboboxContent],
  ['rafters-combobox-empty', RaftersComboboxEmpty],
  ['rafters-combobox-group', RaftersComboboxGroup],
  ['rafters-combobox-item', RaftersComboboxItem],
  ['rafters-combobox-separator', RaftersComboboxSeparator],
];

if (typeof customElements !== 'undefined') {
  for (const [tag, ctor] of ELEMENTS) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
