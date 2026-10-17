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
 * One custom element. The author writes each sub-component of combobox.tsx as
 * `data-part` markup inside the host, named after the tsx sub-component, the
 * way the other menu-collection-popup components do. The element defines no
 * child tags and reads none:
 *
 *   <rafters-combobox value="vue" aria-label="Framework">
 *     <svg slot="start-icon">...</svg>
 *     <input data-part="input" name="fw" placeholder="Search...">
 *     <div data-part="content">
 *       <div data-part="empty">No framework found.</div>
 *       <div data-part="group" heading="Frameworks">
 *         <div data-part="item" data-value="react">React</div>
 *         <div data-part="item" data-value="vue"><svg slot="start-icon">...</svg>Vue</div>
 *         <div data-part="item" data-value="ng" data-disabled>Angular</div>
 *       </div>
 *       <div data-part="separator"></div>
 *     </div>
 *   </rafters-combobox>
 *
 * The host is the root part. Its attributes are the ComboboxProps names:
 * `value` (the seed) and `disabled`. The native `<input data-part="input">` is
 * the only form field; nothing is mirrored into a hidden input. A host
 * `aria-label` or `aria-labelledby` moves to the input, the element that
 * carries the combobox role: a role-less custom element is generic, and
 * ARIA 1.2 prohibits naming one.
 *
 * Part ids come from a per-instance counter. The host assembles every part one
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
const SVG_NS = 'http://www.w3.org/2000/svg';

let rootCounter = 0;

/** The score seeded from the root's attributes, with the view for it. */
interface Scene {
  config: ComboboxConfig;
  state: ComboboxState;
  ids: PartIds<ComboboxPart>;
  classes: ComboboxClassSet;
  aria: Partial<Record<ComboboxPart, AriaAttrs>>;
}

function applyAria(el: HTMLElement, attrs: AriaAttrs | undefined): void {
  if (!attrs) return;
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  }
}

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

/** The check shows while an item is the committed one. The bind projects
 *  data-state, so the glyph follows it. */
function syncChecks(root: HTMLElement): void {
  for (const item of root.querySelectorAll<HTMLElement>('[data-part="item"]')) {
    const indicator = item.firstElementChild;
    if (!indicator) continue;
    const checked = item.getAttribute('data-state') === 'checked';
    const mounted = indicator.firstElementChild !== null;
    if (checked && !mounted) {
      indicator.appendChild(svgIcon(undefined, 'polyline', 'points', '20 6 9 17 4 12'));
    } else if (!checked && mounted) {
      indicator.replaceChildren();
    }
  }
}

/** The root part. Assembles its parts, then binds. */
export class RaftersCombobox extends HTMLElement {
  private teardown: (() => void) | null = null;
  private assembled = false;

  connectedCallback(): void {
    if (!this.id) {
      rootCounter += 1;
      this.id = `${ROOT_TAG}-${rootCounter}`;
    }
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      this.assemble();
      const stop = bindCombobox(this);
      syncChecks(this);
      const observer = new MutationObserver(() => syncChecks(this));
      observer.observe(this, { attributes: true, attributeFilter: ['data-state'], subtree: true });
      this.teardown = () => {
        observer.disconnect();
        stop();
      };
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private scene(input: HTMLElement | null, content: HTMLElement | null): Scene {
    const rootId = this.id;
    const config: ComboboxConfig = {
      disabled: this.hasAttribute('disabled') || this.dataset['disabled'] === '',
      defaultValue: this.getAttribute('value') ?? undefined,
      defaultOpen: content?.dataset['state'] === 'open',
    };
    const state = combobox.initialState(config);
    const ids = {} as PartIds<ComboboxPart>;
    for (const part of Object.keys(combobox.parts) as ComboboxPart[]) ids[part] = '';
    ids.root = rootId;
    ids.input = input?.id || `${rootId}-input`;
    ids.content = content?.id || `${rootId}-content`;
    return {
      config,
      state,
      ids,
      classes: comboboxClasses(config, state),
      aria: combobox.aria(state, config, ids),
    };
  }

  private assemble(): void {
    if (this.assembled) return;
    this.assembled = true;

    const part = (name: string): HTMLElement | null =>
      this.querySelector<HTMLElement>(`[data-part="${name}"]`);

    let input = part('input') as HTMLInputElement | null;
    if (!input) {
      input = document.createElement('input');
      input.dataset['part'] = 'input';
    }
    const content = part('content');
    const { config, state, ids, classes, aria } = this.scene(input, content);

    this.dataset['part'] = 'root';
    this.className = classes.root;
    applyAria(this, aria.root);

    // The host's name moves to the input: it carries the combobox role.
    for (const name of ['aria-label', 'aria-labelledby']) {
      const value = this.getAttribute(name);
      if (value === null) continue;
      if (!input.hasAttribute(name)) input.setAttribute(name, value);
      this.removeAttribute(name);
    }

    input.id = ids.input;
    input.type = 'text';
    input.autocomplete = 'off';
    input.disabled = config.disabled ?? false;
    input.className = classes.input;
    applyAria(input, aria.input);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.dataset['part'] = 'trigger';
    trigger.tabIndex = -1;
    trigger.className = classes.trigger;
    applyAria(trigger, aria.trigger);
    trigger.appendChild(svgIcon(classes.chevron, 'path', 'd', 'm6 9 6 6 6-6'));

    const field = document.createElement('div');
    field.dataset['part'] = 'field';
    field.className = classes.field;
    if (input.parentNode) input.replaceWith(field);
    else this.prepend(field);
    field.append(input, trigger);

    if (content) {
      content.id = ids.content;
      content.className = classes.content;
      content.hidden = !state.open;
      applyAria(content, aria.content);
    }

    const empty = part('empty');
    if (empty) {
      empty.className = classes.empty;
      empty.hidden = true;
    }

    let headingIndex = 0;
    for (const group of this.querySelectorAll<HTMLElement>('[data-part="group"]')) {
      group.setAttribute('role', 'group');
      group.className = classes.group;
      const heading = group.getAttribute('heading');
      if (heading) {
        headingIndex += 1;
        const label = document.createElement('div');
        label.id = `${ids.root}-heading-${headingIndex}`;
        label.className = classes.groupLabel;
        label.textContent = heading;
        group.prepend(label);
        group.setAttribute('aria-labelledby', label.id);
      }
    }

    for (const item of this.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const value = item.dataset['value'] ?? '';
      const icon = item.querySelector(':scope > [slot="start-icon"]');
      const indicator = document.createElement('span');
      indicator.className = classes.itemIndicator;
      const text = document.createElement('span');
      text.className = classes.itemText;
      for (const node of Array.from(item.childNodes)) {
        if (node !== icon) text.appendChild(node);
      }
      item.replaceChildren(...(icon ? [indicator, icon, text] : [indicator, text]));
      item.setAttribute('role', 'option');
      item.id = `${ids.content}-option-${value}`;
      if (item.hasAttribute('data-disabled') || item.getAttribute('aria-disabled') === 'true') {
        item.dataset['disabled'] = '';
        item.setAttribute('aria-disabled', 'true');
      }
      item.className = classes.item;
      applyAria(item, comboboxItemAria(value, state, config));
    }

    for (const separator of this.querySelectorAll<HTMLElement>('[data-part="separator"]')) {
      separator.setAttribute('aria-hidden', 'true');
      separator.className = classes.separator;
    }

    wrapComboboxIcons(this);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(ROOT_TAG)) {
  customElements.define(ROOT_TAG, RaftersCombobox);
}
