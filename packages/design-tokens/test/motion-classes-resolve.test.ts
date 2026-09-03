/**
 * EVERY `animate-*` A COMPONENT TYPES MUST NAME A KEY THE EXPORTER EMITS.
 *
 * A class that names no key compiles to nothing. Not to a broken rule, not to a
 * warning -- to nothing at all. The element simply does not animate, the tests
 * pass because they only ever compared strings to strings, and the defect is
 * invisible until somebody watches the screen.
 *
 * That has now happened three times, each found by accident:
 *
 *   - `select` content carried `animate-in` / `fade-in-0` / `zoom-in-95`,
 *     tailwindcss-animate vocabulary for a plugin this repo does not ship. Select
 *     had never animated.
 *   - `progress` carried `animate-progress-indeterminate`, which had no utility,
 *     no theme key and no keyframes anywhere in the repo.
 *   - `area-chart` carried `animate-area-chart-area-enter` after the vocabulary
 *     moved to deduplicated assignment names, and shipped in v0.4.0 not
 *     animating.
 *
 * Three accidents is a missing test, so this is it. It reads the emitted theme
 * keys out of the real exporter and every `animate-*` candidate out of every
 * classes file, and refuses any candidate that is neither an emitted key nor a
 * Tailwind builtin.
 *
 * It lives in design-tokens rather than ui because the emitted set is the thing
 * being compared against, exactly as the matrix-conformance check above reads
 * ui's matrix from this side.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tokensToTailwind } from '../src/exporters/tailwind.js';
import { generateBaseSystem } from '../src/generators/index.js';

const COMPONENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../ui/src/components');

/**
 * Tailwind v4 ships these in its own default theme, so they resolve without any
 * key of ours. A component typing one is a separate question -- whether it
 * should be on a token instead -- and not this test's business.
 */
const TAILWIND_BUILTINS = new Set(['spin', 'pulse', 'ping', 'bounce', 'none']);

/** Every `--animate-<name>` key the exporter actually emits. */
function emittedKeys(): Set<string> {
  const css = tokensToTailwind(generateBaseSystem({}).allTokens, { includeImport: false }, []);
  const keys = new Set<string>();
  for (const match of css.matchAll(/--animate-([a-z0-9-]+)\s*:/g)) {
    if (match[1]) keys.add(match[1]);
  }
  return keys;
}

/** Every `.classes.ts` under the component tree, as [path, source]. */
function classesFiles(): [string, string][] {
  const out: [string, string][] = [];
  for (const dir of readdirSync(COMPONENTS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const componentDir = join(COMPONENTS_DIR, dir.name);
    for (const entry of readdirSync(componentDir)) {
      if (entry.endsWith('.classes.ts')) {
        out.push([`${dir.name}/${entry}`, readFileSync(join(componentDir, entry), 'utf8')]);
      }
    }
  }
  return out;
}

/**
 * `animate-*` candidates in a source file, ignoring comment lines so the prose
 * explaining why a class was REMOVED does not read as a class that is present.
 */
function animateCandidates(source: string): string[] {
  const found: string[] = [];
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
    for (const literal of line.matchAll(/'([^']*)'/g)) {
      for (const token of (literal[1] ?? '').split(/\s+/)) {
        const bare = token.split(':').pop() ?? '';
        if (bare.startsWith('animate-')) found.push(bare.slice('animate-'.length));
      }
    }
  }
  return found;
}

describe('every animate-* class a component types resolves to an emitted key', () => {
  it('has classes files to check at all', () => {
    // Without this the sweep below passes vacuously the day the path moves.
    expect(classesFiles().length).toBeGreaterThan(40);
  });

  it('emits keys to check against at all', () => {
    expect(emittedKeys().size).toBeGreaterThan(0);
  });

  it('names no class the exporter does not emit', () => {
    const keys = emittedKeys();
    const dangling: string[] = [];

    for (const [path, source] of classesFiles()) {
      for (const name of animateCandidates(source)) {
        // A Tailwind arbitrary value (`animate-(--var)`) is not a named key.
        if (name.startsWith('(')) continue;
        if (TAILWIND_BUILTINS.has(name)) continue;
        if (!keys.has(name)) dangling.push(`${path}: animate-${name}`);
      }
    }

    expect(
      [...new Set(dangling)].sort(),
      'these classes compile to nothing -- the component does not animate',
    ).toEqual([]);
  });
});
