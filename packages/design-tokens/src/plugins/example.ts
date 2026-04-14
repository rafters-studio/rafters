/**
 * Example Plugin
 *
 * Reference implementation showing the Plugin<I, O> pattern.
 * Accepts a token name and returns an example string.
 *
 * Copy this file to start a new plugin:
 *   1. Define input/output Zod schemas
 *   2. Write a pure transform function (no registry access)
 *   3. Export default definePlugin({ id, input, output, transform })
 */

import { z } from 'zod';
import { definePlugin } from '../plugins';

const ExampleInputSchema = z.object({
  tokenName: z.string(),
});

type ExampleInput = z.infer<typeof ExampleInputSchema>;

export default definePlugin({
  id: 'example',
  input: ExampleInputSchema,
  output: z.string(),
  transform(input: ExampleInput): string {
    return `example-result-for-${input.tokenName}`;
  },
});
