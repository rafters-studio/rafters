/**
 * Rebuilding the motion namespace from the generator (#2208).
 *
 * Shared by the two paths that regenerate a project's outputs from its stored
 * tokens -- `init --rebuild` (`regenerateFromExisting`) and the post-install
 * regen in `add` (`regenerateAfterInstall`). Both used to hand a stored
 * `motion.rafters.json` straight to `loadRegistryFromDir`, and both failed on
 * every pre-0.3.0 project for the same reason.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateNamespaces,
  type Plugin,
  saveRegistryToDir,
  TokenRegistry,
} from '@rafters/design-tokens';
import { TokenSchema } from '@rafters/shared';
import { z } from 'zod';
import { log } from './ui.js';

/**
 * Whether a tokens directory holds any namespace file at all.
 *
 * The precondition for every regeneration path: no namespace file means the
 * project is not initialized, and regenerating motion into an absent or empty
 * directory would manufacture a system out of nothing. It is also what lets
 * the callers treat a load failure AFTER this check as a real failure (a
 * corrupt or stale token file) rather than as "not initialized".
 */
export function hasStoredTokens(tokensDir: string): boolean {
  try {
    return readdirSync(tokensDir).some((entry) => entry.endsWith('.rafters.json'));
  } catch {
    return false;
  }
}

const MOTION_CELL_PREFIX = 'motion-cell-';

/**
 * The composite value shape a `motion-cell-*` token carries TODAY, mirroring
 * the generator's own spec (`packages/design-tokens/src/generators/motion.ts`,
 * the per-cell composites) and the exporter's acceptance set
 * (`parseCellSpec` in `packages/design-tokens/src/exporters/tailwind.ts`).
 *
 * This is a second declaration of that shape, and a second declaration drifts.
 * What holds it to the generator is a test, not this comment: the cell-carry
 * conformance case in `test/utils/motion-rebuild.test.ts` runs every
 * `motion-cell-*` value the current generator emits through
 * {@link isCarryableMotionValue} and goes red the day the shape moves again.
 */
const MotionCellSpecSchema = z.object({
  keyframe: z.string(),
  duration: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('tier'), tier: z.string() }),
    z.object({ kind: z.literal('period'), period: z.string() }),
  ]),
  curve: z.string().optional(),
});

/**
 * Whether a stored value may be carried onto the regenerated token of the same
 * name.
 *
 * THE PRECONDITION THE CARRY WAS MISSING. Carrying a stored value forward is
 * right only while the value is still one the current system can emit -- and a
 * pre-0.3.0 `motion-cell-*` value is exactly the case where it is not. A 0.2.3
 * cell wrote `{"keyframe","durationTier","curve"}`; that is still a plain
 * string as far as `TokenSchema` is concerned, so it reloads clean and reaches
 * the Tailwind exporter, which throws on it by name. Writing it back over a
 * correctly regenerated cell reproduces the very failure #2208 is about.
 *
 * The selector is the exporter's own (`name.startsWith('motion-cell-')`), and
 * inside it the branches mirror `parseCellSpec`: a value that does not parse as
 * a JSON object is AN OPERATOR PIN -- an animation shorthand the exporter emits
 * verbatim -- and stays carryable; a value that does parse as an object must
 * satisfy the current cell spec. Every other motion token (easings, durations,
 * periods, keyframes, the semantic namespaces) carries a plain string with no
 * composite shape to go stale, and is carried unconditionally.
 */
export function isCarryableMotionValue(name: string, value: unknown): boolean {
  if (!name.startsWith(MOTION_CELL_PREFIX)) return true;
  if (typeof value !== 'string') return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return true;
  }
  if (typeof parsed !== 'object' || parsed === null) return true;

  return MotionCellSpecSchema.safeParse(parsed).success;
}

/**
 * The designer-owned half of a stored motion token. `userOverride` is the
 * provenance; `value` is what the token actually emits, because TokenRegistry
 * seeds an overridden token from its on-disk value rather than re-deriving it
 * (registry.ts pass 1). The two travel together or not at all: carrying the
 * record alone would leave a token claiming a decision it no longer applies,
 * and carrying the value alone would restore a value nobody can account for.
 */
const StoredMotionTokenSchema = z.object({
  name: z.string(),
  value: TokenSchema.shape.value,
  userOverride: TokenSchema.shape.userOverride,
});

type CarriedMotionOverride = {
  value: z.infer<typeof StoredMotionTokenSchema>['value'];
  userOverride: NonNullable<z.infer<typeof StoredMotionTokenSchema>['userOverride']>;
};

/**
 * Read the overrides worth carrying out of a stored motion namespace file.
 *
 * Parsing is per token, never per file: the whole premise here is that most of
 * a pre-0.3.0 motion file no longer satisfies TokenSchema, so a token that
 * fails to parse is skipped rather than allowed to abort the read.
 */
function readStoredMotionOverrides(motionFile: string): Map<string, CarriedMotionOverride> {
  const carried = new Map<string, CarriedMotionOverride>();

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(motionFile, 'utf8'));
  } catch {
    // No stored motion namespace, or unreadable JSON: nothing to carry.
    return carried;
  }

  const file = z.object({ tokens: z.array(z.unknown()) }).safeParse(raw);
  if (!file.success) return carried;

  for (const entry of file.data.tokens) {
    const parsed = StoredMotionTokenSchema.safeParse(entry);
    if (!parsed.success) continue;
    const { name, value, userOverride } = parsed.data;
    if (!userOverride) continue;
    carried.set(name, { value, userOverride });
  }

  return carried;
}

/**
 * Rewrite `.rafters/tokens/motion.rafters.json` from the motion generator.
 *
 * Motion is system-owned end to end -- cells, easings, durations and the five
 * namespaces all come out of the motion matrix, and nobody hand-authors one.
 * A file written by an older rafters therefore holds tokens the current
 * generator no longer emits: 0.2.3 cells keyed on `durationTier` instead of
 * `duration.kind`, `motion-easing-*` names retired since. Reloading those
 * fails either TokenSchema validation or the Tailwind exporter, which is what
 * made `--rebuild` and post-install regen unusable on every pre-0.3.0
 * project (#2208).
 *
 * `generateNamespaces(['motion'])` is deliberately the same generator call a
 * fresh `init` makes, so a rebuilt namespace holds exactly the tokens a fresh
 * one does and stale names do not come back. The single thing on a motion
 * token that belongs to the designer rather than the generator is a
 * `userOverride`, so that is carried forward onto tokens still present by name
 * -- but only when the value it documents is still a value the current system
 * can emit (see {@link isCarryableMotionValue}). A stored value the generator
 * could no longer produce drops BOTH halves: what is left is the regenerated
 * token exactly as the generator emitted it, `userOverride: null`, rather than
 * a token asserting a decision over a shape that no longer exists. The drop is
 * logged, because a discarded designer decision is not a thing to do silently.
 *
 * Writing before the registry load is what lets the reload see the regenerated
 * namespace with no further surgery.
 *
 * Callers must check {@link hasStoredTokens} first.
 */
export function regenerateMotionNamespace(tokensDir: string, plugins: readonly Plugin[]): void {
  const carried = readStoredMotionOverrides(join(tokensDir, 'motion.rafters.json'));

  const tokens = generateNamespaces(['motion']).allTokens.map((token) => {
    const override = carried.get(token.name);
    if (!override) return token;
    if (!isCarryableMotionValue(token.name, override.value)) {
      log({
        event: 'motion:override-dropped',
        token: token.name,
        message: `Stored override on "${token.name}" holds a value shape this version no longer emits; the token is rebuilt from the generator and the override is dropped.`,
      });
      return token;
    }
    return { ...token, ...override };
  });

  saveRegistryToDir(tokensDir, new TokenRegistry(tokens, plugins));
}
