/**
 * Shadow DOM style definitions for Card web component
 *
 * Parallel to card.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 * Token values via var() from the shared token stylesheet.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import {
  atRule,
  mixin,
  styleRule,
  stylesheet,
  tokenVar,
  transition,
} from '../../primitives/classy-wc';

// ============================================================================
// Base Styles
// ============================================================================

export const cardBase: CSSProperties = {
  'background-color': tokenVar('color-card'),
  color: tokenVar('color-card-foreground'),
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': tokenVar('color-card-border'),
  'border-radius': tokenVar('radius-lg'),
  'box-shadow': tokenVar('shadow-sm'),
};

export const cardInteractive: CSSProperties = {
  transition: transition(['background-color', 'box-shadow'], '150ms'),
  cursor: 'pointer',
};

export const cardInteractiveHover: CSSProperties = {
  'background-color': tokenVar('color-card-hover'),
  'box-shadow': tokenVar('shadow-md'),
};

export const cardInteractiveFocus: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-ring')}`,
  'box-shadow-offset': `0 0 0 2px ${tokenVar('color-background')}`,
};

export const cardEditable: CSSProperties = {
  'outline-width': '2px',
  'outline-style': 'dashed',
  'outline-color': `color-mix(in oklch, ${tokenVar('color-muted-foreground')} 30%, transparent)`,
  'outline-offset': '2px',
};

// ============================================================================
// Sub-component Styles
// ============================================================================

export const cardHeader: CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  gap: '0.375rem',
  padding: '1.5rem',
};

export const cardHeaderFlush: CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  gap: '0.375rem',
  padding: '0',
};

export const cardTitle: CSSProperties = {
  'font-size': tokenVar('font-size-title-medium'),
  'line-height': '1',
};

export const cardDescription: CSSProperties = {
  'font-size': tokenVar('font-size-body-small'),
  color: tokenVar('color-muted-foreground'),
};

export const cardContent: CSSProperties = {
  padding: '0 1.5rem 1.5rem',
};

export const cardFooter: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  padding: '0 1.5rem 1.5rem',
};

export const cardAction: CSSProperties = {
  'grid-column-start': '2',
  'grid-row': '1 / span 2',
  'align-self': 'start',
  'justify-self': 'end',
};

// ============================================================================
// Background Variants
// ============================================================================

export type CardBackground = 'none' | 'muted' | 'accent' | 'card' | 'primary' | 'secondary';

export const cardBackgroundStyles: Record<CardBackground, CSSProperties> = {
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
// Focus Ring Mixin
// ============================================================================

export const focusRing = mixin({
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
});

// ============================================================================
// Assembled Stylesheets
// ============================================================================

/**
 * Build the complete card stylesheet for a given configuration.
 */
export function cardStylesheet(
  options: { interactive?: boolean; background?: CardBackground } = {},
): string {
  const { interactive = false, background = 'card' } = options;

  return stylesheet(
    styleRule(':host', {
      display: 'block',
    }),

    styleRule(
      '.card',
      cardBase,
      cardBackgroundStyles[background],
      interactive ? cardInteractive : null,
    ),

    interactive ? styleRule('.card:hover', cardInteractiveHover) : '',

    interactive ? styleRule('.card:focus-visible', focusRing) : '',

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.card', { transition: 'none' })),

    styleRule('.card-header', cardHeader),
    styleRule('.card-title', cardTitle),
    styleRule('.card-description', cardDescription),
    styleRule('.card-content', cardContent),
    styleRule('.card-footer', cardFooter),
    styleRule('.card-action', cardAction),
  );
}
