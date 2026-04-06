/**
 * Typography Accessibility Validator
 *
 * Enforces WCAG 2.2 AA and Section 508 constraints on typography composites
 * at generation time and override time. The system refuses to generate or
 * accept typographic treatments that violate accessibility requirements.
 *
 * Constraints are enforced, not documented -- errors block generation/override,
 * warnings are attached to token metadata.
 */

import type { TypographyElementOverride } from '@rafters/shared';
import type { TypographyCompositeMapping } from '../generators/defaults.js';

export interface TypographyA11yViolation {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  wcagCriterion: string;
  property: string;
  currentValue: string;
  requiredValue: string;
}

/**
 * Font size scale keys ordered from smallest to largest.
 * Used to compare relative sizes.
 */
const SIZE_ORDER = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
] as const;

function sizeIndex(size: string): number {
  return SIZE_ORDER.indexOf(size as (typeof SIZE_ORDER)[number]);
}

/**
 * Font weight values for comparison.
 */
const WEIGHT_VALUES: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

function weightValue(weight: string): number {
  return WEIGHT_VALUES[weight] ?? 400;
}

/**
 * Validate a typography composite mapping against accessibility constraints.
 *
 * @param mapping - The composite mapping to validate
 * @param role - The role name (for error messages)
 * @returns Array of violations (empty if valid)
 */
export function validateTypographyComposite(
  mapping: TypographyCompositeMapping,
  role: string,
): TypographyA11yViolation[] {
  const violations: TypographyA11yViolation[] = [];
  const sizeIdx = sizeIndex(mapping.fontSize);
  const weight = weightValue(mapping.fontWeight);

  // Determine role category for context-appropriate rules
  const isBody = role.startsWith('body-');
  const isLabel = role.startsWith('label-');
  const isHeading = role.startsWith('title-') || role.startsWith('display-');

  // Rule: Min body font size (WCAG 1.4.4)
  // Body text must be at least 'sm' (0.875rem / 14px)
  if (isBody && sizeIdx < sizeIndex('sm')) {
    violations.push({
      rule: 'min-body-font-size',
      severity: 'error',
      message: `Body role "${role}" uses font-size "${mapping.fontSize}" which is below minimum 'sm' (14px)`,
      wcagCriterion: '1.4.4 Resize Text',
      property: 'fontSize',
      currentValue: mapping.fontSize,
      requiredValue: 'sm or larger',
    });
  }

  // Rule: Min label font size (WCAG 1.4.4)
  // Label text must be at least 'xs' (0.75rem / 12px)
  if (isLabel && sizeIdx < sizeIndex('xs')) {
    violations.push({
      rule: 'min-label-font-size',
      severity: 'error',
      message: `Label role "${role}" uses font-size "${mapping.fontSize}" which is below minimum 'xs' (12px)`,
      wcagCriterion: '1.4.4 Resize Text',
      property: 'fontSize',
      currentValue: mapping.fontSize,
      requiredValue: 'xs or larger',
    });
  }

  // Rule: Body line height (WCAG 1.4.12 Text Spacing)
  // Body text line height must be at least 1.5
  if (isBody) {
    const lhIdx = sizeIndex(mapping.lineHeight);
    // Scale-based line heights: xs=1.5, sm=1.5, base=1.5, lg=1.5, xl=1.4
    // If lineHeight references a scale key >= xl, the value is < 1.5
    if (lhIdx >= sizeIndex('xl')) {
      violations.push({
        rule: 'body-line-height',
        severity: 'warning',
        message: `Body role "${role}" line-height "${mapping.lineHeight}" may be below 1.5 (WCAG 1.4.12 recommends >= 1.5 for body text)`,
        wcagCriterion: '1.4.12 Text Spacing',
        property: 'lineHeight',
        currentValue: mapping.lineHeight,
        requiredValue: 'Scale key with line-height >= 1.5 (xs, sm, base, lg)',
      });
    }
  }

  // Rule: Heading line height (WCAG 1.4.12)
  // Headings can be tighter but should be at least 1.2
  if (isHeading) {
    const lhIdx = sizeIndex(mapping.lineHeight);
    // Scale positions 7xl+ have line-height 1.1 which is below 1.2
    if (lhIdx >= sizeIndex('7xl')) {
      violations.push({
        rule: 'heading-line-height',
        severity: 'warning',
        message: `Heading role "${role}" line-height "${mapping.lineHeight}" may be below 1.2`,
        wcagCriterion: '1.4.12 Text Spacing',
        property: 'lineHeight',
        currentValue: mapping.lineHeight,
        requiredValue: 'Scale key with line-height >= 1.2',
      });
    }
  }

  // Rule: Weight-contrast coupling (WCAG 1.4.3 Contrast)
  // Thin weights (< 300) on small text (<= 'sm') are a readability concern
  if (weight <= 300 && sizeIdx <= sizeIndex('sm')) {
    violations.push({
      rule: 'weight-contrast-coupling',
      severity: 'warning',
      message: `Role "${role}" uses thin weight (${mapping.fontWeight}) at small size (${mapping.fontSize}). This may have insufficient readability. Consider using weight >= medium for small text.`,
      wcagCriterion: '1.4.3 Contrast (Minimum)',
      property: 'fontWeight',
      currentValue: mapping.fontWeight,
      requiredValue: 'medium or heavier for small text',
    });
  }

  return violations;
}

/**
 * Validate a typography element override against accessibility constraints.
 * Merges the override with the base mapping and validates the result.
 *
 * @param override - The element override to validate
 * @param baseMapping - The base role mapping being overridden
 * @returns Array of violations (empty if valid)
 */
export function validateTypographyOverride(
  override: TypographyElementOverride,
  baseMapping: TypographyCompositeMapping,
): TypographyA11yViolation[] {
  // Merge override into base
  const merged: TypographyCompositeMapping = {
    ...baseMapping,
    fontFamily: override.overrides.fontFamily
      ? (override.overrides.fontFamily as TypographyCompositeMapping['fontFamily'])
      : baseMapping.fontFamily,
    fontSize: override.overrides.fontSize ?? baseMapping.fontSize,
    fontWeight: override.overrides.fontWeight ?? baseMapping.fontWeight,
    lineHeight: override.overrides.lineHeight ?? baseMapping.lineHeight,
    letterSpacing: override.overrides.letterSpacing ?? baseMapping.letterSpacing,
  };

  return validateTypographyComposite(merged, override.role);
}
