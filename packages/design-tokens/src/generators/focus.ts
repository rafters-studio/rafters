/**
 * Focus Generator
 *
 * Generates focus ring tokens for WCAG 2.2 compliance.
 * Focus indicators are critical for keyboard navigation and accessibility.
 *
 * This generator is a pure function - it receives focus configurations as input.
 * Default focus values are provided by the orchestrator from defaults.ts.
 */

import type { Token } from '@rafters/shared';
import type { FocusConfig } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

/**
 * Generate focus tokens from provided configurations
 */
/**
 * Convert px value to rem string
 */
function pxToRem(px: number): string {
  const rem = Math.round((px / 16) * 1000) / 1000;
  return `${rem}rem`;
}

export function generateFocusTokens(
  config: ResolvedSystemConfig,
  focusConfigs: Record<string, FocusConfig>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { focusRingWidth } = config;

  // Base focus width token - use rem
  const focusRingWidthRem = pxToRem(focusRingWidth);

  tokens.push({
    name: 'focus-ring-width',
    value: focusRingWidthRem,
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Default focus ring width - WCAG 2.2 requires minimum 2px',
    usageContext: ['focus-indicators', 'keyboard-navigation'],
    accessibilityLevel: 'AA',
    focusRingWidth: focusRingWidthRem,
    description: `Focus ring width ${focusRingWidthRem}. WCAG 2.2 requires minimum 2px for visibility.`,
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

  // Generate focus ring configuration tokens
  for (const [name, focusConfig] of Object.entries(focusConfigs)) {
    const widthRem = pxToRem(focusConfig.width);
    const offsetRem = pxToRem(focusConfig.offset);

    tokens.push({
      name: name === 'default' ? 'focus-ring' : `focus-ring-${name}`,
      value: JSON.stringify({
        width: widthRem,
        offset: offsetRem,
        style: focusConfig.style,
        color: 'var(--ring)',
      }),
      category: 'focus',
      namespace: 'focus',
      semanticMeaning: focusConfig.meaning,
      usageContext: focusConfig.contexts,
      focusRingWidth: widthRem,
      focusRingColor: 'var(--ring)',
      focusRingOffset: offsetRem,
      focusRingStyle: focusConfig.style,
      dependsOn: ['ring', 'focus-ring-width'],
      accessibilityLevel: focusConfig.width >= 2 ? 'AA' : undefined,
      description: `${focusConfig.meaning}. Width: ${widthRem}, Offset: ${offsetRem}.`,
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

    // Also create CSS-ready outline shorthand
    const outlineValue = `${widthRem} ${focusConfig.style} var(--ring)`;

    tokens.push({
      name: name === 'default' ? 'focus-outline' : `focus-outline-${name}`,
      value: outlineValue,
      category: 'focus',
      namespace: 'focus',
      semanticMeaning: `CSS outline shorthand for ${name} focus ring`,
      usageContext: ['css-outline-property'],
      dependsOn: ['ring'],
      description: `CSS outline value: ${outlineValue}. Use with outline-offset: ${offsetRem}.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });

    tokens.push({
      name: name === 'default' ? 'focus-offset' : `focus-offset-${name}`,
      value: offsetRem,
      category: 'focus',
      namespace: 'focus',
      semanticMeaning: `Focus ring offset for ${name} style`,
      focusRingOffset: offsetRem,
      description: `Focus offset ${offsetRem} for ${name} focus style.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });
  }

  // Focus-within variant for containers
  tokens.push({
    name: 'focus-within-ring',
    value: JSON.stringify({
      width: focusRingWidthRem,
      offset: '0',
      style: 'solid',
      color: 'var(--ring)',
    }),
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Focus ring for containers with focused descendants',
    usageContext: ['form-groups', 'card-actions', 'list-containers'],
    focusRingWidth: focusRingWidthRem,
    focusRingColor: 'var(--ring)',
    focusRingOffset: '0',
    focusRingStyle: 'solid',
    dependsOn: ['ring'],
    description: 'Focus indicator for containers using :focus-within pseudo-class.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Use on containers with focusable children', 'Combine with child focus styles'],
      never: ['Use as replacement for child focus indicators', 'Apply to non-container elements'],
    },
  });

  // High contrast mode overrides - derive from base focus ring width
  // Width is scaled up for better visibility in high contrast
  const highContrastWidth = focusRingWidth * 1.5; // 1.5x base width for high contrast visibility
  const highContrastOffset = focusRingWidth; // Offset matches base width
  tokens.push({
    name: 'focus-high-contrast',
    value: JSON.stringify({
      width: pxToRem(highContrastWidth),
      offset: pxToRem(highContrastOffset),
      style: 'solid',
      color: 'Highlight',
    }),
    category: 'focus',
    namespace: 'focus',
    semanticMeaning: 'Focus ring for Windows High Contrast Mode',
    usageContext: ['high-contrast-mode', 'forced-colors'],
    focusRingWidth: pxToRem(highContrastWidth),
    focusRingOffset: pxToRem(highContrastOffset),
    focusRingStyle: 'solid',
    highContrastMode: 'Highlight',
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
