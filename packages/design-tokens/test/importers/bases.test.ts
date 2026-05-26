import { describe, expect, it } from 'vitest';
import {
  detectFocusRingWidth,
  detectFontSizeBase,
  detectRadiusBase,
  detectSpacingBase,
} from '../../src/importers/bases.js';

describe('detectSpacingBase', () => {
  it('reads --spacing (Tailwind v4 canonical)', () => {
    expect(detectSpacingBase(':root { --spacing: 0.25rem; }')).toBe(4);
  });

  it('reads --spacing-base (rafters internal)', () => {
    expect(detectSpacingBase(':root { --spacing-base: 0.5rem; }')).toBe(8);
  });

  it('reads from compound :root, :host inside @layer (real Tailwind v4 shape)', () => {
    const css = `
      @layer theme {
        :root, :host {
          --color-red-50: oklch(97.1% 0.013 17.38);
          --spacing: 0.25rem;
        }
      }
    `;
    expect(detectSpacingBase(css)).toBe(4);
  });

  it('prefers last declaration on collision', () => {
    expect(
      detectSpacingBase(`
        :root { --spacing: 0.25rem; }
        @theme { --spacing-base: 0.5rem; }
      `),
    ).toBe(8);
  });

  it('ignores --spacing-N per-position declarations', () => {
    expect(detectSpacingBase(':root { --spacing-4: 1rem; --spacing-8: 2rem; }')).toBeNull();
  });

  it('returns null when not declared', () => {
    expect(detectSpacingBase(':root { --primary: #000; }')).toBeNull();
  });
});

describe('detectRadiusBase', () => {
  it('reads --radius (shadcn canonical)', () => {
    expect(detectRadiusBase(':root { --radius: 0.625rem; }')).toBe(10);
  });

  it('reads --radius-base (rafters internal)', () => {
    expect(detectRadiusBase(':root { --radius-base: 0.375rem; }')).toBe(6);
  });

  it('ignores per-position --radius-N', () => {
    expect(detectRadiusBase(':root { --radius-sm: 0.25rem; --radius-md: 0.5rem; }')).toBeNull();
  });

  it('returns null on var() ref values', () => {
    expect(detectRadiusBase(':root { --radius: var(--radius-md); }')).toBeNull();
  });
});

describe('detectFontSizeBase', () => {
  it('reads --text-base (Tailwind v4 canonical)', () => {
    expect(detectFontSizeBase(':root { --text-base: 1rem; }')).toBe(16);
  });

  it('reads --font-size-base (rafters internal)', () => {
    expect(detectFontSizeBase(':root { --font-size-base: 1.125rem; }')).toBe(18);
  });

  it('ignores per-position --text-N (Tailwind v4 emits these alongside the base)', () => {
    expect(
      detectFontSizeBase(':root { --text-xs: 0.75rem; --text-sm: 0.875rem; --text-lg: 1.25rem; }'),
    ).toBeNull();
  });

  it('returns null when not declared', () => {
    expect(detectFontSizeBase(':root { --primary: #000; }')).toBeNull();
  });
});

describe('detectFocusRingWidth', () => {
  it('reads --ring-width', () => {
    expect(detectFocusRingWidth(':root { --ring-width: 2px; }')).toBe(2);
  });

  it('reads --focus-ring-width (rafters internal)', () => {
    expect(detectFocusRingWidth(':root { --focus-ring-width: 0.125rem; }')).toBe(2);
  });

  it('returns null when not declared', () => {
    expect(detectFocusRingWidth(':root { --primary: #000; }')).toBeNull();
  });
});

describe('shared behavior across all base detectors', () => {
  it('handles malformed CSS without throwing', () => {
    expect(() => detectSpacingBase('not valid css {{')).not.toThrow();
    expect(() => detectRadiusBase('not valid css {{')).not.toThrow();
    expect(() => detectFontSizeBase('not valid css {{')).not.toThrow();
    expect(() => detectFocusRingWidth('not valid css {{')).not.toThrow();
  });

  it('returns null for unsupported length units (%, vw, etc.)', () => {
    expect(detectSpacingBase(':root { --spacing: 50%; }')).toBeNull();
    expect(detectRadiusBase(':root { --radius: 10vw; }')).toBeNull();
  });
});
