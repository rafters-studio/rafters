/**
 * Intel graph + recursive `describe` resolver (issue #2072, completed by #2090).
 *
 * Assembles the component/composite intel graph in-memory from registry items,
 * and answers a single recursive verb: `describe(addr, graph, target?)`. One
 * verb, a narrowing dot-address argument, with `*` and `?` expansion operators.
 * `*` resolves all children inline (props with full values); `?` resolves one
 * level (types only). Every node response advertises its own drillable,
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
export type ChildType = 'enum' | 'grammar' | 'leaf' | 'edge' | 'deprecated' | 'part';

export interface DrillableChild {
  addr: string;
  type: ChildType;
  deprecatedFor?: string; // present only when type === 'deprecated'
}

// One prop's machine-actionable shape. Byte-identical to the registry's
// `PropField` (#2073 built it that way on purpose) -- re-exported so consumers
// of the resolver keep a graph-local name.
export type PropNode = PropField;

// The AGENT-FACING view of a grammar prop: identical to the registry grammar
// arm EXCEPT `vocab` (the token address) is stripped. The token layer -- the
// color words a grammar prop like `fill` accepts, learned per-project from what
// is installed -- is NEVER surfaced to an agent, or it lands in className and
// routes around every decision rafters encodes. The agent gets the composition
// RULES (`grammar`) so it can form a value (`fill` can be complex on a
// container); rafters validates that value against the internal vocab with
// `onInvalid: 'silent-noop'` behind the curtain.
export type AgentGrammarProp = Omit<Extract<PropField, { type: 'grammar' }>, 'vocab'>;
export type AgentPropField = Extract<PropField, { type: 'enum' | 'deprecated' }> | AgentGrammarProp;

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
  parts: string[]; // child node ids, populated by assembleGraph
  parent?: string; // parent node id, from annotation or inference
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
  parent?: string;
  siblings?: string[];
}

export interface ExpandedNodeResult {
  id: string;
  kind: 'component' | 'composite';
  intel: GraphIntel;
  props: Record<string, AgentPropField>;
  composesWith?: string[];
  parts?: string[];
  snippet?: string;
  slots?: string[];
  events?: string[];
}

export interface ExpandedPropsResult {
  expanded: true;
  props: Record<string, AgentPropField>;
}

export type DescribeResult =
  | { kinds: DrillableChild[]; nodeCount: number } // describe('')
  | Array<{ id: string }> // describe('components' | 'composites')
  | NodeResult // describe('<id>')
  | AgentPropField // describe('<id>.props.<name>') -- a grammar prop with its vocab stripped
  | NodeResult[] // describe('<id>.composesWith') -- each entry a target's layer-0, one level
  | ExpandedNodeResult // describe('<id>.*') -- node with all props resolved inline
  | ExpandedPropsResult // describe('<id>.props.*') -- all props tagged
  | null // describe('<addr>.?') -- probe miss
  | { error: string };

// Address operators. '*' expands all children inline with full values.
// '?' is a safe probe: resolves the address before it, returning null
// instead of an error when the target doesn't exist -- optional chaining
// on the address space.
const EXPAND_OP = '*';
const PROBE_OP = '?';

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

    const gn: GraphNode = {
      id: item.name,
      kind,
      intel,
      facets: item.facets ?? {},
      composesWith: item.composites,
      parts: [],
    };
    if (item.parent !== undefined) gn.parent = item.parent;
    nodes.set(item.name, gn);
  }

  // Convention inference: nodes with no explicit parent get one by prefix match.
  // Split the node id on '-' and try progressively shorter prefixes (longest
  // first). First prefix that matches an existing node id wins.
  for (const node of nodes.values()) {
    if (node.parent !== undefined) continue;
    const segments = node.id.split('-');
    for (let i = segments.length - 1; i >= 1; i--) {
      const candidate = segments.slice(0, i).join('-');
      if (nodes.has(candidate)) {
        node.parent = candidate;
        break;
      }
    }
  }

  // Validate parent references before populating parts arrays.
  for (const node of nodes.values()) {
    if (node.parent === undefined) continue;
    if (node.parent === node.id) {
      throw new Error(`graph: node "${node.id}" parent references itself`);
    }
    if (!nodes.has(node.parent)) {
      throw new Error(`graph: node "${node.id}" parent names unknown id "${node.parent}"`);
    }
  }

  // Detect circular parent chains.
  for (const node of nodes.values()) {
    if (node.parent === undefined) continue;
    const visited = new Set<string>();
    visited.add(node.id);
    let current: string | undefined = node.parent;
    while (current !== undefined) {
      if (visited.has(current)) {
        throw new Error(
          `graph: node "${node.id}" has a circular parent chain through "${current}"`,
        );
      }
      visited.add(current);
      current = nodes.get(current)?.parent;
    }
  }

  // Populate parts arrays from resolved parents.
  for (const node of nodes.values()) {
    if (node.parent === undefined) continue;
    const parentNode = nodes.get(node.parent);
    if (parentNode) parentNode.parts.push(node.id);
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
  // Operators on catalog addresses are not supported -- the catalog is an index.
  if (head === 'components' || head === 'composites') {
    if (rest.length > 0) return { error: `cannot expand: ${addr}` };
    const kind: GraphNode['kind'] = head === 'components' ? 'component' : 'composite';
    const roster: Array<{ id: string }> = [];
    for (const node of graph.nodes.values()) {
      if (node.kind === kind) roster.push({ id: node.id });
    }
    return roster;
  }

  // Probe operator: trailing '?' makes the lookup safe -- null on miss
  // instead of a structured error. Peel it off and re-resolve the base address.
  if (parts[parts.length - 1] === PROBE_OP) {
    const baseAddr = parts.slice(0, -1).join('.');
    const result = describe(baseAddr, graph, target);
    if (typeof result === 'object' && result !== null && 'error' in result) return null;
    return result;
  }

  if (head === EXPAND_OP || head === PROBE_OP) {
    return { error: `cannot expand at root: use 'components' or 'composites'` };
  }

  const node = graph.nodes.get(head);
  if (!node) return { error: `unknown node: ${head}` };

  // describe('<id>') -> layer 0.
  if (rest.length === 0) return layer0(node, graph, target);

  // Expand operator: trailing '*' resolves all children inline with values.
  if (rest[rest.length - 1] === EXPAND_OP) {
    const prefix = rest.slice(0, -1);
    if (prefix.length === 0) return expandNode(node, target);
    if (prefix.length === 1 && prefix[0] === 'props') return expandProps(node, target);
    return { error: `cannot expand: ${addr}` };
  }

  // describe('<id>.composesWith') -> edges resolved to target layer-0, one level.
  if (rest.length === 1 && rest[0] === 'composesWith') {
    return resolveEdges(node, graph, target);
  }

  // describe('<id>.props.<name>') -- resolved through the target's facet. A
  // grammar prop is returned with its `vocab` (the token address) stripped: the
  // agent gets the composition rules, never the token vocabulary. There is no
  // deeper drill -- `.vocab` and anything below resolve to a structured error,
  // so the token layer is unreachable from the agent surface.
  if (rest[0] === 'props') {
    const facet = target === undefined ? undefined : node.facets[target];
    const propName = rest[1];
    const prop = facet && propName !== undefined ? facet.props[propName] : undefined;
    if (!prop) return { error: `cannot resolve: ${addr}` };
    if (rest.length === 2) return toAgentProp(prop);
    return { error: `cannot resolve: ${addr}` };
  }

  return { error: `cannot resolve: ${addr}` };
}

/**
 * Project a stored `PropField` to its agent-facing view. A grammar prop's
 * `vocab` (the token address) is dropped so the token layer never leaves the
 * curtain; enum and deprecated props pass through unchanged.
 */
function toAgentProp(prop: PropField): AgentPropField {
  if (prop.type === 'grammar') {
    const { vocab: _vocab, ...agentView } = prop;
    return agentView;
  }
  return prop;
}

/**
 * Layer 0: the complete intel + self-advertising, type-marked children, seen
 * through `target`'s facet. Prop children come from that facet only (never a
 * union across targets); `snippet`/`slots`/`events` ride along so the reader
 * gets the correct-in-target usage in the same response. Degraded mode (no
 * target or a manifest gap) advertises only the `composesWith` edge. Never
 * expands an edge.
 */
function layer0(node: GraphNode, graph: Graph, target?: ComponentTarget): NodeResult {
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
  for (const partId of node.parts) {
    children.push({ addr: partId, type: 'part' });
  }

  const result: NodeResult = { id: node.id, kind: node.kind, intel: node.intel, children };
  if (facet) {
    result.snippet = facet.snippet;
    if (facet.slots !== undefined) result.slots = facet.slots;
    if (facet.events !== undefined) result.events = facet.events;
  }
  if (node.parent !== undefined) {
    result.parent = node.parent;
    const parentNode = graph.nodes.get(node.parent);
    if (parentNode) {
      const siblings = parentNode.parts.filter((id) => id !== node.id);
      if (siblings.length > 0) result.siblings = siblings;
    }
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
    if (edgeNode) results.push(layer0(edgeNode, graph, target));
  }
  return results;
}

function expandProps(node: GraphNode, target: ComponentTarget | undefined): ExpandedPropsResult {
  const facet = target === undefined ? undefined : node.facets[target];
  const props: Record<string, AgentPropField> = {};
  if (facet) {
    for (const [name, prop] of Object.entries(facet.props)) {
      props[name] = toAgentProp(prop);
    }
  }
  return { expanded: true, props };
}

function expandNode(node: GraphNode, target: ComponentTarget | undefined): ExpandedNodeResult {
  const facet = target === undefined ? undefined : node.facets[target];
  const props: Record<string, AgentPropField> = {};
  if (facet) {
    for (const [name, prop] of Object.entries(facet.props)) {
      props[name] = toAgentProp(prop);
    }
  }
  const result: ExpandedNodeResult = {
    id: node.id,
    kind: node.kind,
    intel: node.intel,
    props,
  };
  if (node.composesWith.length > 0) result.composesWith = node.composesWith;
  if (node.parts.length > 0) result.parts = node.parts;
  if (facet) {
    result.snippet = facet.snippet;
    if (facet.slots !== undefined) result.slots = facet.slots;
    if (facet.events !== undefined) result.events = facet.events;
  }
  return result;
}
