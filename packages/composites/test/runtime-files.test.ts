import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards the source files the registry ships as the composites runtime
 * (see COMPOSITES_RUNTIME_FILES in apps/registry's componentService). These
 * install into a consumer at lib/composites/<file> and the Astro engine plus
 * its resolver MUST stay browser-safe (no node:fs) -- the demo pulls them into
 * the client bundle.
 */
const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

function read(file: string): string {
  return readFileSync(join(SRC_DIR, file), 'utf-8');
}

describe('composites runtime source files', () => {
  it('ships the Astro render engine', () => {
    const engine = read('Composite.astro');
    expect(engine).toContain('resolveBlockTag');
    // Placed by manifest id, recursive via Astro.self.
    expect(engine).toContain('Astro.self');
  });

  it('ships the pure block resolver', () => {
    expect(read('resolve-block.ts')).toContain('export function resolveBlockTag');
  });

  it('ships the pure rule-attr mapper', () => {
    expect(read('rule-attrs.ts')).toContain('export function rulesToHtmlAttrs');
  });

  it('engine merges block rules into element attrs via rulesToHtmlAttrs', () => {
    const engine = read('Composite.astro');
    expect(engine).toContain("import { rulesToHtmlAttrs } from './rule-attrs'");
    // Rule attrs combine with meta attrs and win on conflict (spread last).
    expect(engine).toContain('rulesToHtmlAttrs(block.rules)');
  });

  it('keeps the engine and resolver browser-safe (no node: imports)', () => {
    for (const file of [
      'Composite.astro',
      'resolve-block.ts',
      'rule-attrs.ts',
      'discovery.ts',
      'discovery-vite.ts',
    ]) {
      expect(read(file)).not.toMatch(/from\s+['"]node:/);
    }
  });

  it('engine uses literal inline globs Vite can statically analyze', () => {
    const engine = read('Composite.astro');
    expect(engine).toContain("import.meta.glob('/src/**/*.composite.json'");
    expect(engine).toContain("import.meta.glob('/src/components/ui/*.astro'");
  });

  it('never emits a client directive', () => {
    expect(read('Composite.astro')).not.toMatch(/client:/);
  });

  it('guards cross-composite recursion against cycles', () => {
    const engine = read('Composite.astro');
    // A `seen` ancestor chain is threaded so a -> composite:b -> composite:a
    // is caught instead of looping forever at build.
    expect(engine).toContain('seen');
    expect(engine).toContain('cyclic');
    // Both recursion sites (composite-ref and child-subtree) must pass the chain.
    const selfWithSeen = engine.match(/Astro\.self[^/]*seen=\{chain\}/g) ?? [];
    expect(selfWithSeen.length).toBeGreaterThanOrEqual(2);
  });
});
