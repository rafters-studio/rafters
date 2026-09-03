import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import { buttonClasses, buttonVariants } from '../../../src/components/button/button.classes';

const base: ButtonConfig = { variant: 'default', size: 'default' };

function classesFor(config: ButtonConfig) {
  return buttonClasses(config, button.initialState(config));
}

describe('button classes', () => {
  it('projects variant and size classes', () => {
    const classes = classesFor({ variant: 'destructive', size: 'lg' });
    expect(classes.root).toContain('bg-destructive');
    expect(classes.root).toContain('h-12');
  });

  const cqSizes: Array<[ButtonConfig['size'], string, string]> = [
    ['default', 'h-11', '@md:h-10'],
    ['xs', 'h-11', '@md:h-6'],
    ['sm', 'h-11', '@md:h-8'],
    ['icon', 'h-11', '@md:h-10'],
    ['icon-xs', 'h-11', '@md:h-6'],
    ['icon-sm', 'h-11', '@md:h-8'],
  ];
  for (const [size, touchClass, desktopClass] of cqSizes) {
    it(`${size}: touch-first ${touchClass}, desktop ${desktopClass}`, () => {
      const classes = classesFor({ ...base, size });
      expect(classes.root).toContain(touchClass);
      expect(classes.root).toContain(desktopClass);
    });
  }

  it('lg and icon-lg skip CQ override -- already above touch floor', () => {
    for (const size of ['lg', 'icon-lg'] as const) {
      expect(classesFor({ ...base, size }).root).not.toContain('@md:h-');
    }
  });

  it('spinner scales with CQ', () => {
    const classes = classesFor({ ...base, loading: true });
    expect(classes.spinner).toContain('h-5');
    expect(classes.spinner).toContain('@md:h-4');
  });

  it('root consumes the hover cell: color + elevation at fast/standard', () => {
    const { root } = classesFor(base);
    expect(root).toContain('transition-[color,background-color,border-color,box-shadow,scale]');
    expect(root).toContain('duration-fast');
    expect(root).toContain('ease-standard');
  });

  it('root consumes the press cell: the extent-press zoom at micro/spring-snappy', () => {
    const { root } = classesFor(base);
    // The extent namespace's two-sided contract: the member class writes the
    // `--rafters-consumed-extent` alias, the scale utility reads it back.
    expect(root).toContain('extent-press');
    expect(root).toContain('active:scale-(--rafters-consumed-extent)');
    expect(root).toContain('scale-100');
    expect(root).toContain('active:duration-micro');
    expect(root).toContain('active:ease-spring-snappy');
  });

  it('spinner loops on the period cell, not stock animate-spin', () => {
    const { spinner } = classesFor({ ...base, loading: true });
    expect(spinner).toContain('animate-spin-spin');
    // Token-exact: `animate-spin-spin` contains the stock name as a substring,
    // so the negative has to be checked against the split candidate list.
    expect(spinner.split(' ')).not.toContain('animate-spin');
    expect(spinner.split(' ')).not.toContain('motion-reduce:animate-none');
  });

  it('the busy fade is a transition, so the loop keeps the animation property', () => {
    const { spinner } = classesFor({ ...base, loading: true });
    expect(spinner).toContain('transition-opacity');
    expect(spinner).toContain('duration-fast');
    expect(spinner).toContain('ease-standard');
    // Two animate-* utilities on one node set the same property at the same
    // specificity, so only the later-sorted one survives -- silently. The fade
    // must never become a keyframe here.
    expect(spinner).not.toMatch(/animate-fade-/);
    // And never through @starting-style: the matrix rules that dependency out
    // (motion.md, Presence). Such a rule compiles cleanly and runs nowhere, so
    // no candidate sweep would catch it.
    expect(spinner).not.toContain('starting:');
  });

  it('no component-level reduced-motion escape and no literal timing', () => {
    const classes = classesFor({ ...base, loading: true });
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('motion-reduce:');
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toMatch(/duration-\[/);
      expect(value).not.toMatch(/ease-\[/);
      expect(value).not.toMatch(/delay-\d/);
    }
  });

  it('buttonVariants matches the root projection', () => {
    expect(buttonVariants({ variant: 'destructive', size: 'lg' })).toBe(
      classesFor({ variant: 'destructive', size: 'lg' }).root,
    );
    expect(buttonVariants()).toBe(classesFor(base).root);
  });
});

/**
 * Tailwind drops a malformed candidate SILENTLY -- no warning, no rule -- and
 * every assertion above would still pass for a class that compiles to nothing.
 * So this points the real Tailwind CLI at the real component directory and
 * checks the emitted sheet, the same way test/motion/reveal-candidates.test.ts
 * does for the hover-reveal candidates.
 */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

let compiled: Promise<string> | null = null;
const sheet = (): Promise<string> => {
  if (compiled) return compiled;
  compiled = (async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
    ]);
    return registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/button')],
    });
  })();
  return compiled;
};

describe('button motion candidates compile (#2272)', () => {
  it('every motion candidate became a real rule', async () => {
    const css = await sheet();
    const missing =
      `${classesFor({ ...base, loading: true }).root} ${classesFor({ ...base, loading: true }).spinner}`
        .split(' ')
        .filter(Boolean)
        .filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);

  it('the press extent resolves through the alias, never the leaf', async () => {
    const css = await sheet();
    expect(css, 'extent-press utility missing').toContain(
      '.extent-press{--rafters-consumed-extent:var(--rafters-extent-press)}',
    );
    expect(css, 'scale-(--rafters-consumed-extent) utility missing').toContain(
      'scale:var(--rafters-consumed-extent)',
    );
  }, 120_000);

  it('the loop reads the period leaf, never a literal cycle time', async () => {
    // Whitespace-tolerant: the compiler drops the space between adjacent
    // components, so the emitted value is not byte-identical to the source.
    const css = await sheet();
    expect(css).toMatch(/--animate-spin-spin:\s*spin\s*var\(--rafters-period-spin\)\s*infinite/);
  }, 120_000);
});
