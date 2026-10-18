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
 * ```html
 * <!-- Primary action - highest attention, use once per section -->
 * <rafters-button variant="default">Save Changes</rafters-button>
 *
 * <!-- Destructive action - requires confirmation UX -->
 * <rafters-button variant="destructive">Delete Account</rafters-button>
 *
 * <!-- Loading state - prevents double submission -->
 * <rafters-button loading>Processing...</rafters-button>
 * ```
 */

/**
 * Web Component performance (controller) for button.
 *
 * Renders the same LIGHT-DOM tree button.tsx renders -- the `root` <button>,
 * the `label`, and the `spinner` / `startIcon` / `endIcon` parts when present --
 * with the classes from button.classes.ts, then hands the inner root to
 * bindButton, the SAME DOM-native controller the Astro <script> uses. The
 * element's attributes are the config, read fresh on every render; an
 * attribute change repaints the classes and re-projects the score.
 *
 * Children with `slot="start-icon"` / `slot="end-icon"` become the icon parts;
 * every other child becomes the label.
 */
import type { PartIds } from '../../lib/contract';
import {
  BUTTON_ICON_SIZES,
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

const OBSERVED = [
  'variant',
  'size',
  'type',
  'disabled',
  'loading',
  'soft-disabled',
  'toggle',
  'default-pressed',
  'loading-announcement',
  'loaded-announcement',
  'aria-label',
  'aria-labelledby',
] as const;

/** Attributes that name the control. They belong on the inner <button>, not the generic host. */
const NAME_ATTRS = ['aria-label', 'aria-labelledby'] as const;

let instances = 0;

/**
 * Dev mode as bundlers define it: a production build replaces
 * `process.env.NODE_ENV` with "production"; anywhere `process` is absent the
 * reference throws, which counts as development.
 */
function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
}

function isIconSize(size: string): boolean {
  return (BUTTON_ICON_SIZES as readonly string[]).includes(size);
}

export class RaftersButton extends HTMLElement {
  static observedAttributes = [...OBSERVED];

  private root: HTMLButtonElement | null = null;
  private ids: PartIds<ButtonPart> | null = null;
  private binding: ButtonBinding | null = null;

  /** The score's config, read from the host's attributes. */
  config(): ButtonConfig {
    const variant = this.getAttribute('variant');
    const size = this.getAttribute('size');
    return {
      variant: isButtonVariant(variant) ? variant : 'default',
      size: isButtonSize(size) ? size : 'default',
      toggle: this.hasAttribute('toggle'),
      defaultPressed: this.hasAttribute('default-pressed'),
      disabled: this.hasAttribute('disabled'),
      softDisabled: this.hasAttribute('soft-disabled'),
      loading: this.hasAttribute('loading'),
      loadingAnnouncement: this.getAttribute('loading-announcement') ?? undefined,
      loadedAnnouncement: this.getAttribute('loaded-announcement') ?? undefined,
    };
  }

  connectedCallback(): void {
    // Gotcha 3 (button.md): connectedCallback can fire before the host's
    // children are parsed, so rendering and the bind wait one microtask.
    queueMicrotask(() => {
      if (!this.isConnected || this.binding) return;
      const root = this.renderParts();
      this.paint();
      this.binding = bindButton(root, () => this.config());
      this.warnIfUnnamed();
    });
  }

  disconnectedCallback(): void {
    this.binding?.teardown();
    this.binding = null;
  }

  attributeChangedCallback(name: string): void {
    if (!this.root) return;
    this.paint();
    this.binding?.refresh();
    if (name === 'size') this.warnIfUnnamed();
  }

  /**
   * Builds the tree once and keeps it. A reconnect, or a tree restored from a
   * snapshot, already holds the root, so it is reused rather than wrapped again.
   */
  private renderParts(): HTMLButtonElement {
    if (this.root) return this.root;
    const existing = this.querySelector<HTMLButtonElement>(':scope > button[data-part="root"]');
    if (existing) {
      this.root = existing;
      this.ids = this.partIds(existing.id.replace(/-root$/, ''));
      return existing;
    }

    const ids = this.partIds(this.id || `rafters-button-${++instances}`);
    this.ids = ids;

    const start: Node[] = [];
    const end: Node[] = [];
    const label: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      const slot = node instanceof Element ? node.getAttribute('slot') : null;
      if (slot === 'start-icon') start.push(node);
      else if (slot === 'end-icon') end.push(node);
      else label.push(node);
    }

    const root = document.createElement('button');
    root.setAttribute('data-part', 'root');
    root.id = ids.root;
    if (start.length > 0)
      root.append(this.iconPart('startIcon', 'inline-start', ids.startIcon, start));
    const labelPart = document.createElement('span');
    labelPart.setAttribute('data-part', 'label');
    labelPart.id = ids.label;
    labelPart.append(...label);
    root.append(labelPart);
    if (end.length > 0) root.append(this.iconPart('endIcon', 'inline-end', ids.endIcon, end));

    this.append(root);
    this.root = root;
    return root;
  }

  private partIds(base: string): PartIds<ButtonPart> {
    const ids = {} as PartIds<ButtonPart>;
    for (const part of Object.keys(button.parts) as ButtonPart[]) ids[part] = `${base}-${part}`;
    return ids;
  }

  private iconPart(
    part: 'startIcon' | 'endIcon',
    icon: 'inline-start' | 'inline-end',
    id: string,
    nodes: Node[],
  ): HTMLSpanElement {
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-part', part);
    wrapper.setAttribute('data-icon', icon);
    wrapper.id = id;
    for (const node of nodes) {
      if (node instanceof Element) node.removeAttribute('slot');
      wrapper.append(node);
    }
    return wrapper;
  }

  /** The view: classes, native button attributes, the name, and spinner presence. */
  private paint(): void {
    const root = this.root;
    if (!root) return;
    const config = this.config();
    const classes = buttonClasses(config, button.initialState(config));

    root.className = classes.root;
    const type = this.getAttribute('type');
    root.type = type === 'submit' || type === 'reset' ? type : 'button';
    root.disabled = config.disabled ?? false;
    for (const name of NAME_ATTRS) {
      const value = this.getAttribute(name);
      if (value === null) continue;
      root.setAttribute(name, value);
      this.removeAttribute(name);
    }

    for (const part of ['startIcon', 'endIcon'] as const) {
      const el = root.querySelector<HTMLElement>(`:scope > [data-part="${part}"]`);
      if (el) el.className = classes[part];
    }

    const spinner = root.querySelector<SVGElement>(':scope > [data-part="spinner"]');
    if (config.loading && !spinner) {
      root.prepend(this.spinner(classes.spinner, this.ids?.spinner ?? ''));
    } else if (!config.loading && spinner) {
      spinner.remove();
    } else if (spinner) {
      spinner.setAttribute('class', classes.spinner);
    }
  }

  private spinner(className: string, id: string): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('data-part', 'spinner');
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

  /** button.md: icon sizes need an accessible name; the WC cannot enforce it at compile time. */
  private warnIfUnnamed(): void {
    const root = this.root;
    if (!root || !isDevelopment()) return;
    const size = this.getAttribute('size') ?? 'default';
    if (!isIconSize(size)) return;
    if (root.hasAttribute('aria-label') || root.hasAttribute('aria-labelledby')) return;
    console.warn(
      `rafters-button: size="${size}" renders an icon-only button; give it aria-label or aria-labelledby.`,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rafters-button': RaftersButton;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
