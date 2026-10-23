/**
 * A fill's recipe becomes the stock class list of its bg-fill-* utility
 * (#2828). The cases the feature file does not compile: a gradient's
 * direction against its angle, the linear default, non-integer numbers, and a
 * mask with no positions.
 */

import type { FillValue, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  generateBaseSystem,
  REGISTRY_PLUGINS,
  registryToCompiled,
  registryToDocumentation,
  registryToTailwindStatic,
  TokenRegistry,
} from '../../src/index.js';
import { tokensToTailwind } from '../../src/exporters/tailwind.js';

const FG = { family: 'zinc', position: '900' };

function fill(name: string, value: FillValue): Token {
  return { name, value, category: 'fill', namespace: 'fill', userOverride: null };
}

const BASE = generateBaseSystem().allTokens;

function applied(value: FillValue): string[] {
  const css = tokensToTailwind([...BASE, fill('x', value)]);
  const m = /@utility bg-fill-x \{\s*@apply ([^;]+);/.exec(css);
  if (!m) throw new Error('no bg-fill-x utility');
  return (m[1] ?? '').split(' ');
}

describe('bg-fill-* utilities', () => {
  it('lets the direction win over the angle', () => {
    const classes = applied({
      foreground: FG,
      gradient: { type: 'linear', direction: 'to-r', angle: 45 },
    });
    expect(classes).toContain('bg-linear-to-r');
    expect(classes.some((c) => c.startsWith('bg-linear-45'))).toBe(false);
  });

  it('writes bg-linear-to-b for a linear gradient with neither', () => {
    expect(applied({ foreground: FG, gradient: { type: 'linear' } })).toContain('bg-linear-to-b');
  });

  it('ignores direction on radial and conic, and conic reads its angle', () => {
    expect(
      applied({ foreground: FG, gradient: { type: 'radial', direction: 'to-r', angle: 30 } }),
    ).toContain('bg-radial');
    const conic = applied({
      foreground: FG,
      gradient: { type: 'conic', direction: 'to-r', angle: -45 },
    });
    expect(conic).toContain('-bg-conic-45');
  });

  it('writes non-integer numbers as arbitrary values and keeps named classes for integers', () => {
    const classes = applied({
      foreground: FG,
      gradient: {
        type: 'linear',
        angle: 12.5,
        from: { color: { token: 'primary' }, alpha: 12.5, position: 12.5 },
        to: { color: FG, position: 90 },
      },
      mask: { type: 'b', from: 12.5, to: 90 },
      backdrop: { brightness: 1.5, opacity: 90 },
    });
    expect(classes).toEqual([
      'bg-linear-[12.5deg]',
      'from-primary/12.5',
      'from-[12.5%]',
      'to-zinc-900',
      'to-90%',
      'mask-b-from-[length:12.5%]',
      'mask-b-to-90%',
      'backdrop-brightness-[1.5%]',
      'backdrop-opacity-90',
      'text-zinc-900',
    ]);
  });

  it('writes no mask class for a mask with only a type', () => {
    expect(applied({ foreground: FG, mask: { type: 'radial' } })).toEqual(['text-zinc-900']);
  });

  it('writes dark and state parts as variant classes', () => {
    const classes = applied({
      foreground: FG,
      dark: { foreground: { family: 'zinc', position: '50' } },
      focus: { border: { token: 'ring' }, dark: { border: FG } },
    });
    expect(classes).toEqual([
      'text-zinc-900',
      'dark:text-zinc-50',
      'focus-visible:border-ring',
      'dark:focus-visible:border-zinc-900',
    ]);
  });

  it('writes the fills into the static sheet too, with no --rafters- property for a fill', () => {
    const css = registryToTailwindStatic(
      new TokenRegistry([...BASE, fill('glass', { foreground: FG })], REGISTRY_PLUGINS),
    );
    expect(css).toContain('@utility bg-fill-glass {\n  @apply text-zinc-900;\n}');
    expect(css).toContain('@source inline("bg-fill-glass");');
    expect(css).not.toContain('[object Object]');
  });
});

describe('bg-fill-* utilities through the compiled and documentation exports', () => {
  const registry = new TokenRegistry(
    [
      ...BASE,
      fill('edge', {
        foreground: FG,
        gradient: { type: 'conic', angle: -45, from: { color: FG, position: 12.5 } },
        mask: { type: 'b', from: 12.5 },
      }),
    ],
    REGISTRY_PLUGINS,
  );

  it('compiles a fill with arbitrary values into the standalone sheet', async () => {
    expect(await registryToCompiled(registry, { minify: false })).toContain('.bg-fill-edge');
  });

  it('compiles a fill with arbitrary values into the documentation sheet', async () => {
    expect(await registryToDocumentation(registry)).toContain('bg-fill-edge');
  });
});
