import { describe, expect, it } from 'vitest';
import {
  barPosFromHue,
  findMaxChroma,
  hueFromBarPos,
  inP3,
  inSrgb,
} from '../../src/primitives/oklch-gamut';

describe('oklch-gamut', () => {
  describe.each([
    { name: 'inSrgb', fn: inSrgb },
    { name: 'inP3', fn: inP3 },
  ])('$name', ({ fn }) => {
    it('accepts pure black', () => {
      expect(fn(0, 0, 0)).toBe(true);
    });

    it('accepts pure white', () => {
      expect(fn(1, 0, 0)).toBe(true);
    });

    it('accepts mid-gray', () => {
      expect(fn(0.5, 0, 180)).toBe(true);
    });

    it('rejects extremely high chroma', () => {
      expect(fn(0.5, 0.4, 30)).toBe(false);
    });

    it('is consistent at the 0/360 hue boundary', () => {
      expect(fn(0.7, 0.1, 0)).toBe(fn(0.7, 0.1, 360));
    });
  });

  describe('sRGB-specific', () => {
    it('accepts low chroma color', () => {
      expect(inSrgb(0.7, 0.05, 250)).toBe(true);
    });

    it('rejects high chroma green', () => {
      expect(inSrgb(0.7, 0.25, 150)).toBe(false);
    });
  });

  describe('P3-specific', () => {
    it('accepts high chroma green that exceeds sRGB', () => {
      expect(inP3(0.7, 0.25, 150)).toBe(true);
    });
  });

  describe('findMaxChroma', () => {
    it('returns near-zero for near-white (L=0.99)', () => {
      expect(findMaxChroma(0.99, 0)).toBeLessThan(0.02);
    });

    it('returns positive chroma for mid-lightness', () => {
      expect(findMaxChroma(0.5, 30)).toBeGreaterThan(0.05);
    });

    it('result is within gamut', () => {
      const mc = findMaxChroma(0.6, 150);
      expect(inSrgb(0.6, mc, 150) || inP3(0.6, mc, 150)).toBe(true);
    });

    it('slightly above result is out of gamut', () => {
      const mc = findMaxChroma(0.6, 150);
      expect(inSrgb(0.6, mc + 0.01, 150) || inP3(0.6, mc + 0.01, 150)).toBe(false);
    });

    it('respects ceiling parameter', () => {
      const mc = findMaxChroma(0.5, 30, 0.1);
      expect(mc).toBeLessThanOrEqual(0.1);
    });
  });

  describe('hueFromBarPos / barPosFromHue', () => {
    it('maps 0 to hue 0', () => {
      expect(hueFromBarPos(0)).toBe(0);
    });

    it('maps 1 to hue 360', () => {
      expect(hueFromBarPos(1)).toBeCloseTo(360, 1);
    });

    it('round-trips accurately', () => {
      for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const h = hueFromBarPos(t);
        expect(barPosFromHue(h)).toBeCloseTo(t, 3);
      }
    });

    it('gives reds more space than linear', () => {
      const redSpan = hueFromBarPos(0.3);
      expect(redSpan).toBeLessThan(108);
    });

    it('compresses cyans', () => {
      const cyanStart = hueFromBarPos(0.4);
      const cyanEnd = hueFromBarPos(0.6);
      expect(cyanEnd - cyanStart).toBeGreaterThan(72);
    });

    it('barPosFromHue clamps output to [0, 1]', () => {
      expect(barPosFromHue(0)).toBeGreaterThanOrEqual(0);
      expect(barPosFromHue(360)).toBeLessThanOrEqual(1);
    });
  });

  describe('gamut relationship', () => {
    it('sRGB is a subset of P3 -- if inSrgb then inP3', () => {
      const samples = [
        [0.5, 0.1, 90],
        [0.7, 0.05, 250],
        [0.3, 0.08, 30],
        [0.9, 0.02, 180],
      ] as const;

      for (const [l, c, h] of samples) {
        if (inSrgb(l, c, h)) {
          expect(inP3(l, c, h)).toBe(true);
        }
      }
    });
  });
});
