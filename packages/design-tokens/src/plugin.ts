import type { ColorReference, ColorValue } from '@rafters/shared';
import type { z } from 'zod';
import type { Plugin } from './graph.js';

export function resolveFamily(
  familyName: string,
  get: (name: string) => unknown,
): { family: ColorValue; resolvedName: string } | null {
  let resolved = get(familyName);
  let resolvedName = familyName;
  if (resolved && typeof resolved === 'object' && 'family' in resolved && 'position' in resolved) {
    resolvedName = (resolved as ColorReference).family;
    resolved = get(resolvedName);
  }
  const family = resolved as ColorValue | undefined;
  if (!family) return null;
  return { family, resolvedName };
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
