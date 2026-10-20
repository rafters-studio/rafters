/**
 * Integration tests for the explicit stylesheet import (#2763):
 * `rafters init --css-import <path> --map ...` and `rafters import`.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import { createInitializedFixture, execCli, readFixtureFile } from './helpers.js';

const LEGACY_CSS = `:root {
  --brand: var(--cc-blue);
  --cc-blue: oklch(0.55 0.15 250);
  --slate-gray: #708090;
  --corner: 0.75rem;
  --space: 0.3rem;
  --face: "Inter", sans-serif;
  --unused: red;
  --dangling: var(--nowhere);
}
`;

interface StoredToken {
  name: string;
  value: unknown;
  userOverride: unknown;
}

let fixturePaths: string[] = [];

afterEach(async () => {
  for (const p of fixturePaths) await cleanupFixture(p);
  fixturePaths = [];
});

async function legacyFixture(initialized = false): Promise<string> {
  const p = initialized
    ? await createInitializedFixture('nextjs-shadcn-v4')
    : await createFixture('nextjs-shadcn-v4');
  fixturePaths.push(p);
  await writeFile(join(p, 'legacy.css'), LEGACY_CSS);
  return p;
}

async function tokens(p: string, namespace: string): Promise<Map<string, StoredToken>> {
  const raw = await readFixtureFile(p, `.rafters/tokens/${namespace}.rafters.json`);
  const parsed = JSON.parse(raw) as { tokens: StoredToken[] };
  return new Map(parsed.tokens.map((t) => [t.name, t]));
}

function errorMessage(stderr: string): string {
  const line = stderr.trim().split('\n').pop() ?? '';
  return (JSON.parse(line) as { message: string }).message;
}

async function snapshot(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else {
        const hash = createHash('sha256')
          .update(await readFile(full))
          .digest('hex');
        out.set(relative(root, full), hash);
      }
    }
  };
  await walk(root);
  return out;
}

describe('rafters init --css-import', () => {
  it('sets primary to a new family pinned at the resolved colour, ignoring unmapped declarations', async () => {
    const p = await legacyFixture();
    const result = await execCli(p, [
      'init',
      '--agent',
      '--css-import',
      'legacy.css',
      '--map',
      '{"primary":"--brand"}',
    ]);
    expect(result.exitCode).toBe(0);

    const semantic = await tokens(p, 'semantic');
    expect(semantic.get('primary')?.value).toEqual({ family: 'imported-brand', position: '500' });
    expect(semantic.get('primary')?.userOverride).toMatchObject({
      reason: expect.stringContaining('imported from --brand'),
    });

    const color = await tokens(p, 'color');
    expect(color.get('imported-brand-500')?.value).toBe('oklch(0.55 0.15 250)');
    // Unmapped declarations, and the fixture's shadcn globals.css, import nothing.
    for (const name of color.keys()) {
      expect(name).not.toMatch(/^imported-(?!brand)/);
    }
  });

  it('gives the same result with the repeatable --map form', async () => {
    const json = await legacyFixture();
    const pairs = await legacyFixture();
    const a = await execCli(json, [
      'init',
      '--agent',
      '--css-import',
      'legacy.css',
      '--map',
      '{"primary":"--brand","radius":"--corner"}',
    ]);
    const b = await execCli(pairs, [
      'init',
      '--agent',
      '--css-import',
      'legacy.css',
      '--map',
      'primary=--brand',
      '--map',
      'radius=--corner',
    ]);
    expect(a.exitCode).toBe(0);
    expect(b.exitCode).toBe(0);
    for (const ns of ['semantic', 'radius']) {
      const ta = await tokens(json, ns);
      const tb = await tokens(pairs, ns);
      for (const [name, t] of ta) expect(tb.get(name)?.value).toEqual(t.value);
    }
    const ca = await tokens(json, 'color');
    const cb = await tokens(pairs, 'color');
    expect(cb.get('imported-brand-500')?.value).toEqual(ca.get('imported-brand-500')?.value);
  });

  it('sets radius-base, spacing-base and font-sans as designer overrides', async () => {
    const p = await legacyFixture();
    const result = await execCli(p, [
      'init',
      '--agent',
      '--css-import',
      'legacy.css',
      '--map',
      '{"radius":"--corner","spacing-base":"--space","font-sans":"--face"}',
    ]);
    expect(result.exitCode).toBe(0);

    const expected: Array<[string, string, string, string]> = [
      ['radius', 'radius-base', '0.75rem', '--corner'],
      ['spacing', 'spacing-base', '0.3rem', '--space'],
      ['typography', 'font-sans', '"Inter", sans-serif', '--face'],
    ];
    for (const [ns, name, value, property] of expected) {
      const t = (await tokens(p, ns)).get(name);
      expect(t?.value).toBe(value);
      expect(t?.userOverride).toMatchObject({
        reason: expect.stringContaining(`imported from ${property}`),
      });
    }
  });

  it.each([
    ['unknown target', ['--map', '{"bogus":"--brand"}'], 'bogus'],
    ['missing property', ['--map', '{"primary":"--nope"}'], 'primary=--nope'],
    ['unparseable value', ['--map', 'radius=--slate-gray'], 'radius=--slate-gray'],
    ['unresolved chain', ['--map', 'primary=--dangling'], 'primary=--dangling'],
    ['invalid JSON', ['--map', '{"primary":'], '{"primary":'],
    ['value not shaped --name', ['--map', '{"primary":"brand"}'], 'primary'],
  ])('fails on %s and writes nothing', async (_label, mapArgs, entry) => {
    const p = await legacyFixture();
    const before = await snapshot(p);
    const result = await execCli(p, ['init', '--agent', '--css-import', 'legacy.css', ...mapArgs]);
    expect(result.exitCode).not.toBe(0);
    expect(errorMessage(result.stderr)).toContain(entry);
    expect(await snapshot(p)).toEqual(before);
  });

  it('fails naming an unreadable path and writes nothing', async () => {
    const p = await legacyFixture();
    const before = await snapshot(p);
    const result = await execCli(p, ['init', '--agent', '--css-import', 'nope.css']);
    expect(result.exitCode).not.toBe(0);
    expect(errorMessage(result.stderr)).toContain('nope.css');
    expect(await snapshot(p)).toEqual(before);
  });

  it('without --map writes nothing and reports every custom property', async () => {
    const p = await legacyFixture();
    const before = await snapshot(p);
    const result = await execCli(p, ['init', '--agent', '--css-import', 'legacy.css']);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout.trim()) as {
      properties: Array<{ property: string; value: string | null }>;
    };
    const props = new Map(report.properties.map((r) => [r.property, r.value]));
    expect([...props.keys()].sort()).toEqual(
      [
        '--brand',
        '--cc-blue',
        '--slate-gray',
        '--corner',
        '--space',
        '--face',
        '--unused',
        '--dangling',
      ].sort(),
    );
    expect(props.get('--brand')).toBe('oklch(0.55 0.15 250)');
    expect(props.get('--dangling')).toBeNull();
    expect(await snapshot(p)).toEqual(before);
  });
});

describe('rafters import', () => {
  it('applies the map to an initialised project and regenerates the outputs', async () => {
    const p = await legacyFixture(true);
    const result = await execCli(p, [
      'import',
      '--agent',
      '--css-import',
      'legacy.css',
      '--map',
      '{"primary":"--brand"}',
    ]);
    expect(result.exitCode).toBe(0);

    const semantic = await tokens(p, 'semantic');
    expect(semantic.get('primary')?.value).toEqual({ family: 'imported-brand', position: '500' });
    const css = await readFixtureFile(p, '.rafters/output/rafters.css');
    expect(css).toContain('--color-imported-brand-500: oklch(0.55 0.15 250)');
    expect(css).toContain('--rafters-primary-500: var(--color-imported-brand-500)');
  });
});
