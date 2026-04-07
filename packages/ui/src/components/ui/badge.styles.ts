/**
 * Shadow DOM style definitions for Badge web component
 *
 * Parallel to badge.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import {
  atRule,
  pick,
  styleRule,
  stylesheet,
  tokenVar,
  transition,
} from '../../primitives/classy-wc';

// ============================================================================
// Base Styles
// ============================================================================

export const badgeBase: CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'border-radius': '9999px',
  transition: transition(['background-color', 'color'], '150ms'),
};

// ============================================================================
// Variant Styles
// ============================================================================

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent'
  | 'outline'
  | 'ghost';

export const badgeVariantStyles: Record<BadgeVariant, CSSProperties> = {
  default: {
    'background-color': tokenVar('color-primary'),
    color: tokenVar('color-primary-foreground'),
  },
  primary: {
    'background-color': tokenVar('color-primary'),
    color: tokenVar('color-primary-foreground'),
  },
  secondary: {
    'background-color': tokenVar('color-secondary'),
    color: tokenVar('color-secondary-foreground'),
  },
  destructive: {
    'background-color': tokenVar('color-destructive'),
    color: tokenVar('color-destructive-foreground'),
  },
  success: {
    'background-color': tokenVar('color-success'),
    color: tokenVar('color-success-foreground'),
  },
  warning: {
    'background-color': tokenVar('color-warning'),
    color: tokenVar('color-warning-foreground'),
  },
  info: {
    'background-color': tokenVar('color-info'),
    color: tokenVar('color-info-foreground'),
  },
  muted: {
    'background-color': tokenVar('color-muted'),
    color: tokenVar('color-muted-foreground'),
  },
  accent: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
  },
  outline: {
    'background-color': 'transparent',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': tokenVar('color-input'),
    color: tokenVar('color-foreground'),
  },
  ghost: {
    'background-color': 'transparent',
    color: tokenVar('color-foreground'),
  },
};

export const badgeGhostHover: CSSProperties = {
  'background-color': tokenVar('color-muted'),
  color: tokenVar('color-muted-foreground'),
};

// ============================================================================
// Size Styles
// ============================================================================

export type BadgeSize = 'sm' | 'default' | 'lg';

export const badgeSizeStyles: Record<BadgeSize, CSSProperties> = {
  sm: {
    'padding-left': '0.5rem',
    'padding-right': '0.5rem',
    'padding-top': '0.125rem',
    'padding-bottom': '0.125rem',
    'font-size': tokenVar('font-size-label-small'),
  },
  default: {
    'padding-left': '0.625rem',
    'padding-right': '0.625rem',
    'padding-top': '0.125rem',
    'padding-bottom': '0.125rem',
    'font-size': tokenVar('font-size-label-small'),
  },
  lg: {
    'padding-left': '0.75rem',
    'padding-right': '0.75rem',
    'padding-top': '0.25rem',
    'padding-bottom': '0.25rem',
    'font-size': tokenVar('font-size-label-medium'),
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete badge stylesheet for a given configuration.
 */
export function badgeStylesheet(
  options: { variant?: BadgeVariant; size?: BadgeSize } = {},
): string {
  const { variant = 'default', size = 'default' } = options;

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    styleRule(
      '.badge',
      badgeBase,
      pick(badgeVariantStyles, variant, 'default'),
      pick(badgeSizeStyles, size, 'default'),
    ),

    variant === 'ghost' ? styleRule('.badge:hover', badgeGhostHover) : '',

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.badge', { transition: 'none' })),
  );
}
