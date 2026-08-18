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
 * The overlay is a WRAPPER, not a replacement. `describe()` stays presence-free;
 * the workspace's ONE target is the reader's lens, which the overlay hands to
 * `describe` so the prop surface / snippet resolve through that target's facet
 * (#2090). A caller opts into the overlay by passing an `OverlayContext`. Two
 * calls with different contexts against the SAME `Graph` produce different
 * stamps with no shared mutable state -- one universal graph serves all
 * workspaces.
 *
 * Scope: only `describe(<id>)` (single node) and the two roster calls
 * (`describe(components)` / `describe(composites)`) are STAMPED here (presence,
 * echoed target, rendersForTarget). Every other shape -- the empty-address
 * surface, props, vocab, `composesWith` edges, and structured errors -- passes
 * through as `describe` returned it (already target-lensed).
 */

import type { ComponentTarget } from '../registry/types.js';
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
 * Resolve one dot-address through `describe`, handing it the workspace's target
 * as the reader's lens, and stamp the workspace overlay onto the two enriched
 * shapes -- the roster calls and a single-node query. Never throws for a bad
 * address: `describe`'s structured `{ error }` passes straight through.
 */
export function describeWithOverlay(
  addr: string,
  graph: Graph,
  ctx: OverlayContext,
): OverlayResult {
  const result = describe(addr, graph, ctx.target);

  // Roster: tag every entry with per-kind presence. `describe` never returns an
  // error arm for these two addresses (graph.ts always yields a roster array).
  if (addr === 'components' || addr === 'composites') {
    const set = addr === 'components' ? ctx.installed.components : ctx.installed.composites;
    const roster = result as Array<{ id: string }>;
    return roster.map((entry) => ({ id: entry.id, presence: presenceOf(set, entry.id) }));
  }

  // Single node: a bare id that resolved to a node gets the full stamp. A bad id
  // resolves to `{ error }`, which fails the guard and passes through unchanged.
  // rendersForTarget reads the node's own facets (now on the universal graph):
  // does a facet for the resolved target exist?
  if (addr !== '' && !addr.includes('.') && isNodeResult(result)) {
    const set = result.kind === 'component' ? ctx.installed.components : ctx.installed.composites;
    return {
      ...result,
      presence: presenceOf(set, result.id),
      target: ctx.target,
      rendersForTarget:
        ctx.target !== undefined && graph.nodes.get(result.id)?.facets[ctx.target] !== undefined,
    };
  }

  // Surface, props, vocab, edges, errors: pass through as describe lensed them.
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
