/**
 * <rafters-container> -- Web Component layout primitive.
 *
 * Mirrors the semantics of container.tsx (size, padding, gap, background,
 * article typography, editable) using shadow-DOM-scoped CSS composed via
 * classy-wc. Auto-registers on import and is idempotent against double-define.
 *
 * Attributes:
 *  - as: 'div' | 'main' | 'section' | 'article' | 'aside' (default 'div')
 *  - size: 'sm'..'7xl' | 'full'
 *  - padding: '0' | '1' | ... | '24'
 *  - gap: same as padding scale, OR bare/empty -> derive from size
 *  - background: 'none' | 'muted' | 'accent' | 'card' | 'primary' | 'secondary'
 *  - editable: boolean (presence-based)
 *
 * No raw CSS custom-property literals here -- all token references live in
 * container.styles.ts and resolve through tokenVar().
 * Container queries are always-on via :host { container-type: inline-size }.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type ContainerBackground,
  type ContainerSize,
  type ContainerSpacing,
  containerStylesheet,
  isContainerBackground,
  isContainerSize,
  isContainerSpacing,
} from './container.styles';

export type ContainerAs = 'div' | 'main' | 'section' | 'article' | 'aside';

const ALLOWED_AS: ReadonlyArray<ContainerAs> = ['div', 'main', 'section', 'article', 'aside'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'as',
  'size',
  'padding',
  'gap',
  'background',
  'editable',
] as const;

function parseAs(value: string | null): ContainerAs {
  if (value && (ALLOWED_AS as ReadonlyArray<string>).includes(value)) {
    return value as ContainerAs;
  }
  return 'div';
}

function parseSize(value: string | null): ContainerSize | undefined {
  return isContainerSize(value) ? value : undefined;
}

function parsePadding(value: string | null): ContainerSpacing | undefined {
  return isContainerSpacing(value) ? value : undefined;
}

function parseBackground(value: string | null): ContainerBackground | undefined {
  if (!isContainerBackground(value)) return undefined;
  return value === 'none' ? undefined : value;
}

/**
 * Parse the gap attribute.
 *  - Missing attribute (null): no gap.
 *  - Bare attribute (empty string): true -> derive from size.
 *  - Spacing scale value: that value.
 *  - Unknown string: undefined (silent fallback to no gap).
 */
function parseGap(value: string | null): ContainerSpacing | true | undefined {
  if (value === null) return undefined;
  if (value === '') return true;
  return isContainerSpacing(value) ? value : undefined;
}

export class RaftersContainer extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt on every attribute change. */
  private _instanceSheet: CSSStyleSheet | null = null;

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Resolve the semantic element tag from the `as` attribute, falling back
   * to `div` for anything outside the allow-list.
   */
  getAs(): ContainerAs {
    return parseAs(this.getAttribute('as'));
  }

  /**
   * Build the CSS string for the current attribute values.
   */
  private composeCss(): string {
    const size = parseSize(this.getAttribute('size'));
    const padding = parsePadding(this.getAttribute('padding'));
    const gap = parseGap(this.getAttribute('gap'));
    const background = parseBackground(this.getAttribute('background'));
    const article = this.getAs() === 'article';
    const editable = this.hasAttribute('editable');

    return containerStylesheet({
      size,
      padding,
      gap,
      background,
      article,
      editable,
    });
  }

  /**
   * Render the inner semantic element with a single default <slot>.
   * DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const inner = document.createElement(this.getAs());
    inner.className = 'container';
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    return inner;
  }
}

if (!customElements.get('rafters-container')) {
  customElements.define('rafters-container', RaftersContainer);
}
