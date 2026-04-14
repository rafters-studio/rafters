/**
 * Plugin protocol for the design token rule engine.
 *
 * Each plugin is a pure transformer: it receives a typed input (built by
 * resolveInput from registry state) and returns a typed output. No plugin
 * may read TokenRegistry directly.
 *
 * The registry-aware parts live here:
 *   - resolveInput  -- reads registry to build the plugin input struct
 *   - regenerate    -- per-node compute: parse rule -> resolve input -> transform -> applyComputed
 *   - cascade       -- topological walk; collects failures; throws aggregate error
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  type ColorReference,
  type ColorValue,
  ColorValueSchema,
  OKLCHSchema,
} from '@rafters/shared';
import { z } from 'zod';
import { GenerationRuleParser } from './generation-rules';
import type { TokenRegistry } from './registry';
import { POSITION_TO_INDEX } from './scale-positions';

// ---------------------------------------------------------------------------
// Plugin type and schema
// ---------------------------------------------------------------------------

/**
 * A plugin is a pure schema-first transformer. I/O types are always derived
 * from Zod schemas via z.infer -- never declared as TypeScript interfaces.
 */
export type Plugin<I, O> = {
  readonly id: string;
  readonly input: z.ZodType<I>;
  readonly output: z.ZodType<O>;
  readonly transform: (input: I) => O;
};

/**
 * Validates that a loaded module matches the Plugin shape.
 * Uses z.custom to check that input/output are actual Zod types.
 */
export const PluginSpecSchema = z.object({
  id: z.string().min(1),
  input: z.custom<z.ZodType<unknown>>((v) => v instanceof z.ZodType),
  output: z.custom<z.ZodType<unknown>>((v) => v instanceof z.ZodType),
  transform: z.function(),
});

/**
 * Identity helper for type inference when declaring plugins.
 * Usage: export default definePlugin({ id, input, output, transform })
 */
export function definePlugin<I, O>(spec: Plugin<I, O>): Plugin<I, O> {
  return spec;
}

// ---------------------------------------------------------------------------
// In-memory plugin registry
// ---------------------------------------------------------------------------

const pluginMap = new Map<string, Plugin<unknown, unknown>>();
const ruleParser = new GenerationRuleParser();
let builtinsRegistered = false;

export function registerPlugin(spec: Plugin<unknown, unknown>): void {
  PluginSpecSchema.parse(spec);
  pluginMap.set(spec.id, spec);
}

export function clearPlugins(): void {
  pluginMap.clear();
  builtinsRegistered = false;
}

export function getPlugin(id: string): Plugin<unknown, unknown> | undefined {
  return pluginMap.get(id);
}

// ---------------------------------------------------------------------------
// Dynamic plugin discovery
// ---------------------------------------------------------------------------

export async function loadPlugins(dirs: string[]): Promise<void> {
  for (const dir of dirs) {
    await loadPluginsFromDir(dir);
  }
}

async function loadPluginsFromDir(dir: string): Promise<void> {
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
    const pluginPath = join(dir, file);
    try {
      const mod = await import(pluginPath);
      const candidate = mod.default;
      const parsed = PluginSpecSchema.safeParse(candidate);
      if (parsed.success) {
        pluginMap.set(candidate.id, candidate as Plugin<unknown, unknown>);
      }
    } catch {
      // Skip unloadable files silently
    }
  }
}

// ---------------------------------------------------------------------------
// Input resolution -- the ONE place that reads TokenRegistry
// ---------------------------------------------------------------------------

/**
 * Build the raw input struct for a plugin given the parsed rule and token name.
 * Returns unknown; the plugin's input.parse() call validates and narrows it.
 *
 * A ZodError from input.parse() downstream is the "rule does not apply" signal
 * (e.g., scale-position rule on a non-ColorValue family).
 */
export function resolveInput(
  registry: TokenRegistry,
  parsedRule: ReturnType<GenerationRuleParser['parse']>,
  tokenName: string,
): unknown {
  const dependencies = registry.getDependencies(tokenName);
  const familyTokenName = dependencies[0];

  switch (parsedRule.type) {
    case 'scale-position': {
      if (!familyTokenName) {
        throw new Error(`No family dependency for scale-position rule on token: ${tokenName}`);
      }
      const familyToken = registry.get(familyTokenName);
      if (!familyToken) {
        throw new Error(`Family token not found: ${familyTokenName}`);
      }

      const existingToken = registry.get(tokenName);
      const existingValue = existingToken?.value;

      // Semantic token path: current value is a ColorReference -> preserve the
      // family reference but allow parsedRule.scalePosition to override position
      if (
        existingValue &&
        typeof existingValue === 'object' &&
        'family' in existingValue &&
        'position' in existingValue
      ) {
        const ref = existingValue as ColorReference;
        const scalePosition =
          parsedRule.scalePosition !== undefined
            ? parsedRule.scalePosition
            : (POSITION_TO_INDEX[ref.position] ?? 5);

        return {
          familyColorValue: familyToken.value,
          familyName: familyTokenName,
          scalePosition,
        };
      }

      // Position token path: extract position index from token name suffix
      // e.g., "primary-600" -> 6
      if (parsedRule.scalePosition !== undefined) {
        return {
          familyColorValue: familyToken.value,
          familyName: familyTokenName,
          scalePosition: parsedRule.scalePosition,
        };
      }

      const posMatch = tokenName.match(/(\d+)$/);
      if (!posMatch) {
        throw new Error(`Cannot extract scale position from token name: ${tokenName}`);
      }
      const posNum = parseInt(posMatch[1] ?? '500', 10);
      const SCALE_POS_TO_INDEX: Record<number, number> = {
        50: 0,
        100: 1,
        200: 2,
        300: 3,
        400: 4,
        500: 5,
        600: 6,
        700: 7,
        800: 8,
        900: 9,
        950: 10,
      };
      const scalePosition = SCALE_POS_TO_INDEX[posNum] ?? 5;

      return {
        familyColorValue: familyToken.value,
        familyName: familyTokenName,
        scalePosition,
      };
    }

    case 'state': {
      if (!familyTokenName) {
        throw new Error(`No family dependency for state rule on token: ${tokenName}`);
      }
      const familyToken = registry.get(familyTokenName);
      if (!familyToken) {
        throw new Error(`Family token not found: ${familyTokenName}`);
      }

      // Extract state type from rule or token name
      const stateType =
        parsedRule.stateType ??
        (() => {
          const match = tokenName.match(/(hover|active|focus|disabled)$/);
          if (!match) throw new Error(`Cannot extract state from token name: ${tokenName}`);
          return match[1];
        })();

      // Extract base position from the base token (token without state suffix)
      const baseTokenName = tokenName.replace(/-(hover|active|focus|disabled)$/, '');
      const baseToken = registry.get(baseTokenName);
      let basePosition = 5;

      if (
        baseToken &&
        typeof baseToken.value === 'object' &&
        baseToken.value !== null &&
        'position' in baseToken.value
      ) {
        const ref = baseToken.value as { position?: string };
        if (ref.position) {
          const idx = POSITION_TO_INDEX[ref.position];
          if (idx !== undefined) basePosition = idx;
        }
      }

      return {
        familyColorValue: familyToken.value,
        familyName: familyTokenName,
        basePosition,
        stateType,
      };
    }

    case 'contrast': {
      if (!familyTokenName) {
        throw new Error(`No family dependency for contrast rule on token: ${tokenName}`);
      }
      const familyToken = registry.get(familyTokenName);
      if (!familyToken) {
        throw new Error(`Family token not found: ${familyTokenName}`);
      }

      // Extract base position from semantic token name
      const baseTokenMatch = tokenName.match(/^(.+)-(?:foreground|text|contrast)$/);
      let basePosition = 5;
      if (baseTokenMatch?.[1]) {
        const baseToken = registry.get(baseTokenMatch[1]);
        if (
          baseToken &&
          typeof baseToken.value === 'object' &&
          baseToken.value !== null &&
          'position' in baseToken.value
        ) {
          const ref = baseToken.value as { position?: string | number };
          if (ref.position !== undefined) {
            basePosition =
              typeof ref.position === 'string'
                ? Math.floor(parseInt(ref.position, 10) / 100)
                : Math.floor(ref.position / 100);
          }
        }
      }

      // Resolve neutral family for fallback (done here since plugins cannot access registry)
      let neutralFamilyName: string | undefined;
      let neutralColorValue: ColorValue | undefined;
      const neutralCandidates = ['neutral-grayscale', 'neutral', 'gray', 'grey'];
      for (const candidate of neutralCandidates) {
        const neutralToken = registry.get(candidate);
        if (
          neutralToken &&
          typeof neutralToken.value === 'object' &&
          neutralToken.value !== null &&
          'scale' in neutralToken.value
        ) {
          neutralFamilyName = candidate;
          neutralColorValue = neutralToken.value as ColorValue;
          break;
        }
      }

      return {
        familyColorValue: familyToken.value,
        familyName: familyTokenName,
        basePosition,
        neutralFamilyName,
        neutralColorValue,
      };
    }

    case 'invert': {
      if (!familyTokenName) {
        throw new Error(`No family dependency for invert rule on token: ${tokenName}`);
      }
      const familyToken = registry.get(familyTokenName);
      if (!familyToken) {
        throw new Error(`Family token not found: ${familyTokenName}`);
      }

      // Extract light index from dependency[1] (dark position token) or token name
      let basePosition = 5;
      const darkDepName = dependencies[1];
      if (darkDepName) {
        const posMatch = darkDepName.match(/-(\d+)$/);
        if (posMatch?.[1]) {
          const idx = POSITION_TO_INDEX[posMatch[1]];
          if (idx !== undefined) basePosition = idx;
        }
      } else {
        const nameMatch = tokenName.match(/-(\d+)$/);
        if (nameMatch?.[1]) {
          const idx = POSITION_TO_INDEX[nameMatch[1]];
          if (idx !== undefined) basePosition = idx;
        }
      }

      return {
        familyColorValue: familyToken.value,
        familyName: familyTokenName,
        basePosition,
      };
    }

    case 'calc': {
      if (!parsedRule.expression) {
        throw new Error('Calc rule missing expression');
      }

      const tokenValues: Record<string, string> = {};
      const tokens = parsedRule.tokens ?? [];

      for (const depTokenName of tokens) {
        const depToken = registry.get(depTokenName);
        if (!depToken) {
          throw new Error(`Dependency token ${depTokenName} not found for calc rule`);
        }
        const value =
          typeof depToken.value === 'object'
            ? JSON.stringify(depToken.value)
            : String(depToken.value);
        tokenValues[depTokenName] = value;
      }

      // inferExpressionFromTokenName lives here (input resolution, not transform)
      let expression = parsedRule.expression;

      // If no token references in expression, try to infer from token metadata
      if (tokens.length === 0) {
        const token = registry.get(tokenName);
        if (token && typeof token === 'object' && 'mathRelationship' in token) {
          const rel = (token as { mathRelationship?: string }).mathRelationship;
          if (rel) expression = rel;
        } else {
          expression = inferExpressionFromTokenName(tokenName);
        }
      }

      return { expression, tokenValues };
    }

    case 'scale': {
      // Numeric ratio scale -- uses base token value * ratio
      const baseTokenName = parsedRule.baseToken ?? dependencies[0];
      if (!baseTokenName) {
        throw new Error(`Scale rule missing base token for: ${tokenName}`);
      }
      const baseToken = registry.get(baseTokenName);
      if (!baseToken) {
        throw new Error(`Base token not found: ${baseTokenName}`);
      }
      return {
        expression: `${String(baseToken.value)} * ${parsedRule.ratio ?? 1.5}`,
        tokenValues: {},
      };
    }

    default:
      throw new Error(`No input resolver for rule type: ${parsedRule.type}`);
  }
}

/**
 * Infer a calc expression from token naming patterns.
 * Moved from calc.ts (it's input resolution, not transform logic).
 */
function inferExpressionFromTokenName(tokenName: string): string {
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [
      /(.+)-(minor-second|major-second|minor-third|major-third|perfect-fourth|augmented-fourth|perfect-fifth)$/,
      (m) => `{${m[1]}} * ${m[2]}`,
    ],
    [/(.+)-(golden|golden-ratio)$/, (m) => `{${m[1]}} * golden`],
    [/(.+)-(2x|double)$/, (m) => `{${m[1]}} * 2`],
    [/(.+)-(3x|triple)$/, (m) => `{${m[1]}} * 3`],
    [/(.+)-(4x|quadruple)$/, (m) => `{${m[1]}} * 4`],
    [/(.+)-plus-(\d+)$/, (m) => `{${m[1]}} + ${m[2]}`],
  ];

  for (const [pattern, build] of patterns) {
    const match = tokenName.match(pattern);
    if (match) return build(match);
  }

  const parts = tokenName.split('-');
  return `{${parts[0] ?? tokenName}} * 1`;
}

// ---------------------------------------------------------------------------
// Per-node compute
// ---------------------------------------------------------------------------

/**
 * Regenerate a single token: parse rule -> resolve input -> plugin transform
 * -> validate output -> applyComputed.
 *
 * A ZodError from input.parse() means "rule does not apply" for this token.
 * It propagates up; cascade catches it and records it as a per-node failure.
 */
export async function regenerate(registry: TokenRegistry, tokenName: string): Promise<void> {
  await ensureBuiltinsRegistered();

  const ruleString = registry.getGenerationRule(tokenName);
  if (!ruleString) return;

  const parsed = ruleParser.parse(ruleString);

  const plugin = pluginMap.get(parsed.type);
  if (!plugin) {
    throw new Error(`No plugin registered for rule type: ${parsed.type}`);
  }

  const raw = resolveInput(registry, parsed, tokenName);
  const input = plugin.input.parse(raw); // ZodError here = "rule does not apply"
  const transformed = plugin.transform(input);
  const output = plugin.output.parse(transformed) as string | ColorReference;

  await registry.applyComputed(tokenName, output);
}

// ---------------------------------------------------------------------------
// Cascade
// ---------------------------------------------------------------------------

/**
 * Walk the dependents of changedTokenName in topological order, regenerating
 * each one. Collects per-node failures. Throws a structured aggregate error
 * if any node failed.
 *
 * Never swallows errors with console.warn.
 */
export async function cascade(registry: TokenRegistry, changedTokenName: string): Promise<void> {
  const failures: Array<{ tokenName: string; cause: unknown }> = [];

  for (const dep of registry.topologicalDependents(changedTokenName)) {
    try {
      await regenerate(registry, dep);
    } catch (e) {
      failures.push({ tokenName: dep, cause: e });
    }
  }

  if (failures.length > 0) {
    throw new Error('cascade failed', {
      cause: { code: 'cascade-aggregate', failures },
    });
  }
}

// ---------------------------------------------------------------------------
// Re-export input schema shapes used by plugins
// (so plugins can import from plugins.ts instead of @rafters/shared directly
//  for the compound input shapes that involve registry-context fields)
// ---------------------------------------------------------------------------

export const ColorFamilyInputBaseSchema = z.object({
  familyColorValue: ColorValueSchema,
  familyName: z.string(),
});

export type ColorFamilyInputBase = z.infer<typeof ColorFamilyInputBaseSchema>;

// Verify OKLCHSchema is available for plugins that need it
export { ColorValueSchema, OKLCHSchema };

// ---------------------------------------------------------------------------
// Built-in plugin auto-registration
//
// Built-in plugins are registered lazily on the first regenerate() call.
// Dynamic imports avoid the circular dependency: plugin files import definePlugin
// from this module, so a static import here would create a cycle.
// ---------------------------------------------------------------------------

/**
 * Ensure all built-in plugins are registered.
 * Called automatically by regenerate() before the first use.
 */
async function ensureBuiltinsRegistered(): Promise<void> {
  if (builtinsRegistered) return;
  builtinsRegistered = true;

  const [scale, state, contrast, invert, calc, example] = await Promise.all([
    import('./plugins/scale.js'),
    import('./plugins/state.js'),
    import('./plugins/contrast.js'),
    import('./plugins/invert.js'),
    import('./plugins/calc.js'),
    import('./plugins/example.js'),
  ]);

  // Only register if not already registered (external callers may pre-register)
  if (!pluginMap.has('scale-position'))
    pluginMap.set('scale-position', scale.default as Plugin<unknown, unknown>);
  if (!pluginMap.has('state')) pluginMap.set('state', state.default as Plugin<unknown, unknown>);
  if (!pluginMap.has('contrast'))
    pluginMap.set('contrast', contrast.default as Plugin<unknown, unknown>);
  if (!pluginMap.has('invert')) pluginMap.set('invert', invert.default as Plugin<unknown, unknown>);
  if (!pluginMap.has('calc')) pluginMap.set('calc', calc.default as Plugin<unknown, unknown>);
  if (!pluginMap.has('example'))
    pluginMap.set('example', example.default as Plugin<unknown, unknown>);
}
