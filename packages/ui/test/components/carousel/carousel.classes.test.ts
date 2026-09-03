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
import { carouselClasses } from '../../../src/components/carousel/carousel.classes';

describe('carousel classes', () => {
  it('lays the track along the orientation axis', () => {
    expect(carouselClasses({ orientation: 'horizontal' }).track).toContain('flex-row');
    expect(carouselClasses({ orientation: 'vertical' }).track).toContain('flex-col');
  });

  it('slides are full-basis and non-shrinking so one fills the viewport', () => {
    const classes = carouselClasses({});
    expect(classes.item).toContain('basis-full');
    expect(classes.item).toContain('shrink-0');
    expect(classes.content).toContain('overflow-hidden');
  });

  it('the active indicator keys its fill off the projected data-state', () => {
    expect(carouselClasses({}).indicator).toContain('data-[state=active]:bg-primary');
  });

  it('orientation only relocates the controls; the chrome is shared', () => {
    const horizontal = carouselClasses({ orientation: 'horizontal' });
    const vertical = carouselClasses({ orientation: 'vertical' });
    expect(horizontal.previous).toContain('left-2');
    expect(horizontal.next).toContain('right-2');
    expect(vertical.previous).toContain('rotate-90');
    expect(horizontal.previous).toContain('disabled:opacity-50');
  });

  it('the track consumes the index-change cell on both axes', () => {
    // carousel/track/index change: travel (x, item width) at
    // normal/spring-smooth. A discrete step, so it animates; the offset
    // trackStyle writes is the travel.
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { track } = carouselClasses({ orientation });
      expect(track).toContain('transition-transform');
      expect(track).toContain('duration-normal');
      expect(track).toContain('ease-spring-smooth');
    }
  });

  it('the track carries no pointer-driven suppression: this carousel has no swipe', () => {
    // carousel/track/swipe (pointer rule) and carousel/track/settle on release
    // both describe a gesture that was deliberately not ported
    // (carousel.behavior.ts). No drag can drive the track, so there is nothing
    // to leave untimed and no release to settle from.
    const { track } = carouselClasses({});
    expect(track).not.toContain('transition-none');
    expect(track).not.toContain('duration-instant');
    expect(track).not.toContain('duration-fast');
  });

  it('names no literal timing and no reduced-motion escape', () => {
    for (const value of Object.values(carouselClasses({}))) {
      expect(value).not.toContain('motion-reduce:');
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toMatch(/duration-\[/);
      expect(value).not.toMatch(/ease-\[/);
      expect(value).not.toMatch(/delay-\d/);
    }
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
      contentSources: [resolve(import.meta.dirname, '../../../src/components/carousel')],
    });
  })();
  return compiled;
};

describe('carousel motion candidates compile (#2275)', () => {
  it('every motion candidate became a real rule', async () => {
    const css = await sheet();
    const missing =
      `${carouselClasses({ orientation: 'horizontal' }).track} ${carouselClasses({ orientation: 'vertical' }).track}`
        .split(' ')
        .filter(Boolean)
        .filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);
});
