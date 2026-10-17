/**
 * Dropdown selection component with search and accessibility features
 *
 * @cognitive-load 5/10 - Option selection with search functionality requires cognitive processing
 * @attention-economics State management: closed=compact display, open=full options, searching=filtered results
 * @trust-building Search functionality, clear selection indication, undo patterns for accidental selections
 * @accessibility Keyboard navigation, screen reader announcements, focus management, option grouping
 * @semantic-meaning Option structure: value=data, label=display, group=categorization, disabled=unavailable choices
 *
 * @usage-patterns
 * DO: Use 3-12 choices for optimal cognitive load
 * DO: Provide clear, descriptive option text
 * DO: Pre-select most common/safe option when appropriate
 * DO: Enable search for 8+ options to reduce cognitive load
 * NEVER: Too many options without grouping, unclear option descriptions
 *
 * @example
 * ```tsx
 * // shadcn-compatible usage (drop-in replacement)
 * import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@rafters/ui';
 *
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Choose option..." />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="option1">Option 1</SelectItem>
 *     <SelectItem value="option2">Option 2</SelectItem>
 *   </SelectContent>
 * </Select>
 *
 * // Or with namespaced imports
 * <Select>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Choose option..." />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Item value="option1">Option 1</Select.Item>
 *     <Select.Item value="option2">Option 2</Select.Item>
 *   </Select.Content>
 * </Select>
 * ```
 */

/**
 * <rafters-select> -- the Web Component performance of the select score. A
 * decorator over the behavior: it adds the view (`select.classes.ts`) and the
 * custom-element wiring, then calls the same `bindSelect` the Astro script
 * calls, on the microtask after `connectedCallback`. Light DOM only: no shadow
 * root, no portal, no collision positioning.
 *
 * The author writes select.tsx's sub-components as `data-part` markup and the
 * element renders the tree select.tsx renders around it.
 *
 * ```html
 * <rafters-select name="fruit" value="b">
 *   <button data-part="trigger" aria-label="Fruit">
 *     <svg slot="start-icon"></svg>
 *     <span data-part="value" placeholder="Pick"></span>
 *   </button>
 *   <div data-part="content">
 *     <div data-part="group">
 *       <div data-part="label">Fruit</div>
 *       <div data-part="item" value="a">Apple</div>
 *       <div data-part="item" value="b"><svg slot="end-icon"></svg>Banana</div>
 *       <div data-part="separator"></div>
 *       <div data-part="item" value="c" disabled>Cherry</div>
 *     </div>
 *   </div>
 * </rafters-select>
 * ```
 *
 * Sub-components: trigger, value, portal (a pass-through), content, viewport,
 * group, label, item, separator, scrollUpButton, scrollDownButton, icon.
 * Config is the host's attributes: `value` (the seed), `disabled`, `name`.
 */
import {
  bindSelect,
  formValueAttrs,
  select,
  type SelectConfig,
  type SelectIconPart,
} from './select.behavior';
import { selectClasses, type SelectClassSet } from './select.classes';

const SVG_NS = 'http://www.w3.org/2000/svg';

let instanceCount = 0;

function svgIcon(className: string, ...shapes: Element[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  svg.append(...shapes);
  return svg;
}

function pathIcon(className: string, d: string): SVGSVGElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  return svgIcon(className, path);
}

function checkIcon(): SVGSVGElement {
  const polyline = document.createElementNS(SVG_NS, 'polyline');
  polyline.setAttribute('points', '20 6 9 17 4 12');
  return svgIcon('', polyline);
}

function hasChildWithClass(el: Element, className: string): boolean {
  return Array.from(el.children).some((child) => child.getAttribute('class') === className);
}

/** Wrap the direct `slot` children of `el` in one decorative icon wrapper. */
function wrapIcons(
  el: HTMLElement,
  slot: string,
  part: SelectIconPart,
  className: string,
): HTMLElement | null {
  const nodes = Array.from(el.querySelectorAll(`:scope > [slot="${slot}"]`));
  if (nodes.length === 0) return null;
  const wrapper = document.createElement('span');
  wrapper.dataset['part'] = part;
  wrapper.dataset['icon'] = part === 'startIcon' ? 'inline-start' : 'inline-end';
  wrapper.className = className;
  wrapper.setAttribute('aria-hidden', 'true');
  nodes[0]?.before(wrapper);
  wrapper.append(...nodes);
  return wrapper;
}

export class RaftersSelect extends HTMLElement {
  private teardown: (() => void) | null = null;
  private connection = 0;

  connectedCallback(): void {
    // connectedCallback can fire before the light-DOM children parse: bind on
    // the next microtask.
    const connection = ++this.connection;
    queueMicrotask(() => {
      if (connection !== this.connection || !this.isConnected) return;
      this.release();
      this.decorate();
      this.teardown = bindSelect(this);
    });
  }

  disconnectedCallback(): void {
    this.connection++;
    this.release();
  }

  private release(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private findPart(name: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(`[data-part="${name}"]`);
  }

  private decorate(): void {
    const disabled = this.hasAttribute('disabled') || this.dataset['disabled'] === '';
    const name = this.getAttribute('name') ?? undefined;
    const value = this.getAttribute('value') ?? '';
    const config: SelectConfig = { defaultValue: value, disabled, name };
    const classes = selectClasses(config, select.initialState(config));

    this.dataset['part'] = 'root';
    if (!this.id) this.id = `rafters-select-${++instanceCount}`;

    const trigger = this.findPart('trigger');
    const content = this.findPart('content');
    if (trigger) this.decorateTrigger(trigger, disabled, classes);
    if (content) this.decorateContent(content, classes);

    const valueEl = this.findPart('value');
    if (valueEl) {
      valueEl.className = classes.value;
      const placeholder = valueEl.getAttribute('placeholder');
      if (placeholder !== null && valueEl.dataset['placeholder'] === undefined) {
        valueEl.dataset['placeholder'] = placeholder;
      }
    }

    for (const item of this.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      this.decorateItem(item, classes);
    }
    this.decorateSimple('viewport', classes.viewport);
    this.decorateSimple('group', classes.group, { role: 'group' });
    this.decorateSimple('label', classes.label);
    this.decorateSimple('separator', classes.separator, { 'aria-hidden': 'true' });
    this.decorateScroll('scrollUpButton', classes, 'm18 15-6-6-6 6');
    this.decorateScroll('scrollDownButton', classes, 'm6 9 6 6 6-6');
    this.decorateSimple('icon', '', { 'aria-hidden': 'true' });

    // Form association: the hidden input is the submission path. It carries no
    // `disabled`, so a disabled select still submits its value.
    const hidden = formValueAttrs({ name, value });
    if (hidden && !this.querySelector('input[data-part="hidden-input"]')) {
      const input = document.createElement('input');
      input.dataset['part'] = 'hidden-input';
      input.type = hidden.type;
      input.name = hidden.name;
      input.value = hidden.value;
      this.append(input);
    }
  }

  private decorateTrigger(trigger: HTMLElement, disabled: boolean, classes: SelectClassSet): void {
    if (!trigger.id) trigger.id = `${this.id}-trigger`;
    trigger.className = classes.trigger;
    if (trigger instanceof HTMLButtonElement) {
      trigger.type = 'button';
      trigger.disabled = disabled;
    }
    const start = wrapIcons(trigger, 'start-icon', 'startIcon', classes.triggerStartIcon);
    if (start) trigger.prepend(start);
    const end = wrapIcons(trigger, 'end-icon', 'endIcon', classes.triggerEndIcon);
    if (!hasChildWithClass(trigger, classes.chevron)) {
      trigger.append(pathIcon(classes.chevron, 'm6 9 6 6 6-6'));
    }
    if (end) trigger.lastElementChild?.before(end);
  }

  private decorateContent(content: HTMLElement, classes: SelectClassSet): void {
    if (!content.id) content.id = `${this.id}-content`;
    content.className = classes.content;
    content.hidden = content.dataset['state'] !== 'open';
    if (!content.querySelector(':scope > [data-part="viewport"]')) {
      const viewport = document.createElement('div');
      viewport.dataset['part'] = 'viewport';
      viewport.className = classes.viewport;
      viewport.append(...Array.from(content.childNodes));
      content.append(viewport);
    }
  }

  private decorateItem(item: HTMLElement, classes: SelectClassSet): void {
    const itemValue = item.getAttribute('value');
    const disabled = item.hasAttribute('disabled') || item.dataset['disabled'] === '';
    item.setAttribute('role', 'option');
    if (itemValue !== null) item.dataset['value'] = itemValue;
    item.dataset['rovingItem'] = '';
    item.className = classes.item;
    if (disabled) {
      item.dataset['disabled'] = '';
      item.setAttribute('aria-disabled', 'true');
      item.removeAttribute('tabindex');
    } else {
      item.setAttribute('tabindex', '-1');
    }
    if (hasChildWithClass(item, classes.itemIndicator)) return;

    const start = wrapIcons(item, 'start-icon', 'startIcon', classes.startIcon);
    const end = wrapIcons(item, 'end-icon', 'endIcon', classes.endIcon);
    const indicator = document.createElement('span');
    indicator.className = classes.itemIndicator;
    const text = document.createElement('span');
    text.className = classes.itemText;
    text.append(...Array.from(item.childNodes).filter((node) => node !== start && node !== end));
    // The check is always present; CSS shows it from the item data-state.
    indicator.append(checkIcon());
    item.replaceChildren(indicator);
    if (start) item.append(start);
    item.append(text);
    if (end) item.append(end);
  }

  private decorateSimple(
    part: string,
    className: string,
    attrs: Record<string, string> = {},
  ): void {
    for (const el of this.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)) {
      if (className) el.className = className;
      for (const [attr, attrValue] of Object.entries(attrs)) el.setAttribute(attr, attrValue);
    }
  }

  private decorateScroll(part: string, classes: SelectClassSet, path: string): void {
    this.decorateSimple(part, classes.scrollButton, { 'aria-hidden': 'true' });
    for (const el of this.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)) {
      if (el.childNodes.length === 0) el.append(pathIcon(classes.scrollIcon, path));
    }
  }
}

if (!customElements.get('rafters-select')) {
  customElements.define('rafters-select', RaftersSelect);
}
