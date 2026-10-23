/**
 * Tailwind v4 CSS Exporter
 *
 * Converts TokenRegistry contents to Tailwind v4 CSS format with:
 * - @theme block for raw color scales
 * - :root --rafters-* namespace tokens (light/dark mode)
 * - Semantic variables that switch via .dark class (Tailwind v4 @custom-variant)
 * - @theme inline bridge pattern
 *
 * Semantic color mappings come from the registry -- the exporter only outputs what the registry contains.
 *
 * @see https://tailwindcss.com/docs/theme
 * @see https://ui.shadcn.com/docs/theming
 */

import { oklchToCSS, SCALE_POSITIONS } from '@rafters/color-utils';
import * as csstree from 'css-tree';
import {
  type ColorReference,
  type ColorValue,
  type FillValue,
  FillValueSchema,
  SEMANTIC_FAMILY_ROLES,
  type Token,
  type TypographyElementOverride,
} from '@rafters/shared';
import type { MotionNamespace } from '../generators/motion.js';
import type { TokenRegistry } from '../registry.js';

/**
 * Options for Tailwind CSS export
 */
export interface TailwindExportOptions {
  /** Include comments with token metadata (default: false) */
  includeComments?: boolean;
  /** Include @import "tailwindcss" at top */
  includeImport?: boolean;
  /** Dark mode strategy: 'class' (.dark class toggle) or 'media' (OS preference). Default: 'class' */
  darkMode?: 'class' | 'media';
  /**
   * Font stylesheets to load, e.g. ['@fontsource-variable/noto-sans'].
   * Each distinct entry becomes one `@import "<entry>";` line, in list order,
   * as the first lines of the sheet. Absent or empty = output identical to today.
   */
  fontImports?: readonly string[];
}

const INVALID_FONT_IMPORT = /["\\\r\n]/;

/**
 * One `@import "<entry>";` line per distinct entry, in list order (first
 * occurrence wins). Throws before anything is emitted on an entry that cannot
 * be written as one valid `@import` line.
 */
function fontImportLines(entries: readonly string[] = []): string[] {
  for (const entry of entries) {
    if (entry === '' || INVALID_FONT_IMPORT.test(entry)) {
      throw new Error(
        `Invalid font import ${JSON.stringify(entry)}: expected a package specifier or URL with no quotes, backslashes or line breaks`,
      );
    }
  }
  return [...new Set(entries)].map((entry) => `@import "${entry}";`);
}

/**
 * THE FIVE MOTION NAMESPACES (ruling 019fc49f, issue #1991).
 *
 * Each member is emitted as one `--rafters-<namespace>-<member>` custom property
 * carrying a LITERAL, plus one `@utility <namespace>-<member>` block that
 * references it by NAME. That split is the whole mechanism:
 *
 *   - the var is the only place a motion value exists, so Studio retuning one
 *     leaf changes exactly one line of the emitted sheet;
 *   - the utility never contains a value, so every @utility block is
 *     byte-identical across a retune. One fast, everywhere, always.
 *
 * We generate these blocks ourselves rather than leaning on Tailwind theme
 * inference, because NONE of the five is a Tailwind v4 theme namespace --
 * `duration-*` takes bare numbers (the #1955 trap: `duration-moderate` reads as
 * correct and compiles to nothing), and `delay-*`, `extent-*` and `period-*` are
 * not namespaces at all. `ease-*` is the single exception, and it gets an
 * explicit block anyway so all five behave identically.
 */
const MOTION_NAMESPACE_PROPERTY = {
  duration: 'transition-duration',
  ease: 'transition-timing-function',
  delay: 'transition-delay',
  // Extents are consumed inside transforms, so the utility publishes the chosen
  // extent under a fixed name the consuming rule reads. The name comes from toy
  // 9 (worktree-toy-motion-registry).
  //
  // THIS IS THE UTILITY-SIDE CONTRACT, and it is one of TWO (#2017). A CLASS
  // picks an extent by naming a member (`extent-pop`) and the rule downstream
  // reads `--rafters-consumed-extent` without knowing which member won.
  // KEYFRAME BODIES DO NOT USE THIS ALIAS: they are generator-owned emission and
  // reference the LEAF directly (`var(--rafters-extent-pop)`, see
  // DEFAULT_KEYFRAME_DEFINITIONS). A shape is not a function of whatever extent
  // the consuming class last selected. Do not merge the two contracts.
  extent: '--rafters-consumed-extent',
  period: 'animation-duration',
} as const satisfies Record<MotionNamespace, string>;

// The exporter never imports generator RUNTIME (registry-in, not
// generator-internals-in), but the namespace SET must not be re-declarable by
// hand: `satisfies Record<MotionNamespace, string>` fails the build the moment
// the generator's union gains or loses a member this map does not mirror, and
// the token regex below derives from the map so it cannot drift separately.
const MOTION_NAMESPACE_NAMES = Object.keys(MOTION_NAMESPACE_PROPERTY) as readonly MotionNamespace[];

/**
 * Namespaces the reduced-motion law zeroes.
 *
 * Under `prefers-reduced-motion: reduce` every duration and every delay resolves
 * to zero. `period` is deliberately absent: loops slow, they never stop, because
 * a stopped spinner says the work stopped. No slowdown factor is written here --
 * nobody has tuned one, and an invented multiplier would read as a finding.
 * `ease` and `extent` are absent because zeroing the duration already removes
 * the motion they shape.
 */
const REDUCED_MOTION_ZEROED: ReadonlySet<MotionNamespace> = new Set(['duration', 'delay']);

/**
 * The Tailwind v4 theme namespace each of ours bridges onto, or absent when
 * Tailwind has none.
 *
 * MEASURED, not assumed (2026-09-02, `@tailwindcss/cli` 4.1.18, compiled and
 * read back). Tailwind generates `duration-*`, `ease-*` and `delay-*` from these
 * keys with no `@utility` block from us -- and note the two that are NOT what
 * the class is called: the duration namespace is `--transition-duration-*` and
 * the delay namespace is `--transition-delay-*`. A `--duration-*` key, which is
 * what this bridge used to write, generates NOTHING; it was inert for utility
 * purposes and only ever fed hand-written `var(--duration-*)` references.
 *
 * `extent` and `period` have no Tailwind namespace and keep their own `@utility`
 * blocks: an extent publishes a custom property rather than a CSS one, and a
 * loop's time rides inside an `--animate-*` shorthand.
 */
const TAILWIND_THEME_PREFIX: Partial<Record<MotionNamespace, string>> = {
  duration: 'transition-duration',
  ease: 'ease',
  delay: 'transition-delay',
};

const MOTION_NAMESPACE_TOKEN = new RegExp(`^rafters-(${MOTION_NAMESPACE_NAMES.join('|')})-(.+)$`);

/** Split a `rafters-<ns>-<member>` token name, or null if it is not one. */
function motionNamespaceParts(name: string): { namespace: MotionNamespace; member: string } | null {
  const match = MOTION_NAMESPACE_TOKEN.exec(name);
  if (!match?.[1] || !match[2]) return null;
  return { namespace: match[1] as MotionNamespace, member: match[2] };
}

/**
 * Group tokens by their namespace
 */
interface GroupedTokens {
  semantic: Token[];
  color: Token[];
  motion: Token[];
  'typography-composite': Token[];
  /** Tokens in no namespace the exporter knows: emitted raw. */
  other: Token[];
}

/**
 * Build semantic mappings from actual tokens in the registry.
 * Tokens not present are omitted from output.
 *
 * @param semanticTokens - Semantic tokens from the registry
 * @returns { light: 'neutral-50', dark: 'neutral-950' } format
 */
function getSemanticMappingsFromTokens(
  semanticTokens: Token[],
): Record<string, { light: string; dark: string }> {
  const mappings: Record<string, { light: string; dark: string }> = {};
  const tokensByName = new Map<string, Token>();
  for (const t of semanticTokens) tokensByName.set(t.name, t);

  for (const token of semanticTokens) {
    const { name, value, dependsOn } = token;

    if (name.endsWith('--dark')) continue;

    if (typeof value !== 'object' || value === null || !('family' in value)) {
      continue;
    }

    const colorRef = value as ColorReference;
    const lightRef = `${colorRef.family}-${colorRef.position}`;

    let darkRef = lightRef;
    const darkTokenName = dependsOn?.[1];
    if (darkTokenName) {
      const darkToken = tokensByName.get(darkTokenName);
      if (darkToken?.value && typeof darkToken.value === 'object' && 'family' in darkToken.value) {
        const darkColorRef = darkToken.value as ColorReference;
        darkRef = `${darkColorRef.family}-${darkColorRef.position}`;
      }
    }

    mappings[name] = { light: lightRef, dark: darkRef };
  }

  return mappings;
}

/**
 * Convert a token value to CSS string.
 * Returns null for values that cannot be represented as CSS (e.g. JSON objects/arrays).
 */
function tokenValueToCSS(token: Token): string | null {
  const { value } = token;
  // A fill is a recipe, written as its bg-fill-* utility, never a property.
  if (token.namespace === 'fill') return null;

  // String values pass through, but skip JSON object/array strings
  if (typeof value === 'string') {
    if (value.startsWith('{') || value.startsWith('[')) {
      return null;
    }
    return value;
  }

  // ColorValue - convert OKLCH to CSS
  if (typeof value === 'object' && value !== null) {
    if ('scale' in value) {
      const colorValue = value as ColorValue;
      // Return OKLCH string for the base color (position 500 = index 5)
      const baseColor = colorValue.scale[5];
      if (baseColor) {
        // Reproduce the old formatNumber exactly: round each channel to 3
        // decimals via toFixed, then re-widen through Number() so the
        // no-precision oklchToCSS format path (plain String()) strips
        // trailing zeros the same way `Number(v.toFixed(3)).toString()`
        // did. `oklchToCSS(baseColor, { precision: 3 })` would NOT match --
        // toFixed pads trailing zeros back in (0.92 -> "0.920"). alpha is
        // forced to 1 because the old formatter never emitted a fourth
        // channel at all, even for an imported color carrying alpha < 1.
        // This holds for every OKLCH this exporter can receive, not only
        // the already-rounded output of the default seeded families
        // -- see the imported-primary fixture test below.
        return oklchToCSS({
          l: Number(baseColor.l.toFixed(3)),
          c: Number(baseColor.c.toFixed(3)),
          h: Number(baseColor.h.toFixed(3)),
          alpha: 1,
        });
      }
    }
    // ColorReference - return as var() reference
    if ('family' in value && 'position' in value) {
      const ref = value as ColorReference;
      return `var(--color-${ref.family}-${ref.position})`;
    }
  }

  return String(value);
}

/**
 * Group tokens by namespace
 */
function groupTokens(tokens: Token[]): GroupedTokens {
  const groups: GroupedTokens = {
    semantic: [],
    color: [],
    motion: [],
    'typography-composite': [],
    other: [],
  };

  for (const token of tokens) {
    const ns = token.namespace;
    if (ns === 'semantic' || ns === 'color' || ns === 'motion' || ns === 'typography-composite') {
      groups[ns].push(token);
    } else if (!MAPPED_GROUPS.has(ns)) {
      // The mapped namespaces are written by the theme mapping, not by group.
      groups.other.push(token);
    }
  }

  return groups;
}

/** Every token by name: the owner walk reads tokens outside the semantic group. */
export type TokenIndex = ReadonlyMap<string, Token>;

const FAMILY_ROLES: ReadonlySet<string> = new Set(SEMANTIC_FAMILY_ROLES);
const SCALE_STEPS: ReadonlySet<string> = new Set(SCALE_POSITIONS);
const DARK_SUFFIX = '--dark';
const OWNER_WALK_HOPS = 12;
/** The binding inputs that name the token (or palette) a token is derived from. */
const BINDING_PARENT_KEYS = ['familyName', 'against', 'from', 'fromToken'] as const;
type BindingParentKey = (typeof BINDING_PARENT_KEYS)[number];

function indexTokens(tokens: Token[]): TokenIndex {
  const index = new Map<string, Token>();
  for (const token of tokens) index.set(token.name, token);
  return index;
}

function semanticTokensOf(tokens: TokenIndex): Token[] {
  return [...tokens.values()].filter((t) => t.namespace === 'semantic');
}

function withoutDarkSuffix(name: string): string {
  return name.endsWith(DARK_SUFFIX) ? name.slice(0, -DARK_SUFFIX.length) : name;
}

function bindingInput(token: Token, key: BindingParentKey): string | null {
  const input = token.binding?.input;
  if (typeof input !== 'object' || input === null || !(key in input)) return null;
  const value: unknown = (input as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function bindingParent(token: Token): string | null {
  for (const key of BINDING_PARENT_KEYS) {
    const parent = bindingInput(token, key);
    if (parent) return parent;
  }
  return null;
}

/** A family role that has a semantic root token in this token set. */
function isRoleRoot(name: string, tokens: TokenIndex): boolean {
  return FAMILY_ROLES.has(name) && tokens.get(name)?.namespace === 'semantic';
}

/** The family roles that have a root token, in SEMANTIC_FAMILY_ROLES order. */
function rolesWithRoot(tokens: TokenIndex): string[] {
  return SEMANTIC_FAMILY_ROLES.filter((role) => isRoleRoot(role, tokens));
}

/**
 * The family role that owns a semantic token: walk its binding inputs upward
 * until a role root. `X--dark` walks as `X`. A walk that reaches a palette
 * family (or a token with no binding) ends with no owner.
 */
function findRoleOwner(name: string, tokens: TokenIndex): string | null {
  let current = withoutDarkSuffix(name);
  for (let hops = 0; ; hops++) {
    if (isRoleRoot(current, tokens)) return current;
    const token = tokens.get(current);
    if (!token || token.namespace !== 'semantic') return null;
    const parent = bindingParent(token);
    if (!parent) return null;
    if (hops === OWNER_WALK_HOPS) {
      throw new Error(
        `Role owner walk for semantic token "${name}" did not end within ${OWNER_WALK_HOPS} hops`,
      );
    }
    current = withoutDarkSuffix(parent);
  }
}

function colorPosition(token: Token | undefined): string | null {
  const value = token?.value;
  if (typeof value !== 'object' || value === null || !('position' in value)) return null;
  return String(value.position);
}

function storedFamily(token: Token | undefined): string | null {
  const value = token?.value;
  if (typeof value !== 'object' || value === null || !('family' in value)) return null;
  return value.family;
}

/** What a role's scale points at: another role's scale, or a palette. */
type RoleScaleSource = { layer: 'rafters' | 'color'; family: string };

/**
 * A role's scale follows what the registry stores for its root. A stored
 * family that is another role hangs the scale off that role. A stored palette
 * hangs it off the role its scale binding names only when that role's scale
 * resolves to the same palette (the default: primary stores zinc, its binding
 * names neutral, neutral is zinc); otherwise (a role set to another palette)
 * the scale sits on the stored palette.
 */
function roleScaleSource(role: string, tokens: TokenIndex, seen: Set<string>): RoleScaleSource {
  const root = tokens.get(role);
  const stored = storedFamily(root);
  if (!root || !stored) throw new Error(`Role "${role}" stores no family for its scale`);
  if (stored !== role && isRoleRoot(stored, tokens)) return { layer: 'rafters', family: stored };
  const bound = root.binding?.plugin === 'scale' ? bindingInput(root, 'familyName') : null;
  if (
    bound !== null &&
    bound !== role &&
    isRoleRoot(bound, tokens) &&
    rolePalette(bound, tokens, new Set(seen)) === stored
  ) {
    return { layer: 'rafters', family: bound };
  }
  return { layer: 'color', family: stored };
}

/** The palette a role's scale finally resolves to. */
function rolePalette(role: string, tokens: TokenIndex, seen = new Set<string>()): string {
  if (seen.has(role)) throw new Error(`Role scales form a cycle at "${role}"`);
  seen.add(role);
  const source = roleScaleSource(role, tokens, seen);
  return source.layer === 'rafters' ? rolePalette(source.family, tokens, seen) : source.family;
}

/** The palette a stored family resolves to: a role's palette, or the family itself. */
function familyPalette(family: string, tokens: TokenIndex): string {
  return isRoleRoot(family, tokens) ? rolePalette(family, tokens) : family;
}

/**
 * The role a token's stored palette reference renders through, by the rules
 * above, or null when it renders the palette step as stored (or stores a role
 * already). A role root (or its `--dark`) goes through the role its scale
 * hangs off; any other token through its owning role, when that role's scale
 * resolves to the stored palette. The DTCG export uses this so its edges
 * match the CSS.
 */
export function roleForPaletteReference(name: string, tokens: TokenIndex): string | null {
  const family = storedFamily(tokens.get(name));
  if (family === null || isRoleRoot(family, tokens)) return null;
  const base = withoutDarkSuffix(name);
  if (isRoleRoot(base, tokens)) {
    const source = roleScaleSource(base, tokens, new Set([base]));
    return source.layer === 'rafters' && rolePalette(source.family, tokens) === family
      ? source.family
      : null;
  }
  const owner = findRoleOwner(name, tokens);
  return owner !== null && rolePalette(owner, tokens) === family ? owner : null;
}

/**
 * Generate @theme inline block for semantic color bridges
 * These reference :root variables and must use @theme inline for dynamic resolution.
 * Every role step gets a bridge too, so Tailwind generates its utilities
 * (bg-primary-950 reads --rafters-primary-950).
 * @see https://tailwindcss.com/docs/theme#using-custom-values
 */
function generateThemeInlineBlock(tokens: TokenIndex): string {
  const semanticMappings = getSemanticMappingsFromTokens(semanticTokensOf(tokens));
  const lines: string[] = [];
  lines.push('@theme inline {');

  // Semantic color bridges (reference :root variables)
  for (const name of Object.keys(semanticMappings)) {
    lines.push(`  --color-${name}: var(--${name});`);
  }

  // Role step bridges (reference the role layer in :root)
  for (const role of rolesWithRoot(tokens)) {
    for (const step of SCALE_POSITIONS) {
      lines.push(`  --color-${role}-${step}: var(--rafters-${role}-${step});`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate :root block with --rafters-* namespace and dark mode via .dark class
 * Reads semantic mappings from actual tokens in the registry.
 *
 * The role layer comes first: one 50-950 scale per family role with a root,
 * pointing at its palette or at another role's scale. Every semantic
 * declaration then points at its owning role's step, so changing a role's
 * scale moves every token the role owns. A token with no owning role, or
 * whose stored palette is not its owner's (a dependent set to another
 * palette), stays on its palette step: the CSS renders what the registry
 * stores.
 */
function generateRootBlock(tokens: TokenIndex, darkMode: 'class' | 'media' = 'class'): string {
  const semanticMappings = getSemanticMappingsFromTokens(semanticTokensOf(tokens));
  const lines: string[] = [];
  lines.push(':root, :host {');

  // Role layer: the same scale in light and dark
  for (const role of rolesWithRoot(tokens)) {
    const { layer, family } = roleScaleSource(role, tokens, new Set([role]));
    for (const step of SCALE_POSITIONS) {
      lines.push(`  --rafters-${role}-${step}: var(--${layer}-${family}-${step});`);
    }
  }

  lines.push('');

  // A semantic declaration: its owning role at its own step, or its palette
  // step when no role owns it. The step is the light token's position for
  // light and the --dark token's for dark; it must agree with the registry's.
  const declaration = (name: string, mode: 'light' | 'dark', paletteRef: string): string => {
    const owner = findRoleOwner(name, tokens);
    const own = tokens.get(mode === 'light' ? name : `${name}${DARK_SUFFIX}`) ?? tokens.get(name);
    const family = storedFamily(own);
    const cssStep = colorPosition(own);
    const checkedStep = (): string => {
      const registryStep = paletteRef.match(/-(\d+)$/)?.[1] ?? null;
      if (cssStep === null || cssStep !== registryStep || !SCALE_STEPS.has(cssStep)) {
        throw new Error(
          `Semantic token "${name}" (${mode}): CSS step ${cssStep ?? 'none'} disagrees with registry step ${registryStep ?? 'none'}`,
        );
      }
      return cssStep;
    };
    if (
      owner !== null &&
      family !== null &&
      familyPalette(family, tokens) === rolePalette(owner, tokens)
    ) {
      return `var(--rafters-${owner}-${checkedStep()})`;
    }
    // A token stored on another role than its owner's (a foreground that
    // fell back to the neutral, #2668) rides that role's step, so it follows
    // that role.
    if (family !== null && isRoleRoot(family, tokens)) {
      return `var(--rafters-${family}-${checkedStep()})`;
    }
    return `var(--color-${paletteRef})`;
  };

  // Light mode --rafters-* tokens
  for (const [name, mapping] of Object.entries(semanticMappings)) {
    lines.push(`  --rafters-${name}: ${declaration(name, 'light', mapping.light)};`);
  }

  lines.push('');

  // Dark mode --rafters-dark-* tokens
  for (const [name, mapping] of Object.entries(semanticMappings)) {
    lines.push(`  --rafters-dark-${name}: ${declaration(name, 'dark', mapping.dark)};`);
  }

  lines.push('');

  // Semantic tokens default to light mode
  for (const name of Object.keys(semanticMappings)) {
    lines.push(`  --${name}: var(--rafters-${name});`);
  }

  // The mapped namespaces' --rafters-* layer, as stored (#2825)
  const layer = tokenLayerLines(tokens);
  if (layer.length > 0) {
    lines.push('');
    lines.push(...layer);
  }

  lines.push('}');
  lines.push('');

  if (darkMode === 'class') {
    // Tailwind v4 custom variant for class-based dark mode
    lines.push('@custom-variant dark (&:where(.dark, .dark *));');
    lines.push('');

    // Dark mode via .dark class
    lines.push('.dark {');
  } else {
    // Dark mode via OS preference
    lines.push('@media (prefers-color-scheme: dark) {');
    lines.push('  :root {');
  }

  const indent = darkMode === 'media' ? '    ' : '  ';
  for (const name of Object.keys(semanticMappings)) {
    lines.push(`${indent}--${name}: var(--rafters-dark-${name});`);
  }
  for (const line of tokenLayerDarkLines(tokens)) lines.push(`${indent}${line}`);

  if (darkMode === 'media') {
    lines.push('  }');
  }
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Every colour utility root Tailwind offers, as of 4.3.3. An older version
 * ignores a root it does not know, without error.
 */
const TAILWIND_COLOR_ROOTS =
  'accent,bg,border,border-b,border-be,border-bs,border-e,border-l,border-r,border-s,border-t,border-x,border-y,caret,decoration,divide,drop-shadow,fill,from,inset-ring,inset-shadow,mask-b-from,mask-b-to,mask-conic-from,mask-conic-to,mask-l-from,mask-l-to,mask-linear-from,mask-linear-to,mask-r-from,mask-r-to,mask-radial-from,mask-radial-to,mask-t-from,mask-t-to,mask-x-from,mask-x-to,mask-y-from,mask-y-to,outline,placeholder,ring,ring-offset,scrollbar-thumb,scrollbar-track,shadow,stroke,text,text-shadow,to,via';

/**
 * One `@source inline` per colour family marked `generateUtilityClass` (a
 * family added by a `--map color:<name>` entry, #2813), so Tailwind generates
 * every colour utility for its steps without seeing them in a scanned file.
 */
function generateFamilyInlineSources(colorTokens: readonly Token[]): string | null {
  const lines = colorTokens
    .filter(
      (t) => t.generateUtilityClass === true && typeof t.value === 'object' && 'scale' in t.value,
    )
    .map(
      (t) =>
        `@source inline("{${TAILWIND_COLOR_ROOTS}}-${t.name}-{${SCALE_POSITIONS.join(',')}}");`,
    );
  return lines.length > 0 ? lines.join('\n') : null;
}

/** A registry namespace the theme mapping reads. */
export type ThemeMappingGroup =
  | 'spacing'
  | 'radius'
  | 'shadow'
  | 'typography'
  | 'typography-composite'
  | 'depth'
  | 'breakpoint'
  | 'focus'
  | 'fill';

/** One theme key a row writes. */
export interface ThemeMappingKey {
  /** The Tailwind theme key, e.g. `--text-{1}`. */
  readonly key: string;
  /** The token whose value the key carries, e.g. `line-height-{1}`. Absent: the matched token. */
  readonly reads?: string;
}

/** A utility that shows a row working, and the token and property it reads. */
export interface ThemeMappingProbe {
  readonly utility: string;
  readonly token: string;
  readonly property: string;
}

/** One row of the theme mapping: a registry token pattern and the theme keys it feeds. */
export interface ThemeMappingRow {
  readonly group: ThemeMappingGroup;
  /** The token names the row maps. Capture groups fill `{1}`, `{2}` in the key templates. */
  readonly token: RegExp;
  /** Token names the pattern catches that the row does not map. */
  readonly except?: RegExp;
  /** The values the row maps; absent maps every value. */
  readonly value?: RegExp;
  /** The value is a JSON object whose string fields fill `{field}` in the key templates. */
  readonly json?: boolean;
  readonly keys: readonly ThemeMappingKey[];
  /** Keys written once per entry of the JSON value's `responsive` object; `{bp}` is the entry's name. */
  readonly responsiveKeys?: readonly ThemeMappingKey[];
  /**
   * The utility the row writes for each matched token, in place of theme keys:
   * `@utility <name> { @apply <the recipe's stock classes>; }`.
   */
  readonly utility?: string;
  /** The key carries the stored value itself: media and container queries cannot read var(). */
  readonly literal?: boolean;
  /** The value a probe stores in each probe token, and the utilities that must follow it. */
  readonly probeValue: string;
  readonly probes: readonly ThemeMappingProbe[];
}

/**
 * THE THEME MAPPING: each registry token pattern, the Tailwind v4 theme key
 * whose stock utility reads it, and the probes that show it working (#2825).
 *
 * Every key carries `var(--rafters-<token>)`, and `:root` sets
 * `--rafters-<token>` to the stored value, so a token change reaches its
 * utility the way colour does. A literal row carries the value itself.
 * A token in a mapped namespace that matches no row gets no theme key.
 * A utility row (the fill row) writes a utility built from stock Tailwind
 * classes; its probe colour is a family step, literal in `@theme`.
 *
 * A new namespace adds rows here; the writer below applies them for both the
 * consumer sheet and the static sheet.
 */
export const THEME_MAPPING: readonly ThemeMappingRow[] = [
  {
    group: 'spacing',
    token: /^spacing-base$/,
    keys: [{ key: '--spacing' }],
    probeValue: '0.3rem',
    probes: [
      { utility: 'p-8', token: 'spacing-base', property: 'padding' },
      { utility: 'h-10', token: 'spacing-base', property: 'height' },
      { utility: 'gap-1.5', token: 'spacing-base', property: 'gap' },
    ],
  },
  {
    group: 'spacing',
    token: /^spacing-(.+)$/,
    except: /^spacing-(base|progression)$/,
    keys: [{ key: '--spacing-{1}' }],
    probeValue: '1.1rem',
    probes: [{ utility: 'p-4', token: 'spacing-4', property: 'padding' }],
  },
  {
    group: 'radius',
    token: /^radius$/,
    keys: [{ key: '--radius' }],
    probeValue: '0.7rem',
    probes: [{ utility: 'rounded', token: 'radius', property: 'border-radius' }],
  },
  {
    group: 'radius',
    token: /^radius-(.+)$/,
    except: /-(tl|tr|bl|br)$/,
    keys: [{ key: '--radius-{1}' }],
    probeValue: '0.9rem',
    probes: [
      { utility: 'rounded-md', token: 'radius-md', property: 'border-radius' },
      { utility: 'rounded-t-lg', token: 'radius-lg', property: 'border-top-left-radius' },
    ],
  },
  {
    group: 'shadow',
    token: /^shadow$/,
    keys: [{ key: '--shadow' }],
    probeValue: '0 2px 5px 0 rgb(1 2 3 / 0.4)',
    probes: [{ utility: 'shadow', token: 'shadow', property: '--tw-shadow' }],
  },
  {
    group: 'shadow',
    token: /^shadow-(.+)$/,
    except: /^shadow-(base-unit|progression|rung-\d+)$|-(offset-x|offset-y|blur|spread|color)$/,
    keys: [{ key: '--shadow-{1}' }],
    probeValue: '0 3px 7px 0 rgb(4 5 6 / 0.4)',
    probes: [
      { utility: 'shadow-md', token: 'shadow-md', property: '--tw-shadow' },
      { utility: 'shadow-primary', token: 'shadow-primary', property: '--tw-shadow' },
    ],
  },
  {
    group: 'typography',
    token: /^font-size-(.+)$/,
    keys: [
      { key: '--text-{1}' },
      { key: '--text-{1}--line-height', reads: 'line-height-{1}' },
      { key: '--text-{1}--letter-spacing', reads: 'letter-spacing-{1}' },
    ],
    probeValue: '2.9rem',
    probes: [{ utility: 'text-4xl', token: 'font-size-4xl', property: 'font-size' }],
  },
  {
    group: 'typography',
    token: /^line-height-(.+)$/,
    keys: [{ key: '--leading-{1}' }],
    probeValue: '1.9',
    probes: [
      { utility: 'leading-7', token: 'line-height-7', property: 'line-height' },
      { utility: 'leading-none', token: 'line-height-none', property: 'line-height' },
    ],
  },
  {
    group: 'typography',
    token: /^letter-spacing-(.+)$/,
    keys: [{ key: '--tracking-{1}' }],
    probeValue: '-0.031em',
    probes: [
      { utility: 'tracking-tight', token: 'letter-spacing-tight', property: 'letter-spacing' },
    ],
  },
  {
    group: 'typography',
    token: /^font-weight-(.+)$/,
    keys: [{ key: '--font-weight-{1}' }],
    probeValue: '650',
    probes: [{ utility: 'font-bold', token: 'font-weight-bold', property: 'font-weight' }],
  },
  {
    group: 'typography',
    token: /^font-(sans|mono|serif|heading|body|code)$/,
    keys: [{ key: '--font-{1}' }],
    probeValue: 'Probe Face, monospace',
    probes: [{ utility: 'font-mono', token: 'font-mono', property: 'font-family' }],
  },
  {
    group: 'typography-composite',
    token: /^(.+)$/,
    json: true,
    keys: [
      { key: '--text-{1}', reads: 'font-size-{fontSize}' },
      { key: '--text-{1}--line-height', reads: 'line-height-{lineHeight}' },
      { key: '--text-{1}--letter-spacing', reads: 'letter-spacing-{letterSpacing}' },
      { key: '--text-{1}--font-weight', reads: 'font-weight-{fontWeight}' },
      { key: '--rafters-ts-{1}', reads: 'font-{fontFamily}' },
    ],
    responsiveKeys: [
      { key: '--rafters-ts-{1}-{bp}', reads: 'font-size-{fontSize}' },
      { key: '--rafters-ts-{1}-{bp}-leading', reads: 'line-height-{fontSize}' },
    ],
    probeValue: '3.1rem',
    probes: [
      { utility: 'text-display-medium', token: 'font-size-4xl', property: 'font-size' },
      { utility: 'ts-display-medium', token: 'font-heading', property: 'font-family' },
    ],
  },
  {
    group: 'depth',
    token: /^depth-(.+)$/,
    value: /^-?\d+$/,
    keys: [{ key: '--z-index-depth-{1}' }],
    probeValue: '41',
    probes: [
      { utility: 'z-depth-modal', token: 'depth-modal', property: 'z-index' },
      { utility: 'z-depth-below', token: 'depth-below', property: 'z-index' },
    ],
  },
  {
    group: 'breakpoint',
    token: /^breakpoint-(.+)$/,
    except: /-max$|^breakpoint-scale$/,
    value: /^[^(]/,
    keys: [{ key: '--breakpoint-{1}' }],
    literal: true,
    probeValue: '50rem',
    probes: [{ utility: 'md:p-4', token: 'breakpoint-md', property: 'padding' }],
  },
  {
    group: 'breakpoint',
    token: /^container-(.+)$/,
    keys: [{ key: '--container-{1}' }],
    literal: true,
    probeValue: '33rem',
    probes: [
      { utility: '@lg:p-4', token: 'container-lg', property: 'padding' },
      { utility: 'max-w-md', token: 'container-md', property: 'max-width' },
    ],
  },
  {
    group: 'focus',
    token: /^focus-ring-width$/,
    keys: [
      { key: '--default-ring-width' },
      { key: '--ring-width-2' },
      { key: '--outline-width-2' },
    ],
    probeValue: '0.15rem',
    probes: [
      { utility: 'ring', token: 'focus-ring-width', property: '--tw-ring-shadow' },
      { utility: 'ring-2', token: 'focus-ring-width', property: '--tw-ring-shadow' },
      { utility: 'outline-2', token: 'focus-ring-width', property: 'outline-width' },
    ],
  },
  {
    group: 'focus',
    token: /^focus-offset$/,
    keys: [{ key: '--ring-offset-width-2' }, { key: '--outline-offset-2' }],
    probeValue: '0.2rem',
    probes: [
      { utility: 'ring-offset-2', token: 'focus-offset', property: '--tw-ring-offset-width' },
      { utility: 'outline-offset-2', token: 'focus-offset', property: 'outline-offset' },
    ],
  },
  {
    group: 'fill',
    token: /^(.+)$/,
    keys: [],
    utility: 'bg-fill-{1}',
    literal: true,
    probeValue: 'oklch(0.41 0.12 30)',
    probes: [{ utility: 'bg-fill-probe', token: 'zinc-500', property: 'background-color' }],
  },
];

const MAPPED_GROUPS: ReadonlySet<string> = new Set(THEME_MAPPING.map((row) => row.group));

/** One theme key the mapping writes for a stored token. */
interface MappedKey {
  key: string;
  /** The token the key carries. */
  reads: string;
  literal: boolean;
}

/** Fill `{name}` placeholders from `fields`; null when one has no value. */
function fillTemplate(template: string, fields: Readonly<Record<string, string>>): string | null {
  let missing = false;
  const filled = template.replace(/\{([A-Za-z0-9]+)\}/g, (_all, name: string) => {
    const value = fields[name];
    if (value === undefined) missing = true;
    return value ?? '';
  });
  return missing ? null : filled;
}

/** The string fields of a JSON object token value, and its `responsive` entries. */
function jsonFields(
  token: Token,
): { fields: Record<string, string>; responsive: Record<string, Record<string, string>> } | null {
  if (typeof token.value !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(token.value);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const strings = (o: object): Record<string, string> =>
    Object.fromEntries(
      Object.entries(o).filter((e): e is [string, string] => typeof e[1] === 'string'),
    );
  const responsive: Record<string, Record<string, string>> = {};
  if ('responsive' in parsed && typeof parsed.responsive === 'object' && parsed.responsive) {
    for (const [bp, entry] of Object.entries(parsed.responsive)) {
      if (typeof entry === 'object' && entry !== null) responsive[bp] = strings(entry);
    }
  }
  return { fields: strings(parsed), responsive };
}

/** Every theme key the mapping writes for these tokens, in row order. */
function mappedKeys(tokens: TokenIndex): MappedKey[] {
  const out: MappedKey[] = [];
  for (const row of THEME_MAPPING) {
    for (const token of tokens.values()) {
      if (token.namespace !== row.group || token.name.endsWith(DARK_SUFFIX)) continue;
      const match = row.token.exec(token.name);
      if (!match || row.except?.test(token.name)) continue;
      const captures = Object.fromEntries(match.slice(1).map((c, i) => [String(i + 1), c]));
      const specs: Array<[ThemeMappingKey, Record<string, string>]> = [];
      if (row.json) {
        const parsed = jsonFields(token);
        if (parsed === null) continue;
        const base = { ...parsed.fields, ...captures };
        for (const key of row.keys) specs.push([key, base]);
        for (const [bp, entry] of Object.entries(parsed.responsive)) {
          for (const key of row.responsiveKeys ?? []) specs.push([key, { ...base, ...entry, bp }]);
        }
      } else {
        const value = tokenValueToCSS(token);
        if (value === null || (row.value && !row.value.test(value))) continue;
        for (const key of row.keys) specs.push([key, captures]);
      }
      for (const [spec, fields] of specs) {
        const key = fillTemplate(spec.key, fields);
        const reads = spec.reads === undefined ? token.name : fillTemplate(spec.reads, fields);
        if (key === null || reads === null || !tokens.has(reads)) continue;
        out.push({ key, reads, literal: row.literal === true });
      }
    }
  }
  return out;
}

/** The mapped theme keys as `@theme` lines: a `--rafters-*` reference, or the literal value. */
function themeMappingLines(tokens: TokenIndex): string[] {
  return mappedKeys(tokens).map(({ key, reads, literal }) => {
    const source = tokens.get(reads);
    const value = literal && source ? tokenValueToCSS(source) : `var(--rafters-${reads})`;
    return `  ${key}: ${value};`;
  });
}

type FillParts = NonNullable<FillValue['dark']>;
type FillColour = NonNullable<FillParts['foreground']>;

/** A state block and the variant its classes take. */
const FILL_STATES = [
  ['hover', 'hover'],
  ['active', 'active'],
  ['focus', 'focus-visible'],
  ['disabled', 'disabled'],
] as const;

/** A recipe number as a utility value: the named step when whole, else an arbitrary value. */
function fillNumber(n: number, named: string, arbitrary: string, hint = ''): string {
  return Number.isInteger(n) ? `${n}${named}` : `[${hint}${n}${arbitrary}]`;
}

/** An angle utility, negated with a leading `-` as Tailwind spells it. */
function fillAngle(root: string, angle: number): string {
  return `${angle < 0 ? '-' : ''}${root}-${fillNumber(Math.abs(angle), '', 'deg')}`;
}

/** A registry colour as a utility's colour name, with its alpha modifier. */
function fillColour(colour: FillColour, alpha?: number): string {
  const name = 'token' in colour ? colour.token : `${colour.family}-${colour.position}`;
  return alpha === undefined ? name : `${name}/${alpha}`;
}

function fillGradientClasses(gradient: NonNullable<FillParts['gradient']>): string[] {
  let base: string;
  if (gradient.type === 'radial') base = 'bg-radial';
  else if (gradient.type === 'conic') {
    base = gradient.angle === undefined ? 'bg-conic' : fillAngle('bg-conic', gradient.angle);
  } else if (gradient.direction) base = `bg-linear-${gradient.direction}`;
  else if (gradient.angle !== undefined) base = fillAngle('bg-linear', gradient.angle);
  else base = 'bg-linear-to-b';
  const out = [gradient.interpolation ? `${base}/${gradient.interpolation}` : base];
  for (const prefix of ['from', 'via', 'to'] as const) {
    const stop = gradient[prefix];
    if (!stop) continue;
    out.push(`${prefix}-${fillColour(stop.color, stop.alpha)}`);
    if (stop.position !== undefined) out.push(`${prefix}-${fillNumber(stop.position, '%', '%')}`);
  }
  return out;
}

/** The stock classes of one block of a recipe. A mask with no positions writes no mask. */
function fillPartClasses(parts: FillParts): string[] {
  const out: string[] = [];
  if (parts.background) {
    out.push(`bg-${fillColour(parts.background.color, parts.background.alpha)}`);
  }
  if (parts.gradient) out.push(...fillGradientClasses(parts.gradient));
  const { mask, backdrop } = parts;
  for (const edge of ['from', 'to'] as const) {
    const at = mask?.[edge];
    if (mask && at !== undefined) {
      out.push(`mask-${mask.type}-${edge}-${fillNumber(at, '%', '%', 'length:')}`);
    }
  }
  if (backdrop?.blur) out.push(`backdrop-blur-${backdrop.blur}`);
  for (const filter of ['brightness', 'contrast', 'saturate', 'grayscale', 'opacity'] as const) {
    const n = backdrop?.[filter];
    if (n !== undefined) out.push(`backdrop-${filter}-${fillNumber(n, '', '%')}`);
  }
  if (parts.blend) out.push(`bg-blend-${parts.blend}`);
  if (parts.foreground) out.push(`text-${fillColour(parts.foreground)}`);
  if (parts.border) out.push(`border-${fillColour(parts.border)}`);
  return out;
}

/** A recipe's stock class list: its parts, then `dark:` parts, then each state's variant parts. */
function fillClasses(recipe: FillValue): string[] {
  const out = fillPartClasses(recipe);
  if (recipe.dark) out.push(...fillPartClasses(recipe.dark).map((c) => `dark:${c}`));
  for (const [state, variant] of FILL_STATES) {
    const block = recipe[state];
    if (!block) continue;
    out.push(...fillPartClasses(block).map((c) => `${variant}:${c}`));
    if (block.dark) out.push(...fillPartClasses(block.dark).map((c) => `dark:${variant}:${c}`));
  }
  return out;
}

/**
 * Each fill as its utility row's `@utility`, built only from stock Tailwind
 * classes and registry colours, and one `@source inline` line naming every
 * one, so a fill named only in data still renders (FR-RAF-FILL-002).
 */
function generateFillUtilities(tokens: TokenIndex): string | null {
  const blocks: string[] = [];
  const names: string[] = [];
  for (const row of THEME_MAPPING) {
    if (row.utility === undefined) continue;
    for (const token of tokens.values()) {
      if (token.namespace !== row.group) continue;
      const match = row.token.exec(token.name);
      if (!match || row.except?.test(token.name)) continue;
      const captures = Object.fromEntries(match.slice(1).map((c, i) => [String(i + 1), c]));
      const name = fillTemplate(row.utility, captures);
      if (name === null) continue;
      const classes = fillClasses(FillValueSchema.parse(token.value));
      names.push(name);
      blocks.push(`@utility ${name} {\n  @apply ${classes.join(' ')};\n}`);
    }
  }
  if (names.length === 0) return null;
  return [...blocks, `@source inline("${names.join(' ')}");`].join('\n');
}

/**
 * The `--rafters-*` layer for the mapped namespaces: every token whose value
 * is CSS, as stored. A `<token>--dark` sibling sets `--rafters-dark-<token>`.
 */
function tokenLayerLines(tokens: TokenIndex): string[] {
  const lines: string[] = [];
  for (const token of tokens.values()) {
    if (!MAPPED_GROUPS.has(token.namespace)) continue;
    const value = tokenValueToCSS(token);
    if (value === null) continue;
    const dark = token.name.endsWith(DARK_SUFFIX);
    const name = dark ? `dark-${withoutDarkSuffix(token.name)}` : token.name;
    lines.push(`  --rafters-${name}: ${value};`);
  }
  return lines;
}

/**
 * The dark-mode switch for mapped tokens with a dark sibling, the colour
 * pattern: the `--rafters-*` property (which utilities that inline their
 * theme value read) and each theme key that carries it.
 */
function tokenLayerDarkLines(tokens: TokenIndex): string[] {
  const darkOf = (name: string): boolean => {
    const own = tokens.get(name);
    return (
      own !== undefined && tokenValueToCSS(own) !== null && tokens.has(`${name}${DARK_SUFFIX}`)
    );
  };
  const lines: string[] = [];
  for (const token of tokens.values()) {
    if (
      MAPPED_GROUPS.has(token.namespace) &&
      !token.name.endsWith(DARK_SUFFIX) &&
      darkOf(token.name)
    ) {
      lines.push(`--rafters-${token.name}: var(--rafters-dark-${token.name});`);
    }
  }
  for (const { key, reads, literal } of mappedKeys(tokens)) {
    if (!literal && darkOf(reads)) lines.push(`${key}: var(--rafters-dark-${reads});`);
  }
  return lines;
}

/**
 * Generate @theme block with raw color scales and utility tokens
 * Note: Semantic color bridges are NOT included here - they go in @theme inline
 */
function generateThemeBlock(groups: GroupedTokens, tokens: TokenIndex): string {
  const lines: string[] = [];
  lines.push('@theme {');

  if (groups.color.length > 0) {
    for (const token of groups.color) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --color-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Spacing, radius, shadow, typography, depth, breakpoint and focus: the
  // theme mapping, one generic writer (#2825).
  const mapped = themeMappingLines(tokens);
  if (mapped.length > 0) {
    lines.push(...mapped);
    lines.push('');
  }

  // The five motion namespaces -- the system LEAVES. These carry the literals.
  const motionNamespaceLines = generateMotionNamespaceVars(groups.motion);
  if (motionNamespaceLines) {
    lines.push(motionNamespaceLines);
    lines.push('');
  }

  // Motion tokens other than the namespace leaves
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      if (motionNamespaceParts(token.name)) continue;
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // The Tailwind-facing duration/ease names, as REFERENCES to the leaves above.
  const bridgeLines = generateMotionBridgeVars(groups.motion);
  if (bridgeLines) {
    lines.push(bridgeLines);
    lines.push('');
  }

  // The matrix's assignments, as Tailwind animation keys. Tailwind generates the
  // .animate-* utility from each; we write no @utility block for them.
  const animationKeys = generateMotionAnimationKeys(groups.motion);
  if (animationKeys) {
    lines.push(animationKeys);
    lines.push('');
  }

  // Other tokens
  if (groups.other.length > 0) {
    for (const token of groups.other) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // NO LEGACY --animate-* KEYS. The `motion-animation-*` tokens carried literal
  // times (`spin 1s`, `pulse 2s`, `caret-blink 1.25s`) straight into a theme key,
  // which is a value written outside the leaf layer -- retuning a period moved
  // nothing, and the two copies could disagree. The matrix's own assignments are
  // emitted as --animate-* keys above, deduplicated and built entirely from
  // var()s onto the leaves.

  lines.push('}');
  return lines.join('\n');
}

/**
 * Article element type system - maps HTML elements to @apply utility compositions
 *
 * Each entry is [selector, utilityClasses]. The utilities reference design tokens
 * (font sizes, weights, spacing, colors, leading, tracking) that are already in @theme.
 * The exporter composes them here; the tokens are the atomic values.
 */
const ARTICLE_ELEMENT_STYLES: Array<[string, string]> = [
  // Paragraphs -- composition for metrics, structural for spacing
  ['p', 'text-body-medium ts-body-medium leading-relaxed mb-4'],
  ['p:last-child', 'mb-0'],

  // Headings -- compositions carry size/weight/tracking/leading/family
  ['h1', 'text-display-medium ts-display-medium mb-4 mt-0 text-accent-foreground'],
  ['h2', 'text-title-large ts-title-large mb-3 mt-8 text-accent-foreground'],
  ['h2:first-child', 'mt-0'],
  ['h3', 'text-title-medium ts-title-medium mb-2 mt-6 text-accent-foreground'],
  ['h4', 'text-title-small ts-title-small mb-2 mt-4 text-accent-foreground'],
  ['h5', 'text-title-small ts-title-small mb-2 mt-4 text-accent-foreground'],
  ['h6', 'text-title-small ts-title-small mb-2 mt-4 text-accent-foreground'],

  // Lists -- structural only (type metrics cascade from parent)
  ['ul', 'list-disc pl-6 mb-4'],
  ['ol', 'list-decimal pl-6 mb-4'],
  ['li', 'mb-1'],
  ['li > ul,\n  article li > ol', 'mt-1 mb-0'],

  // Links
  ['a', 'text-primary underline underline-offset-4'],
  ['a:hover', 'text-primary/80'],

  // Blockquotes
  ['blockquote', 'border-l-4 border-muted pl-4 italic my-4'],

  // Code -- composition for metrics + family, structural for bg/padding/radius
  ['code', 'text-code-small ts-code-small bg-muted px-1.5 py-0.5 rounded'],
  ['pre', 'text-code-large ts-code-large bg-muted p-4 rounded-lg overflow-x-auto my-4'],
  ['pre code', 'bg-transparent p-0 rounded-none text-[inherit]'],
  ['kbd', 'text-code-small ts-code-small bg-muted border border-border rounded px-1.5 py-0.5'],

  // Horizontal rules
  ['hr', 'border-border my-8'],

  // Media
  ['img', 'rounded-lg my-4 max-w-full h-auto'],
  ['video', 'rounded-lg my-4 max-w-full h-auto'],

  // Tables
  ['table', 'w-full my-4 border-collapse'],
  ['caption', 'text-label-small ts-label-small mt-2 text-muted-foreground text-left'],
  ['th', 'border border-border px-3 py-2 text-left font-semibold'],
  ['td', 'border border-border px-3 py-2'],

  // Figures
  ['figure', 'my-4'],
  ['figcaption', 'text-label-small ts-label-small mt-2 text-muted-foreground'],

  // Definition lists
  ['dl', 'my-4'],
  ['dt', 'font-semibold mt-2'],
  ['dd', 'pl-4 mb-2'],

  // Details/Summary
  ['details', 'my-4'],
  ['summary', 'cursor-pointer font-semibold'],

  // Inline formatting
  ['strong,\n  article b', 'font-semibold'],
  ['mark', 'bg-accent text-accent-foreground px-1 rounded'],
  ['small', 'text-label-small ts-label-small'],
  ['sub', 'text-xs align-sub'],
  ['sup', 'text-xs align-super'],
  ['abbr[title]', 'underline decoration-dotted underline-offset-4 cursor-help'],
  ['s,\n  article del', 'line-through'],
  ['ins', 'underline'],
];

/**
 * Generate @layer base block with article type system
 *
 * Composes design token utilities via @apply for all HTML content elements
 * inside <article>. Every class referenced here is backed by a design token
 * in @theme - font sizes, weights, leading, tracking, spacing, colors.
 */
function generateArticleBaseLayer(): string {
  const lines: string[] = [];
  lines.push('@layer base {');

  for (const [selector, utilities] of ARTICLE_ELEMENT_STYLES) {
    // Compound selectors already contain "article" for second+ parts
    if (selector.includes('\n')) {
      lines.push(`  article ${selector} {`);
    } else {
      lines.push(`  article ${selector} {`);
    }
    lines.push(`    @apply ${utilities};`);
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate @keyframes from motion-keyframe-* tokens
 */
function generateKeyframes(motionTokens: Token[]): string {
  const keyframeTokens = motionTokens.filter((t) => t.name.startsWith('motion-keyframe-'));

  if (keyframeTokens.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const token of keyframeTokens) {
    const keyframeName = token.keyframeName || token.name.replace('motion-keyframe-', '');
    lines.push(`@keyframes ${keyframeName} {`);
    lines.push(`  ${token.value}`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Named grid track lists for rows a component lays out as columns.
 *
 * `classy` drops arbitrary track lists (`grid-cols-[auto_auto_1fr_auto]`), so a
 * track list a component needs is a named utility. grid-cols-menu-row is the
 * menu-style row: indicator, icon, label, end (shortcut or chevron). Columns
 * lay out in reading order, so the row mirrors on a dir="rtl" page.
 *
 * grid-cols-affix-start/end/both are the field row: a flexible field with a
 * decorative icon beside it on one side or both. One list per combination, so
 * an absent icon leaves no empty track and no stray gap.
 */
function generateGridTrackUtilities(): string {
  return [
    '/* Grid track lists -- named, because classy skips arbitrary track lists */',
    '@utility grid-cols-menu-row {',
    '  grid-template-columns: auto auto 1fr auto; /* indicator, icon, label, end */',
    '}',
    '@utility grid-cols-affix-start {',
    '  grid-template-columns: auto 1fr; /* start icon, field */',
    '}',
    '@utility grid-cols-affix-end {',
    '  grid-template-columns: 1fr auto; /* field, end icon */',
    '}',
    '@utility grid-cols-affix-both {',
    '  grid-template-columns: auto 1fr auto; /* start icon, field, end icon */',
    '}',
  ].join('\n');
}

/**
 * Named Tailwind tracking values. The DTCG exporter resolves a composite's
 * named letter-spacing key with these; the CSS path reads the registry.
 */
export const NAMED_TRACKING: Record<string, string> = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

/**
 * Emit the single @utility ts-* wildcard. Carries font-family and
 * text-transform -- everything --text-* cannot.
 */
function generateTypographyCompositeUtility(compositeTokens: Token[]): string {
  if (compositeTokens.length === 0) return '';

  return [
    '@utility ts-* {',
    '  font-family: --value(--rafters-ts-*);',
    '  text-transform: --value(--rafters-ts-*-transform);',
    '  @container (min-width: 640px) {',
    '    font-size: --value(--rafters-ts-*-md);',
    '    line-height: --value(--rafters-ts-*-md-leading);',
    '  }',
    '  @container (min-width: 1024px) {',
    '    font-size: --value(--rafters-ts-*-lg);',
    '    line-height: --value(--rafters-ts-*-lg-leading);',
    '  }',
    '}',
  ].join('\n');
}

/**
 * Generate `motion-<name>` @utility classes from the semantic motion tokens
 * (motion-semantic-* tokens carrying property/duration-tier/curve JSON).
 *
 * Each token becomes one transition LONGHAND @utility: transition-property +
 * transition-duration (var(--duration-*)) + transition-timing-function
 * (var(--ease-*)). Longhand, not shorthand, so a nested
 * `@media (prefers-reduced-motion: reduce)` can re-set a single property
 * (drop transforms, become a cross-fade) without restating the whole rule.
 * The var() refs resolve against the duration and ease theme vars in @theme.
 *
 * @utility lands in @layer utilities, so `transition-none` / `motion-reduce:`
 * overrides still win normally, and a NEW namespace means no @theme-generated
 * built-in shadows it. The @media-inside-@utility mirrors the
 * @container-inside-@utility nesting in generateTypographyCompositeUtility.
 */
function generateMotionUtilities(motionTokens: Token[]): string {
  const semanticTokens = motionTokens.filter((t) => t.name.startsWith('motion-semantic-'));
  if (semanticTokens.length === 0) {
    return '';
  }

  interface MotionSpec {
    properties: string[];
    durationTier: string;
    curve: string;
    reducedMotion: { properties: string[]; ms?: number } | null;
  }

  const lines: string[] = ['/* Semantic motion utilities -- transition longhand per token */'];

  for (const token of semanticTokens) {
    if (typeof token.value !== 'string') continue;
    let spec: MotionSpec;
    try {
      spec = JSON.parse(token.value) as MotionSpec;
    } catch {
      continue;
    }

    const className = token.name.replace('motion-semantic-', 'motion-');
    lines.push(`@utility ${className} {`);
    lines.push(`  transition-property: ${spec.properties.join(', ')};`);
    // THE LEAF, NOT A BRIDGE NAME. The bridge writes Tailwind's own namespace
    // keys now (`--transition-duration-*`, `--ease-*`), which exist to make
    // Tailwind generate utilities -- they are not a naming layer for us to read
    // through. These read the leaf directly, which is also the only spelling the
    // reduced-motion law reaches.
    lines.push(`  transition-duration: var(--rafters-duration-${spec.durationTier});`);
    lines.push(`  transition-timing-function: var(--rafters-ease-${spec.curve});`);

    if (spec.reducedMotion) {
      lines.push('  @media (prefers-reduced-motion: reduce) {');
      lines.push(`    transition-property: ${spec.reducedMotion.properties.join(', ')};`);
      if (typeof spec.reducedMotion.ms === 'number') {
        lines.push(`    transition-duration: ${spec.reducedMotion.ms}ms;`);
      }
      lines.push('  }');
    }

    lines.push('}');
  }

  return lines.join('\n');
}

/** The duration form a cell spec carries -- the matrix's own tagged union. */
type CellDurationSpec = { kind: 'tier'; tier: string } | { kind: 'period'; period: string };

interface CellSpec {
  keyframe: string;
  duration: CellDurationSpec;
  /** Absent on a period-kind cell: every period row declares curve "none". */
  curve?: string;
}

/**
 * Read one cell token's value.
 *
 * `null` means A PINNED CELL -- the operator wrote an animation shorthand over
 * the JSON spec, and the exporter emits it verbatim. That is the ONLY reason
 * this returns null. A value that parses as a JSON object but is not a valid
 * spec THROWS: emitting `animation: {"keyframe":...}` would be a silently broken
 * rule, and skipping the token would delete the utility and stop the component
 * animating with no error at all.
 */
function parseCellSpec(tokenName: string, raw: string): CellSpec | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const candidate = parsed as { keyframe?: unknown; duration?: unknown; curve?: unknown };
  if (typeof candidate.keyframe !== 'string') {
    throw new Error(`tailwind exporter: motion cell token "${tokenName}" has no keyframe name.`);
  }
  const duration: unknown = candidate.duration;
  const kind: unknown =
    typeof duration === 'object' && duration !== null
      ? (duration as { kind?: unknown }).kind
      : undefined;

  if (kind === 'tier') {
    const tier: unknown = (duration as { tier?: unknown }).tier;
    if (typeof tier !== 'string') {
      throw new Error(
        `tailwind exporter: motion cell token "${tokenName}" names no duration tier.`,
      );
    }
    if (typeof candidate.curve !== 'string') {
      throw new Error(
        `tailwind exporter: motion cell token "${tokenName}" is tier-kind and names no curve.`,
      );
    }
    return {
      keyframe: candidate.keyframe,
      duration: { kind: 'tier', tier },
      curve: candidate.curve,
    };
  }

  if (kind === 'period') {
    const period: unknown = (duration as { period?: unknown }).period;
    if (typeof period !== 'string') {
      throw new Error(`tailwind exporter: motion cell token "${tokenName}" names no loop period.`);
    }
    return { keyframe: candidate.keyframe, duration: { kind: 'period', period } };
  }

  // Neither form. A silent fallback to a default duration would let an
  // unrepresented cell compile as if it had a value.
  throw new Error(
    `tailwind exporter: motion cell token "${tokenName}" has an unrecognized ` +
      `duration.kind ${JSON.stringify(kind ?? null)}. Known duration.kind values: period, tier.`,
  );
}

/**
 * Emit one `@utility animate-<cell>` block per animated matrix cell (#2017).
 *
 * The cell composite is emitted as LONGHAND -- animation-name, -duration,
 * -timing-function -- for the same reason `generateMotionUtilities` emits
 * transition longhand: a nested `@media (prefers-reduced-motion: reduce)` can
 * then re-set ONE property without restating the rule.
 *
 * REDUCED MOTION IS MECHANISM B: zero `animation-duration` in the emission. The
 * alternative, `motion-reduce:animate-none` on the consuming class, was measured
 * against this one (toy 14) and loses on two counts, having stopped differing on
 * a third that used to read as one -- the middle bullet is kept because a
 * maintainer who remembers the old argument needs to be told it lapsed, not to
 * find it quietly missing:
 *   - `animation: none` removes the animation, so the element never reaches the
 *     keyframe's END STATE. Zeroing the duration completes it instantly and
 *     keeps the end state;
 *   - the release path does NOT separate them, and saying so is the point. A
 *     zero-duration animation is never returned by `getAnimations()` either --
 *     it finishes inside the style flush that creates it -- so under reduced
 *     motion both mechanisms leave presence with an empty list and both release
 *     in the same tick (`test/presence/presence-race.e2e.ts` pins this against
 *     the real engines). This bullet used to argue the opposite, back when
 *     presence released on `animationend` and had a backstop timer to fall
 *     through to; #2157 deleted both. The choice rests on the other two;
 *   - the period exemption (loops slow, they never stop) is expressible here as
 *     SET MEMBERSHIP -- this function emits the block for the tier-kind cells
 *     and withholds it from the period-kind ones, and the period utilities do
 *     not carry it either -- while `animate-none` compiles to one cell-blind
 *     rule whose exemption exists only if the author remembers not to type it
 *     on a spinner.
 *
 * THE TWO MECHANISMS MUST NOT BOTH APPLY. Wherever `animate-none` wins it wins
 * DESTRUCTIVELY: `animation: none` resets the whole shorthand and discards the
 * zeroed duration with it. That is why the three consuming classes files dropped
 * `motion-reduce:animate-none` when they took up these utilities.
 *
 * No value appears in any UNPINNED block -- duration and curve are var()s onto
 * the leaves -- so the derived set is byte-identical across a retune, the toy-9
 * invariant.
 *
 * A PINNED CELL IS STILL A CELL. `registry.set` on one of these writes a plain
 * animation shorthand over the JSON spec, which is the sanctioned way an
 * operator hand-tunes a single moment (toy 13 measures it, and an explicit
 * `registry.bind()` is the one exit that clears the pin). The pin therefore
 * emits as the shorthand it is, and keeps whatever reduced-motion treatment its
 * cell already had -- read from the token's `reducedMotionAware`, not from the
 * overwritten value, as the emission site explains. Deciding from the value
 * would silently take a hand-tuned cell out of the reduced-motion law or drag a
 * hand-tuned loop into it, and skipping the token entirely would delete the
 * utility and stop the component animating with no error at all. All are the
 * 019fb063 silent-resolution failure arriving from inside our own emission.
 */
/**
 * Emit one `--animate-<shape>-<tier>-<curve>` theme key per DISTINCT motion the
 * matrix assigns, deduplicated.
 *
 * Tailwind generates the `.animate-*` utility from these -- there is no
 * `@utility` block here, because `--animate-*` is a Tailwind v4 theme namespace
 * and writing our own would be the second generator that made `.ease-standard`
 * merge into two declarations.
 *
 * DEDUPLICATED BY THE MOTION, NOT BY THE MOMENT. This replaces one utility per
 * `(component, part, transition)` -- 49 names, of which the matrix used only 17
 * distinct (keyframe, tier, curve) triples, so `scale-in` at `moderate` on
 * `enter` carried eight different names. Eight names for one motion is the
 * vocabulary drift the generics ruling exists to prevent: one fast, everywhere,
 * always. Two moments assigned the same shape, tier and curve ARE the same
 * motion; a component that should differ differs by TIER, which is already in
 * the name.
 *
 * The name is derived from the assignment and invents nothing -- the keyframe
 * the row names, the tier it consumes, the curve role it consumes. Reading the
 * class back gives you the row.
 *
 * A LOOP names its period instead of a tier and carries `infinite`. It gets no
 * reduced-motion treatment for the same reason `period` sits outside
 * REDUCED_MOTION_ZEROED: work loops slow, they never stop.
 *
 * No value appears in any key -- duration and curve are `var()`s onto the leaves
 * -- so the set is byte-identical across a retune (the toy-9 invariant), and the
 * reduced-motion law, which is written on those leaves, reaches every one of
 * these animations without a single line here.
 */
function generateMotionAnimationKeys(motionTokens: Token[]): string {
  const cellTokens = motionTokens.filter((t) => t.name.startsWith('motion-cell-'));
  if (cellTokens.length === 0) return '';

  const periodMembers = new Set<string>();
  for (const token of motionTokens) {
    const parts = motionNamespaceParts(token.name);
    if (parts?.namespace === 'period') periodMembers.add(parts.member);
  }

  // Insertion-ordered, so the emission is stable across runs.
  const keys = new Map<string, string>();
  for (const token of cellTokens) {
    if (typeof token.value !== 'string') continue;
    const spec = parseCellSpec(token.name, token.value);
    // A PINNED CELL is an operator's hand-tuned shorthand, and it stays keyed by
    // its own name: it is one specific moment by definition, not a shared motion.
    if (spec === null) {
      keys.set(token.name.replace('motion-cell-', ''), token.value);
      continue;
    }
    if (spec.duration.kind === 'period') {
      const { period } = spec.duration;
      if (!periodMembers.has(period)) {
        throw new Error(
          `tailwind exporter: motion cell token "${token.name}" references unknown period ` +
            `"${period}". Known periods: ${[...periodMembers].sort().join(', ')}.`,
        );
      }
      keys.set(
        `${spec.keyframe}-${period}`,
        `${spec.keyframe} var(--rafters-period-${period}) infinite`,
      );
      continue;
    }
    const { tier } = spec.duration;
    keys.set(
      `${spec.keyframe}-${tier}-${spec.curve}`,
      `${spec.keyframe} var(--rafters-duration-${tier}) var(--rafters-ease-${spec.curve})`,
    );
  }

  if (keys.size === 0) return '';
  return [
    '  /* Motion assignments -- one key per distinct (shape, tier, curve) */',
    ...[...keys].map(([name, value]) => `  --animate-${name}: ${value};`),
  ].join('\n');
}

/**
 * Emit the five motion namespaces as `--rafters-<namespace>-<member>` leaves.
 *
 * Indented for the @theme block. These are the only place a motion value is
 * written down, in either emission path -- the static Studio sheet included,
 * because a sheet whose `--duration-*` bridges point at properties it never
 * declares is the exact silent failure reflection 019fb063 records.
 */
function generateMotionNamespaceVars(motionTokens: Token[]): string {
  const lines: string[] = [];
  for (const token of motionTokens) {
    if (!motionNamespaceParts(token.name)) continue;
    const value = tokenValueToCSS(token);
    if (value === null) continue;
    lines.push(`  --${token.name}: ${value};`);
  }
  if (lines.length === 0) return '';
  return [
    '  /* The five motion namespaces -- system leaves, the values live here */',
    ...lines,
  ].join('\n');
}

/**
 * The reduced-motion law, written once, on the LEAVES.
 *
 * Every duration and every delay resolves to zero under
 * `prefers-reduced-motion: reduce`. `period` is deliberately absent -- loops
 * slow, they never stop, because a stopped spinner says the work stopped.
 * `ease` and `extent` are absent because zeroing the duration already removes
 * the motion they shape.
 *
 * ON THE LEAF, NOT ON THE UTILITY, and that is the whole point. A per-utility
 * `@media` block only covers the utilities we hand-write, so anything that
 * reaches a leaf another way -- Tailwind's own generated `duration-*`, its
 * `transition` shorthand, an `--animate-*` whose duration is a `var()` onto the
 * same leaf -- escaped the law silently while looking token-correct. Zero the
 * value itself and there is nothing left to escape through.
 *
 * Emitted OUTSIDE `@theme`, as a plain `:root` override. Verified against the
 * real compiler (2026-09-02): the block survives compilation intact.
 */
function generateReducedMotionLaw(motionTokens: Token[]): string {
  const lines: string[] = [];
  for (const token of motionTokens) {
    const parts = motionNamespaceParts(token.name);
    if (!parts || !REDUCED_MOTION_ZEROED.has(parts.namespace)) continue;
    lines.push(`    --${token.name}: 0ms;`);
  }
  if (lines.length === 0) return '';
  return [
    '/* Reduced motion is law: every duration and delay is zero, loops are not. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  :root {',
    ...lines,
    '  }',
    '}',
  ].join('\n');
}

/**
 * Emit the Tailwind-facing `--duration-*` / `--ease-*` names as REFERENCES to
 * the namespace leaves. Indented for the @theme block.
 *
 * Purely additive: every name that existed before still exists, and every
 * consumer of `var(--duration-moderate)` keeps working. What changed is that
 * these no longer hold a second copy of the value -- a literal here would mean
 * retuning one leaf moved two lines, and the two could then disagree. They die
 * in the component sweep, when their consumers do.
 *
 * KNOWN LIMITATION until that sweep: the bridge names carry NO reduced-motion
 * path -- the zeroing law lives in the generated utilities, which are the ONLY
 * compliant consumption path today. Never `var(--duration-*)` directly, or the
 * law is silently escaped. A typed runtime accessor for JS-consumed cells is
 * #1995 and does not exist yet. Pre-existing posture, disclosed here so nobody
 * reaches for the bridge expecting compliance.
 *
 * Both emission paths (`generateThemeBlock` and `generateThemeBlockWithVarRefs`)
 * call this, because after #1991 the bridge is the same line in both: the
 * dynamic sheet used to write a literal here and the static one a reference, and
 * that difference is exactly what the leaf layer removed.
 */
function generateMotionBridgeVars(motionTokens: Token[]): string {
  const lines: string[] = [];
  for (const token of motionTokens) {
    const parts = motionNamespaceParts(token.name);
    if (!parts) continue;
    const themePrefix = TAILWIND_THEME_PREFIX[parts.namespace];
    if (!themePrefix) continue;
    lines.push(`  --${themePrefix}-${parts.member}: var(--${token.name});`);
  }
  return lines.join('\n');
}

/**
 * Emit an `@utility <namespace>-<member>` block ONLY where Tailwind has no
 * namespace of its own -- `extent-*` and `period-*`.
 *
 * The other three are generated by Tailwind from the bridge keys, so writing
 * them here too produced a second rule with the same selector: for `ease-*`,
 * measurably, Tailwind's declaration merged in and landed LAST, which meant the
 * computed value came from the theme key and not from the block we thought was
 * authoritative. One generator per class.
 *
 * These two remain ours because Tailwind cannot express them. An extent
 * publishes a custom property (a consuming rule reads `--rafters-consumed-extent`
 * without knowing which member won), not a CSS property Tailwind knows how to
 * set. A period is a loop's time, which rides inside an `--animate-*` shorthand
 * rather than in any duration namespace.
 *
 * Every block references a var by NAME and contains no motion value, so the set
 * is byte-identical across any retune -- the toy-9 invariant, asserted in
 * `motion-css-golden.test.ts`. There is no reduced-motion literal here any more
 * either: the law is written once on the leaves, so a block that referenced a
 * zeroed leaf is already zero.
 */
function generateMotionNamespaceUtilities(motionTokens: Token[]): string {
  const lines: string[] = ['/* Motion namespaces Tailwind has no theme key for */'];
  let emitted = 0;

  for (const token of motionTokens) {
    const parts = motionNamespaceParts(token.name);
    if (!parts) continue;
    if (TAILWIND_THEME_PREFIX[parts.namespace]) continue;
    // Total by construction: parts.namespace is MotionNamespace and the map
    // satisfies Record<MotionNamespace, string> -- no silent-drop branch.
    const property = MOTION_NAMESPACE_PROPERTY[parts.namespace];

    emitted++;
    lines.push(`@utility ${parts.namespace}-${parts.member} {`);
    lines.push(`  ${property}: var(--${token.name});`);
    lines.push('}');
  }

  return emitted === 0 ? '' : lines.join('\n');
}

/**
 * Map a typography override property to a Tailwind utility class.
 */
function overridePropertyToUtility(property: string, value: string): string {
  switch (property) {
    case 'fontFamily':
      return `font-${value}`;
    case 'fontWeight':
      return `font-${value}`;
    case 'fontSize':
      return `text-${value}`;
    case 'lineHeight':
      return `leading-${value}`;
    case 'letterSpacing':
      return `tracking-${value}`;
    default:
      return '';
  }
}

/**
 * Generate element-level typography override CSS from registry overrides.
 * Each override produces a CSS rule with @apply using the base role utility
 * plus the overridden Tailwind utilities.
 */
function generateTypographyOverrideCSS(overrides: TypographyElementOverride[]): string {
  if (overrides.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('/* -- Typography Element Overrides -- */');

  for (const override of overrides) {
    const overrideUtilities: string[] = [];
    for (const [prop, val] of Object.entries(override.overrides)) {
      if (val) {
        const utility = overridePropertyToUtility(prop, val);
        if (utility) {
          overrideUtilities.push(utility);
        }
      }
    }

    if (overrideUtilities.length > 0) {
      lines.push(`/* ${override.element}: diverges from ${override.role} (${override.why}) */`);
      lines.push(`${override.element} {`);
      lines.push(`  @apply text-${override.role} ${overrideUtilities.join(' ')};`);
      lines.push('}');
    }
  }

  return lines.join('\n');
}

/**
 * Export tokens to Tailwind v4 CSS format
 *
 * @param tokens - Array of tokens to export
 * @param options - Export options
 * @returns Tailwind v4 compatible CSS string
 *
 * @example
 * ```typescript
 * import { generateBaseSystem } from '@rafters/design-tokens';
 * import { tokensToTailwind } from '@rafters/design-tokens/exporters';
 *
 * const result = generateBaseSystem();
 * const css = tokensToTailwind(result.allTokens);
 *
 * // Write to file
 * fs.writeFileSync('theme.css', css);
 * ```
 */
export function tokensToTailwind(
  tokens: Token[],
  options: TailwindExportOptions = {},
  typographyOverrides: TypographyElementOverride[] = [],
): string {
  const { includeImport = true } = options;

  if (tokens.length === 0) {
    throw new Error('Registry is empty');
  }

  const fontLines = fontImportLines(options.fontImports);
  const groups = groupTokens(tokens);
  const sections: string[] = [...fontLines];

  // Tailwind import
  if (includeImport) {
    sections.push('@import "tailwindcss";');
  }
  if (includeImport || fontLines.length > 0) {
    sections.push('');
  }

  // @theme block with raw color scales and utility tokens
  const tokensByName = indexTokens(tokens);
  const themeBlock = generateThemeBlock(groups, tokensByName);
  sections.push(themeBlock);
  sections.push('');

  const familySources = generateFamilyInlineSources(groups.color);
  if (familySources) {
    sections.push(familySources);
    sections.push('');
  }

  const fillUtilities = generateFillUtilities(tokensByName);
  if (fillUtilities) {
    sections.push(fillUtilities);
    sections.push('');
  }

  // @theme inline block for semantic color bridges (reference :root variables)
  const themeInlineBlock = generateThemeInlineBlock(tokensByName);
  sections.push(themeInlineBlock);
  sections.push('');

  // :root block with --rafters-* namespace and dark mode
  const rootBlock = generateRootBlock(tokensByName, options.darkMode ?? 'class');
  sections.push(rootBlock);
  sections.push('');

  // Keyframes for animations (from motion-keyframe-* tokens)
  const keyframes = generateKeyframes(groups.motion);
  if (keyframes) {
    sections.push(keyframes);
  }

  // The reduced-motion law, once, on the leaves -- so every consumer of a
  // duration or delay inherits it, including Tailwind's own generated utilities.
  const reducedMotionLaw = generateReducedMotionLaw(groups.motion);
  if (reducedMotionLaw) {
    sections.push('');
    sections.push(reducedMotionLaw);
  }

  // Typography composition ts-* utility (its keys come from the theme mapping)
  const typographyTsUtility = generateTypographyCompositeUtility(groups['typography-composite']);
  if (typographyTsUtility) {
    sections.push('');
    sections.push(typographyTsUtility);
  }

  // The five motion namespaces (duration-*, ease-*, delay-*, extent-*, period-*)
  const namespaceUtilities = generateMotionNamespaceUtilities(groups.motion);
  if (namespaceUtilities) {
    sections.push('');
    sections.push(namespaceUtilities);
  }

  // Semantic motion @utility classes (motion-*)
  const motionUtilities = generateMotionUtilities(groups.motion);
  if (motionUtilities) {
    sections.push('');
    sections.push(motionUtilities);
  }

  // NO PER-CELL @utility BLOCKS. The matrix's assignments are --animate-* theme
  // keys in the block above, deduplicated by (shape, tier, curve), and Tailwind
  // generates the utility for each. A hand-written block here would be the
  // second generator for the same class name.

  // Typography element overrides (if any)
  const overrideCSS = generateTypographyOverrideCSS(typographyOverrides);
  if (overrideCSS) {
    sections.push('');
    sections.push(overrideCSS);
  }

  // Named grid track lists (grid-cols-menu-row)
  sections.push('');
  sections.push(generateGridTrackUtilities());

  // Article type system - @layer base with @apply compositions
  sections.push('');
  sections.push(generateArticleBaseLayer());

  return sections.join('\n');
}

/**
 * Export registry tokens to Tailwind v4 CSS format
 *
 * This is the interface required by issue #392.
 *
 * @param registry - TokenRegistry containing tokens
 * @param options - Export options
 * @returns Tailwind v4 compatible CSS string
 *
 * @example
 * ```typescript
 * import { TokenRegistry } from '@rafters/design-tokens';
 * import { registryToTailwind } from '@rafters/design-tokens/exporters';
 *
 * const registry = new TokenRegistry(tokens);
 * const css = registryToTailwind(registry);
 *
 * await writeFile('.rafters/output/theme.css', css);
 * ```
 */
export function registryToTailwind(
  registry: TokenRegistry,
  options?: TailwindExportOptions,
): string {
  const tokens = [...registry.list()];
  return tokensToTailwind(tokens, options, []);
}

/**
 * Generate @theme block with var() references instead of actual values
 * Used for Studio static CSS - Tailwind processes once and references CSS variables
 */
function generateThemeBlockWithVarRefs(groups: GroupedTokens, tokens: TokenIndex): string {
  const lines: string[] = [];
  lines.push('@theme {');

  // Color scales with --color- prefix referencing vars
  if (groups.color.length > 0) {
    for (const token of groups.color) {
      lines.push(`  --color-${token.name}: var(--rafters-color-${token.name});`);
    }
    lines.push('');
  }

  // The theme mapping: byte-identical to the dynamic path (#2825).
  const mapped = themeMappingLines(tokens);
  if (mapped.length > 0) {
    lines.push(...mapped);
    lines.push('');
  }

  // The five motion namespaces -- leaves, so they carry the literal even here.
  // Everything else in this block is a var() reference; these are what the
  // references point AT, and a reference whose target is never declared resolves
  // to nothing without erroring (019fb063).
  const motionNamespaceLines = generateMotionNamespaceVars(groups.motion);
  if (motionNamespaceLines) {
    lines.push(motionNamespaceLines);
    lines.push('');
  }

  // Motion tokens other than the namespace leaves
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      // Semantic motion tokens are JSON specs consumed by generateMotionUtilities,
      // not raw custom properties -- no --var to reference.
      if (token.name.startsWith('motion-semantic-')) continue;
      // Motion cells are JSON specs consumed by generateMotionCellUtilities, for
      // the same reason: there is no --var to point a bridge at, and emitting
      // one would declare `--motion-cell-x: var(--rafters-motion-cell-x)` onto a
      // property nothing declares -- the silent dangling reference of 019fb063.
      if (token.name.startsWith('motion-cell-')) continue;
      if (motionNamespaceParts(token.name)) continue;
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Motion duration/easing tokens with Tailwind-native names, bridged onto the
  // namespace leaves -- byte-identical to the dynamic path, and shared with it.
  const bridgeLines = generateMotionBridgeVars(groups.motion);
  if (bridgeLines) {
    lines.push(bridgeLines);
    lines.push('');
  }

  // The matrix's assignments, as Tailwind animation keys. Tailwind generates the
  // .animate-* utility from each; we write no @utility block for them.
  const animationKeys = generateMotionAnimationKeys(groups.motion);
  if (animationKeys) {
    lines.push(animationKeys);
    lines.push('');
  }

  // Other tokens
  if (groups.other.length > 0) {
    for (const token of groups.other) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // NO LEGACY --animate-* KEYS. The `motion-animation-*` tokens carried literal
  // times (`spin 1s`, `pulse 2s`, `caret-blink 1.25s`) straight into a theme key,
  // which is a value written outside the leaf layer -- retuning a period moved
  // nothing, and the two copies could disagree. The matrix's own assignments are
  // emitted as --animate-* keys above, deduplicated and built entirely from
  // var()s onto the leaves.

  lines.push('}');
  return lines.join('\n');
}

/**
 * Export registry tokens to static Tailwind CSS for Studio
 *
 * This produces the @theme block with var() references - processed once by Tailwind.
 *
 * @param registry - TokenRegistry containing tokens
 * @returns Static Tailwind CSS with var() references
 *
 * @example
 * ```typescript
 * // In Studio setup
 * const staticCSS = registryToTailwindStatic(registry);
 * await writeFile('.rafters/output/rafters.tailwind.css', staticCSS);
 * ```
 */
export function registryToTailwindStatic(
  registry: TokenRegistry,
  options?: Pick<TailwindExportOptions, 'fontImports'>,
): string {
  // Fills reach no export until #2828 teaches the exporters about them.
  const tokens = [...registry.list()];

  if (tokens.length === 0) {
    throw new Error('Registry is empty');
  }

  const groups = groupTokens(tokens);
  const sections: string[] = fontImportLines(options?.fontImports);

  // Tailwind import
  sections.push('@import "tailwindcss";');
  sections.push('');

  // @theme block with var() references (static - processed once by Tailwind)
  const tokensByName = indexTokens(tokens);
  const themeBlock = generateThemeBlockWithVarRefs(groups, tokensByName);
  sections.push(themeBlock);
  sections.push('');

  // @theme inline block for semantic color bridges and role step bridges
  const themeInlineBlock = generateThemeInlineBlock(tokensByName);
  sections.push(themeInlineBlock);
  sections.push('');

  const fillUtilities = generateFillUtilities(tokensByName);
  if (fillUtilities) {
    sections.push(fillUtilities);
    sections.push('');
  }

  // Keyframes for animations (these don't change with token values)
  const keyframes = generateKeyframes(groups.motion);
  if (keyframes) {
    sections.push(keyframes);
  }

  // The reduced-motion law, once, on the leaves -- so every consumer of a
  // duration or delay inherits it, including Tailwind's own generated utilities.
  const reducedMotionLaw = generateReducedMotionLaw(groups.motion);
  if (reducedMotionLaw) {
    sections.push('');
    sections.push(reducedMotionLaw);
  }

  // No per-cell @utility blocks here either -- see the dynamic path. Both sheets
  // carry the --animate-* keys, and Tailwind generates the utilities from them,
  // so the parity gap this block used to work around no longer exists.

  // Typography composition ts-* utility (its keys come from the theme mapping)
  const staticTypoUtility = generateTypographyCompositeUtility(groups['typography-composite']);
  if (staticTypoUtility) {
    sections.push('');
    sections.push(staticTypoUtility);
  }

  // Named grid track lists (grid-cols-menu-row)
  sections.push('');
  sections.push(generateGridTrackUtilities());

  // Article type system - @layer base with @apply compositions
  sections.push('');
  sections.push(generateArticleBaseLayer());

  return sections.join('\n');
}

/**
 * Options for compiled CSS export
 */
export interface CompiledCssOptions {
  /** Minify the output (default: true) */
  minify?: boolean;
  /**
   * Absolute paths (files or directories) Tailwind should scan for utility
   * candidates, emitted as explicit `@source` directives. The compiled sheet
   * is a standalone artifact, so it always uses `@import "tailwindcss"
   * source(none)` to disable Tailwind's content auto-detection -- the output
   * is then a pure function of (registry values, contentSources), never of
   * the process CWD. When empty, only theme tokens and base layers are
   * emitted (no utility rules).
   */
  contentSources?: string[];
}

/**
 * Export registry tokens to fully compiled CSS
 *
 * Generates Tailwind theme CSS and runs it through the Tailwind CLI
 * to produce standalone CSS with all utilities resolved.
 * No Tailwind installation required by consumers.
 *
 * @param registry - TokenRegistry containing tokens
 * @param options - Compilation options
 * @returns Fully compiled CSS string
 *
 * @example
 * ```typescript
 * import { TokenRegistry, registryToCompiled } from '@rafters/design-tokens';
 *
 * const registry = new TokenRegistry(tokens);
 * const css = await registryToCompiled(registry);
 *
 * await writeFile('.rafters/output/rafters.standalone.css', css);
 * ```
 */
export async function registryToCompiled(
  registry: TokenRegistry,
  options: CompiledCssOptions = {},
): Promise<string> {
  const { minify = true, contentSources = [] } = options;

  // Theme body without its own @import -- the standalone sheet supplies the
  // import with source(none) below so utilities come only from contentSources.
  const themeBody = registryToTailwind(registry, { includeImport: false });

  // source(none) disables Tailwind's CWD content auto-detection; each
  // contentSource is scanned explicitly. Output is then independent of where
  // this runs -- a pure function of (registry values, contentSources).
  const sourceDirectives = contentSources.map((src) => `@source "${src}";`).join('\n');
  const input = `@import "tailwindcss" source(none);\n${sourceDirectives}\n${themeBody}`;

  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { createRequire } = await import('node:module');

  // Resolve the @tailwindcss/cli package location using createRequire
  const require = createRequire(import.meta.url);
  let pkgDir: string;
  try {
    const pkgJsonPath = require.resolve('@tailwindcss/cli/package.json');
    pkgDir = dirname(pkgJsonPath);
  } catch {
    throw new Error('Failed to resolve @tailwindcss/cli');
  }

  // The bin is at dist/index.mjs relative to package.json
  const binPath = join(pkgDir, 'dist', 'index.mjs');

  // The temp input lives inside the @tailwindcss/cli package so the CLI can
  // resolve `@import "tailwindcss"` (the engine) via normal node resolution.
  // With source(none) this location does NOT influence content scanning, so
  // it has no effect on output -- only the explicit @source paths do.
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-compile-'));
  const tempInput = join(tempDir, 'input.css');
  const tempOutput = join(tempDir, 'output.css');

  try {
    writeFileSync(tempInput, input);

    const args = [binPath, '-i', tempInput, '-o', tempOutput];
    if (minify) {
      args.push('--minify');
    }
    // Explicit cwd = the package dir (not the inherited process CWD), so a
    // stray Tailwind config or content root in the caller's tree cannot leak in.
    execFileSync('node', args, { stdio: 'pipe', timeout: 30_000, cwd: pkgDir });

    return readFileSync(tempOutput, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile CSS: ${message}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const COLOR_UTILITIES = [
  'bg',
  'text',
  'border',
  'ring',
  'outline',
  'fill',
  'stroke',
  'accent',
  'caret',
  'decoration',
  'divide',
  'shadow',
  'placeholder',
] as const;

const SPACING_UTILITIES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'gap',
  'gap-x',
  'gap-y',
  'w',
  'h',
  'size',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'space-x',
  'space-y',
] as const;

const RADIUS_UTILITIES = [
  'rounded',
  'rounded-t',
  'rounded-r',
  'rounded-b',
  'rounded-l',
  'rounded-tl',
  'rounded-tr',
  'rounded-br',
  'rounded-bl',
] as const;

const STATE_VARIANTS = ['hover', 'focus-visible', 'focus', 'active', 'dark'] as const;

const CONTAINER_LAYOUT_UTILITIES = [
  'grid-cols',
  'gap',
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'h',
  'w',
  'max-w',
  'flex-row',
  'flex-col',
  'flex-col-reverse',
  'flex-wrap',
  'items-center',
  'justify-end',
  'justify-center',
  'justify-between',
  'text-left',
  'text-center',
  'text-right',
  'space-x',
  'space-y',
  'mt',
  'rounded',
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
] as const;

/**
 * Derive the complete set of Tailwind utility candidates from theme custom
 * properties. Each --color-<slug> becomes bg-<slug>, text-<slug>, etc.; each
 * --spacing-<slug> becomes p-<slug>, m-<slug>, gap-<slug>, etc. The result is
 * the exhaustive base utility surface the token graph can produce -- no
 * component scanning required.
 */
function extractThemeBlocks(css: string): string[] {
  const blocks: string[] = [];
  const re = /@theme\s*(?:inline\s*)?\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    let depth = 1;
    const start = match.index + match[0].length;
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          blocks.push(css.slice(start, i));
          break;
        }
      }
    }
  }
  return blocks;
}

function deriveCandidates(themeCSS: string): string[] {
  const themeVarNames: string[] = [];
  for (const block of extractThemeBlocks(themeCSS)) {
    const varRe = /--([a-z][a-z0-9-]*)\s*:/g;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRe.exec(block)) !== null) {
      if (varMatch[1]) themeVarNames.push(varMatch[1]);
    }
  }

  const candidates = new Set<string>();

  for (const name of themeVarNames) {
    if (name.startsWith('color-')) {
      const slug = name.slice(6);
      for (const p of COLOR_UTILITIES) candidates.add(`${p}-${slug}`);
    } else if (name.startsWith('spacing-')) {
      const slug = name.slice(8);
      for (const p of SPACING_UTILITIES) candidates.add(`${p}-${slug}`);
    } else if (name.startsWith('radius-')) {
      const slug = name.slice(7);
      for (const p of RADIUS_UTILITIES) candidates.add(`${p}-${slug}`);
    } else if (name.startsWith('shadow-') && !/-(blur|spread|offset|color|inset)/.test(name)) {
      candidates.add(`shadow-${name.slice(7)}`);
    } else if (name === 'radius' || name === 'shadow') {
      candidates.add(name === 'radius' ? 'rounded' : 'shadow');
    } else if (name.startsWith('font-weight-')) {
      candidates.add(`font-${name.slice(12)}`);
    } else if (name.startsWith('font-')) {
      candidates.add(name);
    } else if (name.startsWith('z-index-')) {
      candidates.add(`z-${name.slice(8)}`);
    } else if (name.startsWith('ease-')) {
      candidates.add(name);
    } else if (name.startsWith('leading-') || name.startsWith('tracking-')) {
      candidates.add(name);
    } else if (name.startsWith('animate-')) {
      candidates.add(name);
    } else if (name.startsWith('text-') && !name.includes('--')) {
      candidates.add(`text-${name.slice(5)}`);
    } else if (name.startsWith('rafters-ts-') && !name.endsWith('-transform')) {
      candidates.add(`ts-${name.slice(11)}`);
    }
  }

  const base = [...candidates];
  for (const variant of STATE_VARIANTS) {
    for (const c of base) {
      candidates.add(`${variant}:${c}`);
    }
  }

  // Container query variants for layout utilities. Only layout-shaped
  // utilities get container prefixes -- crossing the full color/shadow
  // surface with 13 container sizes would produce ~18MB.
  const containerSizes = themeVarNames
    .filter((n) => n.startsWith('container-'))
    .map((n) => n.slice(10));
  const layoutCandidates = base.filter((c) =>
    CONTAINER_LAYOUT_UTILITIES.some((u) => c === u || c.startsWith(`${u}-`)),
  );
  for (const size of containerSizes) {
    for (const c of layoutCandidates) {
      candidates.add(`@${size}:${c}`);
    }
  }

  return [...candidates];
}

/**
 * Produce the complete documentation stylesheet -- every utility the token
 * graph can emit at base + state variants PLUS every utility the installed
 * components actually reference. The candidate file covers the token surface;
 * the content sources cover the component surface (flex, grid, w-full, etc.).
 * Veneer treeshakes the result at bake time; during dev it is adopted whole.
 */
export async function registryToDocumentation(
  registry: TokenRegistry,
  options: { minify?: boolean; contentSources?: string[] } = {},
): Promise<string> {
  const { minify = true, contentSources = [] } = options;
  const themeBody = registryToTailwind(registry, { includeImport: false });
  const candidates = deriveCandidates(themeBody);

  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { createRequire } = await import('node:module');

  const require = createRequire(import.meta.url);
  let pkgDir: string;
  try {
    const pkgJsonPath = require.resolve('@tailwindcss/cli/package.json');
    pkgDir = dirname(pkgJsonPath);
  } catch {
    throw new Error(
      'Failed to resolve @tailwindcss/cli -- install it to generate documentation CSS',
    );
  }

  const tempDir = mkdtempSync(join(pkgDir, '.tmp-doc-compile-'));
  const candidateFile = join(tempDir, 'candidates.txt');
  writeFileSync(candidateFile, candidates.join('\n'));

  const sourceDirectives = [
    `@source "${candidateFile}";`,
    ...contentSources.map((src) => `@source "${src}";`),
  ].join('\n');
  const input = `@import "tailwindcss" source(none);\n${sourceDirectives}\n${themeBody}`;

  const tempInput = join(tempDir, 'input.css');
  const tempOutput = join(tempDir, 'output.css');

  try {
    writeFileSync(tempInput, input);

    const { execFileSync } = await import('node:child_process');
    const binPath = join(pkgDir, 'dist', 'index.mjs');
    const args = [binPath, '-i', tempInput, '-o', tempOutput];
    if (minify) args.push('--minify');
    execFileSync('node', args, { stdio: 'pipe', timeout: 60_000, cwd: pkgDir });

    const { readFileSync } = await import('node:fs');
    const raw = readFileSync(tempOutput, 'utf-8');
    return postProcessDocSheet(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile documentation CSS: ${message}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Post-process the compiled documentation sheet for shadow-DOM adoption.
 *
 * The sheet is SELF-CONTAINED: adopt it, get a correct render, need nothing
 * else on the page. Every top-level construct Tailwind v4 emits is kept;
 * selectors are rewritten for shadow-DOM scope (:root -> :host, universal
 * selector gains :host). The Tailwind banner comment and the bare @layer
 * order declaration are the only things dropped.
 *
 * Uses css-tree for AST walking instead of regex extraction -- the compiled
 * output is a real stylesheet and should be processed as one.
 */
function postProcessDocSheet(css: string): string {
  const ast = csstree.parse(css);
  const parts: string[] = [];
  let hasHostContainer = false;

  const atruleNames = new Set(['layer', 'property', 'keyframes']);
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (!atruleNames.has(node.name)) return;

      if (node.name === 'layer') {
        const prelude = node.prelude ? csstree.generate(node.prelude) : '';
        if (prelude === 'theme' && node.block) {
          let content = csstree.generate(node.block);
          content = content.replace(/^\{/, '').replace(/\}$/, '');
          content = rewriteRootToHost(content);
          if (!hasHostContainer) {
            parts.push(`:host{container-type:inline-size}${content}`);
            hasHostContainer = true;
          } else {
            parts.push(content);
          }
        } else if (/^(base|components|utilities)/.test(prelude) && node.block) {
          parts.push(csstree.generate(node));
        } else if (prelude.startsWith('properties') && node.block) {
          let block = csstree.generate(node);
          block = rewritePropertiesSelector(block);
          parts.push(block);
        }
      } else {
        parts.push(csstree.generate(node));
      }
    },
  });

  // Top-level rules (not inside @layer): semantic color layer, dark mode,
  // data-theme selectors. These carry --primary, --foreground, etc.
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node, _item, list) {
      if (list !== (ast as import('css-tree').StyleSheet).children) return;

      let block = csstree.generate(node);
      block = rewriteRootToHost(block);
      parts.push(block);
    },
  });

  return parts.join('');
}

function rewriteRootToHost(css: string): string {
  return css
    .replace(/:root\s*,\s*:host/g, ':host')
    .replace(/:root\[data-theme/g, ':host[data-theme')
    .replace(/:root(?=[{\s,[])/g, ':host');
}

function rewritePropertiesSelector(css: string): string {
  return css.replace(
    /\*\s*,\s*:?:?before\s*,\s*:?:?after\s*,\s*:?:?backdrop/g,
    ':host,*,::before,::after',
  );
}
