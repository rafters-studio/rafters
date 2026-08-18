import { describe as vdescribe, expect, it } from 'vitest';
import {
  assembleGraph,
  describe,
  type DrillableChild,
  type Graph,
  type GraphNode,
} from '../../src/mcp/graph.js';
import type { RegistryItem } from '../../src/registry/types.js';

// Fixture graph (no target/presence dimension in this slice):
//   button (component): props { variant: enum, size: enum + constraint },
//     composesWith: ['page-header', 'page-header']  // duplicate -> dedup
//   page-header (composite): composesWith: ['button']  // mutual pair -> one-level bound
//   container (component): props { fill: grammar }, vocab for the fill grammar
//   modal (component): composesWith: ['modal']  // self-edge
function fixture(): Graph {
  const nodes = new Map<string, GraphNode>([
    [
      'button',
      {
        id: 'button',
        kind: 'component',
        intel: { cognitiveLoad: 2, dos: [], nevers: [] },
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
        vocab: {},
        composesWith: ['page-header', 'page-header'],
      },
    ],
    [
      'page-header',
      {
        id: 'page-header',
        kind: 'composite',
        intel: { dos: [], nevers: [] },
        props: {},
        vocab: {},
        composesWith: ['button'],
      },
    ],
    [
      'container',
      {
        id: 'container',
        kind: 'component',
        intel: { cognitiveLoad: 1, dos: [], nevers: [] },
        props: {
          fill: {
            type: 'grammar',
            grammar: ['word', 'word/alpha', 'word-to-word'],
            vocab: 'container.props.fill.vocab',
            onInvalid: 'silent-noop',
            default: 'transparent',
          },
        },
        vocab: { 'container.props.fill.vocab': ['surface', 'card', 'muted', 'primary', 'accent'] },
        composesWith: [],
      },
    ],
    [
      'modal',
      {
        id: 'modal',
        kind: 'component',
        intel: { dos: [], nevers: [] },
        props: {},
        vocab: {},
        composesWith: ['modal'],
      },
    ],
  ]);
  return { nodes };
}

vdescribe('describe(addr, graph)', () => {
  const graph = fixture();

  it('describe("") returns the surface: kinds as edges + a node count', () => {
    expect(describe('', graph)).toEqual({
      kinds: [
        { addr: 'components', type: 'edge' },
        { addr: 'composites', type: 'edge' },
      ],
      nodeCount: 4,
    });
  });

  it('describe(components) rosters only components', () => {
    const roster = describe('components', graph);
    expect(roster).toEqual(
      expect.arrayContaining([{ id: 'button' }, { id: 'container' }, { id: 'modal' }]),
    );
    expect(roster).not.toContainEqual({ id: 'page-header' });
  });

  it('describe(<id>) returns layer 0 with type-marked self-advertising children', () => {
    const node = describe('button', graph) as {
      id: string;
      kind: string;
      children: DrillableChild[];
    };
    expect(node).toMatchObject({ id: 'button', kind: 'component' });
    expect(node.children).toEqual(
      expect.arrayContaining([
        { addr: 'button.props.variant', type: 'enum' },
        { addr: 'button.props.size', type: 'enum' },
        { addr: 'button.composesWith', type: 'edge' },
      ]),
    );
  });

  it('describe(<id>.props.<name>) returns the prop node; enum values inline', () => {
    expect(describe('button.props.variant', graph)).toMatchObject({
      type: 'enum',
      values: ['default', 'primary'],
    });
  });

  it('constraints are structured, not prose', () => {
    expect(describe('button.props.size', graph)).toMatchObject({
      constraint: { when: { prop: 'size', matches: 'icon*' }, requires: { prop: 'aria-label' } },
    });
  });

  it('a grammar prop exposes vocab as a drillable address, and it resolves to real tokens', () => {
    const fill = describe('container.props.fill', graph) as { type: string; vocab: string };
    expect(fill).toMatchObject({ type: 'grammar', vocab: 'container.props.fill.vocab' });
    expect(describe(fill.vocab, graph)).toEqual({
      type: 'leaf',
      values: ['surface', 'card', 'muted', 'primary', 'accent'],
    });
  });

  it('edges resolve to target layer-0 only, one level, and dedup exact duplicates', () => {
    const edges = describe('button.composesWith', graph) as Array<{
      id: string;
      children: DrillableChild[];
    }>;
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe('page-header');
    // one-level bound: the target's own edge appears as an ADDRESS, never expanded
    expect(edges[0]?.children).toContainEqual({ addr: 'page-header.composesWith', type: 'edge' });
    expect(edges[0]).not.toHaveProperty('composesWith');
  });

  it('a self-edge resolves cleanly and terminates', () => {
    const edges = describe('modal.composesWith', graph) as Array<{ id: string }>;
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe('modal');
  });

  it('bad addresses return structured errors, never throw', () => {
    expect(describe('unknown-node', graph)).toEqual({ error: 'unknown node: unknown-node' });
    expect(describe('button.props.color', graph)).toEqual({
      error: expect.stringContaining('button.props.color'),
    });
    expect(describe('button.props.variant.vocab', graph)).toEqual({
      error: expect.stringContaining('cannot drill'),
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
    const card = describe('card', graph) as { kind: string; intel: { cognitiveLoad?: number } };
    expect(card.kind).toBe('component');
    expect(card.intel.cognitiveLoad).toBe(3);
    expect(describe('composites', graph)).toContainEqual({ id: 'stack' });
  });

  it('throws when a composesWith edge names an id that appears in no item', () => {
    expect(() => assembleGraph([{ ...validItem, composites: ['nonexistent-id'] }])).toThrow();
  });
});
