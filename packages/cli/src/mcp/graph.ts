/**
 * Intel graph + recursive `describe` resolver (issue #2072).
 *
 * Assembles the component/composite intel graph in-memory from registry items,
 * and answers a single recursive verb: `describe(addr, graph)`. One verb, a
 * narrowing dot-address argument, no `?`/`*` operators -- the depth of the
 * argument IS the request. Every node response advertises its own drillable,
 * type-marked children; cross-kind `composesWith` edges resolve to the target's
 * layer-0 only, cycle-safe.
 *
 * This slice is universal and presence-free: no installed/target dimension (that
 * is the workspace overlay, issue #2074). `props`/`vocab` are fixture-driven
 * here; per-target facet extraction (issue #2073) feeds them from source later.
 * Behavioral reference: `.claude/scratch/describe-toy.ts`.
 */

import type { RegistryItem } from '../registry/types.js';

// A child a caller can drill into next. `type` says whether to drill and what returns.
export type ChildType = 'enum' | 'grammar' | 'leaf' | 'edge' | 'deprecated';

export interface DrillableChild {
  addr: string;
  type: ChildType;
  deprecatedFor?: string; // present only when type === 'deprecated'
}

// A structured, machine-actionable cross-part rule -- never a prose string.
export interface Constraint {
  when: { prop: string; matches: string };
  requires: { prop: string };
}

export type PropNode =
  | {
      type: 'enum';
      values: string[];
      default?: string;
      required?: boolean;
      constraint?: Constraint;
    }
  | {
      type: 'grammar';
      grammar: string[];
      vocab: string;
      onInvalid: 'silent-noop';
      default?: string;
    } // vocab: a drillable addr, never inlined, never withheld
  | { type: 'deprecated'; deprecatedFor: string };

export interface GraphIntel {
  cognitiveLoad?: number;
  dos: string[];
  nevers: string[];
  semanticMeaning?: string;
}

export interface GraphNode {
  id: string;
  kind: 'component' | 'composite';
  intel: GraphIntel;
  props: Record<string, PropNode>; // empty until per-target extraction (#2073) lands
  vocab: Record<string, string[]>; // addr -> real token values
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
 * `RegistryItemSchema`. `id`, `kind`, `intel`, and `composesWith` come from the
 * registry; `props`/`vocab` are left empty here (extraction is #2073).
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

    const intel: GraphIntel = {
      dos: item.intelligence?.usagePatterns?.dos ?? [],
      nevers: item.intelligence?.usagePatterns?.nevers ?? [],
    };
    if (item.intelligence?.cognitiveLoad !== undefined) {
      intel.cognitiveLoad = item.intelligence.cognitiveLoad;
    }
    if (item.intelligence?.semanticMeaning !== undefined) {
      intel.semanticMeaning = item.intelligence.semanticMeaning;
    }

    nodes.set(item.name, {
      id: item.name,
      kind,
      intel,
      props: {},
      vocab: {},
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
 * Resolve one dot-address against the graph. Never throws for a bad caller
 * address -- always returns a structured `{ error }`. Assembly-time / data
 * errors surface earlier, in `assembleGraph`.
 */
export function describe(addr: string, graph: Graph): DescribeResult {
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
  if (rest.length === 0) return layer0(node);

  // describe('<id>.composesWith') -> edges resolved to target layer-0, one level.
  if (rest.length === 1 && rest[0] === 'composesWith') {
    return resolveEdges(node, graph);
  }

  // describe('<id>.props.<name>[.vocab]')
  if (rest[0] === 'props') {
    const propName = rest[1];
    const prop = propName === undefined ? undefined : node.props[propName];
    if (!prop) return { error: `cannot resolve: ${addr}` };
    if (rest.length === 2) return prop;
    if (rest.length === 3 && rest[2] === 'vocab') {
      if (prop.type !== 'grammar') return { error: `cannot drill: ${addr}` };
      return { type: 'leaf', values: node.vocab[prop.vocab] ?? [] };
    }
    return { error: `cannot resolve: ${addr}` };
  }

  return { error: `cannot resolve: ${addr}` };
}

/** Layer 0: intel + self-advertising, type-marked children. Never expands. */
function layer0(node: GraphNode): NodeResult {
  const children: DrillableChild[] = [];
  for (const [name, prop] of Object.entries(node.props)) {
    const child: DrillableChild = { addr: `${node.id}.props.${name}`, type: prop.type };
    if (prop.type === 'deprecated') child.deprecatedFor = prop.deprecatedFor;
    children.push(child);
  }
  if (node.composesWith.length > 0) {
    children.push({ addr: `${node.id}.composesWith`, type: 'edge' });
  }
  return { id: node.id, kind: node.kind, intel: node.intel, children };
}

/**
 * Resolve `composesWith` edges to each target's layer-0 -- ONE level only. A
 * target's own `composesWith` never expands inside this response; it appears
 * only as the `<targetId>.composesWith` address inside that target's children.
 * A visited-id set collapses exact-duplicate entries and makes a self-edge
 * (or any cycle) terminate; every distinct declared edge still resolves.
 */
function resolveEdges(node: GraphNode, graph: Graph): NodeResult[] {
  const seen = new Set<string>();
  const results: NodeResult[] = [];
  for (const targetId of node.composesWith) {
    if (seen.has(targetId)) continue;
    seen.add(targetId);
    const target = graph.nodes.get(targetId);
    if (target) results.push(layer0(target));
  }
  return results;
}
