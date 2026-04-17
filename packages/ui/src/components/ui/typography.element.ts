/**
 * <rafters-typography> -- token-aware typography Web Component
 *
 * Renders any of 17 variants (h1-h4, p, lead, large, small, muted, code,
 * blockquote, ul, ol, li, codeblock, mark, abbr) inside shadow DOM.
 *
 * The variant attribute drives both the rendered tag AND the composite role
 * (see variantToCompositeRole in ./typography.styles). TypographyTokenProps
 * attributes (size/weight/color/line/tracking/family/align/transform) override
 * variant defaults by injecting bare token references into the shadow stylesheet.
 *
 * Auto-registers as 'rafters-typography' on import. Registration is idempotent.
 * Unknown variants silently fall back to 'p' -- NEVER throws.
 *
 * DOM is built via document.createElement / appendChild. No innerHTML.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  resolveVariant,
  type TypographyTokenOverrides,
  type TypographyVariant,
  typographyStylesheet,
  variantToTag,
} from './typography.styles';

// ============================================================================
// Observed Attributes
// ============================================================================

/** Attribute names that map to TypographyTokenOverrides keys. */
const OVERRIDE_ATTRIBUTES = [
  'size',
  'weight',
  'color',
  'line',
  'tracking',
  'family',
  'align',
  'transform',
] as const;

type OverrideAttribute = (typeof OVERRIDE_ATTRIBUTES)[number];

/** All attributes the element observes. Variant is first; overrides follow. */
const OBSERVED_ATTRIBUTES = ['variant', ...OVERRIDE_ATTRIBUTES] as const;

// ============================================================================
// Component
// ============================================================================

export class RaftersTypography extends RaftersElement {
  static observedAttributes: readonly string[] = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet carrying the variant + overrides CSS. */
  private _instanceSheet: CSSStyleSheet | null = null;

  /**
   * Read all TypographyTokenOverrides attributes off the element, omitting
   * absent entries so tokenOverridesToProperties skips them cleanly.
   */
  private readOverrides(): TypographyTokenOverrides {
    const out: TypographyTokenOverrides = {};
    for (const attr of OVERRIDE_ATTRIBUTES) {
      const value = this.getAttribute(attr);
      if (value !== null && value.length > 0) {
        out[attr satisfies OverrideAttribute] = value;
      }
    }
    return out;
  }

  /** Resolve the current variant from the `variant` attribute. */
  private currentVariant(): TypographyVariant {
    return resolveVariant(this.getAttribute('variant'));
  }

  /** Build the CSS text for this instance's current state. */
  protected currentStylesheet(): string {
    return typographyStylesheet({
      variant: this.currentVariant(),
      overrides: this.readOverrides(),
    });
  }

  /**
   * Rebuild the instance stylesheet and the shadow DOM on any state change.
   * Called by RaftersElement.connectedCallback and attributeChangedCallback.
   */
  override update(): void {
    if (!this.shadowRoot) return;

    // Rebuild the per-instance stylesheet from current variant + overrides.
    const css = this.currentStylesheet();
    if (!this._instanceSheet) {
      this._instanceSheet = new CSSStyleSheet();
    }
    this._instanceSheet.replaceSync(css);

    // Compose adopted sheets: keep any inherited sheets, then append ours.
    const existing = this.shadowRoot.adoptedStyleSheets;
    const next: CSSStyleSheet[] = [];
    for (const sheet of existing) {
      if (sheet !== this._instanceSheet) next.push(sheet);
    }
    next.push(this._instanceSheet);
    this.shadowRoot.adoptedStyleSheets = next;

    // Replace content. render() builds a fresh subtree.
    this.shadowRoot.replaceChildren(this.render());
  }

  /**
   * Build the semantic tag tree for the current variant.
   * codeblock -> <pre><code><slot/></code></pre>
   * All other variants -> <tag><slot/></tag>
   */
  override render(): Node {
    const variant = this.currentVariant();
    const tag = variantToTag[variant];
    const root = document.createElement(tag);

    if (variant === 'codeblock') {
      const code = document.createElement('code');
      const slot = document.createElement('slot');
      code.appendChild(slot);
      root.appendChild(code);
      return root;
    }

    root.appendChild(document.createElement('slot'));
    return root;
  }
}

// ============================================================================
// Auto-registration (idempotent)
// ============================================================================

const TAG_NAME = 'rafters-typography';
if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, RaftersTypography);
}
