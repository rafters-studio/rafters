import { describe, expect, it } from 'vitest';
import { registryToTailwindStatic, tokensToTailwind } from '../../src/exporters/tailwind.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import { REGISTRY_PLUGINS, TokenRegistry } from '../../src/index.js';

const tokens = generateBaseSystem({}).allTokens;
const SANS = '@fontsource-variable/noto-sans';
const ARAB = '@fontsource-variable/noto-sans-arabic';

describe('fontImports (#2754)', () => {
  it('emits the font imports ahead of @import "tailwindcss"', () => {
    expect(tokensToTailwind(tokens, { fontImports: [SANS, ARAB] }, [])).toMatch(
      /^@import "@fontsource-variable\/noto-sans";\n@import "@fontsource-variable\/noto-sans-arabic";\n@import "tailwindcss";\n/,
    );
  });

  it('emits the font imports then an empty line when includeImport is false', () => {
    const noTw = tokensToTailwind(tokens, { includeImport: false, fontImports: [SANS, ARAB] }, []);
    expect(noTw.startsWith(`@import "${SANS}";\n@import "${ARAB}";\n\n`)).toBe(true);
    expect(noTw).not.toContain('@import "tailwindcss"');
  });

  it('emits the font imports in the static sheet', () => {
    expect(
      registryToTailwindStatic(new TokenRegistry(tokens, REGISTRY_PLUGINS), {
        fontImports: [SANS],
      }).startsWith(`@import "${SANS}";\n@import "tailwindcss";\n`),
    ).toBe(true);
  });

  it('keeps list order and emits a repeated entry once', () => {
    expect(
      tokensToTailwind(tokens, { fontImports: ['a', 'b', 'a'] }, []).match(/^@import "(a|b)";$/gm),
    ).toEqual(['@import "a";', '@import "b";']);
  });

  it('is byte-identical to today when the list is empty', () => {
    expect(tokensToTailwind(tokens, { fontImports: [] }, [])).toBe(
      tokensToTailwind(tokens, {}, []),
    );
    expect(tokensToTailwind(tokens, { includeImport: false, fontImports: [] }, [])).toBe(
      tokensToTailwind(tokens, { includeImport: false }, []),
    );
    const registry = new TokenRegistry(tokens, REGISTRY_PLUGINS);
    expect(registryToTailwindStatic(registry, { fontImports: [] })).toBe(
      registryToTailwindStatic(registry),
    );
  });

  it('throws on an entry that cannot be one @import line', () => {
    for (const entry of ['a";b', 'a\\b', 'a\nb', 'a\rb', '']) {
      expect(() => tokensToTailwind(tokens, { fontImports: [entry] }, [])).toThrow(
        'Invalid font import',
      );
      expect(() =>
        registryToTailwindStatic(new TokenRegistry(tokens, REGISTRY_PLUGINS), {
          fontImports: [entry],
        }),
      ).toThrow('Invalid font import');
    }
  });

  it('allows a semicolon inside the quoted entry', () => {
    const url = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';
    expect(
      tokensToTailwind(tokens, { fontImports: [url] }, []).startsWith(`@import "${url}";\n`),
    ).toBe(true);
  });
});
