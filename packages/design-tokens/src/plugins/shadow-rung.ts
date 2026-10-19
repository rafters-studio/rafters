import { z } from 'zod';
import { shadowRungIndex, shadowRungRef, shadowScale } from '../generators/shadow.js';
import { definePlugin } from '../plugin.js';

const ShadowRungInputSchema = z.object({
  base: z.string(),
  multiplier: z.number(),
  ratio: z.number(),
  floor: z.number(),
  ceiling: z.number(),
});

type ShadowRungInput = z.infer<typeof ShadowRungInputSchema>;

const REM = /^(\d*\.?\d+)rem$/;
const PX_PER_REM = 16;

/**
 * Picks the shadow rung a part's weight lands on at the current spacing base.
 * CSS cannot snap a value to the nearest rung, so the registry picks it and the
 * part carries a reference to the rung; changing `spacing-base` re-picks.
 */
export const shadowRungPlugin = definePlugin<ShadowRungInput, string>({
  name: 'shadow-rung',
  inputSchema: ShadowRungInputSchema,
  outputSchema: z.string().regex(/^var\(--rafters-shadow-rung-\d+\)$/),
  dependsOn: (input) => [input.base],
  transform: (input, get) => {
    const raw = get(input.base);
    const match = typeof raw === 'string' ? REM.exec(raw.trim()) : null;
    if (!match?.[1]) {
      throw new Error(
        `shadow-rung plugin: "${input.base}" value ${String(raw)} is not a rem length`,
      );
    }
    const basePx = Number.parseFloat(match[1]) * PX_PER_REM;
    const scale = shadowScale(input.ratio, { floor: input.floor, ceiling: input.ceiling });
    return shadowRungRef(shadowRungIndex(input.multiplier, basePx, scale));
  },
});
