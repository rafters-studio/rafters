/**
 * <rafters-card> Web Component
 *
 * Third framework target alongside card.tsx (React) and card.astro (Astro).
 * Consumes the shared cardStylesheet() from card.styles.ts. Auto-registers
 * on import; registration is idempotent under HMR and double-import.
 *
 * Structure: single .card wrapper containing named slots for header,
 * action, content, footer, plus a default slot for unnamed children.
 *
 * Attributes:
 * - interactive: boolean (presence-based). When present, applies hover and
 *   focus-visible rules, sets tabindex="0" and role="button" on the host
 *   (unless consumer already provided them), and dispatches a bubbling,
 *   composed 'rafters-card-activate' CustomEvent on Enter or Space.
 * - background: CardBackground (none | muted | accent | card | primary |
 *   secondary). Unknown values fall back to 'card' silently.
 *
 * NEVER: import React, Astro, nanostores, Tailwind; use var() directly
 * in this file; inline CSS strings -- all styles come from cardStylesheet().
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type CardBackground, cardStylesheet } from './card.styles';

const BACKGROUNDS: ReadonlyArray<CardBackground> = [
  'none',
  'muted',
  'accent',
  'card',
  'primary',
  'secondary',
];

function parseBackground(value: string | null): CardBackground {
  return (BACKGROUNDS as ReadonlyArray<string>).includes(value ?? '')
    ? (value as CardBackground)
    : 'card';
}

export class RaftersCard extends RaftersElement {
  static observedAttributes = ['interactive', 'background'];

  constructor() {
    super();
    this.addEventListener('keydown', this.handleKeydown);
  }

  override connectedCallback(): void {
    this.applyStyles();
    this.applyInteractiveDom();
    super.connectedCallback();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.applyStyles();
    this.applyInteractiveDom();
    super.attributeChangedCallback(name, oldValue, newValue);
  }

  private applyStyles(): void {
    const interactive = this.hasAttribute('interactive');
    const background = parseBackground(this.getAttribute('background'));
    (this.constructor as typeof RaftersElement).styles = cardStylesheet({
      interactive,
      background,
    });
  }

  private applyInteractiveDom(): void {
    if (this.hasAttribute('interactive')) {
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    } else {
      if (this.getAttribute('tabindex') === '0') this.removeAttribute('tabindex');
      if (this.getAttribute('role') === 'button') this.removeAttribute('role');
    }
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (!this.hasAttribute('interactive')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('rafters-card-activate', { bubbles: true, composed: true }));
  };

  override render(): Node {
    const root = document.createElement('div');
    root.className = 'card';

    const header = document.createElement('div');
    header.className = 'card-header';
    const headerSlot = document.createElement('slot');
    headerSlot.setAttribute('name', 'header');
    header.appendChild(headerSlot);

    const action = document.createElement('div');
    action.className = 'card-action';
    const actionSlot = document.createElement('slot');
    actionSlot.setAttribute('name', 'action');
    action.appendChild(actionSlot);

    const content = document.createElement('div');
    content.className = 'card-content';
    const contentSlot = document.createElement('slot');
    contentSlot.setAttribute('name', 'content');
    content.appendChild(contentSlot);

    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const footerSlot = document.createElement('slot');
    footerSlot.setAttribute('name', 'footer');
    footer.appendChild(footerSlot);

    const defaultSlot = document.createElement('slot');

    root.appendChild(header);
    root.appendChild(action);
    root.appendChild(content);
    root.appendChild(footer);
    root.appendChild(defaultSlot);

    return root;
  }
}

if (!customElements.get('rafters-card')) {
  customElements.define('rafters-card', RaftersCard);
}
