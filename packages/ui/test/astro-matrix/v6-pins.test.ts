/**
 * Drift check for the Astro 6 leg of the matrix (#2327).
 *
 * test/astro-matrix/v6/package.json hard-pins the test runner, the DOM, and
 * TypeScript so the 6 leg runs the same tooling the workspace resolves and
 * the two legs' diagnostics stay comparable. Those pins have no link to the
 * root catalog, so this test is the link: when the catalog bumps one of them,
 * this fails and names the file to bump.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';

// import.meta.url is an http:// URL under happy-dom; dirname is the file path.
const workspaceFile = resolve(import.meta.dirname, '../../../../pnpm-workspace.yaml');
const v6PackageFile = resolve(import.meta.dirname, 'v6/package.json');

const catalogSchema = z.object({ catalog: z.record(z.string(), z.string()) });
const packageSchema = z.object({ devDependencies: z.record(z.string(), z.string()) });

const catalog = catalogSchema.parse(parse(readFileSync(workspaceFile, 'utf8'))).catalog;
const v6Pins = packageSchema.parse(JSON.parse(readFileSync(v6PackageFile, 'utf8'))).devDependencies;

/** The v6 pins that mirror a catalog entry. astro and @astrojs/* are the leg's own. */
const tracked = ['vitest', 'happy-dom', 'typescript'] as const;

type Version = [number, number, number];

function parseVersion(value: string, label: string): Version {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (match === null) throw new Error(`${label}: "${value}" is not an exact x.y.z version`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Exact (`5.9.3`) and caret (`^5.0.0`) ranges, the two forms the catalog uses. */
function satisfies(pin: Version, range: string, label: string): boolean {
  const caret = range.startsWith('^');
  const floor = parseVersion(caret ? range.slice(1) : range, `${label} catalog range`);
  if (!caret) return pin.every((part, index) => part === floor[index]);
  if (pin[0] !== floor[0]) return false;
  for (let index = 0; index < 3; index += 1) {
    if (pin[index] > floor[index]) return true;
    if (pin[index] < floor[index]) return false;
  }
  return true;
}

describe('astro-matrix v6 pins track the root catalog', () => {
  for (const name of tracked) {
    it(`${name}: test/astro-matrix/v6/package.json pin satisfies the catalog range`, () => {
      const range = catalog[name];
      const pin = v6Pins[name];
      expect(range, `${name} is missing from the pnpm-workspace.yaml catalog`).toBeDefined();
      expect(pin, `${name} is missing from test/astro-matrix/v6/package.json`).toBeDefined();
      if (range === undefined || pin === undefined) return;
      const parsed = parseVersion(pin, `test/astro-matrix/v6/package.json ${name}`);
      expect(
        satisfies(parsed, range, name),
        `test/astro-matrix/v6/package.json pins ${name} ${pin}, outside the catalog range ${range}; bump the v6 pin and run pnpm astro:v6:install to refresh its lockfile`,
      ).toBe(true);
    });
  }
});
