/**
 * Shadow DOM style definitions for Container web component
 *
 * Parallel to container.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * Container queries always-on (:host sets container-type: inline-size).
 * All token references go through tokenVar() -- no raw CSS custom-property
 * function literals appear in this module.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { atRule, styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type ContainerSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | 'full';

export type ContainerSpacing =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '8'
  | '10'
  | '12'
  | '16'
  | '20'
  | '24';

export type ContainerBackground = 'none' | 'muted' | 'accent' | 'card' | 'primary' | 'secondary';

export interface ContainerStylesheetOptions {
  size?: ContainerSize | undefined;
  padding?: ContainerSpacing | undefined;
  gap?: ContainerSpacing | true | undefined;
  background?: ContainerBackground | undefined;
  article?: boolean | undefined;
  editable?: boolean | undefined;
}

// ============================================================================
// Allowed Value Sets (for validation / fallback)
// ============================================================================

const SIZES: ReadonlyArray<ContainerSize> = [
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'full',
];

const SPACING: ReadonlyArray<ContainerSpacing> = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '8',
  '10',
  '12',
  '16',
  '20',
  '24',
];

const BACKGROUNDS: ReadonlyArray<ContainerBackground> = [
  'none',
  'muted',
  'accent',
  'card',
  'primary',
  'secondary',
];

export function isContainerSize(value: unknown): value is ContainerSize {
  return typeof value === 'string' && (SIZES as ReadonlyArray<string>).includes(value);
}

export function isContainerSpacing(value: unknown): value is ContainerSpacing {
  return typeof value === 'string' && (SPACING as ReadonlyArray<string>).includes(value);
}

export function isContainerBackground(value: unknown): value is ContainerBackground {
  return typeof value === 'string' && (BACKGROUNDS as ReadonlyArray<string>).includes(value);
}

// ============================================================================
// Size-to-Gap Scale (mirrors container.classes.ts)
// ============================================================================

/**
 * Walks the spacing scale from component-padding tier into section-padding tier.
 * Used when `gap` is bare (true / empty) so the gap derives from the container size.
 */
export const containerSizeGapScale: Record<Exclude<ContainerSize, 'full'>, ContainerSpacing> = {
  sm: '3',
  md: '4',
  lg: '5',
  xl: '6',
  '2xl': '6',
  '3xl': '8',
  '4xl': '8',
  '5xl': '10',
  '6xl': '10',
  '7xl': '12',
};

/**
 * Resolve the bare-gap default for the given size. Falls back to '6' when no size set.
 */
export function resolveDerivedGap(size: ContainerSize | undefined): ContainerSpacing {
  if (size && size !== 'full') {
    return containerSizeGapScale[size];
  }
  return '6';
}

// ============================================================================
// Base Host Styles
// ============================================================================

/**
 * Always applied to :host. Container queries are always-on.
 */
export const containerHostBase: CSSProperties = {
  display: 'block',
  'container-type': 'inline-size',
  width: '100%',
};

/**
 * Locally-scoped CSS custom property name carrying the editable outline color.
 * Defined on :host so CSSOM implementations that reject unparsed `color-mix()`
 * values on `outline-color` (notably happy-dom in tests) still preserve the
 * declaration via the indirection through tokenVar(). The literal
 * `color-mix()` expression still appears in the final CSS via the host-side
 * definition.
 */
const EDITABLE_OUTLINE_TOKEN = 'rafters-container-editable-outline';

/**
 * :host-scoped custom-property declaration for the editable outline color.
 * Only included when `editable` is true.
 */
export const containerEditableHost: CSSProperties = {
  [`--${EDITABLE_OUTLINE_TOKEN}`]: `color-mix(in oklch, ${tokenVar('color-muted-foreground')} 30%, transparent)`,
};

/**
 * Editable outline preset on the inner element. Dashed, 30% muted-foreground.
 */
export const containerEditable: CSSProperties = {
  'outline-width': '2px',
  'outline-style': 'dashed',
  'outline-color': tokenVar(EDITABLE_OUTLINE_TOKEN),
  'outline-offset': '2px',
};

// ============================================================================
// Background Variants
// ============================================================================

export const containerBackgroundStyles: Record<ContainerBackground, CSSProperties> = {
  none: {},
  muted: {
    'background-color': tokenVar('color-muted'),
    color: tokenVar('color-muted-foreground'),
  },
  accent: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
  },
  card: {
    'background-color': tokenVar('color-card'),
    color: tokenVar('color-card-foreground'),
  },
  primary: {
    'background-color': tokenVar('color-primary'),
    color: tokenVar('color-primary-foreground'),
  },
  secondary: {
    'background-color': tokenVar('color-secondary'),
    color: tokenVar('color-secondary-foreground'),
  },
};

// ============================================================================
// Article Typography Rules
// ============================================================================

/**
 * Article typography rules, scoped to descendant selectors inside the shadow root.
 * Mirrors container.classes.ts containerArticleTypography but uses tokens.
 */
function articleTypographyRules(): string {
  return stylesheet(
    styleRule('p', {
      'line-height': tokenVar('line-height-relaxed', '1.625'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('p:last-child', {
      'margin-bottom': '0',
    }),

    styleRule('h1', {
      'font-size': tokenVar('font-size-display-medium'),
      'font-weight': tokenVar('font-weight-bold', '700'),
      'letter-spacing': tokenVar('letter-spacing-tight', '-0.025em'),
      'margin-top': '0',
      'margin-bottom': tokenVar('spacing-4'),
      color: tokenVar('color-accent-foreground'),
    }),

    styleRule('h2', {
      'font-size': tokenVar('font-size-display-small'),
      'font-weight': tokenVar('font-weight-semibold', '600'),
      'letter-spacing': tokenVar('letter-spacing-tight', '-0.025em'),
      'margin-top': tokenVar('spacing-8'),
      'margin-bottom': tokenVar('spacing-3'),
      color: tokenVar('color-accent-foreground'),
    }),

    styleRule('h2:first-child', {
      'margin-top': '0',
    }),

    styleRule('h3', {
      'font-size': tokenVar('font-size-headline-medium'),
      'font-weight': tokenVar('font-weight-semibold', '600'),
      'margin-top': tokenVar('spacing-6'),
      'margin-bottom': tokenVar('spacing-2'),
      color: tokenVar('color-accent-foreground'),
    }),

    styleRule('h4', {
      'font-size': tokenVar('font-size-headline-small'),
      'font-weight': tokenVar('font-weight-semibold', '600'),
      'margin-top': tokenVar('spacing-4'),
      'margin-bottom': tokenVar('spacing-2'),
      color: tokenVar('color-accent-foreground'),
    }),

    styleRule('ul', {
      'list-style-type': 'disc',
      'padding-left': tokenVar('spacing-6'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('ol', {
      'list-style-type': 'decimal',
      'padding-left': tokenVar('spacing-6'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('li', {
      'margin-bottom': tokenVar('spacing-1'),
    }),

    styleRule('a', {
      color: tokenVar('color-primary'),
      'text-decoration': 'underline',
      'text-underline-offset': tokenVar('spacing-1'),
    }),

    styleRule('a:hover', {
      color: `color-mix(in oklch, ${tokenVar('color-primary')} 80%, transparent)`,
    }),

    styleRule('blockquote', {
      'border-left-width': '4px',
      'border-left-style': 'solid',
      'border-left-color': tokenVar('color-muted'),
      'padding-left': tokenVar('spacing-4'),
      'font-style': 'italic',
      'margin-top': tokenVar('spacing-4'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('code', {
      'background-color': tokenVar('color-muted'),
      'padding-left': tokenVar('spacing-1'),
      'padding-right': tokenVar('spacing-1'),
      'padding-top': tokenVar('spacing-0'),
      'padding-bottom': tokenVar('spacing-0'),
      'border-radius': tokenVar('radius-sm'),
      'font-size': tokenVar('font-size-body-small'),
      'font-family': tokenVar('font-family-mono'),
    }),

    styleRule('pre', {
      'background-color': tokenVar('color-muted'),
      padding: tokenVar('spacing-4'),
      'border-radius': tokenVar('radius-lg'),
      'overflow-x': 'auto',
      'margin-top': tokenVar('spacing-4'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('pre code', {
      'background-color': 'transparent',
      padding: '0',
    }),

    styleRule('hr', {
      'border-color': tokenVar('color-border'),
      'margin-top': tokenVar('spacing-8'),
      'margin-bottom': tokenVar('spacing-8'),
    }),

    styleRule('img', {
      'border-radius': tokenVar('radius-lg'),
      'margin-top': tokenVar('spacing-4'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('table', {
      width: '100%',
      'margin-top': tokenVar('spacing-4'),
      'margin-bottom': tokenVar('spacing-4'),
    }),

    styleRule('th', {
      'border-width': '1px',
      'border-style': 'solid',
      'border-color': tokenVar('color-border'),
      'padding-left': tokenVar('spacing-3'),
      'padding-right': tokenVar('spacing-3'),
      'padding-top': tokenVar('spacing-2'),
      'padding-bottom': tokenVar('spacing-2'),
      'text-align': 'left',
      'font-weight': tokenVar('font-weight-semibold', '600'),
    }),

    styleRule('td', {
      'border-width': '1px',
      'border-style': 'solid',
      'border-color': tokenVar('color-border'),
      'padding-left': tokenVar('spacing-3'),
      'padding-right': tokenVar('spacing-3'),
      'padding-top': tokenVar('spacing-2'),
      'padding-bottom': tokenVar('spacing-2'),
    }),
  );
}

// ============================================================================
// Inner Element Style Composition
// ============================================================================

interface InnerStyles {
  base: CSSProperties;
  layout: CSSProperties | null;
}

/**
 * Build the property map for the inner semantic element (.container).
 *
 * Layered composition:
 *  - max-width / width based on `size`
 *  - margin-inline: auto when sized but not full
 *  - padding when present
 *  - flex column + gap when gap resolved
 *  - background pair when present
 *  - article max-width clamp when article and size unset
 */
function innerElementStyles(options: ContainerStylesheetOptions): InnerStyles {
  const base: CSSProperties = {};

  // Size constraint -- max-width via token, except 'full' (already 100% on host).
  if (options.size && options.size !== 'full') {
    base['max-width'] = tokenVar(`size-container-${options.size}`);
    base['margin-inline'] = 'auto';
  }
  if (options.size === 'full') {
    base.width = '100%';
  }

  // Article width clamp when no explicit size set.
  if (options.article && !options.size) {
    base['max-width'] = tokenVar('size-prose', '65ch');
    base['margin-inline'] = 'auto';
  }

  // Padding from spacing scale.
  if (options.padding) {
    base.padding = tokenVar(`spacing-${options.padding}`);
  }

  // Background pair (background-color + foreground color).
  if (options.background && options.background !== 'none') {
    const bg = containerBackgroundStyles[options.background];
    Object.assign(base, bg);
  }

  // Editable outline.
  if (options.editable) {
    Object.assign(base, containerEditable);
  }

  // Gap -> flex column layout. Resolve true to size-derived default.
  let gapValue: ContainerSpacing | null = null;
  if (options.gap === true) {
    gapValue = resolveDerivedGap(options.size);
  } else if (typeof options.gap === 'string' && isContainerSpacing(options.gap)) {
    gapValue = options.gap;
  }

  let layout: CSSProperties | null = null;
  if (gapValue !== null) {
    layout = {
      display: 'flex',
      'flex-direction': 'column',
      gap: tokenVar(`spacing-${gapValue}`),
    };
  }

  return { base, layout };
}

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete container stylesheet for a given configuration.
 *
 * Returns concatenated CSS rule blocks suitable for adoption by a
 * CSSStyleSheet inside a shadow root. All token references resolve via the
 * shared token stylesheet on RaftersElement.
 */
export function containerStylesheet(options: ContainerStylesheetOptions = {}): string {
  const inner = innerElementStyles(options);
  const article = options.article ? articleTypographyRules() : '';

  // Compose :host declarations -- always include base, optionally include the
  // editable outline color custom property so the inner outline-color
  // reference resolves through CSSOM regardless of color-mix parser support.
  const hostStyles: CSSProperties = {
    ...containerHostBase,
    ...(options.editable ? containerEditableHost : {}),
  };

  return stylesheet(
    styleRule(':host', hostStyles),
    styleRule('.container', inner.base, inner.layout),
    article,
    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.container', { transition: 'none' }),
    ),
  );
}
