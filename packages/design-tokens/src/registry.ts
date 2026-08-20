import { type Token, TokenSchema } from '@rafters/shared';
import type { z } from 'zod';
import {
  CircularDependencyError,
  type Node,
  type Plugin,
  type SetOptions,
  TokenGraph,
  type UserOverride,
} from './graph.js';

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
      const result = TokenSchema.safeParse(raw);
      if (!result.success) {
        throw new TokenParseError(raw, result.error.issues);
      }
      this.metadata.set(result.data.name, result.data);
      parsed.push(result.data);
    }
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
    const result = TokenSchema.safeParse(token);
    if (!result.success) {
      throw new TokenParseError(token, result.error.issues);
    }
    const t = result.data;
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

  set(name: string, value: TokenValue, options: SetOptions): void {
    if (!this.metadata.has(name)) {
      throw new UnknownTokenError(name);
    }
    this.graph.set(name, value, options);
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

export class UnknownTokenError extends Error {
  constructor(public readonly tokenName: string) {
    super(`Token not registered: ${tokenName}`);
    this.name = 'UnknownTokenError';
  }
}

export class TokenParseError extends Error {
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
