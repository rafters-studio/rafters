/**
 * <rafters-badge> Web Component
 *
 * Framework-target for the Badge component, parallel to badge.tsx (React)
 * and badge.astro (Astro). Consumes badgeStylesheet() from badge.styles.ts
 * to guarantee visual parity across framework targets.
 *
 * Shadow DOM structure:
 *   <span class="badge"><slot></slot></span>
 *
 * Attributes:
 *   variant  default | primary | secondary | destructive | success | warning
 *            | info | muted | accent | outline | ghost
 *   size     sm | default | lg
 *
 * Unknown attribute values fall back to 'default' silently. This matches the
 * React target's runtime behaviour of `badgeVariantClasses[variant] ?? default`.
 *
 * @cognitive-load 2/10
 * @accessibility Semantic generic span, slotted text remains in the light tree.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type BadgeSize, type BadgeVariant, badgeStylesheet } from './badge.styles';

const BADGE_VARIANTS: ReadonlyArray<BadgeVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
];

const BADGE_SIZES: ReadonlyArray<BadgeSize> = ['sm', 'default', 'lg'];

function isBadgeVariant(value: string | null): value is BadgeVariant {
  if (value === null) return false;
  for (const v of BADGE_VARIANTS) {
    if (v === value) return true;
  }
  return false;
}

function isBadgeSize(value: string | null): value is BadgeSize {
  if (value === null) return false;
  for (const s of BADGE_SIZES) {
    if (s === value) return true;
  }
  return false;
}

export class RaftersBadge extends RaftersElement {
  static override styles = badgeStylesheet();

  static readonly observedAttributes: ReadonlyArray<string> = ['variant', 'size'];

  private composeStyles(): string {
    const rawVariant = this.getAttribute('variant');
    const rawSize = this.getAttribute('size');
    const variant: BadgeVariant = isBadgeVariant(rawVariant) ? rawVariant : 'default';
    const size: BadgeSize = isBadgeSize(rawSize) ? rawSize : 'default';
    const css = badgeStylesheet({ variant, size });
    (this.constructor as typeof RaftersBadge).styles = css;
    return css;
  }

  override connectedCallback(): void {
    this.composeStyles();
    super.connectedCallback();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (name === 'variant' || name === 'size') {
      const css = this.composeStyles();
      const root = this.shadowRoot;
      if (root) {
        const sheets: CSSStyleSheet[] = [];
        for (const existing of root.adoptedStyleSheets) {
          sheets.push(existing);
        }
        const componentSheet = new CSSStyleSheet();
        componentSheet.replaceSync(css);
        // Replace the last sheet (component sheet) if one exists; otherwise append.
        if (sheets.length > 0) {
          sheets[sheets.length - 1] = componentSheet;
        } else {
          sheets.push(componentSheet);
        }
        root.adoptedStyleSheets = sheets;
      }
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }

  override render(): Node {
    const span = document.createElement('span');
    span.className = 'badge';
    const slot = document.createElement('slot');
    span.appendChild(slot);
    return span;
  }
}

if (!customElements.get('rafters-badge')) {
  customElements.define('rafters-badge', RaftersBadge);
}
