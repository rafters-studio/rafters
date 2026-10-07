/**
 * Checks the data an embedding `composite:<id>` block passes into the
 * embedded composite against that composite's declared `input`.
 *
 * Pure and browser-safe: no node: imports and no React. Zod is imported as a
 * type only; the consumer supplies the rule schemas, so no rule code ships
 * with the runtime.
 */

import type { ZodType } from 'zod';
import type { CompositeFile } from './manifest';

/**
 * Check an embedding block's resolved meta against the embedded composite's declared
 * input and return the props the embedded composite renders with: one entry per input
 * name, holding the rule's parsed output. Throws on a missing, unexpected or failing input.
 */
export function checkEmbedInput(
  blockId: string,
  target: CompositeFile,
  resolvedMeta: Readonly<Record<string, unknown>>,
  rules: Readonly<Record<string, ZodType>>,
): Record<string, unknown> {
  const ref = `composite:${target.manifest.id}`;
  const declared = new Set(target.input);

  for (const key of Object.keys(resolvedMeta)) {
    if (!declared.has(key)) {
      throw new Error(
        `Unexpected input "${key}" for ${ref} in block "${blockId}"; declared input is [${target.input.join(', ')}]`,
      );
    }
  }

  const props: Record<string, unknown> = {};
  for (const name of target.input) {
    const value = Object.hasOwn(resolvedMeta, name) ? resolvedMeta[name] : undefined;
    if (value === undefined) {
      throw new Error(`Missing input "${name}" for ${ref} in block "${blockId}"`);
    }
    const schema = Object.hasOwn(rules, name) ? rules[name] : undefined;
    if (!schema) {
      throw new Error(
        `No rule schema for input "${name}" of ${ref} in block "${blockId}"; pass it in the rules option`,
      );
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const reason = parsed.error.issues[0]?.message ?? 'invalid value';
      throw new Error(
        `Input "${name}" for ${ref} in block "${blockId}" failed its rule: ${reason}`,
      );
    }
    props[name] = parsed.data;
  }
  return props;
}
