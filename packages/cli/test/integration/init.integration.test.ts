/**
 * Integration tests for `rafters init`
 *
 * Tests the full initialization workflow against real fixture projects.
 * Each test creates a temporary project, runs `rafters init`, and verifies
 * the resulting .rafters/ directory structure, config, and outputs.
 */

import { readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture, type FixtureType } from '../fixtures/projects.js';
import { execCli, fixtureFileExists, readConfig, readFixtureFile } from './helpers.js';

let fixturePath = '';

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

describe('rafters init - fresh initialization', () => {
  it('initializes a Next.js project with shadcn', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);
    expect(fixtureFileExists(fixturePath, '.rafters/config.rafters.json')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/tokens')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.css')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.ts')).toBe(true);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('next');
    expect(config.shadcn).toBe(true);
    expect(config.componentsPath).toBe('components/ui');
    expect(config.primitivesPath).toBe('lib/primitives');
    expect(config.exports).toEqual({
      tailwind: true,
      typescript: true,
      dtcg: false,
      compiled: false,
    });
    expect(config.installed).toEqual({
      components: [],
      primitives: [],
      composites: [],
      rules: [],
    });
  }, 30000);

  it('initializes a Vite project with shadcn', async () => {
    fixturePath = await createFixture('vite-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('vite');
    expect(config.shadcn).toBe(true);
    expect(config.componentsPath).toBe('src/components/ui');
  }, 30000);

  it('initializes a Vite project without shadcn', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('vite');
    expect(config.shadcn).toBe(false);
  }, 30000);

  it('initializes a Remix project with shadcn', async () => {
    fixturePath = await createFixture('remix-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('remix');
    expect(config.componentsPath).toBe('app/components/ui');
  }, 30000);

  it('initializes an Astro project with shadcn', async () => {
    fixturePath = await createFixture('astro-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('astro');
    expect(config.componentsPath).toBe('src/components/ui');
  }, 30000);

  it('rejects Tailwind v3 projects', async () => {
    fixturePath = await createFixture('tailwind-v3-error');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Tailwind v3');
  }, 30000);

  it('generates token namespace files', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    const tokensDir = join(fixturePath, '.rafters', 'tokens');
    const files = readdirSync(tokensDir);

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('.rafters.json'))).toBe(true);
  }, 30000);

  it('generates valid Tailwind CSS output', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    const css = await readFixtureFile(fixturePath, '.rafters/output/rafters.css');
    expect(css).toContain('@import "tailwindcss"');
    expect(css).toContain('--');
  }, 30000);

  it('generates valid TypeScript output', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    const ts = await readFixtureFile(fixturePath, '.rafters/output/rafters.ts');
    expect(ts).toContain('export');
  }, 30000);

  it('updates main CSS file with rafters import for non-shadcn projects', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    const css = await readFixtureFile(fixturePath, 'src/index.css');
    expect(css).toContain('.rafters/output/rafters.css');
    // Original tailwindcss import should be replaced
    expect(css).not.toContain('@import "tailwindcss"');
  }, 30000);

  it('creates CSS backup when modifying main CSS', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    expect(fixtureFileExists(fixturePath, 'src/index.backup.css')).toBe(true);
  }, 30000);

  it('fails on second init without --rebuild flag', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    const result = await execCli(fixturePath, ['init']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('already exists');
  }, 30000);
});

describe('rafters init --rebuild', () => {
  it('regenerates outputs from existing tokens', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Verify initial outputs exist
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.css')).toBe(true);

    // Rebuild
    const result = await execCli(fixturePath, ['init', '--rebuild']);
    expect(result.exitCode).toBe(0);

    // Outputs should still exist
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.css')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.ts')).toBe(true);
  }, 30000);

  it('preserves existing config and installed components', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Read initial config
    const initialConfig = await readConfig(fixturePath);

    // Rebuild
    await execCli(fixturePath, ['init', '--rebuild']);

    // Config should be preserved
    const rebuiltConfig = await readConfig(fixturePath);
    expect(rebuiltConfig.framework).toBe(initialConfig.framework);
    expect(rebuiltConfig.shadcn).toBe(initialConfig.shadcn);
  }, 30000);
});

describe('rafters init --reset', () => {
  it('replaces tokens with defaults', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Get initial token count
    const tokensDir = join(fixturePath, '.rafters', 'tokens');
    const _initialFiles = readdirSync(tokensDir);

    // Reset
    const result = await execCli(fixturePath, ['init', '--reset']);
    expect(result.exitCode).toBe(0);

    // Tokens should exist (regenerated from defaults)
    const resetFiles = readdirSync(tokensDir);
    expect(resetFiles.length).toBeGreaterThan(0);
  }, 30000);

  it('fails when .rafters does not exist', async () => {
    fixturePath = await createFixture('nextjs-no-shadcn');
    const result = await execCli(fixturePath, ['init', '--reset']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Nothing to reset');
  }, 30000);
});

describe('rafters init - source CSS sensing', () => {
  it('emits init:import_sensed when source CSS has classifiable declarations', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    const cssPath = join(fixturePath, 'src/app/globals.css');
    await writeFile(
      cssPath,
      `:root {
  --primary: oklch(0.5 0.2 30);
  --background: oklch(1 0 0);
  --destructive: hsl(0 70% 50%);
  --radius: 0.5rem;
  --font-sans: "Inter", system-ui, sans-serif;
  --tw-ring-color: oklch(0.5 0.2 240);
  --some-internal: 42;
}
@import "tailwindcss";
`,
    );

    const result = await execCli(fixturePath, ['init', '--agent']);
    expect(result.exitCode).toBe(0);

    const events = result.stdout
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const sensed = events.find((e) => e.event === 'init:import_sensed');
    expect(sensed).toBeDefined();
    expect(sensed?.cssPath).toBe('src/app/globals.css');
    expect(sensed?.totalDeclarations).toBe(7);
    const byNamespace = sensed?.byNamespace as Record<string, number>;
    expect(byNamespace.semantic).toBe(3); // primary, background, destructive
    expect(byNamespace.color).toBe(1); // tw-ring-color (color value, non-shadcn name)
    expect(byNamespace.radius).toBe(1);
    expect(byNamespace.typography).toBe(1);
    expect(sensed?.namespacesPresent).toEqual(['color', 'semantic', 'typography', 'radius']);
    expect(sensed?.unclassifiedCount).toBe(1); // some-internal: 42
  }, 30000);

  it('imports each accepted shadcn semantic via define + set in agent mode', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    const cssPath = join(fixturePath, 'src/app/globals.css');
    await writeFile(
      cssPath,
      `:root {
  --primary: oklch(0.5 0.2 30);
  --background: oklch(1 0 0);
  --destructive: hsl(0 70% 50%);
  --radius: 0.5rem;
  --tw-ring-color: oklch(0.5 0.2 240);
}
@import "tailwindcss";
`,
    );

    const result = await execCli(fixturePath, ['init', '--agent']);
    expect(result.exitCode).toBe(0);

    const events = result.stdout
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const applied = events.find((e) => e.event === 'init:import_applied');
    expect(applied).toBeDefined();
    // 3 semantics (primary, background, destructive) + 1 color-namespace
    // primitive (tw-ring-color) + 1 radius (direct set on the rafters
    // `radius` token).
    expect(applied?.count).toBe(5);
    expect(applied?.cssPath).toBe('src/app/globals.css');

    // (1) Imported family + per-position primitive tokens land on disk.
    const colorTokensRaw = await readFixtureFile(fixturePath, '.rafters/tokens/color.rafters.json');
    const colorTokens = JSON.parse(colorTokensRaw) as {
      tokens: Array<{ name: string; value: unknown }>;
    };
    const tokensByName = new Map(colorTokens.tokens.map((t) => [t.name, t]));
    expect(tokensByName.has('imported-primary')).toBe(true);
    expect(tokensByName.has('imported-primary-50')).toBe(true);
    expect(tokensByName.has('imported-primary-500')).toBe(true);
    expect(tokensByName.has('imported-primary-600')).toBe(true);
    expect(tokensByName.has('imported-primary-950')).toBe(true);
    expect(tokensByName.has('imported-background')).toBe(true);
    expect(tokensByName.has('imported-destructive')).toBe(true);
    expect(tokensByName.has('imported-tw-ring-color')).toBe(true);

    // (2) The seed OKLCH is preserved verbatim at position 500 -- the
    // canonical "main" anchor of a family. `colorValueFromFamily` honors
    // the source position via `sourcePositions: {'500': seed}`. Source
    // was --primary: oklch(0.5 0.2 30).
    const primaryAt500 = tokensByName.get('imported-primary-500');
    expect(primaryAt500?.value).toBe('oklch(0.5 0.2 30)');

    // (3) The imported family carries the full rich data that
    // `buildColorValue` produces -- harmonies, semantic suggestions,
    // tokenId, full WCAG ladder + APCA. Verifies we are not hand-stitching
    // ColorValues anymore.
    const primaryFamily = tokensByName.get('imported-primary');
    const primaryValue = primaryFamily?.value as Record<string, unknown> | undefined;
    expect(primaryValue?.harmonies).toBeDefined();
    expect(primaryValue?.tokenId).toMatch(/^color-/);
    expect(primaryValue?.semanticSuggestions).toBeDefined();
    expect(primaryValue?.atmosphericWeight).toBeDefined();

    // (4) The semantic primary is reseated to a ColorReference pointing at
    // the imported family@500 -- not an opaque OKLCH literal (that would
    // hit the documented "ColorValue where exporter expects ColorReference"
    // failure mode from recall 019d6189).
    const semanticTokensRaw = await readFixtureFile(
      fixturePath,
      '.rafters/tokens/semantic.rafters.json',
    );
    const semanticTokens = JSON.parse(semanticTokensRaw) as {
      tokens: Array<{ name: string; value: unknown; userOverride: unknown }>;
    };
    const primary = semanticTokens.tokens.find((t) => t.name === 'primary');
    expect(primary?.value).toEqual({ family: 'imported-primary', position: '500' });

    // (5) The userOverride diary entry captures intent so future cascades
    // can read why primary deviates from defaults.
    expect(primary?.userOverride).toMatchObject({
      reason: expect.stringContaining('imported from --primary'),
    });

    // (6) Tailwind output resolves end-to-end: `--rafters-primary` points
    // at the imported family's 500 position, and that position is declared
    // (not a dangling reference).
    const css = await readFixtureFile(fixturePath, '.rafters/output/rafters.css');
    expect(css).toContain('--rafters-primary: var(--color-imported-primary-500)');
    expect(css).toContain('--color-imported-primary-500: oklch(0.5 0.2 30)');

    // (6) The cascade fired through the imported family: primary-foreground
    // re-derived to use the imported family's most-contrasting position
    // (50 here, the lightest), not the pre-import neutral default.
    expect(css).toMatch(/--rafters-primary-foreground:\s*var\(--color-imported-primary-\d+\)/);

    // (7) Direct-set on the `radius` token persisted the user's value
    // verbatim. Source: `--radius: 0.5rem`.
    const radiusTokensRaw = await readFixtureFile(
      fixturePath,
      '.rafters/tokens/radius.rafters.json',
    );
    const radiusTokens = JSON.parse(radiusTokensRaw) as {
      tokens: Array<{ name: string; value: unknown; userOverride: unknown }>;
    };
    const radius = radiusTokens.tokens.find((t) => t.name === 'radius');
    expect(radius?.value).toBe('0.5rem');
    expect(radius?.userOverride).toMatchObject({
      reason: expect.stringContaining('imported from --radius'),
    });
  }, 30000);

  it('imports typography declarations via direct registry.set on matching tokens', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await writeFile(
      join(fixturePath, 'src/app/globals.css'),
      `:root {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --font-display-bold: "Custom Display", serif;
}
@import "tailwindcss";
`,
    );

    const result = await execCli(fixturePath, ['init', '--agent']);
    expect(result.exitCode).toBe(0);

    const events = result.stdout
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const applied = events.find((e) => e.event === 'init:import_applied');
    expect(applied).toBeDefined();
    // font-sans + font-mono match rafters tokens; font-display-bold does
    // not (rafters doesn't ship that name) and lands in the `skipped` list.
    expect(applied?.count).toBe(2);
    expect(applied?.skipped).toEqual(['font-display-bold']);

    // The matching tokens carry the imported values verbatim.
    const tokensRaw = await readFixtureFile(fixturePath, '.rafters/tokens/typography.rafters.json');
    const tokens = JSON.parse(tokensRaw) as {
      tokens: Array<{ name: string; value: unknown; userOverride: unknown }>;
    };
    const fontSans = tokens.tokens.find((t) => t.name === 'font-sans');
    const fontMono = tokens.tokens.find((t) => t.name === 'font-mono');
    expect(fontSans?.value).toBe('"Inter", system-ui, sans-serif');
    expect(fontMono?.value).toBe('"JetBrains Mono", monospace');
    expect(fontSans?.userOverride).toMatchObject({
      reason: expect.stringContaining('imported from --font-sans'),
    });
  }, 30000);

  it('imports non-shadcn-semantic colors as primitive families without reseating semantics', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await writeFile(
      join(fixturePath, 'src/app/globals.css'),
      `:root {
  --brand-empire: oklch(0.4 0.2 240);
  --brand-republic: oklch(0.5 0.2 200);
  --radius: 0.5rem;
}
@import "tailwindcss";
`,
    );

    const result = await execCli(fixturePath, ['init', '--agent']);
    expect(result.exitCode).toBe(0);

    const events = result.stdout
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    // Apply fires for color-namespace primitives the same as for shadcn
    // semantics -- the only difference is that primitives skip the
    // semantic-set step. The radius declaration is direct-set on the
    // existing rafters `radius` token.
    const applied = events.find((e) => e.event === 'init:import_applied');
    expect(applied).toBeDefined();
    expect(applied?.count).toBe(3); // brand-empire, brand-republic, radius

    // (1) Per-position + family tokens land on disk for both brand colors.
    const colorTokensRaw = await readFixtureFile(fixturePath, '.rafters/tokens/color.rafters.json');
    const colorTokens = JSON.parse(colorTokensRaw) as {
      tokens: Array<{ name: string; value: unknown }>;
    };
    const tokensByName = new Map(colorTokens.tokens.map((t) => [t.name, t]));
    expect(tokensByName.has('imported-brand-empire')).toBe(true);
    expect(tokensByName.has('imported-brand-empire-600')).toBe(true);
    expect(tokensByName.has('imported-brand-republic')).toBe(true);
    expect(tokensByName.has('imported-brand-republic-600')).toBe(true);

    // (2) Seed OKLCH preserved at position 600 for both.
    expect(tokensByName.get('imported-brand-empire-600')?.value).toBe('oklch(0.4 0.2 240)');
    expect(tokensByName.get('imported-brand-republic-600')?.value).toBe('oklch(0.5 0.2 200)');

    // (3) No rafters semantic was reseated -- `primary`, `background`, etc.
    // stay at their Phase A defaults. Designer assigns these brand colors
    // to semantics later (via `rafters set` or Studio).
    const semanticTokensRaw = await readFixtureFile(
      fixturePath,
      '.rafters/tokens/semantic.rafters.json',
    );
    const semanticTokens = JSON.parse(semanticTokensRaw) as {
      tokens: Array<{ name: string; value: unknown; userOverride: unknown }>;
    };
    const primary = semanticTokens.tokens.find((t) => t.name === 'primary');
    expect(primary?.userOverride).toBeNull();
    expect(primary?.value).not.toMatchObject({ family: expect.stringContaining('imported-') });

    // (4) The primitives are reachable from CSS output even without a
    // semantic referencing them -- the Tailwind exporter emits every color
    // token's per-position declarations.
    const css = await readFixtureFile(fixturePath, '.rafters/output/rafters.css');
    expect(css).toContain('--color-imported-brand-empire-600: oklch(0.4 0.2 240)');
    expect(css).toContain('--color-imported-brand-republic-600: oklch(0.5 0.2 200)');
  }, 30000);

  it('runs the typography font role-walk over detected font families in agent mode', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    // Source mixes detection paths: Google Fonts @import (Inter, JetBrains
    // Mono) AND a local @font-face (MyDisplay). No :root --font-* decls --
    // the role walk should still run.
    await writeFile(
      join(fixturePath, 'src/app/globals.css'),
      `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400");
@font-face {
  font-family: "MyDisplay";
  src: url("/fonts/MyDisplay.woff2") format("woff2");
}
@import "tailwindcss";
`,
    );

    const result = await execCli(fixturePath, ['init', '--agent']);
    expect(result.exitCode).toBe(0);

    const events = result.stdout
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const applied = events.find((e) => e.event === 'init:import_fonts_applied');
    expect(applied).toBeDefined();
    expect(applied?.fontsDetected).toEqual(['Inter', 'JetBrains Mono', 'MyDisplay']);
    // Agent mode: sans-named fonts fill heading + body; mono-named fills code.
    expect(applied?.assignments).toEqual([
      { role: 'heading', family: 'Inter' },
      { role: 'body', family: 'Inter' },
      { role: 'code', family: 'JetBrains Mono' },
    ]);

    // Role tokens AND base families both carry the assigned stacks.
    const tokensRaw = await readFixtureFile(fixturePath, '.rafters/tokens/typography.rafters.json');
    const tokens = JSON.parse(tokensRaw) as {
      tokens: Array<{ name: string; value: unknown; userOverride: unknown }>;
    };
    const byName = new Map(tokens.tokens.map((t) => [t.name, t]));
    expect(byName.get('font-heading')?.value).toBe('Inter');
    expect(byName.get('font-body')?.value).toBe('Inter');
    expect(byName.get('font-code')?.value).toBe('"JetBrains Mono"');
    expect(byName.get('font-sans')?.value).toBe('Inter');
    expect(byName.get('font-mono')?.value).toBe('"JetBrains Mono"');
    expect(byName.get('font-heading')?.userOverride).toMatchObject({
      reason: expect.stringContaining('assigned Inter as heading'),
    });
  }, 30000);

  it('skips sensing when source CSS has no :root declarations', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    // The default fixture globals.css is `@import "tailwindcss";\n` -- no :root block.
    const result = await execCli(fixturePath, ['init', '--agent']);
    expect(result.exitCode).toBe(0);

    const events = result.stdout
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    const sensed = events.find((e) => e.event === 'init:import_sensed');
    expect(sensed).toBeUndefined();
  }, 30000);
});

describe('rafters init - framework detection across all types', () => {
  const frameworkTests: Array<{ fixture: FixtureType; expected: string }> = [
    { fixture: 'nextjs-shadcn-v4', expected: 'next' },
    { fixture: 'nextjs-no-shadcn', expected: 'next' },
    { fixture: 'vite-shadcn-v4', expected: 'vite' },
    { fixture: 'vite-no-shadcn', expected: 'vite' },
    { fixture: 'remix-shadcn-v4', expected: 'remix' },
    { fixture: 'astro-shadcn-v4', expected: 'astro' },
  ];

  for (const { fixture, expected } of frameworkTests) {
    it(`detects ${expected} from ${fixture}`, async () => {
      fixturePath = await createFixture(fixture);
      await execCli(fixturePath, ['init']);

      const config = await readConfig(fixturePath);
      expect(config.framework).toBe(expected);
    }, 30000);
  }
});
