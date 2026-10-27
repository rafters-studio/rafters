/**
 * States in the default system step along each family's AA ladder (#2762):
 * they sit next to their base instead of jumping across the middle steps that
 * cannot reach 7:1, and every state's foreground still reads at 4.5:1.
 */

import { calculateWCAGContrast, POSITION_TO_INDEX } from '@rafters/color-utils';
import type { ColorValue, OKLCH } from '@rafters/shared';
import { expect, it } from 'vitest';
import { generateBaseSystem, REGISTRY_PLUGINS, TokenRegistry } from '../src/index.js';

// The full plugin set: the default system also binds shadow rungs (#2648).
const reg = new TokenRegistry(generateBaseSystem().allTokens, REGISTRY_PLUGINS);
const isRef = (v: unknown): v is { family: string; position: string } =>
  typeof v === 'object' && v !== null && 'family' in v && 'position' in v;
const isFamily = (v: unknown): v is ColorValue =>
  typeof v === 'object' && v !== null && 'scale' in v && Array.isArray(v.scale);

/** A semantic token's colour family (followed through role tokens) and step. */
const stepOf = (name: string): { family: string; position: string } => {
  const v: unknown = reg.get(name)?.value;
  if (!isRef(v)) throw new Error(name);
  let family = v.family;
  for (let hop = 0; hop < 8 && reg.get(family)?.namespace !== 'color'; hop++) {
    const next: unknown = reg.get(family)?.value;
    if (!isRef(next)) throw new Error(name);
    family = next.family;
  }
  return { family, position: v.position };
};

const at = (name: string): string => {
  const { family, position } = stepOf(name);
  return `${family}-${position}`;
};

/** A semantic token resolved to OKLCH through its role tokens. */
const colourOf = (name: string): OKLCH => {
  const { family, position } = stepOf(name);
  const value: unknown = reg.get(family)?.value;
  const index = POSITION_TO_INDEX[position];
  if (!isFamily(value) || index === undefined) throw new Error(name);
  const colour = value.scale[index];
  if (!colour) throw new Error(name);
  return colour;
};

const bindingFrom = (name: string, plugin: string, key: string): string | undefined => {
  const binding = reg.get(name)?.binding;
  if (binding?.plugin !== plugin) return undefined;
  const input: unknown = binding.input;
  if (typeof input !== 'object' || input === null || !(key in input)) return undefined;
  const parent: unknown = (input as Record<string, unknown>)[key];
  return typeof parent === 'string' ? parent : undefined;
};

it('default states sit next to their base', () => {
  expect(at('card-hover--dark')).toBe('zinc-600');
  for (const role of ['secondary', 'muted', 'accent'])
    expect(at(`${role}-active--dark`)).toBe('zinc-600');
  expect(at('panel-border')).toBe('zinc-400');
  expect(at('input-disabled')).toBe('zinc-500');
  expect(at('nav-disabled--dark')).toBe('zinc-500');
  expect(at('destructive-hover')).toBe('silver-bold-fire-truck-700');
  expect(at('warning-hover')).toBe('silver-true-honey-700');
});

it('every foreground bound to a state reads at 4.5:1 against it', () => {
  let checked = 0;
  for (const token of reg.list()) {
    const parent = bindingFrom(token.name, 'contrast', 'against');
    if (!parent || reg.get(parent)?.binding?.plugin !== 'state') continue;
    const ratio = calculateWCAGContrast(colourOf(token.name), colourOf(parent));
    expect(ratio, `${token.name} on ${parent}`).toBeGreaterThanOrEqual(4.5);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
});
