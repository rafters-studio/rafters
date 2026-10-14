/**
 * Interactive button component for user actions
 *
 * @cognitive-load 3/10 - Simple action trigger with clear visual hierarchy
 * @attention-economics Size hierarchy: sm=tertiary actions, default=secondary interactions, lg=primary calls-to-action. Primary variant commands highest attention - use sparingly (maximum 1 per section)
 * @trust-building Destructive actions require confirmation patterns. Loading states prevent double-submission. Visual feedback reinforces user actions.
 * @accessibility WCAG AAA compliant with 44px minimum touch targets, high contrast ratios, and screen reader optimization
 * @semantic-meaning Variant mapping: default=main actions, secondary=supporting actions, destructive=irreversible actions with safety patterns
 *
 * @usage-patterns
 * DO: Primary: Main user goal, maximum 1 per section
 * DO: Secondary: Alternative paths, supporting actions
 * DO: Destructive: Permanent actions, requires confirmation patterns
 * NEVER: Multiple primary buttons competing for attention
 *
 * @example
 * ```tsx
 * // Primary action - highest attention, use once per section
 * <Button variant="default">Save Changes</Button>
 *
 * // Destructive action - requires confirmation UX
 * <Button variant="destructive">Delete Account</Button>
 *
 * // Loading state - prevents double submission
 * <Button loading>Processing...</Button>
 * ```
 */

/**
 * WC performance for button: a decorator over the behavior, like button.tsx and
 * button.astro. It adds the view (button.classes.ts) and the custom-element
 * wiring, and nothing else.
 *
 * `<rafters-button variant="destructive">Delete</rafters-button>` renders the
 * same light-DOM parts the React and Astro performances render: a native
 * <button data-part="root"> with its classes and the score's projection, the
 * spinner while loading, the label holding the author's children, and the
 * decorative icon wrappers for children marked `slot="start-icon"` /
 * `slot="end-icon"`. Native Enter/Space activation and form submission come
 * from that inner <button>. The behavior is bindButton, the same client the
 * Astro <script> calls, here fed the element's own attributes as config.
 */
import type { PartIds } from '../../lib/contract';
import {
  bindButton,
  button,
  isButtonSize,
  isButtonVariant,
  type ButtonBinding,
  type ButtonConfig,
  type ButtonPart,
} from './button.behavior';
import { buttonClasses } from './button.classes';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BUTTON_TYPES = ['button', 'submit', 'reset'] as const;
let instance = 0;

export class RaftersButton extends HTMLElement {
  static observedAttributes = [
    'variant',
    'size',
    'type',
    'toggle',
    'pressed',
    'disabled',
    'soft-disabled',
    'loading',
    'loading-announcement',
    'aria-label',
  ];

  private readonly uid = `rafters-button-${++instance}`;
  private root: HTMLButtonElement | null = null;
  private binding: ButtonBinding | null = null;

  private config(): ButtonConfig {
    const variant = this.getAttribute('variant');
    const size = this.getAttribute('size');
    return {
      variant: isButtonVariant(variant) ? variant : 'default',
      size: isButtonSize(size) ? size : 'default',
      toggle: this.hasAttribute('toggle'),
      defaultPressed: this.hasAttribute('pressed'),
      disabled: this.hasAttribute('disabled'),
      softDisabled: this.hasAttribute('soft-disabled'),
      loading: this.hasAttribute('loading'),
      loadingAnnouncement: this.getAttribute('loading-announcement') ?? undefined,
    };
  }

  private ids(): PartIds<ButtonPart> {
    const ids = {} as PartIds<ButtonPart>;
    for (const part of Object.keys(button.parts) as ButtonPart[]) ids[part] = `${this.uid}-${part}`;
    return ids;
  }

  connectedCallback(): void {
    // Gotcha 3 (05-authoring): connectedCallback can fire before the element's
    // children are parsed, so the parts are built one microtask later.
    queueMicrotask(() => {
      if (!this.isConnected) return;
      if (!this.root) this.render();
      if (this.root && !this.binding) this.binding = bindButton(this.root, () => this.config());
    });
  }

  disconnectedCallback(): void {
    this.binding?.teardown();
    this.binding = null;
  }

  attributeChangedCallback(): void {
    if (!this.root) return;
    this.paint();
    this.binding?.refresh();
  }

  /** Build the parts once, moving the author's children into them. */
  private render(): void {
    const ids = this.ids();
    const root = document.createElement('button');
    root.dataset['part'] = 'root';
    root.id = ids.root;

    const label = document.createElement('span');
    label.dataset['part'] = 'label';
    label.id = ids.label;

    const icons: Partial<Record<'startIcon' | 'endIcon', HTMLSpanElement>> = {};
    for (const node of Array.from(this.childNodes)) {
      const slot = node instanceof Element ? node.getAttribute('slot') : null;
      const part = slot === 'start-icon' ? 'startIcon' : slot === 'end-icon' ? 'endIcon' : null;
      if (part && node instanceof Element) {
        const wrapper = document.createElement('span');
        wrapper.dataset['part'] = part;
        wrapper.dataset['icon'] = part === 'startIcon' ? 'inline-start' : 'inline-end';
        wrapper.id = ids[part];
        node.removeAttribute('slot');
        wrapper.append(node);
        icons[part] = wrapper;
      } else {
        label.append(node);
      }
    }

    root.append(...[icons.startIcon, label, icons.endIcon].filter((el) => el !== undefined));
    this.append(root);
    this.root = root;
    this.paint();
  }

  /** Apply the view for the current attributes: classes, native attributes, spinner. */
  private paint(): void {
    const root = this.root;
    if (!root) return;
    const config = this.config();
    const ids = this.ids();
    const classes = buttonClasses(config, button.initialState(config));
    const type = this.getAttribute('type');

    root.className = classes.root;
    root.type = (BUTTON_TYPES as ReadonlyArray<string>).includes(type ?? '')
      ? (type as HTMLButtonElement['type'])
      : 'button';
    root.disabled = config.disabled ?? false;
    const ariaLabel = this.getAttribute('aria-label');
    if (ariaLabel === null) root.removeAttribute('aria-label');
    else root.setAttribute('aria-label', ariaLabel);
    if (config.loadingAnnouncement)
      root.dataset['loadingAnnouncement'] = config.loadingAnnouncement;
    else delete root.dataset['loadingAnnouncement'];
    for (const part of ['startIcon', 'endIcon'] as const) {
      const wrapper = root.querySelector<HTMLElement>(`[data-part="${part}"]`);
      if (wrapper) wrapper.className = classes[part];
    }

    const spinner = root.querySelector('[data-part="spinner"]');
    if (config.loading && !spinner) root.prepend(this.spinner(ids.spinner, classes.spinner));
    if (!config.loading && spinner) spinner.remove();
  }

  private spinner(id: string, className: string): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.dataset['part'] = 'spinner';
    svg.id = id;
    svg.setAttribute('class', className);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M21 12a9 9 0 1 1-6.219-8.56');
    svg.append(path);
    return svg;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
