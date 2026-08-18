/**
 * Typography primitives for consistent text styling and hierarchy
 *
 * @cognitive-load 2/10 - Familiar text patterns with clear visual hierarchy
 * @attention-economics Hierarchy guides reading: H1=page title (one per page), H2=sections, H3=subsections, body text flows naturally
 * @trust-building Consistent typography builds readability and professionalism
 * @accessibility Proper heading hierarchy for screen readers; sufficient contrast ratios
 * @semantic-meaning Element mapping: H1-H6=document structure, P=body content (with token overrides for lead/muted variants), Code=technical content
 *
 * @usage-patterns
 * DO: Use H1 once per page for main title
 * DO: Follow heading hierarchy (H1 -> H2 -> H3, never skip)
 * DO: Use P with size/color token props for variant styling (e.g., lead, muted)
 * DO: Use token props to override individual typography dimensions
 * NEVER: Skip heading levels (H1 -> H3)
 * NEVER: Use headings for styling only (use CSS instead)
 * NEVER: Use multiple H1s on a single page
 *
 * @example
 * ```tsx
 * // Page structure
 * <H1>Page Title</H1>
 * <P size="xl" color="muted">This is an introduction to the page content.</P>
 *
 * <H2>Section Title</H2>
 * <P>Body paragraph with standard styling.</P>
 *
 * <H3>Subsection</H3>
 * <P>More content here.</P>
 * <P size="sm" color="muted">Last updated: Jan 2025</P>
 *
 * // Code example
 * <P>Use the <Code>useState</Code> hook for local state.</P>
 *
 * // Blockquote
 * <Blockquote>
 *   "Design is not just what it looks like. Design is how it works."
 * </Blockquote>
 * ```
 */

/**
 * <rafters-typography> -- the Web Component performance of the static score.
 *
 * Like container/card, Typography is a PURE STATIC: empty ARIA projection, no
 * state, no effects, so there is nothing to bind -- no `bindTypography` exists.
 * The element renders once inside its shadow root from the shared class
 * resolver (resolveTypography), so the WC carries the EXACT composition the
 * React and Astro performances do. Presentation resolves from the compiled
 * utility sheet adopted by RaftersElement plus the token custom properties
 * inherited from the host :root.
 *
 * The `variant` attribute drives both the rendered tag (via the score's
 * `variantToTag`) and the composed class string. TypographyTokenProps
 * attributes (size/weight/color/line/tracking/family/align/transform) override
 * the variant defaults at compose time. Unknown variants fall back to `p` --
 * NEVER throws. DOM is built via createElement/appendChild; no innerHTML.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  resolveVariant,
  variantToTag,
  type TypographyTokenProps,
  type TypographyVariant,
} from './typography.behavior';
import { resolveTypography } from './typography.classes';

export type { TypographyTokenProps, TypographyVariant } from './typography.behavior';

/** Attribute names that map to TypographyTokenProps keys. */
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

/**
 * Compose the inner element's class string from the shared resolver. Exported
 * so tests assert the WC renders the exact same composition the Astro/React
 * targets do -- the parity guarantee.
 */
export function composeTypographyClasses(
  variant: TypographyVariant,
  overrides: TypographyTokenProps = {},
): string {
  return resolveTypography(variant, overrides);
}

export class RaftersTypography extends RaftersElement {
  static override styles = ':host { display: block; }';

  static readonly observedAttributes: readonly string[] = OBSERVED_ATTRIBUTES;

  /**
   * Read all TypographyTokenProps attributes off the element, omitting absent
   * entries so the resolver skips them cleanly.
   */
  private readOverrides(): TypographyTokenProps {
    const out: TypographyTokenProps = {};
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

  /**
   * Build the semantic tag tree for the current variant, carrying the composed
   * utility class string and data-part="root" (the harness contract).
   * codeblock -> pre > code > slot; all other variants -> tag > slot.
   */
  override render(): Node {
    const variant = this.currentVariant();
    const tag = variantToTag[variant];
    const className = composeTypographyClasses(variant, this.readOverrides());
    const root = document.createElement(tag);
    root.setAttribute('data-part', 'root');
    if (className) root.className = className;

    if (variant === 'codeblock') {
      const code = document.createElement('code');
      code.appendChild(document.createElement('slot'));
      root.appendChild(code);
      return root;
    }

    root.appendChild(document.createElement('slot'));
    return root;
  }
}

const TAG_NAME = 'rafters-typography';
if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, RaftersTypography);
}
