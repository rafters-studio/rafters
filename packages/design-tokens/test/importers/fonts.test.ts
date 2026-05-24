import { describe, expect, it } from 'vitest';
import { detectFonts } from '../../src/importers/fonts.js';

describe('detectFonts', () => {
  it('returns empty array for CSS with no font declarations', () => {
    expect(detectFonts(':root { --primary: #000; }')).toEqual([]);
  });

  it('extracts a single Google Fonts family from @import', () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700");`;
    expect(detectFonts(css)).toEqual([{ name: 'Inter', stack: 'Inter' }]);
  });

  it('extracts multiple Google Fonts families across one @import', () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400");`;
    const result = detectFonts(css);
    expect(result).toEqual([
      { name: 'Inter', stack: 'Inter' },
      { name: 'JetBrains Mono', stack: '"JetBrains Mono"' },
    ]);
  });

  it('extracts from Google Fonts v1 URL shape', () => {
    const css = `@import url('https://fonts.googleapis.com/css?family=Roboto:400,700');`;
    expect(detectFonts(css)).toEqual([{ name: 'Roboto', stack: 'Roboto' }]);
  });

  it('extracts from @font-face declarations', () => {
    const css = `
      @font-face {
        font-family: "MyCustom";
        src: url("/fonts/MyCustom.woff2") format("woff2");
        font-weight: 400;
      }
    `;
    expect(detectFonts(css)).toEqual([{ name: 'MyCustom', stack: 'MyCustom' }]);
  });

  it('extracts the first family from --font-* declarations in :root', () => {
    const css = `:root { --font-sans: "Inter Variable", system-ui, sans-serif; }`;
    expect(detectFonts(css)).toEqual([
      {
        name: 'Inter Variable',
        stack: '"Inter Variable", system-ui, sans-serif',
        sourceDeclName: 'font-sans',
      },
    ]);
  });

  it('extracts from --font-* declarations in @theme blocks', () => {
    const css = `@theme { --font-mono: "JetBrains Mono", monospace; }`;
    expect(detectFonts(css)).toEqual([
      {
        name: 'JetBrains Mono',
        stack: '"JetBrains Mono", monospace',
        sourceDeclName: 'font-mono',
      },
    ]);
  });

  it('carries sourceDeclName for non-canonical --font-* declarations', () => {
    const css = `@theme { --font-aurabesh: "Aurabesh", sans-serif; }`;
    expect(detectFonts(css)).toEqual([
      {
        name: 'Aurabesh',
        stack: '"Aurabesh", sans-serif',
        sourceDeclName: 'font-aurabesh',
      },
    ]);
  });

  it('skips generic keywords as detected families', () => {
    const css = `:root { --font-sans: sans-serif, serif; }`;
    expect(detectFonts(css)).toEqual([]);
  });

  it('deduplicates by canonical family name (case-insensitive)', () => {
    const css = `
      @import url("https://fonts.googleapis.com/css2?family=Inter");
      :root { --font-sans: "inter", sans-serif; }
    `;
    // Same family detected twice; we keep one entry. The full stack from
    // the :root declaration is longer, so it wins for `stack`.
    const result = detectFonts(css);
    expect(result).toHaveLength(1);
    expect(result[0]?.stack).toBe('"inter", sans-serif');
  });

  it('combines all detection sources into one list', () => {
    const css = `
      @import url("https://fonts.googleapis.com/css2?family=Inter");
      @font-face { font-family: "MyCustom"; src: url("/x.woff2"); }
      :root { --font-mono: "JetBrains Mono", monospace; }
    `;
    const result = detectFonts(css);
    expect(result.map((f) => f.name)).toEqual(['Inter', 'MyCustom', 'JetBrains Mono']);
  });

  it('handles malformed CSS without throwing', () => {
    expect(() => detectFonts('not valid css {{')).not.toThrow();
  });

  it('ignores non-font custom properties', () => {
    const css = `:root { --color-primary: #000; --spacing-4: 1rem; }`;
    expect(detectFonts(css)).toEqual([]);
  });

  it('preserves spaces in Google Fonts family names', () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Source+Sans+3");`;
    expect(detectFonts(css)).toEqual([{ name: 'Source Sans 3', stack: '"Source Sans 3"' }]);
  });

  it('preserves sourceDeclName from the first --font-* declaration when same family appears elsewhere', () => {
    // Inter shows up both via @font-face AND via :root --font-sans. The
    // declaration name signal from --font-sans should survive (the caller
    // matches it against the registry's base-family list).
    const css = `
      @font-face { font-family: "Inter"; src: url("/x.woff2"); }
      :root { --font-sans: "Inter", sans-serif; }
    `;
    const inter = detectFonts(css).find((f) => f.name === 'Inter');
    expect(inter?.sourceDeclName).toBe('font-sans');
  });
});
