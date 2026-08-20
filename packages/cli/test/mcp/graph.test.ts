import { describe as vdescribe, expect, it } from 'vitest';
import {
  assembleGraph,
  describe,
  type ExpandedNodeResult,
  type Graph,
  type GraphNode,
  type NodeResult,
} from '../../src/mcp/graph.js';
import type { RegistryItem } from '../../src/registry/types.js';

// Fixture graph. Every node carries ALL its per-target facets (here just astro);
// the reader hands describe its one target as the lens. Presence-free.
//   button (component): astro facet { variant: enum, size: enum + constraint },
//     composesWith: ['page-header', 'page-header']  // duplicate -> dedup
//   page-header (composite): no facet, composesWith: ['button']  // mutual pair
//   container (component): astro facet { fill: grammar (vocab is a drillable addr) }
//   modal (component): no facet, composesWith: ['modal']  // self-edge
function fixture(): Graph {
  const nodes = new Map<string, GraphNode>([
    [
      'button',
      {
        id: 'button',
        kind: 'component',
        intel: { cognitiveLoad: 2, dos: [], nevers: [] },
        facets: {
          astro: {
            props: {
              variant: { type: 'enum', values: ['default', 'primary'], default: 'default' },
              size: {
                type: 'enum',
                values: ['default', 'icon'],
                default: 'default',
                constraint: {
                  when: { prop: 'size', matches: 'icon*' },
                  requires: { prop: 'aria-label' },
                },
              },
            },
            slots: ['default'],
            snippet: '<Button variant="primary">Save</Button>',
          },
        },
        composesWith: ['page-header', 'page-header'],
        parts: [], // populated by assembleGraph; manual fixtures need it explicit
      },
    ],
    [
      'page-header',
      {
        id: 'page-header',
        kind: 'composite',
        intel: { dos: [], nevers: [] },
        facets: {},
        composesWith: ['button'],
        parts: [],
      },
    ],
    [
      'container',
      {
        id: 'container',
        kind: 'component',
        intel: { cognitiveLoad: 1, dos: [], nevers: [] },
        facets: {
          astro: {
            props: {
              fill: {
                type: 'grammar',
                grammar: ['word', 'word/alpha', 'word-to-word'],
                vocab: 'container.props.fill.vocab',
                onInvalid: 'silent-noop',
                default: 'transparent',
              },
            },
            snippet: '<Container fill="surface"><slot /></Container>',
          },
        },
        composesWith: [],
        parts: [],
      },
    ],
    [
      'modal',
      {
        id: 'modal',
        kind: 'component',
        intel: { dos: [], nevers: [] },
        facets: {},
        composesWith: ['modal'],
        parts: [],
      },
    ],
  ]);
  return { nodes };
}

vdescribe('describe(addr, graph, target)', () => {
  const graph = fixture();
  const T = 'astro' as const;

  it('describe("") returns the surface: kinds as edges + a node count', () => {
    expect(describe('', graph, T)).toEqual({
      kinds: [
        { addr: 'components', type: 'edge' },
        { addr: 'composites', type: 'edge' },
      ],
      nodeCount: 4,
    });
  });

  it('describe(components) rosters only components', () => {
    const roster = describe('components', graph, T);
    expect(roster).toEqual(
      expect.arrayContaining([{ id: 'button' }, { id: 'container' }, { id: 'modal' }]),
    );
    expect(roster).not.toContainEqual({ id: 'page-header' });
  });

  it('operators are not supported on the catalog -- structured error, never the roster', () => {
    const components = describe('components.*', graph, T);
    expect(Array.isArray(components)).toBe(false);
    expect(components).toMatchObject({ error: expect.stringContaining('components.*') });

    const composites = describe('composites.*', graph, T);
    expect(Array.isArray(composites)).toBe(false);
    expect(composites).toMatchObject({ error: expect.stringContaining('composites.*') });
  });

  it('describe(<id>) returns layer 0 with type-marked children + target-correct usage', () => {
    const node = describe('button', graph, T) as NodeResult;
    expect(node).toMatchObject({ id: 'button', kind: 'component' });
    expect(node.children).toEqual(
      expect.arrayContaining([
        { addr: 'button.props.variant', type: 'enum' },
        { addr: 'button.props.size', type: 'enum' },
        { addr: 'button.composesWith', type: 'edge' },
      ]),
    );
    // the correct-in-target usage rides along in the same response
    expect(node.snippet).toBe('<Button variant="primary">Save</Button>');
    expect(node.slots).toEqual(['default']);
  });

  it('describe(<id>.props.<name>) returns the prop node; enum values inline', () => {
    expect(describe('button.props.variant', graph, T)).toMatchObject({
      type: 'enum',
      values: ['default', 'primary'],
    });
  });

  it('constraints are structured, not prose', () => {
    expect(describe('button.props.size', graph, T)).toMatchObject({
      constraint: { when: { prop: 'size', matches: 'icon*' }, requires: { prop: 'aria-label' } },
    });
  });

  it('a grammar prop exposes its composition rules but never its vocab (tokens)', () => {
    const fill = describe('container.props.fill', graph, T);
    // The agent gets the grammar RULES it needs to compose a value...
    expect(fill).toMatchObject({
      type: 'grammar',
      grammar: ['word', 'word/alpha', 'word-to-word'],
      onInvalid: 'silent-noop',
    });
    // ...but the token vocabulary is stripped -- never surfaced, or it lands in
    // className. The vocab address stays internal on the node, off the response.
    expect(fill).not.toHaveProperty('vocab');
    // And the vocab drill is unreachable: the token layer stays behind the curtain.
    expect(describe('container.props.fill.vocab', graph, T)).toEqual({
      error: expect.stringContaining('container.props.fill.vocab'),
    });
  });

  it('edges resolve to target layer-0 only, one level, and dedup exact duplicates', () => {
    const edges = describe('button.composesWith', graph, T) as NodeResult[];
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe('page-header');
    // one-level bound: the target's own edge appears as an ADDRESS, never expanded
    expect(edges[0]?.children).toContainEqual({ addr: 'page-header.composesWith', type: 'edge' });
    expect(edges[0]).not.toHaveProperty('composesWith');
  });

  it('a self-edge resolves cleanly and terminates', () => {
    const edges = describe('modal.composesWith', graph, T) as Array<{ id: string }>;
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe('modal');
  });

  it('bad addresses return structured errors, never throw', () => {
    expect(describe('unknown-node', graph, T)).toEqual({ error: 'unknown node: unknown-node' });
    expect(describe('button.props.color', graph, T)).toEqual({
      error: expect.stringContaining('button.props.color'),
    });
    expect(describe('button.props.variant.vocab', graph, T)).toEqual({
      error: expect.stringContaining('button.props.variant.vocab'),
    });
  });

  it('describe(<id>.*) expands all props inline with full values', () => {
    const expanded = describe('button.*', graph, T) as ExpandedNodeResult;
    expect(expanded.id).toBe('button');
    expect(expanded.kind).toBe('component');
    expect(expanded.intel).toBeDefined();
    expect(expanded.props.variant).toMatchObject({
      type: 'enum',
      values: ['default', 'primary'],
      default: 'default',
    });
    expect(expanded.props.size).toMatchObject({
      type: 'enum',
      values: ['default', 'icon'],
    });
    expect(expanded.snippet).toBe('<Button variant="primary">Save</Button>');
    expect(expanded.composesWith).toEqual(['page-header', 'page-header']);
    expect(expanded).not.toHaveProperty('children');
  });

  it('describe(<addr>.?) probes safely -- returns the result on hit, null on miss', () => {
    const hit = describe('button.props.variant.?', graph, T);
    expect(hit).toMatchObject({ type: 'enum', values: ['default', 'primary'] });

    const miss = describe('button.props.color.?', graph, T);
    expect(miss).toBeNull();

    const nodeMiss = describe('nonexistent.?', graph, T);
    expect(nodeMiss).toBeNull();
  });

  it('describe(<id>.props.*) returns all props tagged with full values', () => {
    const result = describe('button.props.*', graph, T) as {
      expanded: true;
      props: Record<string, unknown>;
    };
    expect(result.expanded).toBe(true);
    expect(result.props.variant).toMatchObject({ type: 'enum', values: ['default', 'primary'] });
    expect(result.props.size).toMatchObject({ type: 'enum', values: ['default', 'icon'] });
  });

  it('* expansion strips vocab from grammar props', () => {
    const expanded = describe('container.*', graph, T) as ExpandedNodeResult;
    expect(expanded.props.fill).toMatchObject({
      type: 'grammar',
      grammar: ['word', 'word/alpha', 'word-to-word'],
    });
    expect(expanded.props.fill).not.toHaveProperty('vocab');
  });

  it('degraded mode (no target) resolves intel + edges but advertises no prop children', () => {
    const node = describe('button', graph) as NodeResult;
    expect(node).toMatchObject({ id: 'button', kind: 'component' });
    // no facet chosen -> no prop children, no snippet, only the composesWith edge
    expect(node.children).toEqual([{ addr: 'button.composesWith', type: 'edge' }]);
    expect(node.snippet).toBeUndefined();
    // drilling a prop without a target is an honest error, never a guess or throw
    expect(describe('button.props.variant', graph)).toEqual({
      error: expect.stringContaining('button.props.variant'),
    });
  });
});

vdescribe('assembleGraph(items)', () => {
  const validItem: RegistryItem = {
    name: 'button',
    type: 'ui',
    primitives: [],
    files: [],
    rules: [],
    composites: [],
    facets: {},
  };

  it('maps registry items to nodes (kind, intel, composesWith)', () => {
    const graph = assembleGraph([
      {
        ...validItem,
        name: 'card',
        composites: ['stack'],
        intelligence: { cognitiveLoad: 3, usagePatterns: { dos: ['a'], nevers: ['b'] } },
      },
      { ...validItem, name: 'stack', type: 'composite' },
    ]);
    const card = describe('card', graph) as NodeResult;
    expect(card.kind).toBe('component');
    expect(card.intel.cognitiveLoad).toBe(3);
    expect(describe('composites', graph)).toContainEqual({ id: 'stack' });
  });

  it('carries the COMPLETE intelligence -- never a subset -- onto the node', () => {
    const graph = assembleGraph([
      {
        ...validItem,
        name: 'dialog',
        intelligence: {
          cognitiveLoad: 4,
          semanticMeaning: 'blocks everything; demands a decision',
          accessibility: 'focus-trapped; aria-modal; ESC closes',
          attentionEconomics: 'spends the whole screen; use sparingly',
          trustBuilding: 'explicit confirm/cancel; no silent dismissal',
          usagePatterns: { dos: ['block for a decision'], nevers: ['passive info'] },
        },
      },
    ]);
    const dialog = describe('dialog', graph) as NodeResult;
    expect(dialog.intel).toEqual({
      cognitiveLoad: 4,
      semanticMeaning: 'blocks everything; demands a decision',
      accessibility: 'focus-trapped; aria-modal; ESC closes',
      attentionEconomics: 'spends the whole screen; use sparingly',
      trustBuilding: 'explicit confirm/cancel; no silent dismissal',
      dos: ['block for a decision'],
      nevers: ['passive info'],
    });
  });

  it('carries each per-target facet onto the node, resolvable through that target', () => {
    const graph = assembleGraph([
      {
        ...validItem,
        name: 'badge',
        facets: {
          astro: {
            props: { tone: { type: 'enum', values: ['info', 'warn'] } },
            snippet: '<Badge />',
          },
          react: {
            props: { tone: { type: 'enum', values: ['info', 'warn', 'error'] } },
            snippet: '<Badge/>',
          },
        },
      },
    ]);
    // The same node, seen through two targets, exposes each target's own surface.
    expect(describe('badge.props.tone', graph, 'astro')).toMatchObject({
      values: ['info', 'warn'],
    });
    expect(describe('badge.props.tone', graph, 'react')).toMatchObject({
      values: ['info', 'warn', 'error'],
    });
    // A target with no facet is a manifest gap: no prop children, no guess.
    expect((describe('badge', graph, 'vue') as NodeResult).children).toEqual([]);
  });

  it('throws when a composesWith edge names an id that appears in no item', () => {
    expect(() => assembleGraph([{ ...validItem, composites: ['nonexistent-id'] }])).toThrow();
  });
});

vdescribe('assembleGraph: @parent and convention inference', () => {
  const validItem: RegistryItem = {
    name: 'button',
    type: 'ui',
    primitives: [],
    files: [],
    rules: [],
    composites: [],
    facets: {},
  };

  it('explicit @parent links child to parent, both directions', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'card' },
      { ...validItem, name: 'card-header', parent: 'card' },
    ]);
    const headerNode = graph.nodes.get('card-header');
    expect(headerNode?.parent).toBe('card');
    const cardNode = graph.nodes.get('card');
    expect(cardNode?.parts).toEqual(['card-header']);
  });

  it('convention inference when no @parent tag present (card + card-header -> parent is card)', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'card' },
      { ...validItem, name: 'card-header' },
    ]);
    const headerNode = graph.nodes.get('card-header');
    expect(headerNode?.parent).toBe('card');
    const cardNode = graph.nodes.get('card');
    expect(cardNode?.parts).toEqual(['card-header']);
  });

  it('longest-prefix matching (input, input-group, input-group-addon -> addon parent is input-group)', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'input' },
      { ...validItem, name: 'input-group' },
      { ...validItem, name: 'input-group-addon' },
    ]);
    const addonNode = graph.nodes.get('input-group-addon');
    expect(addonNode?.parent).toBe('input-group');
    // input-group itself infers parent input
    const groupNode = graph.nodes.get('input-group');
    expect(groupNode?.parent).toBe('input');
  });

  it('@parent overrides convention (card-header with @parent report -> parent is report)', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'card' },
      { ...validItem, name: 'report' },
      { ...validItem, name: 'card-header', parent: 'report' },
    ]);
    const headerNode = graph.nodes.get('card-header');
    expect(headerNode?.parent).toBe('report');
    // report gets the part, not card
    expect(graph.nodes.get('report')?.parts).toEqual(['card-header']);
    expect(graph.nodes.get('card')?.parts).toEqual([]);
  });

  it('does not infer parent when candidate prefix names no real node', () => {
    const graph = assembleGraph([{ ...validItem, name: 'foo-bar' }]);
    const node = graph.nodes.get('foo-bar');
    expect(node?.parent).toBeUndefined();
    // single-segment names never infer (loop starts at i >= 1 with segments.length === 1)
    const graph2 = assembleGraph([{ ...validItem, name: 'standalone' }]);
    expect(graph2.nodes.get('standalone')?.parent).toBeUndefined();
  });

  it('a composite can be a parent', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'layout', type: 'composite' },
      { ...validItem, name: 'layout-sidebar', parent: 'layout' },
    ]);
    const sidebarNode = graph.nodes.get('layout-sidebar');
    expect(sidebarNode?.parent).toBe('layout');
    const layoutNode = graph.nodes.get('layout');
    expect(layoutNode?.parts).toEqual(['layout-sidebar']);
    expect(layoutNode?.kind).toBe('composite');
  });

  it('throws on self-referential @parent', () => {
    expect(() => assembleGraph([{ ...validItem, name: 'loop', parent: 'loop' }])).toThrow(
      'parent references itself',
    );
  });

  it('throws on circular @parent chain', () => {
    expect(() =>
      assembleGraph([
        { ...validItem, name: 'alpha', parent: 'beta' },
        { ...validItem, name: 'beta', parent: 'alpha' },
      ]),
    ).toThrow('circular parent chain');
  });

  it('throws when @parent names an absent id', () => {
    expect(() => assembleGraph([{ ...validItem, name: 'orphan', parent: 'ghost' }])).toThrow(
      'unknown id',
    );
  });
});

vdescribe('describe(): parts, parent, siblings', () => {
  const validItem: RegistryItem = {
    name: 'button',
    type: 'ui',
    primitives: [],
    files: [],
    rules: [],
    composites: [],
    facets: {},
  };

  it('describe(card) includes part children typed "part"', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'card' },
      { ...validItem, name: 'card-header' },
      { ...validItem, name: 'card-footer' },
    ]);
    const result = describe('card', graph) as NodeResult;
    expect(result.children).toContainEqual({ addr: 'card-header', type: 'part' });
    expect(result.children).toContainEqual({ addr: 'card-footer', type: 'part' });
  });

  it('describe(card-header) returns NodeResult with parent and siblings', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'card' },
      { ...validItem, name: 'card-header' },
      { ...validItem, name: 'card-footer' },
    ]);
    const result = describe('card-header', graph) as NodeResult;
    expect(result.parent).toBe('card');
    expect(result.siblings).toEqual(['card-footer']);
  });

  it('describe(card.*) includes parts in expanded result', () => {
    const graph = assembleGraph([
      { ...validItem, name: 'card' },
      { ...validItem, name: 'card-header' },
      { ...validItem, name: 'card-footer' },
    ]);
    const result = describe('card.*', graph) as ExpandedNodeResult;
    expect(result.parts).toEqual(['card-header', 'card-footer']);
  });

  it('a node with no parts carries no parent/siblings keys', () => {
    const graph = assembleGraph([{ ...validItem, name: 'standalone' }]);
    const result = describe('standalone', graph) as NodeResult;
    expect(result).not.toHaveProperty('parent');
    expect(result).not.toHaveProperty('siblings');
    expect(result.children).toEqual([]);
  });
});
