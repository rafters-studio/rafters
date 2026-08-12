/**
 * Focus Generator
 *
 * Focus derives FROM spacing. `focus-ring-width` is
 * `calc(var(--rafters-spacing-base) / 2)`, so changing the spacing base
 * cascades into every focus token at runtime. WCAG 2.2 requires minimum 2px
 * for visibility -- at base 4 the derivation produces exactly 2px.
 */

import type { Token } from '@rafters/shared';
import type { FocusConfig } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

export function generateFocusTokens(
  config: ResolvedSystemConfig,
  focusConfigs: Record<string, FocusConfig>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { focusRingWidth, baseSpacingUnit } = config;

  // The divisor that anchors focus to spacing. `focusRingWidth` is already
  // `baseSpacingUnit / 2` from resolveConfig, so this is stable across bases.
  // Guard: a zero override would produce Infinity in the calc() string.
  const focusDivisor =
    focusRingWidth > 0 ? Math.round((baseSpacingUnit / focusRingWidth) * 1000) / 1000 : 2;

  const focusWidthValue = `calc(var(--rafters-spacing-base) / ${focusDivisor})`;

  tokens.push({
    name: 'focus-ring-width',
    value: focusWidthValue,
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Default focus ring width - derives from spacing base',
    usageContext: ['focus-indicators', 'keyboard-navigation'],
    accessibilityLevel: 'AA',
    focusRingWidth: focusWidthValue,
    dependsOn: ['spacing-base'],
    description: `Focus ring width = spacing-base / ${focusDivisor} (${focusRingWidth}px at base ${baseSpacingUnit}). WCAG 2.2 requires minimum 2px.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Use for all focus-visible states', 'Ensure 3:1 contrast against adjacent colors'],
      never: ['Reduce below 2px', 'Remove focus rings without alternative indicator'],
    },
  });

  // Focus ring color token (references semantic ring color)
  tokens.push({
    name: 'focus-ring-color',
    value: 'var(--ring)',
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Focus ring color - inherits from semantic ring token',
    usageContext: ['focus-indicators'],
    dependsOn: ['ring'],
    focusRingColor: 'var(--ring)',
    description: 'Focus ring color. Uses semantic ring token for theme consistency.',
    generatedAt: timestamp,
    containerQueryAware: false,
    highContrastMode: 'Highlight',
    userOverride: null,
  });

  // Each config's width and offset are expressed as multipliers of
  // focus-ring-width, which itself derives from spacing-base. The build-time
  // pixel number stays for the WCAG check; the emitted value is a calc().
  const focusVar = 'var(--rafters-focus-ring-width)';

  const focusCalc = (px: number): string => {
    const mult = px / focusRingWidth;
    if (mult === 0) return '0';
    if (mult === 1) return focusVar;
    if (mult === -1) return `calc(${focusVar} * -1)`;
    return `calc(${focusVar} * ${mult})`;
  };

  for (const [name, focusConfig] of Object.entries(focusConfigs)) {
    const widthVal = focusCalc(focusConfig.width);
    const offsetVal = focusCalc(focusConfig.offset);

    tokens.push({
      name: name === 'default' ? 'focus-ring' : `focus-ring-${name}`,
      value: JSON.stringify({
        width: widthVal,
        offset: offsetVal,
        style: focusConfig.style,
        color: 'var(--ring)',
      }),
      category: 'focus',
      namespace: 'focus',
      semanticMeaning: focusConfig.meaning,
      usageContext: focusConfig.contexts,
      focusRingWidth: widthVal,
      focusRingColor: 'var(--ring)',
      focusRingOffset: offsetVal,
      focusRingStyle: focusConfig.style,
      dependsOn: ['ring', 'focus-ring-width'],
      accessibilityLevel: focusConfig.width >= 2 ? 'AA' : undefined,
      description: `${focusConfig.meaning}. Width: ${widthVal}, Offset: ${offsetVal}.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      highContrastMode: 'Highlight',
      userOverride: null,
      usagePatterns: {
        do:
          name === 'default'
            ? ['Use as the default focus indicator', 'Apply to all interactive elements']
            : name === 'inset'
              ? ['Use when external ring would be clipped', 'Use for contained elements']
              : name === 'thick'
                ? ['Use for critical actions', 'Use in accessibility-focused modes']
                : ['Use in dense UIs', 'Ensure sufficient contrast'],
        never: [
          'Remove without providing alternative focus indicator',
          'Use colors with insufficient contrast',
        ],
      },
    });

    const outlineValue = `${widthVal} ${focusConfig.style} var(--ring)`;

    tokens.push({
      name: name === 'default' ? 'focus-outline' : `focus-outline-${name}`,
      value: outlineValue,
      category: 'focus',
      namespace: 'focus',
      semanticMeaning: `CSS outline shorthand for ${name} focus ring`,
      usageContext: ['css-outline-property'],
      dependsOn: ['ring', 'focus-ring-width'],
      description: `CSS outline value: ${outlineValue}. Use with outline-offset: ${offsetVal}.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });

    tokens.push({
      name: name === 'default' ? 'focus-offset' : `focus-offset-${name}`,
      value: offsetVal,
      category: 'focus',
      namespace: 'focus',
      semanticMeaning: `Focus ring offset for ${name} style`,
      focusRingOffset: offsetVal,
      dependsOn: ['focus-ring-width'],
      description: `Focus offset ${offsetVal} for ${name} focus style.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });
  }

  tokens.push({
    name: 'focus-within-ring',
    value: JSON.stringify({
      width: focusVar,
      offset: '0',
      style: 'solid',
      color: 'var(--ring)',
    }),
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Focus ring for containers with focused descendants',
    usageContext: ['form-groups', 'card-actions', 'list-containers'],
    focusRingWidth: focusVar,
    focusRingColor: 'var(--ring)',
    focusRingOffset: '0',
    focusRingStyle: 'solid',
    dependsOn: ['ring', 'focus-ring-width'],
    description: 'Focus indicator for containers using :focus-within pseudo-class.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Use on containers with focusable children', 'Combine with child focus styles'],
      never: ['Use as replacement for child focus indicators', 'Apply to non-container elements'],
    },
  });

  // High contrast: 1.5x width, 1x offset -- both expressed through the var
  const hcWidthVal = `calc(${focusVar} * 1.5)`;
  const hcOffsetVal = focusVar;
  tokens.push({
    name: 'focus-high-contrast',
    value: JSON.stringify({
      width: hcWidthVal,
      offset: hcOffsetVal,
      style: 'solid',
      color: 'Highlight',
    }),
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Focus ring for Windows High Contrast Mode',
    usageContext: ['high-contrast-mode', 'forced-colors'],
    focusRingWidth: hcWidthVal,
    focusRingOffset: hcOffsetVal,
    focusRingStyle: 'solid',
    highContrastMode: 'Highlight',
    dependsOn: ['focus-ring-width'],
    description: 'High contrast focus ring using system Highlight color.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Apply in @media (forced-colors: active)', 'Use system color keywords'],
      never: ['Override in forced-colors mode', 'Use custom colors in high contrast'],
    },
  });

  return {
    namespace: 'focus',
    tokens,
  };
}
