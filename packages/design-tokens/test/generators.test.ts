/**
 * Generator Tests
 *
 * Tests for the design token generators.
 * Validates config resolution, token generation, and mathematical relationships.
 */

import type { Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  BREAKPOINT_SCALE,
  // Defaults for generators
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLOR_SCALES,
  DEFAULT_CONTAINER_BREAKPOINTS,
  DEFAULT_DELAY_DEFINITIONS,
  DEFAULT_DEPTH_DEFINITIONS,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_ELEVATION_DEFINITIONS,
  DEFAULT_FOCUS_CONFIGS,
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_RADIUS_DEFINITIONS,
  DEFAULT_SHADOW_DEFINITIONS,
  DEFAULT_SPACING_MULTIPLIERS,
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_TYPOGRAPHY_SCALE,
  DEPTH_LEVELS,
  EASING_CURVES,
  ELEVATION_LEVELS,
  // Orchestration
  generateBaseSystem,
  generateBreakpointTokens,
  // Individual generators
  generateColorTokens,
  generateDepthTokens,
  generateElevationTokens,
  generateFocusTokens,
  generateMotionTokens,
  generateNamespaces,
  generateRadiusTokens,
  generateSemanticTokens,
  generateShadowTokens,
  generateSpacingTokens,
  generateTypographyTokens,
  getAvailableNamespaces,
  getGeneratorInfo,
  MOTION_DURATION_SCALE,
  PURE_MATH_CONFIG,
  RADIUS_SCALE,
  // Config and types
  resolveConfig,
  SHADOW_SCALE,
  // Scale constants
  SPACING_SCALE,
  TYPOGRAPHY_SCALE,
  toNamespaceJSON,
  toTokenMap,
} from '../src/generators/index.js';

describe('Config Resolution', () => {
  describe('resolveConfig', () => {
    it('computes derived values from baseSpacingUnit when no overrides provided', () => {
      const resolved = resolveConfig(PURE_MATH_CONFIG);

      // baseFontSize = baseSpacingUnit * 4 = 4 * 4 = 16
      expect(resolved.baseFontSize).toBe(16);
      // baseRadius = baseSpacingUnit * 1.5 = 4 * 1.5 = 6
      expect(resolved.baseRadius).toBe(6);
      // focusRingWidth = baseSpacingUnit / 2 = 4 / 2 = 2
      expect(resolved.focusRingWidth).toBe(2);
      // baseTransitionDuration = baseSpacingUnit * 37.5 = 4 * 37.5 = 150
      expect(resolved.baseTransitionDuration).toBe(150);
    });

    it('uses override values when provided', () => {
      const resolved = resolveConfig(DEFAULT_SYSTEM_CONFIG);

      expect(resolved.baseFontSize).toBe(16);
      expect(resolved.baseRadius).toBe(6);
      expect(resolved.focusRingWidth).toBe(2);
      expect(resolved.baseTransitionDuration).toBe(150);
    });

    it('computes correct values for different base spacing unit', () => {
      const resolved = resolveConfig({
        ...PURE_MATH_CONFIG,
        baseSpacingUnit: 8,
      });

      // baseFontSize = 8 * 4 = 32
      expect(resolved.baseFontSize).toBe(32);
      // baseRadius = 8 * 1.5 = 12
      expect(resolved.baseRadius).toBe(12);
      // focusRingWidth = 8 / 2 = 4
      expect(resolved.focusRingWidth).toBe(4);
      // baseTransitionDuration = 8 * 37.5 = 300
      expect(resolved.baseTransitionDuration).toBe(300);
    });

    it('allows partial overrides', () => {
      const resolved = resolveConfig({
        ...PURE_MATH_CONFIG,
        baseFontSizeOverride: 18,
        // Other values remain computed
      });

      expect(resolved.baseFontSize).toBe(18);
      expect(resolved.baseRadius).toBe(6); // Computed: 4 * 1.5
    });
  });

  describe('DEFAULT_SYSTEM_CONFIG', () => {
    it('has baseSpacingUnit of 4', () => {
      expect(DEFAULT_SYSTEM_CONFIG.baseSpacingUnit).toBe(4);
    });

    it('uses minor-third progression', () => {
      expect(DEFAULT_SYSTEM_CONFIG.progressionRatio).toBe('minor-third');
    });

    it('has Rafters aesthetic overrides', () => {
      expect(DEFAULT_SYSTEM_CONFIG.baseFontSizeOverride).toBe(16);
      expect(DEFAULT_SYSTEM_CONFIG.baseRadiusOverride).toBe(6);
      expect(DEFAULT_SYSTEM_CONFIG.focusRingWidthOverride).toBe(2);
      expect(DEFAULT_SYSTEM_CONFIG.baseTransitionDurationOverride).toBe(150);
    });
  });

  describe('PURE_MATH_CONFIG', () => {
    it('has no overrides', () => {
      expect(PURE_MATH_CONFIG.baseFontSizeOverride).toBeUndefined();
      expect(PURE_MATH_CONFIG.baseRadiusOverride).toBeUndefined();
      expect(PURE_MATH_CONFIG.focusRingWidthOverride).toBeUndefined();
      expect(PURE_MATH_CONFIG.baseTransitionDurationOverride).toBeUndefined();
    });
  });
});

describe('Token Structure Validation', () => {
  const resolvedConfig = resolveConfig(DEFAULT_SYSTEM_CONFIG);

  function validateTokenStructure(token: Token) {
    // Required fields
    expect(token.name).toBeDefined();
    expect(typeof token.name).toBe('string');
    expect(token.name.length).toBeGreaterThan(0);

    expect(token.value).toBeDefined();

    expect(token.category).toBeDefined();
    expect(typeof token.category).toBe('string');

    expect(token.namespace).toBeDefined();
    expect(typeof token.namespace).toBe('string');

    // Optional but commonly present fields should be correct type when present
    if (token.semanticMeaning !== undefined) {
      expect(typeof token.semanticMeaning).toBe('string');
    }

    if (token.usageContext !== undefined) {
      expect(Array.isArray(token.usageContext)).toBe(true);
    }

    if (token.dependsOn !== undefined) {
      expect(Array.isArray(token.dependsOn)).toBe(true);
    }

    if (token.generatedAt !== undefined) {
      expect(typeof token.generatedAt).toBe('string');
      // Should be ISO timestamp
      const timestamp = token.generatedAt;
      expect(() => new Date(timestamp)).not.toThrow();
    }
  }

  describe('generateColorTokens', () => {
    const result = generateColorTokens(resolvedConfig, DEFAULT_COLOR_SCALES);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('color');
    });

    it('generates tokens array', () => {
      expect(Array.isArray(result.tokens)).toBe(true);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });

    it('generates neutral color scale', () => {
      const neutralTokens = result.tokens.filter(
        (t) => t.name.startsWith('neutral-') && t.name !== 'neutral',
      );
      expect(neutralTokens.length).toBeGreaterThanOrEqual(11); // 50-950
    });

    it('color tokens have OKLCH values', () => {
      const colorToken = result.tokens.find((t) => t.name === 'neutral-500');
      expect(colorToken?.value).toMatch(/oklch\(/);
    });
  });

  describe('generateSpacingTokens', () => {
    const result = generateSpacingTokens(resolvedConfig, DEFAULT_SPACING_MULTIPLIERS);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('spacing');
    });

    it('generates tokens for all scale positions', () => {
      for (const scale of SPACING_SCALE) {
        const token = result.tokens.find((t) => t.name === `spacing-${scale}`);
        expect(token).toBeDefined();
      }
    });

    it('includes base spacing token', () => {
      const baseToken = result.tokens.find((t) => t.name === 'spacing-base');
      expect(baseToken).toBeDefined();
      expect(baseToken?.value).toBe('0.25rem'); // 4px = 0.25rem
    });

    it('calculates correct spacing values', () => {
      const spacing4 = result.tokens.find((t) => t.name === 'spacing-4');
      expect(spacing4?.value).toBe('calc(var(--rafters-spacing-base) * 4)'); // base * 4

      const spacing8 = result.tokens.find((t) => t.name === 'spacing-8');
      expect(spacing8?.value).toBe('calc(var(--rafters-spacing-base) * 8)'); // base * 8
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateTypographyTokens', () => {
    const result = generateTypographyTokens(
      resolvedConfig,
      DEFAULT_TYPOGRAPHY_SCALE,
      DEFAULT_FONT_WEIGHTS,
    );

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('typography');
    });

    it('generates font size tokens for all scale positions', () => {
      for (const scale of TYPOGRAPHY_SCALE) {
        const token = result.tokens.find((t) => t.name === `font-size-${scale}`);
        expect(token).toBeDefined();
      }
    });

    it('generates line height tokens', () => {
      const lineHeightTokens = result.tokens.filter((t) => t.name.startsWith('line-height-'));
      expect(lineHeightTokens.length).toBeGreaterThan(0);
    });

    it('generates font weight tokens', () => {
      const fontWeightTokens = result.tokens.filter((t) => t.name.startsWith('font-weight-'));
      expect(fontWeightTokens.length).toBeGreaterThan(0);
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });

    it('smaller font sizes follow correct scale ordering (sm > xs)', () => {
      const smToken = result.tokens.find((t) => t.name === 'font-size-sm');
      const xsToken = result.tokens.find((t) => t.name === 'font-size-xs');
      const baseToken = result.tokens.find((t) => t.name === 'font-size-base');

      expect(smToken).toBeDefined();
      expect(xsToken).toBeDefined();
      expect(baseToken).toBeDefined();

      const smRem = Number.parseFloat(smToken?.value as string);
      const xsRem = Number.parseFloat(xsToken?.value as string);
      const baseRem = Number.parseFloat(baseToken?.value as string);

      // sm (step -1) should be smaller than base but larger than xs (step -2)
      expect(smRem).toBeLessThan(baseRem);
      expect(smRem).toBeGreaterThan(xsRem);

      // Both should be reasonable sizes (> 0.5rem = 8px)
      expect(smRem).toBeGreaterThan(0.5);
      expect(xsRem).toBeGreaterThan(0.5);

      // sm should equal base / ratio (minor-third = 1.2)
      // 16px / 1.2 = 13.33px = 0.833rem
      expect(smRem).toBeCloseTo(1 / 1.2, 2);
    });
  });

  describe('generateSemanticTokens', () => {
    const result = generateSemanticTokens(resolvedConfig);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('semantic');
    });

    it('generates tokens for semantic intents', () => {
      // Check for key semantic tokens
      const primaryToken = result.tokens.find((t) => t.name === 'primary');
      expect(primaryToken).toBeDefined();

      const destructiveToken = result.tokens.find((t) => t.name === 'destructive');
      expect(destructiveToken).toBeDefined();
    });

    it('generates sidebar tokens', () => {
      const sidebarTokens = result.tokens.filter((t) => t.name.startsWith('sidebar-'));
      expect(sidebarTokens.length).toBeGreaterThan(0);
    });

    it('generates chart tokens', () => {
      for (let i = 1; i <= 5; i++) {
        const chartToken = result.tokens.find((t) => t.name === `chart-${i}`);
        expect(chartToken).toBeDefined();
      }
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateRadiusTokens', () => {
    const result = generateRadiusTokens(resolvedConfig, DEFAULT_RADIUS_DEFINITIONS);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('radius');
    });

    it('generates tokens for all scale positions', () => {
      for (const scale of RADIUS_SCALE) {
        const tokenName = scale === 'DEFAULT' ? 'radius' : `radius-${scale}`;
        const token = result.tokens.find((t) => t.name === tokenName);
        expect(token).toBeDefined();
      }
    });

    it('includes base radius token', () => {
      const baseToken = result.tokens.find((t) => t.name === 'radius-base');
      expect(baseToken).toBeDefined();
      expect(baseToken?.value).toBe('0.375rem'); // 6px = 0.375rem
    });

    it('radius-none is 0', () => {
      const noneToken = result.tokens.find((t) => t.name === 'radius-none');
      expect(noneToken?.value).toBe('0');
    });

    it('radius-full is 9999px', () => {
      const fullToken = result.tokens.find((t) => t.name === 'radius-full');
      expect(fullToken?.value).toBe('9999px');
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateShadowTokens', () => {
    const result = generateShadowTokens(resolvedConfig, DEFAULT_SHADOW_DEFINITIONS);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('shadow');
    });

    it('generates tokens for all scale positions', () => {
      for (const scale of SHADOW_SCALE) {
        const tokenName = scale === 'DEFAULT' ? 'shadow' : `shadow-${scale}`;
        const token = result.tokens.find((t) => t.name === tokenName);
        expect(token).toBeDefined();
      }
    });

    it('shadow-none has no shadow', () => {
      const noneToken = result.tokens.find((t) => t.name === 'shadow-none');
      expect(noneToken?.value).toBe('none');
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateDepthTokens', () => {
    const result = generateDepthTokens(resolvedConfig, DEFAULT_DEPTH_DEFINITIONS);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('depth');
    });

    it('generates tokens for all depth levels', () => {
      for (const level of DEPTH_LEVELS) {
        const token = result.tokens.find((t) => t.name === `depth-${level}`);
        expect(token).toBeDefined();
      }
    });

    it('depth values increase appropriately', () => {
      const baseDepth = result.tokens.find((t) => t.name === 'depth-base');
      const tooltipDepth = result.tokens.find((t) => t.name === 'depth-tooltip');

      expect(Number(baseDepth?.value)).toBeLessThan(Number(tooltipDepth?.value));
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateElevationTokens', () => {
    const result = generateElevationTokens(resolvedConfig, DEFAULT_ELEVATION_DEFINITIONS);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('elevation');
    });

    it('generates tokens for all elevation levels', () => {
      for (const level of ELEVATION_LEVELS) {
        const token = result.tokens.find((t) => t.name === `elevation-${level}`);
        expect(token).toBeDefined();
      }
    });

    it('elevation tokens have z-index and shadow components', () => {
      for (const level of ELEVATION_LEVELS) {
        const zToken = result.tokens.find((t) => t.name === `elevation-${level}-z`);
        const shadowToken = result.tokens.find((t) => t.name === `elevation-${level}-shadow`);
        expect(zToken).toBeDefined();
        expect(shadowToken).toBeDefined();
      }
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateMotionTokens', () => {
    const result = generateMotionTokens(
      resolvedConfig,
      DEFAULT_DURATION_DEFINITIONS,
      DEFAULT_EASING_DEFINITIONS,
      DEFAULT_DELAY_DEFINITIONS,
    );

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('motion');
    });

    it('generates duration tokens for all scale positions', () => {
      for (const scale of MOTION_DURATION_SCALE) {
        const token = result.tokens.find((t) => t.name === `motion-duration-${scale}`);
        expect(token).toBeDefined();
      }
    });

    it('generates easing tokens for all curves', () => {
      for (const curve of EASING_CURVES) {
        const token = result.tokens.find((t) => t.name === `motion-easing-${curve}`);
        expect(token).toBeDefined();
      }
    });

    it('instant duration is 0ms', () => {
      const instantToken = result.tokens.find((t) => t.name === 'motion-duration-instant');
      expect(instantToken?.value).toBe('0ms');
    });

    it('normal duration matches base transition duration', () => {
      const normalToken = result.tokens.find((t) => t.name === 'motion-duration-normal');
      expect(normalToken?.value).toBe('150ms');
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });

    it('generates keyframe tokens', () => {
      const keyframeTokens = result.tokens.filter((t) => t.name.startsWith('motion-keyframe-'));
      expect(keyframeTokens.length).toBe(19);

      // Check specific keyframes exist
      const fadeIn = result.tokens.find((t) => t.name === 'motion-keyframe-fade-in');
      expect(fadeIn).toBeDefined();
      expect(fadeIn?.keyframeName).toBe('fade-in');
      expect(fadeIn?.value).toContain('opacity');

      const slideInFromBottom = result.tokens.find(
        (t) => t.name === 'motion-keyframe-slide-in-from-bottom',
      );
      expect(slideInFromBottom).toBeDefined();
      expect(slideInFromBottom?.value).toContain('translateY');
    });

    it('generates animation tokens', () => {
      const animationTokens = result.tokens.filter((t) => t.name.startsWith('motion-animation-'));
      expect(animationTokens.length).toBe(19);

      // Check specific animations exist
      const fadeIn = result.tokens.find((t) => t.name === 'motion-animation-fade-in');
      expect(fadeIn).toBeDefined();
      expect(fadeIn?.animationName).toBe('fade-in');
      expect(fadeIn?.keyframeName).toBe('fade-in');
      expect(fadeIn?.animationDuration).toBeDefined();
      expect(fadeIn?.animationEasing).toBeDefined();
    });

    it('animation tokens reference duration and easing tokens via var()', () => {
      const fadeIn = result.tokens.find((t) => t.name === 'motion-animation-fade-in');
      expect(fadeIn?.value).toContain('var(--motion-duration-');
      expect(fadeIn?.value).toContain('var(--motion-easing-');
    });

    it('animation tokens with fixed durations use literal values', () => {
      const spin = result.tokens.find((t) => t.name === 'motion-animation-spin');
      expect(spin?.value).toContain('1s');
      expect(spin?.animationIterations).toBe('infinite');
    });

    it('animation tokens have correct dependsOn arrays', () => {
      const fadeIn = result.tokens.find((t) => t.name === 'motion-animation-fade-in');
      expect(fadeIn?.dependsOn).toContain('motion-keyframe-fade-in');
      expect(fadeIn?.dependsOn).toContain('motion-duration-fast');
      expect(fadeIn?.dependsOn).toContain('motion-easing-ease-out');
    });
  });

  describe('generateFocusTokens', () => {
    const result = generateFocusTokens(resolvedConfig, DEFAULT_FOCUS_CONFIGS);

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('focus');
    });

    it('includes focus ring width token', () => {
      const widthToken = result.tokens.find((t) => t.name === 'focus-ring-width');
      expect(widthToken).toBeDefined();
      expect(widthToken?.value).toBe('0.125rem'); // 2px = 0.125rem
    });

    it('includes focus ring color token', () => {
      const colorToken = result.tokens.find((t) => t.name === 'focus-ring-color');
      expect(colorToken).toBeDefined();
      expect(colorToken?.value).toBe('var(--ring)');
    });

    it('includes default focus ring configuration', () => {
      const focusRing = result.tokens.find((t) => t.name === 'focus-ring');
      expect(focusRing).toBeDefined();
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });

  describe('generateBreakpointTokens', () => {
    const result = generateBreakpointTokens(
      resolvedConfig,
      DEFAULT_BREAKPOINTS,
      DEFAULT_CONTAINER_BREAKPOINTS,
    );

    it('returns correct namespace', () => {
      expect(result.namespace).toBe('breakpoint');
    });

    it('generates viewport breakpoints for all scale positions', () => {
      for (const scale of BREAKPOINT_SCALE) {
        const token = result.tokens.find((t) => t.name === `breakpoint-${scale}`);
        expect(token).toBeDefined();
      }
    });

    it('generates container query breakpoints', () => {
      const cqTokens = result.tokens.filter((t) => t.name.startsWith('container-'));
      expect(cqTokens.length).toBeGreaterThan(0);
    });

    it('includes accessibility media queries', () => {
      const reducedMotion = result.tokens.find((t) => t.name === 'breakpoint-motion-reduce');
      const dark = result.tokens.find((t) => t.name === 'breakpoint-dark');
      const highContrast = result.tokens.find((t) => t.name === 'breakpoint-high-contrast');

      expect(reducedMotion).toBeDefined();
      expect(dark).toBeDefined();
      expect(highContrast).toBeDefined();
    });

    it('all tokens have valid structure', () => {
      for (const token of result.tokens) {
        validateTokenStructure(token);
      }
    });
  });
});

describe('Orchestration', () => {
  describe('generateBaseSystem', () => {
    it('generates all namespaces', () => {
      const result = generateBaseSystem();
      const namespaces = getAvailableNamespaces();

      for (const namespace of namespaces) {
        expect(result.byNamespace.has(namespace)).toBe(true);
      }
    });

    it('returns metadata with generation timestamp', () => {
      const result = generateBaseSystem();

      expect(result.metadata.generatedAt).toBeDefined();
      expect(() => new Date(result.metadata.generatedAt)).not.toThrow();
    });

    it('returns metadata with resolved config', () => {
      const result = generateBaseSystem();

      expect(result.metadata.config).toBeDefined();
      expect(result.metadata.config.baseSpacingUnit).toBe(4);
      expect(result.metadata.config.baseFontSize).toBe(16);
    });

    it('returns correct token count', () => {
      const result = generateBaseSystem();

      expect(result.metadata.tokenCount).toBe(result.allTokens.length);
      expect(result.metadata.tokenCount).toBeGreaterThan(0);
    });

    it('generates many tokens', () => {
      const result = generateBaseSystem();

      // Should generate a significant number of tokens
      expect(result.allTokens.length).toBeGreaterThan(100);
    });

    it('accepts config overrides', () => {
      const result = generateBaseSystem({
        baseSpacingUnit: 8,
      });

      expect(result.metadata.config.baseSpacingUnit).toBe(8);

      // Spacing uses calc() with var() for cascade -- multiplier stays the same
      const spacing4 = result.allTokens.find((t) => t.name === 'spacing-4');
      expect(spacing4?.value).toBe('calc(var(--rafters-spacing-base) * 4)');
    });

    it('uses custom colorPaletteBases when provided', () => {
      const customBases = {
        'custom-red': { hue: 0, chroma: 0.25, description: 'Custom red' },
        'custom-blue': { hue: 240, chroma: 0.15, description: 'Custom blue' },
      };

      const result = generateBaseSystem({ colorPaletteBases: customBases });

      // Should generate color tokens for custom families
      const customRed500 = result.allTokens.find((t) => t.name === 'custom-red-500');
      const customBlue500 = result.allTokens.find((t) => t.name === 'custom-blue-500');

      expect(customRed500).toBeDefined();
      expect(customBlue500).toBeDefined();
      expect(customRed500?.value).toMatch(/oklch\(/);
      expect(customBlue500?.value).toMatch(/oklch\(/);

      // Should NOT have default color families when custom bases provided
      const silverGlacier500 = result.allTokens.find((t) => t.name === 'silver-true-glacier-500');
      expect(silverGlacier500).toBeUndefined();
    });

    it('still includes neutral scale when custom colorPaletteBases provided', () => {
      const customBases = {
        primary: { hue: 180, chroma: 0.12, description: 'Primary' },
      };

      const result = generateBaseSystem({ colorPaletteBases: customBases });

      // Neutral is from DEFAULT_COLOR_SCALES, not DEFAULT_SEMANTIC_COLOR_BASES
      const neutral500 = result.allTokens.find((t) => t.name === 'neutral-500');
      expect(neutral500).toBeDefined();
    });
  });

  describe('generateNamespaces', () => {
    it('generates only requested namespaces', () => {
      const result = generateNamespaces(['color', 'spacing']);

      expect(result.byNamespace.size).toBe(2);
      expect(result.byNamespace.has('color')).toBe(true);
      expect(result.byNamespace.has('spacing')).toBe(true);
      expect(result.byNamespace.has('typography')).toBe(false);
    });

    it('returns empty result for empty namespace array', () => {
      const result = generateNamespaces([]);

      expect(result.byNamespace.size).toBe(0);
      expect(result.allTokens.length).toBe(0);
    });
  });

  describe('toNamespaceJSON', () => {
    it('converts Map to plain object', () => {
      const result = generateBaseSystem();
      const json = toNamespaceJSON(result);

      expect(typeof json).toBe('object');
      expect(Array.isArray(json)).toBe(false);
      expect(json.color).toBeDefined();
      expect(Array.isArray(json.color)).toBe(true);
    });
  });

  describe('toTokenMap', () => {
    it('creates name-to-token map', () => {
      const result = generateBaseSystem();
      const map = toTokenMap(result);

      expect(map instanceof Map).toBe(true);
      expect(map.get('spacing-4')).toBeDefined();
      expect(map.get('radius')).toBeDefined();
    });

    it('allows quick token lookups', () => {
      const result = generateBaseSystem();
      const map = toTokenMap(result);

      const spacing4 = map.get('spacing-4');
      expect(spacing4?.value).toBe('calc(var(--rafters-spacing-base) * 4)'); // base * 4
    });
  });

  describe('getAvailableNamespaces', () => {
    it('returns array of namespace names', () => {
      const namespaces = getAvailableNamespaces();

      expect(Array.isArray(namespaces)).toBe(true);
      expect(namespaces).toContain('color');
      expect(namespaces).toContain('spacing');
      expect(namespaces).toContain('typography');
    });
  });

  describe('getGeneratorInfo', () => {
    it('returns info for all generators', () => {
      const info = getGeneratorInfo();
      const namespaces = getAvailableNamespaces();

      expect(info.length).toBe(namespaces.length);
    });

    it('each generator has name and description', () => {
      const info = getGeneratorInfo();

      for (const gen of info) {
        expect(gen.name).toBeDefined();
        expect(typeof gen.name).toBe('string');
        expect(gen.description).toBeDefined();
        expect(typeof gen.description).toBe('string');
      }
    });
  });
});

describe('Mathematical Relationships', () => {
  describe('Pure Math Config', () => {
    const pureResult = generateBaseSystem({
      ...PURE_MATH_CONFIG,
    });

    it('derived values match formulas from baseSpacingUnit', () => {
      const config = pureResult.metadata.config;

      // baseFontSize = baseSpacingUnit * 4
      expect(config.baseFontSize).toBe(config.baseSpacingUnit * 4);

      // baseRadius = baseSpacingUnit * 1.5
      expect(config.baseRadius).toBe(config.baseSpacingUnit * 1.5);

      // focusRingWidth = baseSpacingUnit / 2
      expect(config.focusRingWidth).toBe(config.baseSpacingUnit / 2);

      // baseTransitionDuration = baseSpacingUnit * 37.5
      expect(config.baseTransitionDuration).toBe(config.baseSpacingUnit * 37.5);
    });
  });

  describe('Different Base Spacing Unit', () => {
    it('scales all values proportionally', () => {
      const base4Result = generateBaseSystem({ baseSpacingUnit: 4 });
      const base8Result = generateBaseSystem({ baseSpacingUnit: 8 });

      // Spacing should scale
      const spacing4_base4 = base4Result.allTokens.find((t) => t.name === 'spacing-4');
      const spacing4_base8 = base8Result.allTokens.find((t) => t.name === 'spacing-4');

      // Both use calc() -- the base value differs but multiplier is the same
      // CSS cascade handles the actual computation at runtime
      expect(spacing4_base4?.value).toBe('calc(var(--rafters-spacing-base) * 4)');
      expect(spacing4_base8?.value).toBe('calc(var(--rafters-spacing-base) * 4)');
    });
  });

  describe('Progression Ratio', () => {
    it('can use different progression ratios', () => {
      const minorThird = generateBaseSystem({
        progressionRatio: 'minor-third',
      });
      const perfectFourth = generateBaseSystem({
        progressionRatio: 'perfect-fourth',
      });

      // Both should generate successfully
      expect(minorThird.allTokens.length).toBeGreaterThan(0);
      expect(perfectFourth.allTokens.length).toBeGreaterThan(0);

      // Metadata should reflect the ratio
      expect(minorThird.metadata.config.progressionRatio).toBe('minor-third');
      expect(perfectFourth.metadata.config.progressionRatio).toBe('perfect-fourth');
    });
  });
});

describe('Token Dependencies', () => {
  const result = generateBaseSystem();
  const tokenMap = toTokenMap(result);

  it('spacing tokens depend on spacing-base', () => {
    const spacing4 = tokenMap.get('spacing-4');
    expect(spacing4?.dependsOn).toContain('spacing-base');
  });

  it('elevation tokens depend on depth and shadow', () => {
    const elevationModal = tokenMap.get('elevation-modal');
    expect(elevationModal?.dependsOn).toBeDefined();
    expect(elevationModal?.dependsOn?.length).toBeGreaterThan(0);
  });

  it('focus tokens depend on ring', () => {
    const focusRing = tokenMap.get('focus-ring');
    expect(focusRing?.dependsOn).toContain('ring');
  });

  // Semantic color dependencies
  it('destructive depends on silver-bold-fire-truck color family', () => {
    const destructive = tokenMap.get('destructive');
    expect(destructive?.dependsOn).toBeDefined();
    // dependsOn[0] = family token (for ColorValue/WCAG data access)
    expect(destructive?.dependsOn).toContain('silver-bold-fire-truck');
  });

  it('success depends on silver-true-citrine color family', () => {
    const success = tokenMap.get('success');
    expect(success?.dependsOn).toBeDefined();
    expect(success?.dependsOn).toContain('silver-true-citrine');
  });

  it('warning depends on silver-true-honey color family', () => {
    const warning = tokenMap.get('warning');
    expect(warning?.dependsOn).toBeDefined();
    expect(warning?.dependsOn).toContain('silver-true-honey');
  });

  it('info depends on silver-true-sky color family', () => {
    const info = tokenMap.get('info');
    expect(info?.dependsOn).toBeDefined();
    expect(info?.dependsOn).toContain('silver-true-sky');
  });

  it('semantic tokens include family and dark mode position dependencies', () => {
    const destructive = tokenMap.get('destructive');
    expect(destructive?.dependsOn).toBeDefined();
    // dependsOn[0] = family token, dependsOn[1] = dark mode position token
    expect(destructive?.dependsOn).toContain('silver-bold-fire-truck');
    expect(destructive?.dependsOn).toContain('silver-bold-fire-truck-500');
  });
});

describe('Accessibility Metadata', () => {
  const result = generateBaseSystem();
  const tokenMap = toTokenMap(result);

  it('focus tokens have accessibility level', () => {
    const focusRingWidth = tokenMap.get('focus-ring-width');
    expect(focusRingWidth?.accessibilityLevel).toBe('AA');
  });

  it('motion tokens are reduced motion aware', () => {
    const motionDuration = tokenMap.get('motion-duration-normal');
    expect(motionDuration?.reducedMotionAware).toBe(true);
  });

  it('breakpoint tokens include accessibility queries', () => {
    const reducedMotion = tokenMap.get('breakpoint-motion-reduce');
    expect(reducedMotion?.value).toBe('(prefers-reduced-motion: reduce)');
  });
});
