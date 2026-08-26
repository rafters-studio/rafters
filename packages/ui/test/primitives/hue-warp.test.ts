import { describe, expect, it } from 'vitest';
import { barPosFromHue, hueFromBarPos } from '../../src/primitives/hue-warp';

describe('hue-warp', () => {
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
});
