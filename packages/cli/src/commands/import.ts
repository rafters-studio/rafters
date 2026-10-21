/**
 * rafters import (#2763)
 *
 * Imports an existing stylesheet by a map naming which of its custom
 * properties become which rafters targets. Only mapped properties import;
 * every entry is checked before anything is written. Without a map the
 * command is a dry run that reports every custom property it can resolve.
 * `rafters init --css-import` runs the same plan on a fresh project.
 * A `color:<name>` entry adds a colour family assigned to no role (#2813).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  importColorFamily,
  loadRegistryFromDir,
  REGISTRY_PLUGINS,
  resolveCustomProperties,
  saveRegistryToDir,
  type TokenRegistry,
} from '@rafters/design-tokens';
import { SCALE_POSITIONS, tryParseColor } from '@rafters/color-utils';
import { type OKLCH, SEMANTIC_FAMILY_ROLES } from '@rafters/shared';
import { z } from 'zod';
import { getRaftersPaths } from '../utils/paths.js';
import { setAgentMode } from '../utils/ui.js';
import { init } from './init.js';

export class CssImportError extends Error {
  override name = 'CssImportError';
}

/** Non-colour targets and the token each one sets. */
const NON_COLOR_TARGETS = {
  radius: 'radius-base',
  'spacing-base': 'spacing-base',
  'font-sans': 'font-sans',
} as const;
type NonColorTarget = keyof typeof NON_COLOR_TARGETS;

const LENGTH = /^-?(?:\d+|\d*\.\d+)(?:rem|px|em)$/;
const FAMILY = String.raw`\s*(?:"[^"]+"|'[^']+'|[A-Za-z_-][\w-]*(?:\s+[A-Za-z_-][\w-]*)*)\s*`;
const FONT_STACK = new RegExp(`^${FAMILY}(?:,${FAMILY})*$`);
const PROPERTY = /^--[\w-]+$/;
const COLOR_ENTRY = 'color:';
const FAMILY_NAME = /^[a-z][a-z0-9-]*$/;
const SCALE_SOURCE = /^--[\w-]+-\*$/;

/** A `color:<name>` entry: one seed pinned at 500, or a complete 50-950 scale. */
type AddedFamily = { name: string; seed: OKLCH } | { name: string; scale: readonly OKLCH[] };

export interface CssImportPlan {
  readonly cssPath: string;
  readonly colors: readonly { role: string; property: string; seed: OKLCH }[];
  readonly nonColors: readonly { token: string; property: string; value: string }[];
  readonly families: readonly AddedFamily[];
}

export interface CssImportSource {
  readonly cssPath: string;
  readonly css: string;
}

export async function readCssImport(cssPath: string): Promise<CssImportSource> {
  try {
    return { cssPath, css: await readFile(resolve(cssPath), 'utf-8') };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new CssImportError(`--css-import ${cssPath}: cannot read the file (${reason})`);
  }
}

/** The dry run: every custom property in the file with its resolved value. */
export function printCssImportReport({ cssPath, css }: CssImportSource): void {
  const properties = resolveCustomProperties(css);
  console.log(JSON.stringify({ event: 'import:dry_run', cssPath, properties }));
}

/** Join `--map` values (JSON objects or `target=--property` pairs) into one object. */
function collectMap(values: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const raw of values) {
    if (raw.trim().startsWith('{')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new CssImportError(`--map ${raw}: invalid JSON (${reason})`);
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new CssImportError(`--map ${raw}: expected a JSON object`);
      }
      Object.assign(out, parsed);
      continue;
    }
    const eq = raw.indexOf('=');
    if (eq === -1) throw new CssImportError(`--map ${raw}: expected target=--property`);
    out[raw.slice(0, eq).trim()] = raw.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Check every map entry against the file and the registry's targets. Throws
 * on the first bad entry, naming it; touches nothing.
 */
export function planCssImport(
  registry: TokenRegistry,
  { cssPath, css }: CssImportSource,
  mapValues: readonly string[],
): CssImportPlan {
  const colorTargets = SEMANTIC_FAMILY_ROLES.filter(
    (role) => registry.get(role)?.namespace === 'semantic',
  );
  const targets: readonly [string, ...string[]] = [
    ...(Object.keys(NON_COLOR_TARGETS) as [NonColorTarget, ...NonColorTarget[]]),
    ...colorTargets,
  ];
  const map = collectMap(mapValues);
  const roleMap: Record<string, unknown> = {};
  const familyMap: [string, unknown][] = [];
  for (const [key, value] of Object.entries(map)) {
    if (key.startsWith(COLOR_ENTRY)) familyMap.push([key.slice(COLOR_ENTRY.length), value]);
    else roleMap[key] = value;
  }
  const schema = z.partialRecord(z.enum(targets), z.string().regex(PROPERTY));
  const parsed = schema.safeParse(roleMap);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) =>
      i.code === 'invalid_key'
        ? `${i.path.join('.')}: unknown target (expected one of ${targets.join(', ')}, or color:<name> to add a colour family)`
        : `${i.path.join('.')}: ${i.message}`,
    );
    throw new CssImportError(`--map: ${issues.join('; ')}`);
  }

  const resolved: ReadonlyMap<string, ReturnType<typeof resolveCustomProperties>[number]> = new Map(
    resolveCustomProperties(css).map((r) => [r.property, r]),
  );
  const resolveValue = (entry: string, property: string): string => {
    const found = resolved.get(property);
    if (found === undefined) {
      throw new CssImportError(
        `--map ${entry}: ${property} is not declared in a :root rule or @theme block of ${cssPath}`,
      );
    }
    if (found.value === null) {
      throw new CssImportError(`--map ${entry}: ${found.reason}`);
    }
    return found.value;
  };
  const resolveColor = (entry: string, property: string, label = ''): OKLCH => {
    const value = resolveValue(entry, property);
    const color = tryParseColor(value);
    if (color === null) {
      throw new CssImportError(`--map ${entry}: ${label}"${value}" does not parse as a colour`);
    }
    return color;
  };

  const families: AddedFamily[] = [];
  for (const [name, source] of familyMap) {
    const entry = `${COLOR_ENTRY}${name}=${String(source)}`;
    if (name === '') throw new CssImportError(`--map ${entry}: the colour name is empty`);
    if ((SEMANTIC_FAMILY_ROLES as readonly string[]).includes(name)) {
      throw new CssImportError(
        `--map ${entry}: reserved color name "${name}" (a family role; map the role as ${name}=--property)`,
      );
    }
    if (!FAMILY_NAME.test(name)) {
      throw new CssImportError(
        `--map ${entry}: "${name}" is not a lowercase kebab-case name (letters, digits and hyphens, starting with a letter)`,
      );
    }
    if (typeof source !== 'string' || !(PROPERTY.test(source) || SCALE_SOURCE.test(source))) {
      throw new CssImportError(`--map ${entry}: expected --property or --prefix-*`);
    }
    if (!SCALE_SOURCE.test(source)) {
      families.push({ name, seed: resolveColor(entry, source) });
      continue;
    }
    const prefix = source.slice(0, -2);
    const missing = SCALE_POSITIONS.filter((step) => !resolved.has(`${prefix}-${step}`));
    if (missing.length > 0) {
      throw new CssImportError(
        `--map ${entry}: the scale is missing step${missing.length > 1 ? 's' : ''} ${missing.join(', ')} (${missing.map((step) => `${prefix}-${step}`).join(', ')} not declared in ${cssPath})`,
      );
    }
    const scale = SCALE_POSITIONS.map((step) =>
      resolveColor(entry, `${prefix}-${step}`, `step ${step} (${prefix}-${step}): `),
    );
    families.push({ name, scale });
  }

  const colors: { role: string; property: string; seed: OKLCH }[] = [];
  const nonColors: { token: string; property: string; value: string }[] = [];
  for (const [target, property] of Object.entries(parsed.data)) {
    if (property === undefined) continue;
    const entry = `${target}=${property}`;
    if (target in NON_COLOR_TARGETS) {
      const value = resolveValue(entry, property);
      const pattern = target === 'font-sans' ? FONT_STACK : LENGTH;
      if (!pattern.test(value)) {
        throw new CssImportError(`--map ${entry}: "${value}" does not parse as a ${target} value`);
      }
      nonColors.push({ token: NON_COLOR_TARGETS[target as NonColorTarget], property, value });
      continue;
    }
    colors.push({ role: target, property, seed: resolveColor(entry, property) });
  }
  return { cssPath, colors, nonColors, families };
}

/**
 * Apply a checked plan. A colour defines a new `imported-<property>` family
 * seeded at 500 and points the role at it, as init's `:root` import does; a
 * non-colour sets its token. Every set records a designer override. An
 * added family is defined under its own name, assigned to no role, and marked
 * `generateUtilityClass` so rafters.css names its utilities without scanning.
 */
export function applyCssImport(registry: TokenRegistry, plan: CssImportPlan): void {
  for (const { role, property, seed } of plan.colors) {
    const family = `imported-${property.slice(2)}`;
    for (const t of importColorFamily(family, '500', seed)) registry.define(t);
    registry.set(
      role,
      { family, position: '500' },
      { reason: `imported from ${property} in ${plan.cssPath}` },
    );
  }
  for (const { token, property, value } of plan.nonColors) {
    registry.set(token, value, { reason: `imported from ${property} in ${plan.cssPath}` });
  }
  for (const family of plan.families) {
    const tokens =
      'scale' in family
        ? importColorFamily(family.name, family.scale)
        : importColorFamily(family.name, '500', family.seed);
    for (const t of tokens) {
      registry.define(t.name === family.name ? { ...t, generateUtilityClass: true } : t);
    }
  }
}

interface ImportOptions {
  cssImport: string;
  map?: string[];
  agent?: boolean;
}

export async function importCss(options: ImportOptions): Promise<void> {
  setAgentMode(options.agent ?? false);
  const source = await readCssImport(options.cssImport);
  const mapValues = options.map ?? [];
  if (mapValues.length === 0) {
    printCssImportReport(source);
    return;
  }
  const paths = getRaftersPaths(process.cwd());
  if (!existsSync(paths.root)) {
    throw new CssImportError('No .rafters/ directory found. Run rafters init first.');
  }
  const registry = loadRegistryFromDir(paths.tokens, REGISTRY_PLUGINS);
  const plan = planCssImport(registry, source, mapValues);
  applyCssImport(registry, plan);
  saveRegistryToDir(paths.tokens, registry);
  await init({ rebuild: true, ...(options.agent ? { agent: true } : {}) });
}
