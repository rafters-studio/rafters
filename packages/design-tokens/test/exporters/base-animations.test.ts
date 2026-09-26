/**
 * Base animations (#2391): every animation definition is published as a base
 * Tailwind `--animate-<name>` key built only from var()s onto the leaves, and
 * composes with Tailwind's own `duration-*` / `ease-*` in pure CSS.
 *
 * The matrix assignment keys (`animate-<shape>-<tier>-<curve>`) are untouched
 * and asserted by motion-utilities.test.ts; these keys sit alongside them.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_ANIMATION_DEFINITIONS } from '../../src/generators/defaults.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  registryToTailwind,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

function baseRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  return new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

function baseKeyLine(css: string, name: string): string | undefined {
  return css.split('\n').find((l) => l.trim().startsWith(`--animate-${name}:`));
}

describe('base animations (#2391)', () => {
  it('publishes every tier-kind definition on its leaves, overridable by --tw-duration / --tw-ease', () => {
    const css = registryToTailwind(baseRegistry());
    for (const [name, def] of Object.entries(DEFAULT_ANIMATION_DEFINITIONS)) {
      if (!('tier' in def.duration)) continue;
      expect(baseKeyLine(css, name), `${name} missing`).toBe(
        `  --animate-${name}: ${def.keyframe} ` +
          `var(--tw-duration, var(--rafters-duration-${def.duration.tier})) ` +
          `var(--tw-ease, var(--rafters-ease-${def.curve}));`,
      );
    }
  });

  it('publishes a loop on its period leaf, running infinite', () => {
    const css = registryToTailwind(baseRegistry());
    for (const [name, def] of Object.entries(DEFAULT_ANIMATION_DEFINITIONS)) {
      if (!('period' in def.duration)) continue;
      expect(baseKeyLine(css, name), `${name} missing`).toBe(
        `  --animate-${name}: ${def.keyframe} var(--rafters-period-${def.duration.period}) ` +
          `var(--tw-ease, var(--rafters-ease-${def.curve})) infinite;`,
      );
    }
  });

  it('leaves unpublished any loop that still carries a literal period', () => {
    const css = registryToTailwind(baseRegistry());
    for (const [name, def] of Object.entries(DEFAULT_ANIMATION_DEFINITIONS)) {
      if (!('loopPeriod' in def.duration)) continue;
      expect(baseKeyLine(css, name), `${name} must not be published`).toBeUndefined();
    }
  });

  it('no base key carries a literal time', () => {
    const css = registryToTailwind(baseRegistry());
    const names = Object.keys(DEFAULT_ANIMATION_DEFINITIONS);
    for (const name of names) {
      const line = baseKeyLine(css, name);
      if (line === undefined) continue;
      expect(line, `${name} carries a literal time`).not.toMatch(/\b\d+(\.\d+)?m?s\b/);
    }
  });
});

describe('base animations compile and compose (#2391)', () => {
  let fixtureDir: string;

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-base-animate-'));
    writeFileSync(
      join(fixtureDir, 'drawer.classes.ts'),
      "export const x = 'data-[state=open]:animate-slide-in-from-bottom data-[state=open]:duration-normal data-[state=open]:ease-spring-smooth';\n",
    );
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('compiles the keyframe utility with its value inlined, and the generics that retime it', async () => {
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    // @theme inline puts the value in the utility itself, so var(--tw-duration) and
    // var(--tw-ease) resolve on the element where duration-* / ease-* set them. A
    // utility of \`animation: var(--animate-...)\` would resolve them on :root instead.
    expect(css).toMatch(
      /animate-slide-in-from-bottom\[data-state=open\]\{animation:\s*slide-in-from-bottom var\(--tw-duration,\s*var\(--rafters-duration-normal\)\)\s*var\(--tw-ease,\s*var\(--rafters-ease-enter\)\)\}/,
    );
    expect(css).not.toMatch(/animation:\s*var\(--animate-slide-in-from-bottom\)/);
    // duration-normal / ease-spring-smooth set exactly those variables, onto the leaves.
    expect(css).toMatch(
      /duration-normal\[data-state=open\]\{--tw-duration:\s*var\(--transition-duration-normal\)/,
    );
    expect(css).toMatch(
      /ease-spring-smooth\[data-state=open\]\{--tw-ease:\s*var\(--ease-spring-smooth\)/,
    );
    expect(css).toMatch(/--transition-duration-normal:\s*var\(--rafters-duration-normal\)/);
    expect(css).toMatch(/--ease-spring-smooth:\s*var\(--rafters-ease-spring-smooth\)/);
  });

  it('reaches the reduced-motion law through the duration leaf', async () => {
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    const law = css.slice(css.search(/@media \(prefers-reduced-motion:\s*reduce\)/));
    expect(law).toMatch(/--rafters-duration-normal:\s*0m?s/);
  });
});
