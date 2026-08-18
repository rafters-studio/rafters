import { describe as vdescribe, expect, it } from 'vitest';
import {
  assembleGraph,
  describe,
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

  it('a grammar prop exposes vocab as a drillable address; the leaf is honest and empty', () => {
    const fill = describe('container.props.fill', graph, T) as { type: string; vocab: string };
    expect(fill).toMatchObject({ type: 'grammar', vocab: 'container.props.fill.vocab' });
    // Token VALUES live in the separate token DAG, never on the graph -- the leaf
    // is an honest empty here; sourcing values is a named follow-up.
    expect(describe(fill.vocab, graph, T)).toEqual({ type: 'leaf', values: [] });
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
      error: expect.stringContaining('cannot drill'),
    });
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
