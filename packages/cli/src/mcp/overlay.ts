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
 * Scope: `describe(<id>)` (single node), `describe(<id>.*)` (expanded node --
 * issue #2101), and the two roster calls (`describe(components)` /
 * `describe(composites)`) are STAMPED here (presence, echoed target,
 * rendersForTarget). Every other shape -- the empty-address surface,
 * `describe(<id>.props.*)`, a single prop, `.vocab`, `composesWith` edges, the
 * probe miss (`null`), and structured errors -- passes through as `describe`
 * returned it (already target-lensed). `describe(<id>.props.*)` and `null` have
 * no node identity (no `id`) to hang a stamp on, so they stay unstamped by
 * construction, not by an address check.
 *
 * KNOWN GAP (pre-existing, #2074, out of #2101's scope): `describe(<id>.?)` --
 * probing a BARE node id -- peels the probe and re-resolves to the same
 * `NodeResult` shape `describe(<id>)` returns, but is address-gated OUT of the
 * single-node branch below (`!addr.includes('.')`) and so returns unstamped.
 * The expanded-node branch is deliberately structural (no such gate) so
 * `describe(<id>.*.?)` IS stamped; closing the bare-id asymmetry is a named
 * follow-up, not this issue's surface.
 */

import type { ComponentTarget } from '../registry/types.js';
import {
  type DescribeResult,
  describe,
  type ExpandedNodeResult,
  type Graph,
  type NodeResult,
} from './graph.js';

export type Presence = 'installed' | 'available';

/**
 * The workspace's installed set, split per kind. A `component`-kind node checks
 * `components`; a `composite`-kind node checks `composites`. Sourced from an
 * on-disk scan of the workspace's component/composite folders (`scanInstalled`
 * in tools.ts), never from `RaftersConfig.installed` -- that config field can
 * drift from disk (a manually deleted file, a dependency pulled in without a
 * recorded install) and presence must reflect what will actually resolve.
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

/**
 * An expanded node (`describe(<id>.*)`, #2101), enriched with the same
 * workspace stamp as `OverlayNodeResult`. Same three fields, different base
 * shape -- `ExpandedNodeResult` carries `props` inline and has no `children`.
 */
export type OverlayExpandedNodeResult = ExpandedNodeResult & {
  presence: Presence;
  target: ComponentTarget | undefined;
  rendersForTarget: boolean;
};

/** A roster entry (`describe(components|composites)`), enriched with presence. */
export type OverlayRosterEntry = { id: string; presence: Presence };

export type OverlayResult =
  | OverlayRosterEntry[] // describe(components) / describe(composites)
  | OverlayNodeResult // describe(<id>)
  | OverlayExpandedNodeResult // describe(<id>.*)
  | DescribeResult; // every other shape passes through unchanged

/**
 * Resolve one dot-address through `describe`, handing it the workspace's target
 * as the reader's lens, and stamp the workspace overlay onto the three enriched
 * shapes -- the roster calls, a single-node query, and an expanded node
 * (`<id>.*`). Never throws for a bad address: `describe`'s structured `{ error
 * }` passes straight through.
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
  if (addr !== '' && !addr.includes('.') && isNodeResult(result)) {
    return { ...result, ...stampOf(result.id, result.kind, graph, ctx) };
  }

  // Expanded node (`<id>.*`, #2101): same stamp, structural detection so
  // `<id>.*.?` (probe re-resolving to the same expanded shape) is caught too --
  // gating on the address suffix would miss that case. `describe(<id>.props.*)`
  // has no `id` key and fails this guard on purpose: it has no node identity to
  // stamp (see the file header).
  if (isExpandedNodeResult(result)) {
    return { ...result, ...stampOf(result.id, result.kind, graph, ctx) };
  }

  // Surface, props, vocab, edges, probe miss (null), errors: pass through as
  // describe lensed them.
  return result;
}

function presenceOf(set: ReadonlySet<string>, id: string): Presence {
  return set.has(id) ? 'installed' : 'available';
}

/** The three-field workspace stamp shared by `OverlayNodeResult` and `OverlayExpandedNodeResult`. */
function stampOf(
  id: string,
  kind: NodeResult['kind'],
  graph: Graph,
  ctx: OverlayContext,
): { presence: Presence; target: ComponentTarget | undefined; rendersForTarget: boolean } {
  const set = kind === 'component' ? ctx.installed.components : ctx.installed.composites;
  return {
    presence: presenceOf(set, id),
    target: ctx.target,
    // rendersForTarget reads the node's own facets (on the universal graph):
    // does a facet for the resolved target exist?
    rendersForTarget:
      ctx.target !== undefined && graph.nodes.get(id)?.facets[ctx.target] !== undefined,
  };
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

/**
 * Narrow a `DescribeResult` to an expanded node (`describe(<id>.*)`).
 * Requiring both `id` and `props` excludes `ExpandedPropsResult`
 * (`{ expanded: true, props }`, no `id`); excluding `children` excludes
 * `NodeResult`; `!Array.isArray` excludes the roster and `composesWith`
 * arrays. `expandNode` always sets `props` (possibly `{}`), so a node with no
 * facet for the target still matches.
 */
function isExpandedNodeResult(result: DescribeResult): result is ExpandedNodeResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    !Array.isArray(result) &&
    'id' in result &&
    'kind' in result &&
    'props' in result &&
    !('children' in result)
  );
}
