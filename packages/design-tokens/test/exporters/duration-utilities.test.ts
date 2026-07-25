/**
 * Duration tiers emit as real utilities -- the Tailwind namespace rule again.
 *
 * `--ease-*` IS a Tailwind v4 theme namespace, so `ease-standard` generates by
 * itself. `--duration-*` is NOT one; Tailwind's `duration-*` reads bare numbers.
 * So `duration-moderate` looks exactly as correct as `ease-standard` and, without
 * these @utility rules, compiles to nothing -- the same silent no-op that shipped
 * for z-depth-* before depth-utilities.test.ts existed, and the same fix.
 *
 * This test is what stops a component writing the word and getting nothing.
 */

import { describe, expect, it } from 'vitest';
import { registryToTailwind, TokenRegistry } from '../../src/index.js';

const TIERS = ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'] as const;

function buildMotionRegistry(): TokenRegistry {
  const tokens = TIERS.map((tier, index) => ({
    name: `motion-duration-${tier}`,
    value: `${index * 100}ms`,
    category: 'motion',
    namespace: 'motion',
    userOverride: null,
  }));
  return new TokenRegistry(tokens);
}

const css = registryToTailwind(buildMotionRegistry());

describe('duration tier utilities', () => {
  it('emits one @utility duration-<tier> per tier token', () => {
    for (const tier of TIERS) {
      expect(css).toContain(`@utility duration-${tier} {`);
      expect(css).toContain(`transition-duration: var(--duration-${tier});`);
    }
  });

  it('emits the custom property the utility references', () => {
    for (const tier of TIERS) {
      expect(css).toContain(`--duration-${tier}:`);
    }
  });

  it('drops the motion- prefix, matching the theme block it points at', () => {
    // @theme emits --duration-moderate, not --motion-duration-moderate, so a
    // utility named for the token rather than the property would dangle.
    expect(css).not.toContain('@utility motion-duration-moderate');
    expect(css).not.toContain('var(--motion-duration-moderate)');
  });

  it('motion-duration-base emits no utility -- @theme emits no var for it', () => {
    const registry = buildMotionRegistry();
    registry.define({
      name: 'motion-duration-base',
      value: '150ms',
      category: 'motion',
      namespace: 'motion',
      userOverride: null,
    });
    const out = registryToTailwind(registry);
    expect(out).not.toContain('@utility duration-base');
    expect(out).not.toContain('var(--duration-base)');
  });

  it('non-duration motion tokens emit no duration utility', () => {
    const registry = buildMotionRegistry();
    registry.define({
      name: 'motion-easing-standard',
      value: 'cubic-bezier(0.4, 0, 0.2, 1)',
      category: 'motion',
      namespace: 'motion',
      userOverride: null,
    });
    const out = registryToTailwind(registry);
    expect(out).not.toContain('@utility duration-standard');
    expect(out).not.toContain('@utility duration-easing-standard');
  });

  it('the vocabulary a component would actually write resolves', () => {
    // The middle of the scale is the default a port reaches for, per the
    // operator ruling that `fast` is almost always wrong.
    expect(css).toContain('@utility duration-moderate {');
    expect(css).toContain('@utility duration-normal {');
  });
});

describe('duration utilities in the real shipped system', () => {
  // The synthetic registry above proves the generator; this proves the DEFAULTS
  // reach it. A guard that only ever sees a hand-built fixture cannot tell you
  // whether the tokens real projects receive actually produce the utilities.
  it('emits every tier from generateBaseSystem, and none for the base token', async () => {
    const { generateBaseSystem, scalePlugin, contrastPlugin, statePlugin, invertPlugin } =
      await import('../../src/index.js');
    // The default system contains bound tokens, so the registry needs the same
    // plugin set the CLI seeds; without it construction throws on the first
    // scale binding rather than telling you anything about durations.
    const shipped = registryToTailwind(
      new TokenRegistry(generateBaseSystem().allTokens, [
        scalePlugin,
        contrastPlugin,
        statePlugin,
        invertPlugin,
      ]),
    );

    for (const tier of TIERS) {
      expect(shipped).toContain(`@utility duration-${tier} {`);
      expect(shipped).toContain(`transition-duration: var(--duration-${tier});`);
    }
    expect(shipped).not.toContain('@utility duration-base');
  });

  it('every emitted duration utility points at a custom property that exists', () => {
    const shipped = css;
    const referenced = [
      ...shipped.matchAll(
        /@utility duration-([a-z]+) \{\s*transition-duration: var\(--duration-([a-z]+)\);/g,
      ),
    ];
    expect(referenced.length).toBeGreaterThan(0);
    for (const [, className, varName] of referenced) {
      // A utility whose class name and var name drift apart is the dangling
      // case: it compiles, resolves to nothing, and looks correct in review.
      expect(className).toBe(varName);
      expect(shipped).toContain(`--duration-${varName}:`);
    }
  });
});
