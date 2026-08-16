import { describe, expect, it } from 'vitest';
import { getAdapter, getAvailableAdapters } from '../../src/importers/adapter.js';
// Side-effect imports: ensure adapters are registered before tests run.
import '../../src/importers/shadcn-adapter.js';
import '../../src/importers/tailwind-adapter.js';
import {
  detectFocusRingWidth,
  detectFontSizeBase,
  detectRadiusBase,
  detectSpacingBase,
} from '../../src/importers/bases.js';
import { classifyDeclarations } from '../../src/importers/classify.js';
import { colorsFromClassification } from '../../src/importers/colors.js';
import { detectFonts } from '../../src/importers/fonts.js';
import { extractShadcnRoot } from '../../src/importers/shadcn.js';

// -- Registry ---------------------------------------------------------------

describe('getAvailableAdapters', () => {
  it('returns both built-in adapter names', () => {
    const names = getAvailableAdapters();
    expect(names).toContain('shadcn');
    expect(names).toContain('tailwind');
  });

  it('returns names in sorted order', () => {
    const names = getAvailableAdapters();
    expect([...names].sort()).toEqual([...names]);
  });
});

describe('getAdapter', () => {
  it('resolves "shadcn"', () => {
    const adapter = getAdapter('shadcn');
    expect(adapter.name).toBe('shadcn');
  });

  it('resolves "tailwind"', () => {
    const adapter = getAdapter('tailwind');
    expect(adapter.name).toBe('tailwind');
  });

  it('throws for unknown names, listing known adapters', () => {
    expect(() => getAdapter('bootstrap')).toThrow(/Unknown design system adapter "bootstrap"/);
    expect(() => getAdapter('bootstrap')).toThrow(/shadcn/);
    expect(() => getAdapter('bootstrap')).toThrow(/tailwind/);
  });
});

// -- Equivalence: adapter output matches bare functions ---------------------

const FIXTURE_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700");
:root {
  --spacing: 0.25rem;
  --radius: 0.5rem;
  --text-base: 1rem;
  --ring-width: 2px;
  --font-sans: "Inter", sans-serif;
  --primary: oklch(0.65 0.19 258);
  --background: oklch(1 0 0);
  --foreground: oklch(0.15 0 0);
  --muted: oklch(0.9 0 0);
}
`;

describe('ShadcnAdapter equivalence', () => {
  const adapter = getAdapter('shadcn');

  it('detectFonts matches bare detectFonts', () => {
    const bare = [...detectFonts(FIXTURE_CSS)];
    const adapted = adapter.detectFonts(FIXTURE_CSS);
    expect(adapted).toEqual(bare);
  });

  it('detectColors matches colorsFromClassification(classifyDeclarations(extractShadcnRoot(...)))', () => {
    const declarations = extractShadcnRoot(FIXTURE_CSS);
    const classification = classifyDeclarations(declarations);
    const bare = [...colorsFromClassification(classification)];
    const adapted = adapter.detectColors(FIXTURE_CSS);
    expect(adapted).toEqual(bare);
  });

  it('detectSpacing matches detectSpacingBase', () => {
    const bare = detectSpacingBase(FIXTURE_CSS);
    const adapted = adapter.detectSpacing(FIXTURE_CSS);
    expect(adapted.base).toBe(bare);
  });

  it('detectRadius matches detectRadiusBase', () => {
    const bare = detectRadiusBase(FIXTURE_CSS);
    const adapted = adapter.detectRadius(FIXTURE_CSS);
    expect(adapted.base).toBe(bare);
  });

  it('detectFontSize matches detectFontSizeBase', () => {
    const bare = detectFontSizeBase(FIXTURE_CSS);
    const adapted = adapter.detectFontSize(FIXTURE_CSS);
    expect(adapted.base).toBe(bare);
  });

  it('detectFocusRing matches detectFocusRingWidth', () => {
    const bare = detectFocusRingWidth(FIXTURE_CSS);
    const adapted = adapter.detectFocusRing(FIXTURE_CSS);
    expect(adapted.width).toBe(bare);
  });
});

describe('TailwindAdapter equivalence', () => {
  const adapter = getAdapter('tailwind');

  it('detectFonts matches bare detectFonts', () => {
    const bare = [...detectFonts(FIXTURE_CSS)];
    const adapted = adapter.detectFonts(FIXTURE_CSS);
    expect(adapted).toEqual(bare);
  });

  it('detectColors matches colorsFromClassification composition', () => {
    const declarations = extractShadcnRoot(FIXTURE_CSS);
    const classification = classifyDeclarations(declarations);
    const bare = [...colorsFromClassification(classification)];
    const adapted = adapter.detectColors(FIXTURE_CSS);
    expect(adapted).toEqual(bare);
  });

  it('detectSpacing matches detectSpacingBase', () => {
    const bare = detectSpacingBase(FIXTURE_CSS);
    const adapted = adapter.detectSpacing(FIXTURE_CSS);
    expect(adapted.base).toBe(bare);
  });

  it('detectRadius matches detectRadiusBase', () => {
    const bare = detectRadiusBase(FIXTURE_CSS);
    const adapted = adapter.detectRadius(FIXTURE_CSS);
    expect(adapted.base).toBe(bare);
  });

  it('detectFontSize matches detectFontSizeBase', () => {
    const bare = detectFontSizeBase(FIXTURE_CSS);
    const adapted = adapter.detectFontSize(FIXTURE_CSS);
    expect(adapted.base).toBe(bare);
  });

  it('detectFocusRing matches detectFocusRingWidth', () => {
    const bare = detectFocusRingWidth(FIXTURE_CSS);
    const adapted = adapter.detectFocusRing(FIXTURE_CSS);
    expect(adapted.width).toBe(bare);
  });
});

// -- Empty/missing detection ------------------------------------------------

describe('adapter empty detection', () => {
  const adapter = getAdapter('shadcn');
  const emptyCss = 'body { color: red; }';

  it('detectFonts returns empty array for CSS with no fonts', () => {
    expect(adapter.detectFonts(emptyCss)).toEqual([]);
  });

  it('detectColors returns empty array for CSS with no :root colors', () => {
    expect(adapter.detectColors(emptyCss)).toEqual([]);
  });

  it('detectSpacing returns empty object when no spacing declaration found', () => {
    expect(adapter.detectSpacing(emptyCss)).toEqual({});
  });

  it('detectRadius returns empty object when no radius declaration found', () => {
    expect(adapter.detectRadius(emptyCss)).toEqual({});
  });

  it('detectFocusRing returns empty object when no ring-width declaration found', () => {
    expect(adapter.detectFocusRing(emptyCss)).toEqual({});
  });

  it('detectFontSize returns empty object when no font-size-base declaration found', () => {
    expect(adapter.detectFontSize(emptyCss)).toEqual({});
  });
});
