import { describe, expect, it } from 'vitest';
import { detectRadiusBase } from '../../src/importers/radius.js';

describe('detectRadiusBase', () => {
  it('returns null when no --radius or --radius-base is declared', () => {
    expect(detectRadiusBase(':root { --primary: #000; }')).toBeNull();
  });

  it('reads --radius (shadcn canonical) in rem and converts to px', () => {
    expect(detectRadiusBase(':root { --radius: 0.625rem; }')).toBe(10);
  });

  it('reads --radius-base (rafters internal) in rem', () => {
    expect(detectRadiusBase(':root { --radius-base: 0.375rem; }')).toBe(6);
  });

  it('reads px values as-is', () => {
    expect(detectRadiusBase(':root { --radius: 8px; }')).toBe(8);
  });

  it('reads from @theme blocks', () => {
    expect(detectRadiusBase('@theme { --radius: 0.5rem; }')).toBe(8);
  });

  it('reads from compound :root, :host inside @layer (real Tailwind v4 shape)', () => {
    const css = `
      @layer theme {
        :root, :host {
          --color-red-50: oklch(97.1% 0.013 17.38);
          --radius: 0.5rem;
        }
      }
    `;
    expect(detectRadiusBase(css)).toBe(8);
  });

  it('prefers the last declaration when both --radius and --radius-base appear', () => {
    const css = `
      :root { --radius: 0.625rem; }
      @theme { --radius-base: 0.375rem; }
    `;
    expect(detectRadiusBase(css)).toBe(6);
  });

  it('ignores per-position --radius-N (sm/md/lg) declarations', () => {
    const css = `
      :root {
        --radius-sm: 0.25rem;
        --radius-md: 0.375rem;
        --radius-lg: 0.5rem;
      }
    `;
    expect(detectRadiusBase(css)).toBeNull();
  });

  it('returns null for unsupported units', () => {
    expect(detectRadiusBase(':root { --radius: 50%; }')).toBeNull();
  });

  it('returns null when value is not a length', () => {
    expect(detectRadiusBase(':root { --radius: var(--radius-md); }')).toBeNull();
  });

  it('handles malformed CSS without throwing', () => {
    expect(() => detectRadiusBase('not valid css {{')).not.toThrow();
  });
});
