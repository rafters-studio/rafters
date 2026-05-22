/**
 * rafters set
 *
 * Sets a token's value. Every change is a diary entry -- the previous value
 * and the reason are recorded as `userOverride`, and downstream cascade fires
 * via plugin bindings so dependents re-derive against the new value.
 *
 * userOverride is metadata describing the change. It is also the anchor that
 * blocks future upstream cascades from clobbering this node's value -- the
 * downstream subtree keeps re-deriving from the override as its new root.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { input } from '@inquirer/prompts';
import { calculateWCAGContrast, generateAccessibilityMetadata } from '@rafters/color-utils';
import {
  contrastPlugin,
  invertPlugin,
  loadRegistryFromDir,
  saveRegistryToDir,
  scalePlugin,
  statePlugin,
} from '@rafters/design-tokens';
import {
  type ColorAccessibility,
  ColorReferenceSchema,
  type ColorValue,
  ColorValueSchema,
  type OKLCH,
} from '@rafters/shared';
import { z } from 'zod';
import { isAgentMode, log, setAgentMode } from '../utils/ui.js';

const TokenValueSchema = z.union([z.string(), ColorValueSchema, ColorReferenceSchema]);
type TokenValue = z.infer<typeof TokenValueSchema>;

export interface SetOptions {
  reason?: string;
  raftersDir?: string;
  agent?: boolean;
}

export async function set(name: string, value: string, options: SetOptions): Promise<void> {
  setAgentMode(options.agent ?? false);

  const dir = resolve(options.raftersDir ?? '.rafters/tokens');
  if (!existsSync(dir)) {
    throw new Error(`tokens directory not found: ${dir}`);
  }

  let reason = options.reason;
  if (!reason) {
    if (isAgentMode()) {
      throw new Error('rafters set requires --reason in agent mode');
    }
    reason = await input({
      message: 'Reason for this change (recorded with userOverride):',
      validate: (v) => (v.trim().length > 0 ? true : 'A reason is required'),
    });
  }

  const parsedValue = bakeAccessibility(parseValue(value));
  const registry = loadRegistryFromDir(dir, [
    scalePlugin,
    contrastPlugin,
    invertPlugin,
    statePlugin,
  ]);
  if (!registry.has(name)) {
    throw new Error(`token "${name}" not found in ${dir}`);
  }

  const previous = registry.get(name)?.value;
  registry.set(name, parsedValue, { reason });
  saveRegistryToDir(dir, registry);

  log({
    event: 'token.set',
    name,
    previous,
    next: parsedValue,
    reason,
  });
}

const WHITE: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };
const BLACK: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };
const WCAG_AA_NORMAL = 4.5;
const WCAG_AAA_NORMAL = 7;

/**
 * Rebake accessibility metadata when the user sets a ColorValue family. The
 * incoming JSON typically supplies only `{name, scale}`, so without this the
 * cascade's contrast/state plugins would lose the WCAG pair list that the
 * color generator populated at init time. Same algorithm as the color
 * generator -- generateAccessibilityMetadata over the scale, ratios from
 * position 5 vs white/black.
 *
 * No-op for string values and ColorReference values (those don't carry a
 * scale to derive accessibility from).
 */
export function bakeAccessibility(value: TokenValue): TokenValue {
  if (typeof value !== 'object' || value === null) return value;
  if (!('scale' in value) || !Array.isArray(value.scale)) return value;
  const colorValue = value as ColorValue;
  const meta = generateAccessibilityMetadata(colorValue.scale);
  const reference = colorValue.scale[5] ?? colorValue.scale[0];
  if (!reference) return value;
  const onWhiteRatio = calculateWCAGContrast(reference, WHITE);
  const onBlackRatio = calculateWCAGContrast(reference, BLACK);
  const accessibility: ColorAccessibility = {
    wcagAA: meta.wcagAA,
    wcagAAA: meta.wcagAAA,
    onWhite: {
      wcagAA: onWhiteRatio >= WCAG_AA_NORMAL,
      wcagAAA: onWhiteRatio >= WCAG_AAA_NORMAL,
      contrastRatio: onWhiteRatio,
      aa: meta.onWhite.aa,
      aaa: meta.onWhite.aaa,
    },
    onBlack: {
      wcagAA: onBlackRatio >= WCAG_AA_NORMAL,
      wcagAAA: onBlackRatio >= WCAG_AAA_NORMAL,
      contrastRatio: onBlackRatio,
      aa: meta.onBlack.aa,
      aaa: meta.onBlack.aaa,
    },
  };
  return { ...colorValue, accessibility };
}

function parseValue(raw: string): TokenValue {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const result = TokenValueSchema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // fall through to string
    }
  }
  return raw;
}
