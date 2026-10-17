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
 * <rafters-typography> -- the Web Component performance of the static Typography score.
 *
 * Typography is a PURE STATIC: no state, no actions, no keymap, no effects, no
 * bind. The shadow root holds the variant's semantic tag with the composed
 * classes from `resolveTypography` and a default slot for the author's content
 * (`codeblock` nests the slot in `pre > code`). The tag carries the meaning
 * natively, so no role or aria-* is set. An unknown or absent `variant` renders
 * `p`. Every attribute is observed; a change re-renders.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { resolveVariant, variantToTag, type TypographyTokenProps } from './typography.behavior';
import { resolveTypography } from './typography.classes';

const TOKEN_ATTRIBUTES = [
  'size',
  'weight',
  'color',
  'line',
  'tracking',
  'family',
  'align',
  'transform',
] as const satisfies ReadonlyArray<keyof TypographyTokenProps>;

export class RaftersTypography extends RaftersElement {
  static readonly observedAttributes: string[] = ['variant', ...TOKEN_ATTRIBUTES];

  /** The host adds no box of its own; the inner tag owns layout. */
  static override styles = ':host { display: contents; }';

  override render(): Node {
    const variant = resolveVariant(this.getAttribute('variant'));
    const tokens: TypographyTokenProps = {};
    for (const name of TOKEN_ATTRIBUTES) {
      tokens[name] = this.getAttribute(name) ?? undefined;
    }

    const root = document.createElement(variantToTag[variant]);
    root.setAttribute('data-part', 'root');
    const classes = resolveTypography(variant, tokens);
    if (classes) root.className = classes;

    const slot = document.createElement('slot');
    if (variant === 'codeblock') {
      const code = document.createElement('code');
      code.appendChild(slot);
      root.appendChild(code);
    } else {
      root.appendChild(slot);
    }
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-typography')) {
  customElements.define('rafters-typography', RaftersTypography);
}
