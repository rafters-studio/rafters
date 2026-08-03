import type { Token } from '@rafters/shared';
import type { TokenRegistry } from './registry.js';

// A preset is a value-set over system tokens: token name -> value.
export type PresetValueSet = Readonly<Record<string, string>>;

export type ApplyPresetOptions = {
  // Human-facing reason recorded on every token the preset writes.
  reason: string;
  context?: string;
};

export type ApplyPresetResult = {
  // Tokens the preset wrote, each now carrying kind: 'preset'.
  applied: readonly string[];
  // Tokens left alone because a designer had attributed the current value.
  skipped: readonly string[];
  // Tokens in the value-set that the registry does not know about.
  unknown: readonly string[];
};

/**
 * Apply a preset value-set without destroying designer decisions.
 *
 * A naive apply -- set() every token in the value-set -- silently clobbers a
 * designer's pin: no error is raised, and the pinned value survives only as
 * previousValue under the PRESET's reason, so the designer attribution is
 * gone. A second apply erases even that. This helper is the shipped answer:
 * it skips any token whose current override is attributed to a designer, and
 * records kind: 'preset' on everything it does write.
 *
 * Provenance is what it branches on, never the free-text reason string. An
 * override with no kind is NOT treated as a designer pin -- absent provenance
 * means unknown, and the preset overwrites it. That is the honest status quo
 * for overrides written before the kind field existed; Studio should backfill
 * kind rather than have this helper guess.
 */
export function applyPreset(
  registry: TokenRegistry,
  valueSet: PresetValueSet,
  options: ApplyPresetOptions,
): ApplyPresetResult {
  const applied: string[] = [];
  const skipped: string[] = [];
  const unknown: string[] = [];

  for (const [name, value] of Object.entries(valueSet)) {
    const token = registry.get(name);
    if (!token) {
      unknown.push(name);
      continue;
    }
    if (isDesignerAttributed(token)) {
      skipped.push(name);
      continue;
    }
    registry.set(name, value, {
      reason: options.reason,
      ...(options.context ? { context: options.context } : {}),
      kind: 'preset',
    });
    applied.push(name);
  }

  return { applied, skipped, unknown };
}

/** True when the token's current value is a designer decision. */
export function isDesignerAttributed(token: Token): boolean {
  return token.userOverride?.kind === 'designer';
}
