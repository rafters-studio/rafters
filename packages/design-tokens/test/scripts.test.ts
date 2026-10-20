import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCRIPTS,
  DEFAULT_SYSTEM_CONFIG,
  detectFontImports,
  fontImportsFor,
  fontStackFor,
  generateBaseSystem,
  PURE_MATH_CONFIG,
  SCRIPT_FONTS,
} from '../src/index.js';

describe('writing systems -> Noto stack (#2742)', () => {
  it('keeps the default stack for DEFAULT_SCRIPTS', () => {
    expect(fontStackFor(DEFAULT_SCRIPTS)).toBe("'Noto Sans Variable', sans-serif");
    expect(DEFAULT_SCRIPTS).toEqual(['Latn', 'Grek', 'Cyrl']);
  });

  it('builds the stack in table order', () => {
    expect(fontStackFor(['Latn', 'Arab', 'Hans'])).toBe(
      "'Noto Sans Variable', 'Noto Sans Arabic Variable', 'Noto Sans SC Variable', sans-serif",
    );
    expect(fontStackFor(['Hans', 'Arab', 'Latn'])).toBe(fontStackFor(['Latn', 'Arab', 'Hans']));
  });

  it('lists Noto Sans Variable once for Latin, Greek and Cyrillic', () => {
    const stack = fontStackFor(['Latn', 'Grek', 'Cyrl']);
    expect(stack.match(/Noto Sans Variable/g)).toHaveLength(1);
  });

  it('maps scripts to Fontsource packages', () => {
    expect(fontImportsFor(['Latn', 'Hebr'])).toEqual([
      '@fontsource-variable/noto-sans',
      '@fontsource-variable/noto-sans-hebrew',
    ]);
    expect(fontImportsFor(DEFAULT_SCRIPTS)).toEqual(['@fontsource-variable/noto-sans']);
  });

  it('throws on an unknown code, naming it and the known codes', () => {
    expect(() => fontStackFor(['Latn', 'Klingon'])).toThrow(/Klingon/);
    expect(() => fontStackFor(['Latn', 'Klingon'])).toThrow(/Latn, Grek, Cyrl, Arab/);
    expect(() => fontImportsFor(['Klingon'])).toThrow(/Klingon/);
  });

  it('marks Arabic and Hebrew right-to-left', () => {
    const rtl = Object.entries(SCRIPT_FONTS)
      .filter(([, f]) => f.rtl)
      .map(([code]) => code);
    expect(rtl).toEqual(['Arab', 'Hebr']);
  });

  it('derives the system configs from the default scripts', () => {
    expect(DEFAULT_SYSTEM_CONFIG.fontFamily).toBe(fontStackFor(DEFAULT_SCRIPTS));
    expect(PURE_MATH_CONFIG.fontFamily).toBe(fontStackFor(DEFAULT_SCRIPTS));
  });

  it('writes the chosen stack into font-sans', () => {
    const stack = fontStackFor(['Latn', 'Jpan']);
    const system = generateBaseSystem({ fontFamily: stack });
    expect(system.allTokens.find((t) => t.name === 'font-sans')?.value).toBe(stack);
  });
});

describe('detectFontImports', () => {
  it('returns each Google Fonts @import URL once, in source order', () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
@import 'https://fonts.googleapis.com/css2?family=JetBrains+Mono';`;
    expect(detectFontImports(css)).toEqual([
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
      'https://fonts.googleapis.com/css2?family=JetBrains+Mono',
    ]);
  });
});
