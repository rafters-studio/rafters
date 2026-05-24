import { describe, expect, it } from 'vitest';
import { detectSpacingBase } from '../../src/importers/spacing.js';

describe('detectSpacingBase', () => {
  it('returns null when no --spacing-base is declared', () => {
    expect(detectSpacingBase(':root { --primary: #000; }')).toBeNull();
  });

  it('reads --spacing-base in px and returns the px value', () => {
    expect(detectSpacingBase(':root { --spacing-base: 4px; }')).toBe(4);
  });

  it('reads --spacing-base in rem and converts to px at 16px root', () => {
    expect(detectSpacingBase(':root { --spacing-base: 0.5rem; }')).toBe(8);
  });

  it('reads --spacing-base in em the same way as rem', () => {
    expect(detectSpacingBase(':root { --spacing-base: 1em; }')).toBe(16);
  });

  it('reads --spacing-base from @theme blocks', () => {
    expect(detectSpacingBase('@theme { --spacing-base: 0.25rem; }')).toBe(4);
  });

  it('prefers the last declaration when --spacing-base appears in both :root and @theme', () => {
    const css = `
      :root { --spacing-base: 4px; }
      @theme { --spacing-base: 8px; }
    `;
    expect(detectSpacingBase(css)).toBe(8);
  });

  it('returns null for unsupported units', () => {
    expect(detectSpacingBase(':root { --spacing-base: 50%; }')).toBeNull();
  });

  it('returns null when the value is not a length', () => {
    expect(detectSpacingBase(':root { --spacing-base: auto; }')).toBeNull();
  });

  it('ignores --spacing-N per-position declarations (only --spacing-base)', () => {
    expect(detectSpacingBase(':root { --spacing-4: 1rem; --spacing-8: 2rem; }')).toBeNull();
  });

  it('handles malformed CSS without throwing', () => {
    expect(() => detectSpacingBase('not valid css {{')).not.toThrow();
  });

  it('reads --spacing (Tailwind v4 canonical name)', () => {
    expect(detectSpacingBase(':root { --spacing: 0.25rem; }')).toBe(4);
  });

  it('reads --spacing from compound :root, :host inside @layer (real Tailwind v4 shape)', () => {
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

  it('prefers the last declaration when both --spacing and --spacing-base appear', () => {
    const css = `
      :root { --spacing: 0.25rem; }
      @theme { --spacing-base: 0.5rem; }
    `;
    expect(detectSpacingBase(css)).toBe(8);
  });
});
