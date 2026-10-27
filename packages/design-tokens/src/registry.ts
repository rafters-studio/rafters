import { isDeepStrictEqual } from 'node:util';
import { SCALE_POSITIONS, tryParseColor } from '@rafters/color-utils';
import {
  FILL_NAME_EXCLUDES,
  FillValueSchema,
  type OKLCH,
  OKLCHSchema,
  type StudioErrorCode,
  type Token,
  TokenSchema,
} from '@rafters/shared';
import type { z } from 'zod';
import {
  CircularDependencyError,
  type Node,
  type Plugin,
  type SetOptions,
  TokenGraph,
  type UserOverride,
} from './graph.js';
import { importColorFamily } from './importers/color.js';

type TokenValue = z.infer<typeof TokenSchema>['value'];
type UserOverrideField = NonNullable<z.infer<typeof TokenSchema>['userOverride']>;

export type RegistryFilter = {
  namespace?: string;
  category?: string;
};

export class TokenRegistry {
  private graph: TokenGraph;
  private plugins = new Map<string, Plugin>();
  private metadata = new Map<string, Token>();

  constructor(initialTokens: readonly unknown[] = [], plugins: readonly Plugin[] = []) {
    this.graph = new TokenGraph(plugins);
    for (const plugin of plugins) this.plugins.set(plugin.name, plugin);
    // Two passes: pass 1 seeds leaves and overridden tokens (order-independent);
    // pass 2 binds derived tokens in dependency order so each transform sees
    // its upstream values. Array order alone was not enough (#1634).
    const parsed: Token[] = [];
    for (const raw of initialTokens) {
      checkFillRecipe(raw);
      const result = TokenSchema.safeParse(raw);
      if (!result.success) {
        throw new TokenParseError(raw, result.error.issues);
      }
      this.metadata.set(result.data.name, result.data);
      parsed.push(result.data);
    }
    const colours = colourNames(parsed);
    for (const t of parsed) checkName(t, colours);
    // Pass 1: leaves (no binding) plus any token carrying a userOverride.
    // An overridden token is seeded with its on-disk value AND its binding
    // metadata -- the binding stays as a re-derivation hook for future
    // rebinds, but the override anchor blocks pass 2 from re-running the
    // transform now.
    for (const t of parsed) {
      const override = toNodeOverride(t.userOverride);
      if (t.binding && !override) continue;
      this.graph.seed(t.name, t.value, {
        ...(override ? { userOverride: override } : {}),
        ...(t.binding ? { binding: t.binding } : {}),
      });
    }
    // Pass 2: bound tokens without a userOverride re-derive against the
    // leaves seeded in pass 1, sorted by dependency edges so upstream
    // tokens are bound before their dependents.
    //
    // TokenGraph.topoSort cannot be reused here: it discovers edges via
    // this.nodes, but pass-2 tokens have not been added to the graph yet.
    // A local sort over the parsed data is required.
    const ordered = topoSortPass2(parsed, this.plugins);
    for (const entry of ordered) {
      this.graph.bind(entry.name, entry.binding.plugin, entry.binding.input);
    }
  }

  registerPlugin(plugin: Plugin): void {
    this.graph.registerPlugin(plugin);
    this.plugins.set(plugin.name, plugin);
  }

  define(token: unknown): void {
    checkFillRecipe(token);
    const result = TokenSchema.safeParse(token);
    if (!result.success) {
      throw new TokenParseError(token, result.error.issues);
    }
    const t = result.data;
    checkName(t, colourNames([...this.metadata.values(), t]));
    this.metadata.set(t.name, t);
    const override = toNodeOverride(t.userOverride);
    if (t.binding && !override) {
      this.graph.bind(t.name, t.binding.plugin, t.binding.input);
    } else {
      this.graph.seed(t.name, t.value, {
        ...(override ? { userOverride: override } : {}),
        ...(t.binding ? { binding: t.binding } : {}),
      });
    }
  }

  /**
   * The one change operation. With a value and a reason it sets a registered
   * token, regenerates a colour family from a new seed, or creates what the
   * first matching CREATORS entry makes; with no value it returns the token to
   * its previousValue (one step) and clears the override, removing what set
   * created. It returns the names it created, changed or removed, and none
   * when there was nothing to undo.
   */
  set(name: string): readonly string[];
  set(name: string, value: TokenValue | OKLCH, options: SetOptions): readonly string[];
  set(name: string, value?: TokenValue | OKLCH, options?: SetOptions): readonly string[] {
    if (value === undefined) {
      return this.revert(name);
    }
    if (!options?.reason) {
      throw new MissingReasonError(name);
    }
    const meta = this.metadata.get(name);
    if (meta) {
      // A new seed on a family regenerates it, keeping its utilities; any other
      // value edits the token.
      if (colourCreator.owns(meta) && colourCreator.match(name, value)) {
        const keep = {
          ...options,
          utilities: options.utilities || meta.generateUtilityClass === true,
        };
        const created = colourCreator.create(name, value, keep).map((t) => this.validate(t));
        this.drop(colourCreator.names(name));
        return this.add(created, options);
      }
      this.validate({ ...meta, value });
      this.graph.set(name, value, options);
      return [name];
    }
    const creator = CREATORS.find((c) => c.match(name, value));
    if (!creator) {
      throw new UnknownTokenError(name);
    }
    const created = creator.create(name, value, options).map((t) => this.validate(t));
    const taken = creator.occupies(name).find((n) => this.graph.has(n));
    if (taken) {
      throw new NameTakenError(name, taken);
    }
    return this.add(created, options);
  }

  /**
   * Removes a whole token of a kind a CREATORS entry makes, whoever made it:
   * a fill, or a colour family with its eleven steps. It returns the names
   * removed. A family step, or a token the system makes, is refused, and so
   * is a token any other token still reads.
   */
  delete(name: string, options: { reason: string }): readonly string[] {
    if (!options?.reason) {
      throw new MissingReasonError(name, 'delete');
    }
    const meta = this.metadata.get(name);
    if (!meta) {
      throw new UnknownTokenError(name);
    }
    const creator = CREATORS.find((c) => c.owns(meta));
    if (!creator) {
      const family = [...this.metadata.values()].find((t) =>
        CREATORS.some((c) => c.owns(t) && t.name !== name && c.names(t.name).includes(name)),
      );
      throw new UndeletableTokenError(
        name,
        family
          ? `it is a step of "${family.name}"; delete "${family.name}" instead`
          : 'the system makes it, so it cannot be deleted',
      );
    }
    const names = creator.names(name).filter((n) => this.graph.has(n));
    const own = new Set(names);
    const readers = this.list()
      .filter((t) => !own.has(t.name))
      .filter((t) => readsAny(t.value, name, own) || t.dependsOn?.some((d) => own.has(d)))
      .map((t) => t.name);
    if (readers.length > 0) {
      throw new TokenInUseError(name, readers);
    }
    this.drop(names);
    return names;
  }

  // The first token is the one created; it records the override, seeded first
  // so its previousValue is its own value: that is how set(name) knows set
  // created it.
  private add(tokens: readonly Token[], options: SetOptions): readonly string[] {
    const [head] = tokens;
    if (!head) return [];
    for (const t of tokens) {
      this.metadata.set(t.name, t);
      this.graph.seed(t.name, t.value);
    }
    this.graph.set(head.name, head.value, options);
    return tokens.map((t) => t.name);
  }

  private drop(names: readonly string[]): void {
    for (const n of names) {
      this.graph.remove(n);
      this.metadata.delete(n);
    }
  }

  private revert(name: string): readonly string[] {
    const node = this.graph.node(name);
    const meta = this.metadata.get(name);
    if (!node?.userOverride || !meta) return [];
    const creator = CREATORS.find((c) => c.owns(meta));
    if (creator && isDeepStrictEqual(node.userOverride.previousValue, node.value)) {
      const names = creator.names(name).filter((n) => this.graph.has(n));
      this.drop(names);
      return names;
    }
    this.graph.revert(name);
    return [name];
  }

  private validate(token: unknown): Token {
    checkFillRecipe(token);
    const result = TokenSchema.safeParse(token);
    if (!result.success) {
      throw new TokenParseError(token, result.error.issues);
    }
    checkName(result.data, colourNames([...this.metadata.values(), result.data]));
    return result.data;
  }

  bind(name: string, pluginName: string, input: unknown): void {
    if (!this.metadata.has(name)) {
      throw new UnknownTokenError(name);
    }
    this.graph.bind(name, pluginName, input);
  }

  get(name: string): Token | undefined {
    const node = this.graph.node(name);
    const meta = this.metadata.get(name);
    if (!node || !meta) return undefined;
    return this.toToken(node, meta);
  }

  undo(): void {
    this.graph.undo();
  }

  has(name: string): boolean {
    return this.graph.has(name);
  }

  size(): number {
    return this.graph.size();
  }

  list(filter?: RegistryFilter): readonly Token[] {
    const out: Token[] = [];
    for (const node of this.graph.list()) {
      const meta = this.metadata.get(node.name);
      if (!meta) continue;
      const token = this.toToken(node, meta);
      if (filter?.namespace && token.namespace !== filter.namespace) continue;
      if (filter?.category && token.category !== filter.category) continue;
      out.push(token);
    }
    return out;
  }

  private toToken(node: Node, meta: Token): Token {
    // Preserve metadata's dependsOn (it carries the dependsOn[1] dark counterpart
    // typed convention the exporter relies on); the runtime binding edges live
    // on node.binding and are derivable via plugin.dependsOn at cascade time.
    return {
      ...meta,
      name: node.name,
      value: node.value as TokenValue,
      userOverride: node.userOverride ? toUserOverrideField(node.userOverride, meta.value) : null,
    };
  }
}

// Each error carries its Studio error code and, as public properties, the
// facts that code's refusal reports (#2876).

export class UnknownTokenError extends Error {
  readonly code: StudioErrorCode = 'unknown-token';

  constructor(public readonly tokenName: string) {
    super(`Token not registered: ${tokenName}`);
    this.name = 'UnknownTokenError';
  }
}

export class TokenParseError extends Error {
  readonly code: StudioErrorCode = 'token-invalid';
  readonly tokenName: string;

  constructor(
    public readonly raw: unknown,
    public readonly issues: readonly z.core.$ZodIssue[],
  ) {
    const first = issues[0];
    const detail = first ? `${first.path.join('.')}: ${first.message}` : 'unknown';
    const name =
      raw && typeof raw === 'object' && typeof (raw as { name?: unknown }).name === 'string'
        ? (raw as { name: string }).name
        : '<unnamed>';
    super(`Token "${name}" failed TokenSchema validation: ${detail}`);
    this.name = 'TokenParseError';
    this.tokenName = name;
  }
}

/** A fill recipe holding a colour that is not a registry reference. */
export class LiteralColourError extends TokenParseError {
  override readonly code: StudioErrorCode = 'literal-color';

  constructor(
    raw: unknown,
    issues: readonly z.core.$ZodIssue[],
    public readonly path: string,
  ) {
    super(raw, issues);
    this.name = 'LiteralColourError';
  }
}

export class NameTakenError extends Error {
  readonly code: StudioErrorCode = 'name-taken';

  constructor(
    public readonly tokenName: string,
    public readonly takenBy: string,
  ) {
    super(`Token "${tokenName}" cannot be created: the token "${takenBy}" holds that name`);
    this.name = 'NameTakenError';
  }
}

export class MissingReasonError extends Error {
  readonly code: StudioErrorCode = 'reason-required';

  constructor(
    public readonly tokenName: string,
    public readonly action: 'set' | 'delete' = 'set',
  ) {
    super(
      `Token "${tokenName}" cannot be ${action === 'set' ? 'set' : 'deleted'} without a reason`,
    );
    this.name = 'MissingReasonError';
  }
}

export class UndeletableTokenError extends Error {
  readonly code: StudioErrorCode = 'token-undeletable';

  constructor(
    public readonly tokenName: string,
    public readonly reason: string,
  ) {
    super(`Token "${tokenName}" cannot be deleted: ${reason}`);
    this.name = 'UndeletableTokenError';
  }
}

export class TokenInUseError extends Error {
  readonly code: StudioErrorCode = 'token-in-use';

  constructor(
    public readonly tokenName: string,
    public readonly readers: readonly string[],
  ) {
    const list =
      readers.length > 1
        ? `${readers.slice(0, -1).join(', ')} and ${readers[readers.length - 1]} read it`
        : `${readers[0]} reads it`;
    super(`Token "${tokenName}" cannot be deleted: ${list}`);
    this.name = 'TokenInUseError';
  }
}

export class TokenNameError extends Error {
  readonly code: StudioErrorCode = 'name-rejected';

  constructor(
    public readonly tokenName: string,
    public readonly reason: string,
  ) {
    super(`Token "${tokenName}" is rejected: ${reason}`);
    this.name = 'TokenNameError';
  }
}

const FILL_NAMESPACE = 'fill';
// A designer fill is stored as `fill-<name>`; a generated one as `surface-<name>`.
const DESIGNER_FILL_PREFIX = 'fill-';
const FILL_NAME_PREFIXES = [DESIGNER_FILL_PREFIX, 'surface-'] as const;
const COLOUR_NAMESPACE = 'color';
// Reserved for the bg-fill-* and bg-surface-* utilities (FR-RAF-FILL-001).
const RESERVED_COLOUR_PREFIXES = ['fill-', 'surface-'] as const;
const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXCLUDED_FILL_NAMES: ReadonlySet<string> = new Set(FILL_NAME_EXCLUDES);

/**
 * What set makes for an unregistered name. `match` picks the creator, `names`
 * are the tokens `create` returns (the first records the override), and
 * `occupies` every name that must be free before creating. `owns` tells
 * set(name) and delete which creator's kind a registered token is.
 */
type Creator = {
  match(name: string, value: unknown): boolean;
  owns(token: Token): boolean;
  names(name: string): readonly string[];
  occupies(name: string): readonly string[];
  create(name: string, value: unknown, options: SetOptions): readonly unknown[];
};

// A designer fill's own name is the part after `fill-`.
const fillOwnName = (name: string): string => name.slice(DESIGNER_FILL_PREFIX.length);

const fillCreator: Creator = {
  match: (name) => name.startsWith(DESIGNER_FILL_PREFIX),
  owns: (token) => token.name.startsWith(DESIGNER_FILL_PREFIX),
  names: (name) => [name],
  occupies: (name) => [name, fillOwnName(name)],
  create: (name, value) => [
    {
      name,
      value,
      category: FILL_NAMESPACE,
      namespace: FILL_NAMESPACE,
      userOverride: null,
    },
  ],
};

/** A seed in any CSS colour format color-utils parses, or an `{l, c, h}` object. */
function parseColour(value: unknown): OKLCH | null {
  if (typeof value === 'string') return tryParseColor(value);
  const oklch = OKLCHSchema.safeParse(value);
  return oklch.success ? oklch.data : null;
}

const colourFamilyNames = (name: string): readonly string[] => [
  name,
  ...SCALE_POSITIONS.map((p) => `${name}-${p}`),
];

const colourCreator: Creator = {
  match: (name, value) =>
    KEBAB_CASE.test(name) &&
    !RESERVED_COLOUR_PREFIXES.some((p) => name.startsWith(p)) &&
    parseColour(value) !== null,
  owns: (token) =>
    token.namespace === COLOUR_NAMESPACE &&
    typeof token.value === 'object' &&
    'scale' in token.value,
  names: colourFamilyNames,
  occupies: (name) => [...colourFamilyNames(name), `${DESIGNER_FILL_PREFIX}${name}`],
  create: (name, value, options) => {
    const seed = parseColour(value);
    if (!seed) throw new UnknownTokenError(name);
    return importColorFamily(name, '500', seed).map((t) =>
      options.utilities && t.name === name ? { ...t, generateUtilityClass: true } : t,
    );
  },
};

// Checked in order; the first match creates.
const CREATORS: readonly Creator[] = [fillCreator, colourCreator];

/**
 * Whether a value holds `{ family }` naming the family, or `{ token }` naming
 * one of its tokens, anywhere inside it: a fill recipe's parts, states and
 * dark parts included.
 */
function readsAny(value: unknown, family: string, names: ReadonlySet<string>): boolean {
  if (!value || typeof value !== 'object') return false;
  const ref = value as { family?: unknown; token?: unknown };
  if (ref.family === family) return true;
  if (typeof ref.token === 'string' && names.has(ref.token)) return true;
  return Object.values(value).some((v) => readsAny(v, family, names));
}

function colourNames(tokens: Iterable<Token>): ReadonlySet<string> {
  const names = new Set<string>();
  for (const t of tokens) if (t.namespace === COLOUR_NAMESPACE) names.add(t.name);
  return names;
}

/**
 * A fill's recipe is checked before TokenSchema: TokenSchema's value is a
 * union, so a bad recipe fails every branch and the error names no field.
 */
function checkFillRecipe(raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const { namespace, value } = raw as { namespace?: unknown; value?: unknown };
  if (namespace !== FILL_NAMESPACE) return;
  const recipe = FillValueSchema.safeParse(value);
  if (!recipe.success) {
    const issues = recipe.error.issues.map((issue) => ({
      ...issue,
      path: ['value', ...issue.path],
    }));
    // A colour slot is the recipe's only union: a union failure on a present
    // value is a colour that is not a reference.
    const literal = recipe.error.issues.find(
      (issue) => issue.code === 'invalid_union' && valueAt(value, issue.path) !== undefined,
    );
    if (literal) {
      throw new LiteralColourError(raw, issues, ['value', ...literal.path].join('.'));
    }
    throw new TokenParseError(raw, issues);
  }
}

function valueAt(value: unknown, path: readonly PropertyKey[]): unknown {
  let at = value;
  for (const key of path) {
    if (!at || typeof at !== 'object') return undefined;
    at = (at as Record<PropertyKey, unknown>)[key];
  }
  return at;
}

/**
 * The naming rules of FR-RAF-FILL-001: a colour never takes a reserved
 * prefix; a fill takes a kebab-case name that no colour and no excluded
 * bg-* name already holds (its recipe is checked by checkFillRecipe).
 */
function checkName(t: Token, colours: ReadonlySet<string>): void {
  if (t.namespace === COLOUR_NAMESPACE) {
    const prefix = RESERVED_COLOUR_PREFIXES.find((p) => t.name.startsWith(p));
    if (prefix) throw new TokenNameError(t.name, `a colour name cannot begin with "${prefix}"`);
    return;
  }
  if (t.namespace !== FILL_NAMESPACE) return;
  if (!FILL_NAME_PREFIXES.some((p) => t.name.startsWith(p))) {
    throw new TokenNameError(
      t.name,
      `a fill name must begin with "${DESIGNER_FILL_PREFIX}"; rename it to "${DESIGNER_FILL_PREFIX}${t.name}"`,
    );
  }
  if (!KEBAB_CASE.test(t.name)) {
    throw new TokenNameError(t.name, 'a fill name must be lowercase kebab-case');
  }
  const own = t.name.startsWith(DESIGNER_FILL_PREFIX) ? fillOwnName(t.name) : t.name;
  if (colours.has(own)) {
    throw new TokenNameError(t.name, `a fill name cannot equal the colour "${own}"`);
  }
  if (EXCLUDED_FILL_NAMES.has(own)) {
    throw new TokenNameError(t.name, `a fill name cannot equal the excluded name "bg-${own}"`);
  }
}

// Token schema shape -> graph node shape. One copy site so a newly added
// override field cannot be dropped on the way in.
function toNodeOverride(field: Token['userOverride']): UserOverride | undefined {
  if (!field) return undefined;
  return {
    previousValue: field.previousValue,
    reason: field.reason,
    ...(field.context ? { context: field.context } : {}),
    ...(field.kind ? { kind: field.kind } : {}),
  };
}

// Graph node shape -> token schema shape. This is what persistence writes:
// saveRegistryToDir serialises registry.list(), which routes through here.
function toUserOverrideField(
  override: NonNullable<Node['userOverride']>,
  baseValue: TokenValue,
): UserOverrideField {
  const previousValue = (override.previousValue as TokenValue | undefined) ?? baseValue;
  const result: UserOverrideField = {
    previousValue,
    reason: override.reason,
  };
  if (override.context) result.context = override.context;
  if (override.kind) result.kind = override.kind;
  return result;
}

type Pass2Entry = { name: string; binding: NonNullable<Token['binding']> };

/**
 * Topologically sort the pass-2 tokens (bound, no userOverride) so each
 * token is bound after all pass-2 tokens it depends on. Dependencies on
 * pass-1 tokens (leaves, overrides) are already satisfied and ignored.
 *
 * Source order is the tiebreaker for independent tokens so list() output
 * stays deterministic.
 */
function topoSortPass2(
  parsed: readonly Token[],
  plugins: ReadonlyMap<string, Plugin>,
): readonly Pass2Entry[] {
  const entries: Pass2Entry[] = [];
  for (const t of parsed) {
    if (!t.binding || t.userOverride) continue;
    entries.push({ name: t.name, binding: t.binding });
  }

  const entryByName = new Map<string, Pass2Entry>();
  for (const e of entries) entryByName.set(e.name, e);

  const sorted: Pass2Entry[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (name: string, path: readonly string[]): void => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new CircularDependencyError([...path, name]);
    }
    visiting.add(name);
    const entry = entryByName.get(name);
    if (entry) {
      const plugin = plugins.get(entry.binding.plugin);
      // Skip edge discovery for unknown plugins; graph.bind() will throw
      // UnknownPluginError when it processes the entry.
      if (plugin) {
        for (const dep of plugin.dependsOn(entry.binding.input)) {
          if (entryByName.has(dep)) visit(dep, [...path, name]);
        }
      }
    }
    visiting.delete(name);
    visited.add(name);
    if (entry) sorted.push(entry);
  };

  for (const e of entries) visit(e.name, []);
  return sorted;
}
