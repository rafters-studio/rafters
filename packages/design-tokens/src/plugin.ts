import { POSITION_TO_INDEX } from '@rafters/color-utils';
import type { ColorReference, ColorValue } from '@rafters/shared';
import type { z } from 'zod';
import type { Plugin } from './graph.js';

export interface ResolvedParent {
  ref: ColorReference;
  positionIndex: number;
  family: ColorValue;
  familyName: string;
}

export function resolveFamily(
  familyName: string,
  get: (name: string) => unknown,
): { family: ColorValue; familyName: string } | null {
  let resolved = get(familyName);
  let name = familyName;
  if (resolved && typeof resolved === 'object' && 'family' in resolved && 'position' in resolved) {
    name = (resolved as ColorReference).family;
    resolved = get(name);
  }
  if (!resolved || typeof resolved !== 'object' || !('scale' in resolved)) return null;
  return { family: resolved as ColorValue, familyName: name };
}

export function resolveParent(
  tokenName: string,
  get: (name: string) => unknown,
): ResolvedParent | null {
  const raw = get(tokenName);
  if (!raw || typeof raw !== 'object' || !('family' in raw) || !('position' in raw)) return null;
  const ref = raw as ColorReference;
  const positionIndex = POSITION_TO_INDEX[ref.position];
  if (positionIndex === undefined) return null;
  let resolved = get(ref.family);
  let familyName = ref.family;
  if (resolved && typeof resolved === 'object' && 'family' in resolved && 'position' in resolved) {
    familyName = (resolved as ColorReference).family;
    resolved = get(familyName);
  }
  if (!resolved || typeof resolved !== 'object' || !('scale' in resolved)) return null;
  return { ref, positionIndex, family: resolved as ColorValue, familyName };
}

export type PluginSpec<I, O> = {
  name: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  dependsOn(input: I): readonly string[];
  transform(input: I, get: (name: string) => unknown): O;
};

export function definePlugin<I, O>(spec: PluginSpec<I, O>): Plugin {
  return {
    name: spec.name,
    inputSchema: spec.inputSchema as z.ZodType<unknown>,
    outputSchema: spec.outputSchema as z.ZodType<unknown>,
    dependsOn: (input) => spec.dependsOn(input as I),
    transform: (input, get) => spec.transform(input as I, get),
  };
}
