/**
 * Unit tests for Token and ColorValue schemas
 * Tests Zod schema validation for intelligence metadata
 */

import { describe, expect, it } from 'vitest';
import {
  ColorAccessibilitySchema,
  ColorIntelligenceSchema,
  ColorValueSchema,
  OKLCHSchema,
  TokenSchema,
} from '../src/types.js';

describe('OKLCH Schema', () => {
  it('validates valid OKLCH colors', () => {
    const validColor = { l: 0.5, c: 0.1, h: 180, alpha: 1 };
    expect(() => OKLCHSchema.parse(validColor)).not.toThrow();
  });

  it('validates OKLCH with optional alpha', () => {
    const colorNoAlpha = { l: 0.5, c: 0.1, h: 180 };
    const parsed = OKLCHSchema.parse(colorNoAlpha);
    expect(parsed.alpha).toBe(1); // Default value
  });

  it('rejects invalid lightness values', () => {
    const invalidColor = { l: 1.5, c: 0.1, h: 180 }; // L > 1
    expect(() => OKLCHSchema.parse(invalidColor)).toThrow();
  });

  it('rejects negative chroma', () => {
    const invalidColor = { l: 0.5, c: -0.1, h: 180 };
    expect(() => OKLCHSchema.parse(invalidColor)).toThrow();
  });

  it('rejects invalid hue range', () => {
    const invalidColor = { l: 0.5, c: 0.1, h: 400 }; // H > 360
    expect(() => OKLCHSchema.parse(invalidColor)).toThrow();
  });
});

describe('ColorIntelligence Schema', () => {
  it('validates complete color intelligence', () => {
    // Note: suggestedName removed - naming is now deterministic via generateColorName()
    const intelligence = {
      reasoning: 'Resembles deep ocean water',
      emotionalImpact: 'Calm and trustworthy',
      culturalContext: 'Associated with stability in Western cultures',
      accessibilityNotes: 'Passes WCAG AA for normal text on white',
      usageGuidance: 'Use for primary actions and trust indicators',
      metadata: {
        predictionId: 'pred_123',
        confidence: 0.92,
        uncertaintyBounds: {
          lower: 0.85,
          upper: 0.95,
          confidenceInterval: 0.95,
        },
        qualityScore: 0.88,
        method: 'ensemble',
      },
    };

    expect(() => ColorIntelligenceSchema.parse(intelligence)).not.toThrow();
  });

  it('validates without optional metadata', () => {
    const intelligence = {
      reasoning: 'Resembles deep ocean water',
      emotionalImpact: 'Calm',
      culturalContext: 'Western stability',
      accessibilityNotes: 'WCAG AA',
      usageGuidance: 'Primary actions',
    };

    expect(() => ColorIntelligenceSchema.parse(intelligence)).not.toThrow();
  });

  it('rejects invalid confidence values', () => {
    const intelligence = {
      reasoning: 'Test',
      emotionalImpact: 'Test',
      culturalContext: 'Test',
      accessibilityNotes: 'Test',
      usageGuidance: 'Test',
      metadata: {
        predictionId: 'pred_123',
        confidence: 1.5, // Invalid: > 1
        uncertaintyBounds: {
          lower: 0.85,
          upper: 0.95,
          confidenceInterval: 0.95,
        },
        qualityScore: 0.88,
        method: 'ensemble',
      },
    };

    expect(() => ColorIntelligenceSchema.parse(intelligence)).toThrow();
  });
});

describe('ColorAccessibility Schema', () => {
  it('validates with WCAG matrices', () => {
    const accessibility = {
      onWhite: {
        wcagAA: true,
        wcagAAA: false,
        contrastRatio: 4.5,
        aa: [5, 6, 7, 8, 9],
        aaa: [7, 8, 9],
      },
      onBlack: {
        wcagAA: true,
        wcagAAA: true,
        contrastRatio: 15.2,
        aa: [0, 1, 2, 3, 4],
        aaa: [0, 1, 2],
      },
      wcagAA: {
        normal: [
          [0, 5],
          [0, 6],
        ],
        large: [
          [0, 4],
          [0, 5],
        ],
      },
    };

    expect(() => ColorAccessibilitySchema.parse(accessibility)).not.toThrow();
  });

  it('validates with APCA scores', () => {
    const accessibility = {
      onWhite: {
        wcagAA: true,
        wcagAAA: false,
        contrastRatio: 4.5,
      },
      onBlack: {
        wcagAA: true,
        wcagAAA: true,
        contrastRatio: 15.2,
      },
      apca: {
        onWhite: 60,
        onBlack: 90,
        minFontSize: 14,
      },
    };

    expect(() => ColorAccessibilitySchema.parse(accessibility)).not.toThrow();
  });

  it('validates with CVD simulations', () => {
    const accessibility = {
      onWhite: {
        wcagAA: true,
        wcagAAA: false,
        contrastRatio: 4.5,
      },
      onBlack: {
        wcagAA: true,
        wcagAAA: true,
        contrastRatio: 15.2,
      },
      cvd: {
        deuteranopia: { l: 0.5, c: 0.08, h: 200, alpha: 1 },
        protanopia: { l: 0.5, c: 0.07, h: 210, alpha: 1 },
        tritanopia: { l: 0.5, c: 0.09, h: 190, alpha: 1 },
      },
    };

    expect(() => ColorAccessibilitySchema.parse(accessibility)).not.toThrow();
  });
});

describe('ColorValue Schema', () => {
  it('validates complete ColorValue with all intelligence', () => {
    const colorValue = {
      name: 'ocean-blue',
      scale: [
        { l: 0.95, c: 0.02, h: 220, alpha: 1 },
        { l: 0.5, c: 0.15, h: 220, alpha: 1 },
        { l: 0.2, c: 0.1, h: 220, alpha: 1 },
      ],
      token: 'primary',
      value: '500',
      intelligence: {
        reasoning: 'Deep ocean color',
        emotionalImpact: 'Calm',
        culturalContext: 'Stability',
        accessibilityNotes: 'WCAG AA',
        usageGuidance: 'Primary actions',
      },
      accessibility: {
        onWhite: {
          wcagAA: true,
          wcagAAA: false,
          contrastRatio: 4.5,
        },
        onBlack: {
          wcagAA: true,
          wcagAAA: true,
          contrastRatio: 15.2,
        },
      },
      tokenId: 'color-0.5-0.15-220',
    };

    expect(() => ColorValueSchema.parse(colorValue)).not.toThrow();
  });

  it('validates minimal ColorValue', () => {
    const colorValue = {
      name: 'blue',
      scale: [{ l: 0.5, c: 0.15, h: 220, alpha: 1 }],
    };

    expect(() => ColorValueSchema.parse(colorValue)).not.toThrow();
  });

  it('requires name and scale', () => {
    const invalidColor = {
      token: 'primary',
    };

    expect(() => ColorValueSchema.parse(invalidColor)).toThrow();
  });
});

describe('Token Schema', () => {
  it('validates token with mathRelationship field', () => {
    const token = {
      name: 'spacing-lg',
      value: '24px',
      category: 'spacing',
      namespace: 'core',
      mathRelationship: 'golden * 16',
      dependsOn: ['spacing-base'],
      generationRule: 'calc({spacing-base} * golden)',
      userOverride: null,
    };

    expect(() => TokenSchema.parse(token)).not.toThrow();
  });

  it('validates token with ColorValue', () => {
    const token = {
      name: 'color-primary',
      value: {
        name: 'ocean-blue',
        scale: [{ l: 0.5, c: 0.15, h: 220, alpha: 1 }],
      },
      category: 'color',
      namespace: 'core',
      userOverride: null,
    };

    expect(() => TokenSchema.parse(token)).not.toThrow();
  });

  it('validates token with complete intelligence', () => {
    const token = {
      name: 'button-primary',
      value: '#0066cc',
      category: 'color',
      namespace: 'semantic',
      semanticMeaning: 'Primary action color for buttons',
      usageContext: ['buttons', 'links', 'call-to-action'],
      trustLevel: 'high',
      cognitiveLoad: 3,
      accessibilityLevel: 'AA',
      consequence: 'reversible',
      userOverride: null,
    };

    expect(() => TokenSchema.parse(token)).not.toThrow();
  });

  it('validates token with dependency information', () => {
    const token = {
      name: 'color-primary-hover',
      value: '#0052a3',
      category: 'color',
      namespace: 'semantic',
      dependsOn: ['color-primary'],
      generationRule: 'state:hover',
      interactionType: 'hover',
      userOverride: null,
    };

    expect(() => TokenSchema.parse(token)).not.toThrow();
  });

  it('requires name, value, category, and namespace', () => {
    const invalidToken = {
      name: 'test',
      category: 'color',
    };

    expect(() => TokenSchema.parse(invalidToken)).toThrow();
  });

  it('validates cognitiveLoad range 1-10', () => {
    const validToken = {
      name: 'button',
      value: '#000',
      category: 'color',
      namespace: 'core',
      cognitiveLoad: 5,
      userOverride: null,
    };

    expect(() => TokenSchema.parse(validToken)).not.toThrow();

    const invalidToken = {
      name: 'button',
      value: '#000',
      category: 'color',
      namespace: 'core',
      cognitiveLoad: 15, // > 10
      userOverride: null,
    };

    expect(() => TokenSchema.parse(invalidToken)).toThrow();
  });

  it('validates trustLevel enum', () => {
    const validLevels = ['low', 'medium', 'high', 'critical'];

    for (const level of validLevels) {
      const token = {
        name: 'test',
        value: '#000',
        category: 'color',
        namespace: 'core',
        trustLevel: level,
        userOverride: null,
      };

      expect(() => TokenSchema.parse(token)).not.toThrow();
    }

    const invalidToken = {
      name: 'test',
      value: '#000',
      category: 'color',
      namespace: 'core',
      trustLevel: 'extreme', // Invalid
      userOverride: null,
    };

    expect(() => TokenSchema.parse(invalidToken)).toThrow();
  });

  it('rejects token with userOverride omitted entirely', () => {
    // userOverride is required (nullable, not optional).
    // Omitting it entirely must fail Zod validation.
    const tokenWithoutUserOverride = {
      name: 'spacing-base',
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
    };

    expect(() => TokenSchema.parse(tokenWithoutUserOverride)).toThrow();
  });

  it('accepts token with userOverride: null (generated baseline)', () => {
    const generatedToken = {
      name: 'spacing-base',
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
      userOverride: null,
    };

    expect(() => TokenSchema.parse(generatedToken)).not.toThrow();
    const parsed = TokenSchema.parse(generatedToken);
    expect(parsed.userOverride).toBeNull();
  });

  it('accepts token with populated userOverride (designer override)', () => {
    const overriddenToken = {
      name: 'spacing-base',
      value: '1.25rem',
      category: 'spacing',
      namespace: 'spacing',
      userOverride: {
        previousValue: '1rem',
        reason: 'Increased base unit for improved touch target density on mobile',
        context: 'Q2 mobile accessibility audit',
      },
    };

    expect(() => TokenSchema.parse(overriddenToken)).not.toThrow();
    const parsed = TokenSchema.parse(overriddenToken);
    expect(parsed.userOverride).not.toBeNull();
    expect(parsed.userOverride?.reason).toBe(
      'Increased base unit for improved touch target density on mobile',
    );
  });
});
