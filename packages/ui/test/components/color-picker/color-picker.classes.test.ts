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
import {
  colorPickerBehavior,
  DEFAULT_MAX_CHROMA,
  type ColorPickerConfig,
} from '../../../src/components/color-picker/color-picker.behavior';
import { colorPickerClasses } from '../../../src/components/color-picker/color-picker.classes';

const base: ColorPickerConfig = {
  maxChroma: DEFAULT_MAX_CHROMA,
  disabled: false,
};

function classesFor(config: ColorPickerConfig) {
  return colorPickerClasses(config, colorPickerBehavior.initialState(config));
}

describe('color picker classes', () => {
  it('root carries the flex column shape and data-disabled dimming', () => {
    const { root } = classesFor(base);
    expect(root).toContain('flex');
    expect(root).toContain('flex-col');
    expect(root).toContain('w-full');
    expect(root).toContain('data-[disabled]:opacity-50');
    expect(root).toContain('data-[disabled]:pointer-events-none');
  });

  it('root consumes its two presence cells as keyframes keyed off data-state', () => {
    const { root } = classesFor(base);
    expect(root).toContain('data-[state=open]:animate-fade-in-moderate-enter');
    expect(root).toContain('data-[state=closed]:animate-fade-out-fast-exit');
  });

  it('the per-component motion pair and its transition start value are gone', () => {
    const { root } = classesFor(base);
    expect(root).not.toContain('motion-dropdown-in');
    expect(root).not.toContain('motion-dropdown-out');
    // The unconditional opacity-0 was the old transition's `from`. With a
    // keyframe carrying its own, keeping it would leave the picker invisible
    // wherever no composing surface sets data-state.
    expect(root.split(' ')).not.toContain('opacity-0');
    expect(root.split(' ')).not.toContain('starting:opacity-0');
  });

  it('names no literal timing and no reduced-motion escape', () => {
    for (const value of Object.values(classesFor(base))) {
      expect(value).not.toContain('motion-reduce:');
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toMatch(/duration-\[/);
      expect(value).not.toMatch(/ease-\[/);
      expect(value).not.toMatch(/delay-\d/);
    }
  });

  it('area carries the aspect-square crosshair surface', () => {
    const { area } = classesFor(base);
    expect(area).toContain('aspect-square');
    expect(area).toContain('cursor-crosshair');
    expect(area).toContain('overflow-hidden');
    expect(area).toContain('rounded-lg');
  });

  it('area thumb is pointer-events-none with border and shadow', () => {
    const { areaThumb } = classesFor(base);
    expect(areaThumb).toContain('pointer-events-none');
    expect(areaThumb).toContain('rounded-full');
    expect(areaThumb).toContain('border-2');
    expect(areaThumb).toContain('border-white');
    expect(areaThumb).toContain('shadow-md');
  });

  it('hue carries the bar shape with rounded-full', () => {
    const { hue } = classesFor(base);
    expect(hue).toContain('h-4');
    expect(hue).toContain('w-full');
    expect(hue).toContain('cursor-pointer');
    expect(hue).toContain('rounded-full');
  });

  it('hue thumb matches area thumb pattern', () => {
    const { hueThumb } = classesFor(base);
    expect(hueThumb).toContain('pointer-events-none');
    expect(hueThumb).toContain('rounded-full');
    expect(hueThumb).toContain('border-2');
    expect(hueThumb).toContain('border-white');
  });

  it('inputs container carries flex gap', () => {
    const { inputs } = classesFor(base);
    expect(inputs).toContain('flex');
    expect(inputs).toContain('gap-2');
  });

  it('input carries border, background, focus ring, and motion-focus', () => {
    const { input } = classesFor(base);
    expect(input).toContain('border');
    expect(input).toContain('border-border');
    expect(input).toContain('bg-background');
    expect(input).toContain('rounded-md');
    expect(input).toContain('motion-focus');
    expect(input).toContain('focus-visible:ring-2');
    expect(input).toContain('focus-visible:ring-primary-ring');
  });

  it('preview carries the swatch shape', () => {
    const { preview } = classesFor(base);
    expect(preview).toContain('h-8');
    expect(preview).toContain('w-8');
    expect(preview).toContain('rounded-md');
    expect(preview).toContain('border-border');
  });

  it('gamut label is muted text', () => {
    const { gamutLabel } = classesFor(base);
    expect(gamutLabel).toContain('text-xs');
    expect(gamutLabel).toContain('text-muted-foreground');
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
      contentSources: [resolve(import.meta.dirname, '../../../src/components/color-picker')],
    });
  })();
  return compiled;
};

describe('color-picker motion candidates compile (#2278)', () => {
  it('every motion candidate became a real rule', async () => {
    const css = await sheet();
    const missing = classesFor(base)
      .root.split(' ')
      .filter(Boolean)
      .filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);

  it('both presence keyframes read the duration and ease leaves', async () => {
    // Whitespace-tolerant: the compiler drops the space between the two var()s,
    // so the emitted value is not byte-identical to the source.
    const css = await sheet();
    expect(css).toMatch(
      /--animate-fade-in-moderate-enter:\s*fade-in\s*var\(--rafters-duration-moderate\)\s*var\(--rafters-ease-enter\)/,
    );
    expect(css).toMatch(
      /--animate-fade-out-fast-exit:\s*fade-out\s*var\(--rafters-duration-fast\)\s*var\(--rafters-ease-exit\)/,
    );
  }, 120_000);
});
