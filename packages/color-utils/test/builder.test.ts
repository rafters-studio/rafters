/**
 * Tests for buildColorValue() - the main entry point for generating complete ColorValue objects
 */

import type { OKLCH } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { rebakeAccessibility } from '../src/accessibility.js';
import { buildColorValue } from '../src/builder.js';
import { roundOKLCH } from '../src/conversion.js';
import { getGamutTier, toGamutCeiling } from '../src/gamut.js';
import { generateOKLCHScale } from '../src/harmony.js';
import { SCALE_POSITIONS } from '../src/scale-positions.js';

describe('buildColorValue', () => {
  // Reference colors for testing
  const blue: OKLCH = { l: 0.5, c: 0.15, h: 240, alpha: 1 };
  const red: OKLCH = { l: 0.5, c: 0.2, h: 25, alpha: 1 };
  const _green: OKLCH = { l: 0.6, c: 0.15, h: 145, alpha: 1 };
  const gray: OKLCH = { l: 0.5, c: 0.01, h: 0, alpha: 1 }; // Achromatic
  const white: OKLCH = { l: 0.98, c: 0, h: 0, alpha: 1 };
  const black: OKLCH = { l: 0.05, c: 0, h: 0, alpha: 1 };

  describe('basic structure', () => {
    it('returns a ColorValue with required fields', () => {
      const result = buildColorValue(blue);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('scale');
      expect(result).toHaveProperty('tokenId');
      expect(result).toHaveProperty('harmonies');
      expect(result).toHaveProperty('accessibility');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('atmosphericWeight');
      expect(result).toHaveProperty('perceptualWeight');
      expect(result).toHaveProperty('semanticSuggestions');
    });

    it('generates a deterministic name', () => {
      const result1 = buildColorValue(blue);
      const result2 = buildColorValue(blue);

      expect(result1.name).toBe(result2.name);
      expect(typeof result1.name).toBe('string');
      expect(result1.name.length).toBeGreaterThan(0);
    });

    it('generates a tokenId in correct format', () => {
      const result = buildColorValue(blue);

      expect(result.tokenId).toMatch(/^color-\d+\.\d{3}-\d+\.\d{3}-\d+$/);
      expect(result.tokenId).toBe('color-0.500-0.150-240');
    });
  });

  describe('scale generation', () => {
    it('generates an 11-position scale', () => {
      const result = buildColorValue(blue);

      expect(result.scale).toHaveLength(11);
    });

    it('generates OKLCH objects in the scale', () => {
      const result = buildColorValue(blue);

      for (const color of result.scale) {
        expect(color).toHaveProperty('l');
        expect(color).toHaveProperty('c');
        expect(color).toHaveProperty('h');
        expect(typeof color.l).toBe('number');
        expect(typeof color.c).toBe('number');
        expect(typeof color.h).toBe('number');
      }
    });

    it('scale progresses from light to dark', () => {
      const result = buildColorValue(blue);

      // First position (50) should be lightest
      expect(result.scale[0]?.l).toBeGreaterThan(0.9);
      // Last position (950) should be darkest
      expect(result.scale[10]?.l).toBeLessThan(0.1);
    });

    it('keeps the base hue on every step that needed no gamut mapping', () => {
      // An sRGB seed: steps already in sRGB are not moved and keep the hue
      // exactly. Mapped steps must land in sRGB; their hue is held by the
      // #2873 seed test below.
      const muted: OKLCH = { l: 0.5, c: 0.05, h: 240, alpha: 1 };
      const unmapped = SCALE_POSITIONS.map((pos) => generateOKLCHScale(muted)[pos]);
      const result = buildColorValue(muted);
      expect(result.seedAdjusted).toBeUndefined();
      let kept = 0;
      for (const [i, color] of result.scale.entries()) {
        const before = unmapped[i];
        if (before && getGamutTier(before) === 'srgb') {
          expect(color).toEqual(before);
          expect(color.h).toBe(240);
          kept++;
        } else {
          expect(getGamutTier(color)).toBe('srgb');
        }
      }
      expect(kept).toBeGreaterThan(5);
    });
  });

  describe('harmonies', () => {
    it('generates all harmony types', () => {
      const result = buildColorValue(blue);

      expect(result.harmonies).toHaveProperty('complementary');
      expect(result.harmonies).toHaveProperty('triadic');
      expect(result.harmonies).toHaveProperty('analogous');
      expect(result.harmonies).toHaveProperty('tetradic');
      expect(result.harmonies).toHaveProperty('splitComplementary');
      expect(result.harmonies).toHaveProperty('monochromatic');
    });

    it('complementary is approximately opposite hue', () => {
      const result = buildColorValue(blue);

      // Blue (240°) complementary should be around orange/yellow (60°)
      const complementaryHue = result.harmonies?.complementary.h;
      expect(complementaryHue).toBeGreaterThan(30);
      expect(complementaryHue).toBeLessThan(90);
    });

    it('triadic has 3 colors', () => {
      const result = buildColorValue(blue);

      expect(result.harmonies?.triadic).toHaveLength(3);
    });

    it('analogous has 6 colors', () => {
      const result = buildColorValue(blue);

      expect(result.harmonies?.analogous).toHaveLength(6);
    });

    it('tetradic has 4 colors', () => {
      const result = buildColorValue(blue);

      expect(result.harmonies?.tetradic).toHaveLength(4);
    });

    it('splitComplementary has 3 colors', () => {
      const result = buildColorValue(blue);

      expect(result.harmonies?.splitComplementary).toHaveLength(3);
    });

    it('monochromatic has 6 colors', () => {
      const result = buildColorValue(blue);

      expect(result.harmonies?.monochromatic).toHaveLength(6);
    });
  });

  describe('accessibility', () => {
    it('includes WCAG AA and AAA matrices', () => {
      const result = buildColorValue(blue);

      expect(result.accessibility).toHaveProperty('wcagAA');
      expect(result.accessibility).toHaveProperty('wcagAAA');
      expect(result.accessibility?.wcagAA).toHaveProperty('normal');
      expect(result.accessibility?.wcagAA).toHaveProperty('large');
    });

    it('includes onWhite accessibility data', () => {
      const result = buildColorValue(blue);

      expect(result.accessibility?.onWhite).toHaveProperty('wcagAA');
      expect(result.accessibility?.onWhite).toHaveProperty('wcagAAA');
      expect(result.accessibility?.onWhite).toHaveProperty('contrastRatio');
      expect(typeof result.accessibility?.onWhite.contrastRatio).toBe('number');
    });

    it('includes onBlack accessibility data', () => {
      const result = buildColorValue(blue);

      expect(result.accessibility?.onBlack).toHaveProperty('wcagAA');
      expect(result.accessibility?.onBlack).toHaveProperty('wcagAAA');
      expect(result.accessibility?.onBlack).toHaveProperty('contrastRatio');
    });

    it('includes APCA data', () => {
      const result = buildColorValue(blue);

      expect(result.accessibility?.apca).toHaveProperty('onWhite');
      expect(result.accessibility?.apca).toHaveProperty('onBlack');
      expect(result.accessibility?.apca).toHaveProperty('minFontSize');
    });

    it('dark colors pass AA on white', () => {
      const darkBlue: OKLCH = { l: 0.3, c: 0.15, h: 240, alpha: 1 };
      const result = buildColorValue(darkBlue);

      expect(result.accessibility?.onWhite.wcagAA).toBe(true);
    });

    it('light colors pass AA on black', () => {
      const lightBlue: OKLCH = { l: 0.85, c: 0.1, h: 240, alpha: 1 };
      const result = buildColorValue(lightBlue);

      expect(result.accessibility?.onBlack.wcagAA).toBe(true);
    });
  });

  describe('analysis', () => {
    it('includes temperature analysis', () => {
      const result = buildColorValue(blue);

      expect(result.analysis).toHaveProperty('temperature');
      expect(['warm', 'cool', 'neutral']).toContain(result.analysis?.temperature);
    });

    it('blue is cool', () => {
      const result = buildColorValue(blue);
      expect(result.analysis?.temperature).toBe('cool');
    });

    it('red is warm', () => {
      const result = buildColorValue(red);
      expect(result.analysis?.temperature).toBe('warm');
    });

    it('gray is neutral', () => {
      const result = buildColorValue(gray);
      expect(result.analysis?.temperature).toBe('neutral');
    });

    it('includes isLight boolean', () => {
      const result = buildColorValue(blue);

      expect(result.analysis).toHaveProperty('isLight');
      expect(typeof result.analysis?.isLight).toBe('boolean');
    });

    it('includes name in analysis', () => {
      const result = buildColorValue(blue);

      expect(result.analysis).toHaveProperty('name');
      expect(result.analysis?.name).toBe(result.name);
    });
  });

  describe('atmospheric weight', () => {
    it('includes distanceWeight', () => {
      const result = buildColorValue(blue);

      expect(result.atmosphericWeight).toHaveProperty('distanceWeight');
      expect(result.atmosphericWeight?.distanceWeight).toBeGreaterThanOrEqual(0);
      expect(result.atmosphericWeight?.distanceWeight).toBeLessThanOrEqual(1);
    });

    it('includes temperature', () => {
      const result = buildColorValue(blue);

      expect(result.atmosphericWeight).toHaveProperty('temperature');
      expect(['warm', 'cool', 'neutral']).toContain(result.atmosphericWeight?.temperature);
    });

    it('includes atmosphericRole', () => {
      const result = buildColorValue(blue);

      expect(result.atmosphericWeight).toHaveProperty('atmosphericRole');
      expect(['background', 'midground', 'foreground']).toContain(
        result.atmosphericWeight?.atmosphericRole,
      );
    });
  });

  describe('perceptual weight', () => {
    it('includes weight value', () => {
      const result = buildColorValue(blue);

      expect(result.perceptualWeight).toHaveProperty('weight');
      expect(result.perceptualWeight?.weight).toBeGreaterThanOrEqual(0);
      expect(result.perceptualWeight?.weight).toBeLessThanOrEqual(1);
    });

    it('includes density', () => {
      const result = buildColorValue(blue);

      expect(result.perceptualWeight).toHaveProperty('density');
      expect(['light', 'medium', 'heavy']).toContain(result.perceptualWeight?.density);
    });

    it('red has higher weight than blue', () => {
      const redResult = buildColorValue(red);
      const blueResult = buildColorValue(blue);

      // Red is perceptually heavier
      expect(redResult.perceptualWeight?.weight).toBeGreaterThan(
        blueResult.perceptualWeight?.weight,
      );
    });
  });

  describe('semantic suggestions', () => {
    it('includes all semantic categories', () => {
      const result = buildColorValue(blue);

      expect(result.semanticSuggestions).toHaveProperty('destructive');
      expect(result.semanticSuggestions).toHaveProperty('danger'); // deprecated mirror
      expect(result.semanticSuggestions).toHaveProperty('success');
      expect(result.semanticSuggestions).toHaveProperty('warning');
      expect(result.semanticSuggestions).toHaveProperty('info');
    });

    it('each category has 3 suggestions', () => {
      const result = buildColorValue(blue);

      expect(result.semanticSuggestions?.destructive).toHaveLength(3);
      expect(result.semanticSuggestions?.success).toHaveLength(3);
      expect(result.semanticSuggestions?.warning).toHaveLength(3);
      expect(result.semanticSuggestions?.info).toHaveLength(3);
    });

    it('danger suggestions are in red hue range', () => {
      const result = buildColorValue(blue);
      const danger = result.semanticSuggestions?.destructive ?? [];

      for (const color of danger) {
        // Red hues: 0-30 or 330-360
        expect(color.h <= 30 || color.h >= 330).toBe(true);
      }
    });

    it('success suggestions are in green hue range', () => {
      const result = buildColorValue(blue);
      const success = result.semanticSuggestions?.success ?? [];

      for (const color of success) {
        // Green hues: roughly 120-150
        expect(color.h).toBeGreaterThanOrEqual(100);
        expect(color.h).toBeLessThanOrEqual(170);
      }
    });
  });

  describe('options', () => {
    it('accepts token option', () => {
      const result = buildColorValue(blue, { token: 'primary' });

      expect(result.token).toBe('primary');
    });

    it('accepts value option', () => {
      const result = buildColorValue(blue, { value: '500' });

      expect(result.value).toBe('500');
    });

    it('accepts use option', () => {
      const result = buildColorValue(blue, { use: 'Brand primary color' });

      expect(result.use).toBe('Brand primary color');
    });

    it('accepts states option', () => {
      const states = { hover: 'blue-600', focus: 'blue-700' };
      const result = buildColorValue(blue, { states });

      expect(result.states).toEqual(states);
    });

    it('combines all options', () => {
      const result = buildColorValue(blue, {
        token: 'primary',
        value: '500',
        use: 'Main brand color',
        states: { hover: 'primary-600' },
      });

      expect(result.token).toBe('primary');
      expect(result.value).toBe('500');
      expect(result.use).toBe('Main brand color');
      expect(result.states).toEqual({ hover: 'primary-600' });
    });

    it('does not include undefined options', () => {
      const result = buildColorValue(blue);

      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('value');
      expect(result).not.toHaveProperty('use');
      expect(result).not.toHaveProperty('states');
    });
  });

  describe('edge cases', () => {
    it('handles pure white', () => {
      const result = buildColorValue(white);

      expect(result.name).toBeDefined();
      expect(result.scale).toHaveLength(11);
      expect(result.analysis?.isLight).toBe(true);
    });

    it('handles pure black', () => {
      const result = buildColorValue(black);

      expect(result.name).toBeDefined();
      expect(result.scale).toHaveLength(11);
      expect(result.analysis?.isLight).toBe(false);
    });

    it('handles achromatic gray', () => {
      const result = buildColorValue(gray);

      expect(result.name).toBeDefined();
      expect(result.analysis?.temperature).toBe('neutral');
    });

    it('handles high chroma colors', () => {
      const vivid: OKLCH = { l: 0.5, c: 0.35, h: 30, alpha: 1 };
      const result = buildColorValue(vivid);

      expect(result.name).toBeDefined();
      expect(result.scale).toHaveLength(11);
    });

    it('handles edge hues (0° and 359°)', () => {
      const hue0: OKLCH = { l: 0.5, c: 0.15, h: 0, alpha: 1 };
      const hue359: OKLCH = { l: 0.5, c: 0.15, h: 359, alpha: 1 };

      const result0 = buildColorValue(hue0);
      const result359 = buildColorValue(hue359);

      expect(result0.name).toBeDefined();
      expect(result359.name).toBeDefined();
    });

    it('handles missing alpha (defaults to 1)', () => {
      const noAlpha = { l: 0.5, c: 0.15, h: 240 } as OKLCH;
      const result = buildColorValue(noAlpha);

      expect(result.name).toBeDefined();
      expect(result.scale).toHaveLength(11);
    });
  });

  describe('determinism', () => {
    it('produces identical results for same input', () => {
      const result1 = buildColorValue(blue);
      const result2 = buildColorValue(blue);

      expect(result1.name).toBe(result2.name);
      expect(result1.tokenId).toBe(result2.tokenId);
      expect(result1.scale).toEqual(result2.scale);
      expect(result1.harmonies).toEqual(result2.harmonies);
      expect(result1.accessibility).toEqual(result2.accessibility);
    });

    it('produces different results for different inputs', () => {
      const resultBlue = buildColorValue(blue);
      const resultRed = buildColorValue(red);

      expect(resultBlue.name).not.toBe(resultRed.name);
      expect(resultBlue.tokenId).not.toBe(resultRed.tokenId);
    });
  });

  describe('batch generation', () => {
    it('builds a complete ColorValue for a single color', () => {
      const value = buildColorValue(blue);

      expect(value.name).toBeTruthy();
      expect(value.scale.length).toBeGreaterThan(0);
    });

    it('builds one distinct ColorValue per input in a batch', () => {
      const colors: OKLCH[] = Array.from({ length: 24 }, (_, i) => ({
        l: 0.5,
        c: 0.15,
        h: (i * 15) % 360,
        alpha: 1,
      }));

      const results = colors.map((color) => buildColorValue(color));

      // Work-count assertion in place of a wall-clock budget: one value per
      // input, none dropped or collapsed into another.
      expect(results).toHaveLength(colors.length);
      expect(new Set(results.map((r) => r.tokenId)).size).toBe(colors.length);
    });
  });

  describe('stored steps say what they are (#2672)', () => {
    const fireTruck: OKLCH = { l: 0.55, c: 0.2, h: 0, alpha: 1 };
    const blue260: OKLCH = { l: 0.55, c: 0.2, h: 260, alpha: 1 };
    const sky: OKLCH = { l: 0.55, c: 0.12, h: 210, alpha: 1 };
    const citrine: OKLCH = { l: 0.55, c: 0.12, h: 90, alpha: 1 };
    const zinc: OKLCH = { l: 0.55, c: 0.01, h: 260, alpha: 1 };
    const tooLight: OKLCH = { l: 0.9, c: 0.1, h: 30, alpha: 1 };
    const families = [
      fireTruck,
      blue260,
      sky,
      citrine,
      zinc,
      tooLight,
      blue,
      red,
      gray,
      white,
      black,
    ];

    it('puts every step of the four default families in sRGB', () => {
      for (const seed of [fireTruck, blue260, sky, citrine]) {
        const value = buildColorValue(seed);
        for (const step of value.scale) expect(getGamutTier(step)).toBe('srgb');
      }
    });

    it("records seedAdjusted with reason 'gamut' for the P3 seeds", () => {
      for (const seed of [sky, citrine]) {
        expect(getGamutTier(seed)).toBe('p3');
        const value = buildColorValue(seed);
        expect(value.seedAdjusted?.reason).toBe('gamut');
        expect(value.seedAdjusted?.from).toEqual(seed);
        expect(value.seedAdjusted?.to).toEqual(value.scale[6]);
      }
    });

    it('returns strictly falling lightness from 50 to 950', () => {
      for (const seed of families) {
        const { scale } = buildColorValue(seed);
        for (let i = 1; i < scale.length; i++) {
          expect(scale[i]?.l).toBeLessThan(scale[i - 1]?.l as number);
        }
      }
    });

    it('records one gamut tier per step, equal to getGamutTier of that step', () => {
      for (const seed of families) {
        const value = buildColorValue(seed);
        expect(value.gamut).toHaveLength(value.scale.length);
        for (const [i, step] of value.scale.entries()) {
          expect(value.gamut?.[i]).toBe(getGamutTier(step));
        }
      }
    });

    it("records a seed moved by the lightness bounds with reason 'lightness-bounds'", () => {
      const value = buildColorValue(tooLight);
      expect(value.seedAdjusted?.reason).toBe('lightness-bounds');
      expect(value.seedAdjusted?.from.l).toBe(0.9);
      expect(value.seedAdjusted?.to).toEqual(value.scale[6]);
    });

    it('never moves the seed unrecorded: without seedAdjusted, the 600 step is the seed', () => {
      for (const seed of families) {
        const value = buildColorValue(seed);
        if (value.seedAdjusted) continue;
        expect(value.scale[6]).toEqual(roundOKLCH(seed));
      }
    });

    it('keeps every step within 1 degree of its generated hue for the #2873 seeds', () => {
      const seeds: OKLCH[] = [
        { l: 0.517, c: 0.107, h: 234, alpha: 1 },
        { l: 0.375, c: 0.061, h: 236, alpha: 1 },
        { l: 0.213, c: 0.061, h: 236, alpha: 1 },
        { l: 0.725, c: 0.166, h: 53, alpha: 1 },
        { l: 0.418, c: 0.127, h: 51, alpha: 1 },
        { l: 0.817, c: 0.167, h: 247, alpha: 1 },
      ];
      const hueGap = (a: number, b: number) => {
        const d = Math.abs(a - b) % 360;
        return Math.min(d, 360 - d);
      };
      for (const seed of seeds) {
        const value = buildColorValue(seed);
        // The builder's own seed: a P3 seed is first mapped into sRGB.
        const built = getGamutTier(seed) === 'p3' ? toGamutCeiling(seed, 'srgb') : seed;
        const generated = generateOKLCHScale(built);
        for (const [i, step] of value.scale.entries()) {
          const pos = SCALE_POSITIONS[i] as (typeof SCALE_POSITIONS)[number];
          const expected = generated[pos] as OKLCH;
          if (step.c > 0.02) expect(hueGap(step.h, expected.h)).toBeLessThanOrEqual(1);
          if (i > 0) expect(step.l).toBeLessThan(value.scale[i - 1]?.l as number);
          expect(getGamutTier(step)).toBe('srgb');
        }
        if (value.seedAdjusted) expect(value.seedAdjusted.reason).toBe('gamut');
      }
    });

    it('re-baking an unchanged family returns the same onWhite and onBlack', () => {
      for (const seed of families) {
        const value = buildColorValue(seed);
        const rebaked = rebakeAccessibility(value);
        expect(rebaked.accessibility?.onWhite).toEqual(value.accessibility?.onWhite);
        expect(rebaked.accessibility?.onBlack).toEqual(value.accessibility?.onBlack);
      }
    });
  });
});
