/**
 * Intel graph + recursive `describe` resolver (issue #2072, completed by #2090).
 *
 * Assembles the component/composite intel graph in-memory from registry items,
 * and answers a single recursive verb: `describe(addr, graph, target?)`. One
 * verb, a narrowing dot-address argument, no `?`/`*` operators -- the depth of
 * the argument IS the request. Every node response advertises its own drillable,
 * type-marked children; cross-kind `composesWith` edges resolve to the target's
 * layer-0 only, cycle-safe.
 *
 * The graph is UNIVERSAL and presence-free: no installed/target dimension is
 * baked on a node. A node carries the COMPLETE encoded judgment (all of
 * `intelligence`) and ALL of its per-target facets (#2073), none privileged --
 * both are the same universal fact for every workspace. What varies per
 * workspace is only which facet you look through: the reader hands `describe`
 * its one `target` (the workspace's lens, via the overlay #2074), and the prop
 * surface / snippet resolve through that target's facet. Presence stays the
 * overlay's job. Behavioral reference: `.claude/scratch/describe-toy.ts`.
 *
 * A grammar prop's `vocab` is a drillable ADDRESS, never inlined token values:
 * the values live in the separate token DAG, so the `.vocab` leaf is honest and
 * empty here (sourcing it at query time is a named follow-up, and must never
 * copy values onto the graph).
 */

import type { ComponentTarget, Facet, PropField, RegistryItem } from '../registry/types.js';

// A child a caller can drill into next. `type` says whether to drill and what returns.
export type ChildType = 'enum' | 'grammar' | 'leaf' | 'edge' | 'deprecated';

export interface DrillableChild {
  addr: string;
  type: ChildType;
  deprecatedFor?: string; // present only when type === 'deprecated'
}

// One prop's machine-actionable shape. Byte-identical to the registry's
// `PropField` (#2073 built it that way on purpose) -- re-exported so consumers
// of the resolver keep a graph-local name.
export type PropNode = PropField;

export interface GraphIntel {
  cognitiveLoad?: number;
  dos: string[];
  nevers: string[];
  semanticMeaning?: string;
  accessibility?: string;
  attentionEconomics?: string;
  trustBuilding?: string;
}

export interface GraphNode {
  id: string;
  kind: 'component' | 'composite';
  intel: GraphIntel;
  // Every built target's facet, none privileged. The reader's `target` picks one
  // at query time; the graph itself stays target-free. Empty for a node with no
  // extracted facets (a manifest gap for every target).
  facets: Partial<Record<ComponentTarget, Facet>>;
  composesWith: string[]; // edges; the only edge-bearing field the registry schema provides
}

export interface Graph {
  nodes: Map<string, GraphNode>;
}

export interface NodeResult {
  id: string;
  kind: 'component' | 'composite';
  intel: GraphIntel;
  children: DrillableChild[];
  // How to build it IN THE READER'S TARGET, when a facet resolves for that
  // target. Absent in degraded mode (no target) or on a manifest gap.
  snippet?: string;
  slots?: string[];
  events?: string[];
}

export type DescribeResult =
  | { kinds: DrillableChild[]; nodeCount: number } // describe('')
  | Array<{ id: string }> // describe('components' | 'composites')
  | NodeResult // describe('<id>')
  | PropNode // describe('<id>.props.<name>')
  | { type: 'leaf'; values: string[] } // describe('<id>.props.<name>.vocab')
  | NodeResult[] // describe('<id>.composesWith') -- each entry a target's layer-0, one level
  | { error: string };

/**
 * Build the graph once, in-memory, from registry items already validated by
 * `RegistryItemSchema`. `id`, `kind`, and `composesWith` come from the registry;
 * `intel` carries the COMPLETE `intelligence` (every field, never a subset --
 * dropping any is dropping the encoded judgment that is the point of rafters);
 * `facets` is the item's per-target facet record, taken verbatim (byte-compatible
 * with `PropField`, no transformation).
 *
 * Fails fast (throws at build time / MCP startup) if a `composesWith` edge names
 * an id that appears in no item -- a broken graph must never reach a query. A
 * self-edge (a node listing its own id) is valid: the id exists.
 */
export function assembleGraph(items: RegistryItem[]): Graph {
  const nodes = new Map<string, GraphNode>();

  for (const item of items) {
    const kind = kindOf(item.type);
    if (kind === null) continue; // rule/substrate are not describe-able nodes

    const src = item.intelligence;
    const intel: GraphIntel = {
      dos: src?.usagePatterns?.dos ?? [],
      nevers: src?.usagePatterns?.nevers ?? [],
    };
    if (src?.cognitiveLoad !== undefined) intel.cognitiveLoad = src.cognitiveLoad;
    if (src?.semanticMeaning !== undefined) intel.semanticMeaning = src.semanticMeaning;
    if (src?.accessibility !== undefined) intel.accessibility = src.accessibility;
    if (src?.attentionEconomics !== undefined) intel.attentionEconomics = src.attentionEconomics;
    if (src?.trustBuilding !== undefined) intel.trustBuilding = src.trustBuilding;

    nodes.set(item.name, {
      id: item.name,
      kind,
      intel,
      facets: item.facets ?? {},
      composesWith: item.composites,
    });
  }

  for (const node of nodes.values()) {
    for (const target of node.composesWith) {
      if (!nodes.has(target)) {
        throw new Error(`graph: node "${node.id}" composesWith unknown id "${target}"`);
      }
    }
  }

  return { nodes };
}

function kindOf(type: RegistryItem['type']): GraphNode['kind'] | null {
  if (type === 'composite') return 'composite';
  if (type === 'ui' || type === 'primitive') return 'component';
  return null;
}

/**
 * Resolve one dot-address against the graph, through the reader's `target` lens.
 * Never throws for a bad caller address -- always returns a structured
 * `{ error }`. Assembly-time / data errors surface earlier, in `assembleGraph`.
 *
 * `target` is the reader's one workspace target (the overlay supplies it).
 * `undefined` is degraded mode: intel and edges still resolve, but no facet is
 * chosen, so a node advertises no prop children and a prop drill errors -- the
 * graph never guesses a target.
 */
export function describe(addr: string, graph: Graph, target?: ComponentTarget): DescribeResult {
  const parts = addr === '' ? [] : addr.split('.');

  // describe('') -> the surface: the two kinds as drillable edges + a count.
  if (parts.length === 0) {
    return {
      kinds: [
        { addr: 'components', type: 'edge' },
        { addr: 'composites', type: 'edge' },
      ],
      nodeCount: graph.nodes.size,
    };
  }

  const [head, ...rest] = parts;
  if (head === undefined) return { error: `cannot resolve: ${addr}` };

  // describe('components' | 'composites') -> the kind roster (untagged here).
  if (head === 'components' || head === 'composites') {
    const kind: GraphNode['kind'] = head === 'components' ? 'component' : 'composite';
    const roster: Array<{ id: string }> = [];
    for (const node of graph.nodes.values()) {
      if (node.kind === kind) roster.push({ id: node.id });
    }
    return roster;
  }

  const node = graph.nodes.get(head);
  if (!node) return { error: `unknown node: ${head}` };

  // describe('<id>') -> layer 0.
  if (rest.length === 0) return layer0(node, target);

  // describe('<id>.composesWith') -> edges resolved to target layer-0, one level.
  if (rest.length === 1 && rest[0] === 'composesWith') {
    return resolveEdges(node, graph, target);
  }

  // describe('<id>.props.<name>[.vocab]') -- resolved through the target's facet.
  if (rest[0] === 'props') {
    const facet = target === undefined ? undefined : node.facets[target];
    const propName = rest[1];
    const prop = facet && propName !== undefined ? facet.props[propName] : undefined;
    if (!prop) return { error: `cannot resolve: ${addr}` };
    if (rest.length === 2) return prop;
    if (rest.length === 3 && rest[2] === 'vocab') {
      if (prop.type !== 'grammar') return { error: `cannot drill: ${addr}` };
      // Honest empty leaf: token values live in the separate token DAG, never on
      // the graph. The drillable address is already on the grammar prop above.
      return { type: 'leaf', values: [] };
    }
    return { error: `cannot resolve: ${addr}` };
  }

  return { error: `cannot resolve: ${addr}` };
}

/**
 * Layer 0: the complete intel + self-advertising, type-marked children, seen
 * through `target`'s facet. Prop children come from that facet only (never a
 * union across targets); `snippet`/`slots`/`events` ride along so the reader
 * gets the correct-in-target usage in the same response. Degraded mode (no
 * target or a manifest gap) advertises only the `composesWith` edge. Never
 * expands an edge.
 */
function layer0(node: GraphNode, target?: ComponentTarget): NodeResult {
  const facet = target === undefined ? undefined : node.facets[target];
  const children: DrillableChild[] = [];
  if (facet) {
    for (const [name, prop] of Object.entries(facet.props)) {
      const child: DrillableChild = { addr: `${node.id}.props.${name}`, type: prop.type };
      if (prop.type === 'deprecated') child.deprecatedFor = prop.deprecatedFor;
      children.push(child);
    }
  }
  if (node.composesWith.length > 0) {
    children.push({ addr: `${node.id}.composesWith`, type: 'edge' });
  }

  const result: NodeResult = { id: node.id, kind: node.kind, intel: node.intel, children };
  if (facet) {
    result.snippet = facet.snippet;
    if (facet.slots !== undefined) result.slots = facet.slots;
    if (facet.events !== undefined) result.events = facet.events;
  }
  return result;
}

/**
 * Resolve `composesWith` edges to each target's layer-0 -- ONE level only, seen
 * through the SAME reader `target`. A target's own `composesWith` never expands
 * inside this response; it appears only as the `<targetId>.composesWith` address
 * inside that target's children. A visited-id set collapses exact-duplicate
 * entries and makes a self-edge (or any cycle) terminate; every distinct
 * declared edge still resolves.
 */
function resolveEdges(node: GraphNode, graph: Graph, target?: ComponentTarget): NodeResult[] {
  const seen = new Set<string>();
  const results: NodeResult[] = [];
  for (const edgeId of node.composesWith) {
    if (seen.has(edgeId)) continue;
    seen.add(edgeId);
    const edgeNode = graph.nodes.get(edgeId);
    if (edgeNode) results.push(layer0(edgeNode, target));
  }
  return results;
}
