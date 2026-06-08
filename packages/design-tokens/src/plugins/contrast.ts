import { SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema, type ColorValue } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, resolveParent } from '../plugin.js';

const ContrastInputSchema = z.object({
  against: z.string(),
  level: z.enum(['AA', 'AAA']).default('AAA'),
});

type ContrastInput = z.infer<typeof ContrastInputSchema>;

type ColorValueWithForegroundRefs = ColorValue & {
  foregroundReferences?: { auto?: { family: string; position: string } };
};

function partnerForBase(
  pairs: readonly (readonly number[])[] | undefined,
  basePosition: number,
): number | undefined {
  if (!pairs) return undefined;
  for (const [p1, p2] of pairs) {
    if (p1 === basePosition) return p2;
    if (p2 === basePosition) return p1;
  }
  return undefined;
}

/**
 * If no pair contains the exact base position, walk outward to find the
 * nearest position that does. Returns the partner of that nearest position.
 * This lets contrast pick a valid foreground even when the designer's
 * chosen position isn't itself a WCAG pair anchor.
 */
function nearestPartner(
  pairs: readonly (readonly number[])[] | undefined,
  basePosition: number,
): number | undefined {
  if (!pairs || pairs.length === 0) return undefined;
  const anchors = new Set<number>();
  for (const pair of pairs) {
    for (const position of pair) anchors.add(position);
  }
  if (anchors.size === 0) return undefined;
  let nearest = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    const distance = Math.abs(anchor - basePosition);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = anchor;
    }
  }
  if (nearest === -1) return undefined;
  return partnerForBase(pairs, nearest);
}

function requireScalePosition(index: number, label: string): string {
  const position = SCALE_POSITIONS[index];
  if (!position) {
    throw new Error(`contrast plugin: invalid scale index ${index} (${label})`);
  }
  return position;
}

/**
 * Find a WCAG-compliant foreground for a parent token's current value.
 *
 * Reads parent's ColorReference via `get`, resolves the family's accessibility
 * metadata, and walks the WCAG-AAA pair list (falling back to AA if AAA has
 * no partner) to find an accessible partner position. The `against` input is
 * a TOKEN NAME -- the cascade re-runs this transform whenever that token's
 * value changes, so the foreground always reflects the parent's current
 * family and position.
 */
export const contrastPlugin = definePlugin<ContrastInput, ColorReference>({
  name: 'contrast',
  inputSchema: ContrastInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.against],
  transform: (input, get) => {
    const resolved = resolveParent(input.against, get);
    if (!resolved) {
      throw new Error(`contrast plugin: "${input.against}" could not resolve`);
    }
    const { positionIndex: basePosition, family: rawFamily, familyName } = resolved;
    const family = rawFamily as ColorValueWithForegroundRefs;

    if (family.foregroundReferences?.auto) {
      const ref = family.foregroundReferences.auto;
      return { family: ref.family, position: ref.position };
    }

    if (family.accessibility) {
      const aaaPartner =
        partnerForBase(family.accessibility.wcagAAA?.normal, basePosition) ??
        nearestPartner(family.accessibility.wcagAAA?.normal, basePosition);
      const aaPartner =
        partnerForBase(family.accessibility.wcagAA?.normal, basePosition) ??
        nearestPartner(family.accessibility.wcagAA?.normal, basePosition);
      const partner = input.level === 'AAA' ? (aaaPartner ?? aaPartner) : aaPartner;
      if (partner !== undefined) {
        return {
          family: familyName,
          position: requireScalePosition(partner, `${familyName} pair`),
        };
      }
    }

    throw new Error(
      `contrast plugin: family "${familyName}" has no foregroundReferences and no accessibility ` +
        `WCAG pair partner for position ${resolved.ref.position} (against ${input.against})`,
    );
  },
});
