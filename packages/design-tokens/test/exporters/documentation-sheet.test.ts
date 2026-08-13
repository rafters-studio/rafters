/**
 * Completeness guard for the documentation stylesheet (#2039).
 *
 * The documentation sheet is adopted by veneer for live previews and
 * treeshaken at bake. It must contain both the token-derived utility surface
 * (colors, spacing, typography at base + state variants) AND every structural
 * utility the installed components reference (flex, w-full, items-center, etc.).
 *
 * #2039: the call site in outputs.ts was not passing contentSources to
 * registryToDocumentation(), so the sheet contained only token-derived
 * candidates. These tests guard against that regression.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  registryToDocumentation,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

// Pure layout utilities with NO token dependency -- these only appear when
// Tailwind scans component source files via contentSources. Utilities like
// border-b ARE token-derivable (they reference the spacing/border scale),
// so they appear even without content sources and cannot test the regression.
const STRUCTURAL_CLASSES = 'flex items-center justify-between inline-flex sr-only';

const CONTENT_ONLY_UTILITIES = [
  'flex',
  'items-center',
  'justify-between',
  'inline-flex',
  'sr-only',
];

function baseRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  return new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

describe('documentation sheet (#2039)', () => {
  let fixtureDir: string;

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-doc-sheet-'));
    writeFileSync(
      join(fixtureDir, 'layout.classes.ts'),
      `export const x = '${STRUCTURAL_CLASSES}';\n`,
    );
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('includes content-sourced utilities when contentSources are provided', async () => {
    const css = await registryToDocumentation(baseRegistry(), {
      contentSources: [fixtureDir],
    });
    for (const rule of CONTENT_ONLY_UTILITIES) {
      expect(css, `missing utility from content source: .${rule}`).toContain(`.${rule}`);
    }
  });

  it('omits content-sourced utilities when no contentSources are provided', async () => {
    const css = await registryToDocumentation(baseRegistry());
    for (const rule of CONTENT_ONLY_UTILITIES) {
      expect(
        css,
        `utility .${rule} present without content sources -- it should only appear via scanning`,
      ).not.toContain(`.${rule}`);
    }
  });

  it('always includes token-derived utilities regardless of contentSources', async () => {
    const css = await registryToDocumentation(baseRegistry());
    expect(css).toContain('bg-surface');
    expect(css).toContain('text-foreground');
  });
});
