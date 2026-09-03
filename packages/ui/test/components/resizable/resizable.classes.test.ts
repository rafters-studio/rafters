import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import {
  resizableBehavior,
  type ResizableConfig,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';

const base: ResizableConfig = {
  direction: 'horizontal',
  panels: [
    { defaultSize: 50, minSize: 10, maxSize: 90 },
    { defaultSize: 50, minSize: 10, maxSize: 90 },
  ],
  disabled: false,
};

function classesFor(config: ResizableConfig) {
  return resizableClasses(config, resizableBehavior.initialState(config));
}

describe('resizable classes', () => {
  it('root is a flex container that follows the horizontal axis', () => {
    const { root } = classesFor(base);
    expect(root).toContain('flex');
    expect(root).toContain('h-full');
    expect(root).toContain('w-full');
    expect(root).toContain('flex-row');
  });

  it('vertical root stacks the column', () => {
    expect(classesFor({ ...base, direction: 'vertical' }).root).toContain('flex-col');
  });

  it('panel is a fixed-basis, clipped cell', () => {
    const { panel } = classesFor(base);
    expect(panel).toContain('grow-0');
    expect(panel).toContain('shrink-0');
    expect(panel).toContain('overflow-hidden');
  });

  it('handle carries the border rail, focus ring, and data-driven state styling', () => {
    const { handle } = classesFor(base);
    expect(handle).toContain('bg-border');
    expect(handle).toContain('focus-visible:ring-ring');
    expect(handle).toContain('data-[dragging]:bg-primary');
    expect(handle).toContain('data-[disabled]:opacity-50');
    expect(handle).toContain('cursor-col-resize');
  });

  it('vertical handle uses the row-resize cursor and horizontal rail', () => {
    const { handle } = classesFor({ ...base, direction: 'vertical' });
    expect(handle).toContain('cursor-row-resize');
    expect(handle).toContain('h-px');
  });

  it('the handle consumes its hover/active cell: color + elevation at fast/standard', () => {
    const { handle } = classesFor(base);
    expect(handle).toContain('transition-[color,background-color,border-color,box-shadow]');
    expect(handle).toContain('duration-fast');
    expect(handle).toContain('ease-standard');
  });

  it('the panel animates the keyboard step and goes untimed under a pointer drag', () => {
    const { panel } = classesFor(base);
    // panels / keyboard step: a discrete percent delta, so it animates.
    expect(panel).toContain('transition-[flex-basis]');
    expect(panel).toContain('duration-fast');
    expect(panel).toContain('ease-standard');
    // panels / dragging: the pointer rule. The transition is turned OFF, not
    // shortened -- any nonzero duration while a pointer drives the boundary is
    // a defect. `data-dragging` lands on the handle, so the discriminator is
    // the group root having a dragging handle among its direct children.
    expect(panel).toContain(
      '[[data-part=root]:has(>[data-part=handle][data-dragging])>&]:transition-none',
    );
  });

  it('declares no literal timing and no reduced-motion escape', () => {
    for (const value of Object.values(classesFor(base))) {
      expect(value).not.toContain('motion-reduce:');
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toMatch(/duration-\[/);
      expect(value).not.toMatch(/ease-\[/);
      expect(value).not.toMatch(/delay-\d/);
    }
  });

  it('grip icon rotates only in the horizontal axis', () => {
    expect(classesFor(base).gripIcon).toContain('rotate-90');
    expect(classesFor({ ...base, direction: 'vertical' }).gripIcon).not.toContain('rotate-90');
  });
});

/**
 * The pointer-rule suppression is a long arbitrary variant carrying `:has()`,
 * `>` and bracketed attribute selectors -- exactly the shape Tailwind drops
 * SILENTLY, with no warning and no rule, when it is malformed. Every assertion
 * above would still pass for a candidate that compiles to nothing, so this
 * points the real Tailwind CLI at the real component directory and reads the
 * emitted sheet, the same way test/motion/reveal-candidates.test.ts does for the
 * hover-reveal candidates.
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
      contentSources: [resolve(import.meta.dirname, '../../../src/components/resizable')],
    });
  })();
  return compiled;
};

describe('resizable motion candidates compile (#2298)', () => {
  it('every panel and handle candidate became a real rule', async () => {
    const css = await sheet();
    const { panel, handle } = classesFor(base);
    const missing = `${panel} ${handle}`
      .split(' ')
      .filter(Boolean)
      .filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);

  it('the drag suppression desugars to the root/handle/panel structure it was written for', async () => {
    const css = await sheet();
    expect(css, 'the pointer-rule selector did not compile').toContain(
      '[data-part=root]:has(>[data-part=handle][data-dragging])>',
    );
  }, 120_000);

  it('every transition-property utility sorts BEFORE its duration', async () => {
    // Tailwind's own `transition-*` utilities restate transition-duration from
    // `var(--tw-duration, ...)` while this repo's `duration-*` set the longhand.
    // Same specificity, so the later rule wins: a transition-property sorting
    // after its duration would collapse the cell onto Tailwind's default with
    // every other test still green.
    const css = await sheet();
    for (const property of [
      'transition-[flex-basis]',
      'transition-[color,background-color,border-color,box-shadow]',
    ]) {
      const propertyAt = css.indexOf(escapeCandidate(property));
      const durationAt = css.indexOf(escapeCandidate('duration-fast'));
      expect(propertyAt, `${property} did not compile`).toBeGreaterThanOrEqual(0);
      expect(durationAt, 'duration-fast did not compile').toBeGreaterThanOrEqual(0);
      expect(
        propertyAt,
        `${property} sorts after duration-fast -- the cell's tier is lost`,
      ).toBeLessThan(durationAt);
    }
  }, 120_000);
});
