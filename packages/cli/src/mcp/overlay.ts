/**
 * Workspace overlay for `describe()` (issue #2074).
 *
 * A thin, per-workspace lens applied at QUERY time. It stamps three things onto
 * a describe() response without ever mutating the universal graph (#2072):
 *   - presence: `installed` | `available`, from the workspace's installed set;
 *   - a per-target manifest: `rendersForTarget` -- does a facet for the resolved
 *     target exist for this node;
 *   - the resolved target, echoed as-is so a misresolve is catchable.
 *
 * The overlay is a WRAPPER, not a replacement. `describe()` stays presence-free
 * and target-free; a caller opts into the overlay by also passing a
 * `FacetTargetIndex` and an `OverlayContext`. Two calls with different contexts
 * against the SAME `Graph` and `FacetTargetIndex` produce different stamps with
 * no shared mutable state -- one graph serves all workspaces.
 *
 * Scope (per the brief): only `describe(<id>)` (single node) and the two roster
 * calls (`describe(components)` / `describe(composites)`) are enriched. Every
 * other shape -- the empty-address surface, props, vocab, `composesWith` edges,
 * and structured errors -- passes through unchanged.
 */

import { type ComponentTarget, ComponentTargetSchema } from '../registry/types.js';
import { type DescribeResult, describe, type Graph, type NodeResult } from './graph.js';

export type Presence = 'installed' | 'available';

/**
 * The workspace's installed set, split per kind. A `component`-kind node checks
 * `components`; a `composite`-kind node checks `composites`. Sourced from
 * `RaftersConfig.installed` (see `buildInstalledSet`).
 */
export interface InstalledSet {
  components: ReadonlySet<string>;
  composites: ReadonlySet<string>;
}

/**
 * The per-workspace context the overlay is stamped from. `target` is
 * `undefined` in degraded mode (no `componentTarget` configured) -- it is
 * echoed as-is, never guessed, and `rendersForTarget` is then always false.
 */
export interface OverlayContext {
  target: ComponentTarget | undefined;
  installed: InstalledSet;
}

/**
 * Per-node facet-target availability, independent of `Graph`/`GraphNode`.
 * `GraphNode` (#2072) is deliberately flat and carries no per-target data, so
 * the overlay builds its own side-index directly from each item's `facets`
 * keys (#2073) at construction time rather than changing graph.ts's node shape.
 */
export type FacetTargetIndex = ReadonlyMap<string, ReadonlySet<ComponentTarget>>;

/** A single node's describe result, enriched with the workspace stamp. */
export type OverlayNodeResult = NodeResult & {
  presence: Presence;
  target: ComponentTarget | undefined;
  rendersForTarget: boolean;
};

/** A roster entry (`describe(components|composites)`), enriched with presence. */
export type OverlayRosterEntry = { id: string; presence: Presence };

export type OverlayResult =
  | OverlayRosterEntry[] // describe(components) / describe(composites)
  | OverlayNodeResult // describe(<id>)
  | DescribeResult; // every other shape passes through unchanged

/**
 * Build the per-kind installed set from a config's `installed` block. Absent or
 * partial `installed` is treated as "nothing installed" -- never a crash, never
 * "everything installed". Only the two kinds the overlay stamps are read;
 * `primitives`/`rules`/`substrate` are intentionally not folded in here (a
 * `primitive`-kind item maps to graph kind `component`, but its presence wiring
 * is Issue D's concern, not this query-time lens).
 */
export function buildInstalledSet(config: {
  installed?: { components?: string[]; composites?: string[] };
}): InstalledSet {
  return {
    components: new Set(config.installed?.components ?? []),
    composites: new Set(config.installed?.composites ?? []),
  };
}

/**
 * Build the node -> facet-target side-index from the SAME `RegistryItem[]`
 * array `assembleGraph` (#2072) consumes, once, at construction time. An item's
 * per-target manifest IS the set of keys on its `facets` record (#2073). An
 * absent `facets`, or a key that is not a recognized target, contributes no
 * target -- never a crash.
 */
export function buildFacetTargetIndex(
  items: Array<{ name: string; facets?: Partial<Record<ComponentTarget, unknown>> }>,
): FacetTargetIndex {
  const index = new Map<string, ReadonlySet<ComponentTarget>>();
  for (const item of items) {
    const targets = new Set<ComponentTarget>();
    if (item.facets) {
      for (const key of Object.keys(item.facets)) {
        const parsed = ComponentTargetSchema.safeParse(key);
        if (parsed.success) targets.add(parsed.data);
      }
    }
    index.set(item.name, targets);
  }
  return index;
}

/**
 * Resolve one dot-address through `describe` (#2072, unmodified) and stamp the
 * workspace overlay onto the two enriched shapes -- the roster calls and a
 * single-node query. Never throws for a bad address: `describe`'s structured
 * `{ error }` passes straight through.
 */
export function describeWithOverlay(
  addr: string,
  graph: Graph,
  facetIndex: FacetTargetIndex,
  ctx: OverlayContext,
): OverlayResult {
  const result = describe(addr, graph);

  // Roster: tag every entry with per-kind presence. `describe` never returns an
  // error arm for these two addresses (graph.ts always yields a roster array).
  if (addr === 'components' || addr === 'composites') {
    const set = addr === 'components' ? ctx.installed.components : ctx.installed.composites;
    const roster = result as Array<{ id: string }>;
    return roster.map((entry) => ({ id: entry.id, presence: presenceOf(set, entry.id) }));
  }

  // Single node: a bare id that resolved to a node gets the full stamp. A bad id
  // resolves to `{ error }`, which fails the guard and passes through unchanged.
  if (addr !== '' && !addr.includes('.') && isNodeResult(result)) {
    const set = result.kind === 'component' ? ctx.installed.components : ctx.installed.composites;
    return {
      ...result,
      presence: presenceOf(set, result.id),
      target: ctx.target,
      rendersForTarget:
        ctx.target !== undefined && facetIndex.get(result.id)?.has(ctx.target) === true,
    };
  }

  // Surface, props, vocab, edges, errors: unchanged.
  return result;
}

function presenceOf(set: ReadonlySet<string>, id: string): Presence {
  return set.has(id) ? 'installed' : 'available';
}

/** Narrow a `DescribeResult` to a single-node `NodeResult`. */
function isNodeResult(result: DescribeResult): result is NodeResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    !Array.isArray(result) &&
    'id' in result &&
    'kind' in result &&
    'children' in result
  );
}
