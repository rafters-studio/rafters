/**
 * Tests for the deterministic color naming module
 */

import { describe, expect, it } from 'vitest';
import {
  C_BUCKET_COUNT,
  generateColorName,
  generateColorNameWithMetadata,
  getCBucket,
  getHBucket,
  getLBucket,
  H_BUCKET_COUNT,
  INTENSITY_WORDS,
  L_BUCKET_COUNT,
  LUMINOSITY_WORDS,
  MATERIAL_WORDS,
} from '../src/naming/index.js';

describe('Quantization functions', () => {
  describe('getLBucket', () => {
    it('returns 0 for darkest colors', () => {
      expect(getLBucket(0)).toBe(0);
      expect(getLBucket(0.05)).toBe(0);
      expect(getLBucket(0.09)).toBe(0);
    });

    it('returns 9 for lightest colors', () => {
      expect(getLBucket(0.9)).toBe(9);
      expect(getLBucket(0.95)).toBe(9);
      expect(getLBucket(1.0)).toBe(9);
    });

    it('maps mid-range values correctly', () => {
      expect(getLBucket(0.5)).toBe(5);
      expect(getLBucket(0.55)).toBe(5);
      expect(getLBucket(0.65)).toBe(6);
    });

    it('clamps out-of-range values', () => {
      expect(getLBucket(-0.5)).toBe(0);
      expect(getLBucket(1.5)).toBe(9);
    });
  });

  describe('getCBucket', () => {
    it('returns 0 for achromatic colors', () => {
      expect(getCBucket(0)).toBe(0);
      expect(getCBucket(0.01)).toBe(0);
      expect(getCBucket(0.029)).toBe(0);
    });

    it('returns 7 for maximum saturation', () => {
      expect(getCBucket(0.3)).toBe(7);
      expect(getCBucket(0.35)).toBe(7);
      expect(getCBucket(0.4)).toBe(7);
    });

    it('maps mid-range values correctly', () => {
      expect(getCBucket(0.05)).toBe(1);
      expect(getCBucket(0.08)).toBe(2);
      expect(getCBucket(0.12)).toBe(3);
      expect(getCBucket(0.17)).toBe(4);
    });
  });

  describe('getHBucket', () => {
    it('returns 0 for red hues', () => {
      expect(getHBucket(0)).toBe(0);
      expect(getHBucket(10)).toBe(0);
      expect(getHBucket(19)).toBe(0);
    });

    it('returns 17 for red-pink hues', () => {
      expect(getHBucket(340)).toBe(17);
      expect(getHBucket(350)).toBe(17);
      expect(getHBucket(359)).toBe(17);
    });

    it('handles hue wraparound', () => {
      expect(getHBucket(360)).toBe(0);
      expect(getHBucket(370)).toBe(0);
      expect(getHBucket(-10)).toBe(17);
    });

    it('maps mid-range hues correctly', () => {
      expect(getHBucket(180)).toBe(9); // cyan
      expect(getHBucket(230)).toBe(11); // blue
      expect(getHBucket(270)).toBe(13); // violet
    });
  });
});

describe('Word banks', () => {
  it('has correct number of luminosity words', () => {
    expect(LUMINOSITY_WORDS.length).toBe(L_BUCKET_COUNT);
  });

  it('has intensity words for all densities', () => {
    expect(INTENSITY_WORDS.light.length).toBe(C_BUCKET_COUNT);
    expect(INTENSITY_WORDS.medium.length).toBe(C_BUCKET_COUNT);
    expect(INTENSITY_WORDS.heavy.length).toBe(C_BUCKET_COUNT);
  });

  it('has material words for all temperatures', () => {
    expect(MATERIAL_WORDS.warm.length).toBe(H_BUCKET_COUNT);
    expect(MATERIAL_WORDS.cool.length).toBe(H_BUCKET_COUNT);
    expect(MATERIAL_WORDS.neutral.length).toBe(H_BUCKET_COUNT);
  });

  it('all words are unique within their bank', () => {
    const luminositySet = new Set(LUMINOSITY_WORDS);
    expect(luminositySet.size).toBe(LUMINOSITY_WORDS.length);

    for (const density of ['light', 'medium', 'heavy'] as const) {
      const intensitySet = new Set(INTENSITY_WORDS[density]);
      expect(intensitySet.size).toBe(INTENSITY_WORDS[density].length);
    }

    for (const temp of ['warm', 'cool', 'neutral'] as const) {
      const materialSet = new Set(MATERIAL_WORDS[temp]);
      expect(materialSet.size).toBe(MATERIAL_WORDS[temp].length);
    }
  });

  const allIntensityWords = [
    ...INTENSITY_WORDS.light,
    ...INTENSITY_WORDS.medium,
    ...INTENSITY_WORDS.heavy,
  ];

  it('all 24 intensity words are unique across all density levels', () => {
    const uniqueWords = new Set(allIntensityWords);
    expect(uniqueWords.size).toBe(allIntensityWords.length);
  });

  it('intensity words do not contain banned personality adjectives', () => {
    const bannedWords = [
      'honest',
      'fierce',
      'calm',
      'radiant',
      'ghost',
      'whisper',
      'gentle',
      'mild',
      'striking',
      'electric',
      'haze',
      'intense',
      'blazing',
    ];
    for (const banned of bannedWords) {
      expect(allIntensityWords).not.toContain(banned);
    }
  });
});

describe('generateColorName', () => {
  it('generates deterministic names (same input = same output)', () => {
    const oklch = { l: 0.65, c: 0.12, h: 230, alpha: 1 };

    const name1 = generateColorName(oklch);
    const name2 = generateColorName(oklch);
    const name3 = generateColorName(oklch);

    expect(name1).toBe(name2);
    expect(name2).toBe(name3);
  });

  it('generates two-word names for achromatic colors', () => {
    const achromatic = { l: 0.5, c: 0.01, h: 180, alpha: 1 };
    const name = generateColorName(achromatic);

    // Should be "luminosity-intensity" format (no material word)
    const parts = name.split('-');
    expect(parts.length).toBe(2);
  });

  it('generates three-word names for chromatic colors', () => {
    const chromatic = { l: 0.5, c: 0.15, h: 180, alpha: 1 };
    const name = generateColorName(chromatic);

    // Should be "luminosity-intensity-material" format
    const parts = name.split('-');
    expect(parts.length).toBe(3);
  });

  it('generates different names for different colors', () => {
    const red = { l: 0.5, c: 0.2, h: 10, alpha: 1 };
    const blue = { l: 0.5, c: 0.2, h: 230, alpha: 1 };
    const green = { l: 0.5, c: 0.2, h: 130, alpha: 1 };

    const redName = generateColorName(red);
    const blueName = generateColorName(blue);
    const greenName = generateColorName(green);

    expect(redName).not.toBe(blueName);
    expect(blueName).not.toBe(greenName);
    expect(redName).not.toBe(greenName);
  });

  it('generates different names for different lightness levels', () => {
    const dark = { l: 0.2, c: 0.15, h: 230, alpha: 1 };
    const mid = { l: 0.5, c: 0.15, h: 230, alpha: 1 };
    const light = { l: 0.8, c: 0.15, h: 230, alpha: 1 };

    const darkName = generateColorName(dark);
    const midName = generateColorName(mid);
    const lightName = generateColorName(light);

    expect(darkName).not.toBe(midName);
    expect(midName).not.toBe(lightName);
    expect(darkName).not.toBe(lightName);
  });

  it('uses hyphenated format', () => {
    const oklch = { l: 0.65, c: 0.12, h: 230, alpha: 1 };
    const name = generateColorName(oklch);

    // Format: luminosity-intensity-material (each component may contain hyphens)
    // Examples: "luminous-true-lagoon", "deep-bold-cobalt", "faint-soft-sage"
    expect(name).toMatch(/^[a-z]+(-[a-z]+)+$/);
  });
});

describe('generateColorNameWithMetadata', () => {
  it('returns complete metadata structure', () => {
    const oklch = { l: 0.65, c: 0.12, h: 230, alpha: 1 };
    const result = generateColorNameWithMetadata(oklch);

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('components');
    expect(result).toHaveProperty('buckets');
    expect(result).toHaveProperty('modifiers');

    expect(result.components).toHaveProperty('luminosity');
    expect(result.components).toHaveProperty('intensity');
    expect(result.components).toHaveProperty('material');

    expect(result.buckets).toHaveProperty('l');
    expect(result.buckets).toHaveProperty('c');
    expect(result.buckets).toHaveProperty('h');

    expect(result.modifiers).toHaveProperty('temperature');
    expect(result.modifiers).toHaveProperty('density');
    expect(result.modifiers).toHaveProperty('isAchromatic');
  });

  it('returns null material for achromatic colors', () => {
    const achromatic = { l: 0.5, c: 0.01, h: 180, alpha: 1 };
    const result = generateColorNameWithMetadata(achromatic);

    expect(result.components.material).toBeNull();
    expect(result.modifiers.isAchromatic).toBe(true);
  });

  it('returns material word for chromatic colors', () => {
    const chromatic = { l: 0.5, c: 0.15, h: 180, alpha: 1 };
    const result = generateColorNameWithMetadata(chromatic);

    expect(result.components.material).not.toBeNull();
    expect(result.modifiers.isAchromatic).toBe(false);
  });

  it('name matches assembled components', () => {
    const oklch = { l: 0.65, c: 0.12, h: 230, alpha: 1 };
    const result = generateColorNameWithMetadata(oklch);

    const { luminosity, intensity, material } = result.components;
    const expectedName = material
      ? `${luminosity}-${intensity}-${material}`
      : `${luminosity}-${intensity}`;

    expect(result.name).toBe(expectedName);
  });
});

describe('Edge cases', () => {
  it('handles boundary values for lightness', () => {
    const darkest = { l: 0, c: 0.1, h: 180, alpha: 1 };
    const lightest = { l: 1, c: 0.1, h: 180, alpha: 1 };

    expect(() => generateColorName(darkest)).not.toThrow();
    expect(() => generateColorName(lightest)).not.toThrow();
  });

  it('handles boundary values for chroma', () => {
    const zero = { l: 0.5, c: 0, h: 180, alpha: 1 };
    const max = { l: 0.5, c: 0.4, h: 180, alpha: 1 };

    expect(() => generateColorName(zero)).not.toThrow();
    expect(() => generateColorName(max)).not.toThrow();
  });

  it('handles boundary values for hue', () => {
    const zero = { l: 0.5, c: 0.1, h: 0, alpha: 1 };
    const full = { l: 0.5, c: 0.1, h: 360, alpha: 1 };

    expect(() => generateColorName(zero)).not.toThrow();
    expect(() => generateColorName(full)).not.toThrow();

    // Hue 0 and 360 should be the same color bucket
    expect(generateColorName(zero)).toBe(generateColorName(full));
  });

  it('handles negative hue values', () => {
    const negative = { l: 0.5, c: 0.1, h: -30, alpha: 1 };
    const equivalent = { l: 0.5, c: 0.1, h: 330, alpha: 1 };

    expect(() => generateColorName(negative)).not.toThrow();
    expect(generateColorName(negative)).toBe(generateColorName(equivalent));
  });
});
