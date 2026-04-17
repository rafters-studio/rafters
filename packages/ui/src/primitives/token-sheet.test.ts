import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractTokenSheet } from './token-sheet.js';

const FIXTURES = join(__dirname, '__fixtures__');

describe('extractTokenSheet', () => {
  it('extracts every --* custom property from real Tailwind v4 output', async () => {
    const raw = await readFile(join(FIXTURES, 'rafters.css'), 'utf-8');
    const result = extractTokenSheet(raw);

    const inputCustomProps = [...raw.matchAll(/(--[a-z][a-z0-9-]*)\s*:/g)]
      .map((m) => m[1])
      .filter((name): name is string => Boolean(name));

    for (const prop of new Set(inputCustomProps)) {
      expect(result).toContain(prop);
    }
  });

  it('produces output that adopts via CSSStyleSheet.replaceSync without error', async () => {
    const raw = await readFile(join(FIXTURES, 'rafters.css'), 'utf-8');
    const result = extractTokenSheet(raw);
    const sheet = new CSSStyleSheet();
    expect(() => sheet.replaceSync(result)).not.toThrow();
  });

  it('output contains zero non-custom-property declarations', async () => {
    const raw = await readFile(join(FIXTURES, 'rafters.css'), 'utf-8');
    const result = extractTokenSheet(raw);
    const declarations = [...result.matchAll(/([\w-]+)\s*:/g)]
      .map((m) => m[1])
      .filter((name): name is string => Boolean(name) && name !== 'root');
    for (const decl of declarations) {
      expect(decl.startsWith('--')).toBe(true);
    }
  });

  it('output contains zero utility class rules', async () => {
    const raw = await readFile(join(FIXTURES, 'rafters.css'), 'utf-8');
    const result = extractTokenSheet(raw);
    expect(result).not.toMatch(/^\.[a-z]/m);
    expect(result).not.toContain('@theme');
    expect(result).not.toContain('@utility');
    expect(result).not.toContain('@layer');
    expect(result).not.toContain('@apply');
    expect(result).not.toContain('@keyframes');
  });

  it('throws structured error with code NO_ROOT_BLOCK when input lacks :root', async () => {
    const raw = await readFile(join(FIXTURES, 'no-root.css'), 'utf-8');
    expect(() => extractTokenSheet(raw)).toThrow(
      expect.objectContaining({ code: 'NO_ROOT_BLOCK' }),
    );
  });

  it('throws structured error with code INVALID_CSS on malformed input', async () => {
    const raw = await readFile(join(FIXTURES, 'malformed.css'), 'utf-8');
    expect(() => extractTokenSheet(raw)).toThrow(expect.objectContaining({ code: 'INVALID_CSS' }));
  });

  it('thrown errors are plain objects, not Error subclass instances', async () => {
    const raw = await readFile(join(FIXTURES, 'no-root.css'), 'utf-8');
    try {
      extractTokenSheet(raw);
      expect.fail('expected throw');
    } catch (err) {
      expect(err instanceof Error).toBe(false);
      expect(typeof err).toBe('object');
    }
  });

  it('preserves dark-mode rule blocks when they contain --* declarations', async () => {
    const raw = await readFile(join(FIXTURES, 'rafters.css'), 'utf-8');
    const result = extractTokenSheet(raw);
    expect(result).toMatch(/\.dark\s*\{/);
  });

  it('integrates with RaftersElement.setTokenCSS', async () => {
    const { RaftersElement } = await import('./rafters-element.js');
    const raw = await readFile(join(FIXTURES, 'rafters.css'), 'utf-8');
    const result = extractTokenSheet(raw);
    expect(() => RaftersElement.setTokenCSS(result)).not.toThrow();
  });
});

describe('loadTokenSheet', () => {
  it('throws OUTPUT_NOT_FOUND when .rafters/output/rafters.css is missing', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const originalCwd = process.cwd();
    const dir = mkdtempSync(join(originalCwd, '.tmp-token-sheet-'));
    try {
      process.chdir(dir);
      const { loadTokenSheet } = await import('./token-sheet.js');
      await expect(loadTokenSheet()).rejects.toEqual(
        expect.objectContaining({ code: 'OUTPUT_NOT_FOUND' }),
      );
    } finally {
      process.chdir(originalCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
