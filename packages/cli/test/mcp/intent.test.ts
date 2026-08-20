import { describe as vdescribe, expect, it } from 'vitest';
import { describe, type Graph, type GraphNode } from '../../src/mcp/graph.js';
import {
  type IntentMatch,
  type IntentNoMatch,
  isNaturalLanguageQuery,
  matchIntent,
} from '../../src/mcp/intent.js';

// Fixture graph shaped like #2072's own: component nodes with intel that carries
// semanticMeaning, no props needed for intent routing. `modal`/`alert` are the
// curated pair the acceptance criteria exercise; `tooltip` gives a SECOND
// routing target so the mechanism is shown to generalize past one hardcoded pair.
function fixture(): Graph {
  const nodes = new Map<string, GraphNode>([
    [
      'modal',
      {
        id: 'modal',
        kind: 'component',
        intel: { dos: [], nevers: [], semanticMeaning: 'blocking overlay above all content' },
        facets: {},
        composesWith: [],
        parts: [],
      },
    ],
    [
      'alert',
      {
        id: 'alert',
        kind: 'component',
        intel: { dos: [], nevers: [], semanticMeaning: 'inline passive status message' },
        facets: {},
        composesWith: [],
        parts: [],
      },
    ],
    [
      'tooltip',
      {
        id: 'tooltip',
        kind: 'component',
        intel: { dos: [], nevers: [], semanticMeaning: 'passive hint shown on hover' },
        facets: {},
        composesWith: [],
        parts: [],
      },
    ],
  ]);
  return { nodes };
}

vdescribe('matchIntent -- the intent door', () => {
  const graph = fixture();

  it('routes "above everything" to modal with alert as the near-miss', () => {
    const result = matchIntent(
      'what do I use when it needs to be above everything',
      graph,
    ) as IntentMatch;
    expect(result.use.id).toBe('modal');
    expect(result.not.id).toBe('alert');
    expect(result.because).toContain('blocking');
    expect(result.because).toContain('inline');
  });

  it('routes a different phrasing hitting the same axis the same way', () => {
    const result = matchIntent(
      'I need something that sits on top of everything else',
      graph,
    ) as IntentMatch;
    expect(result.use.id).toBe('modal');
  });

  it('routes a different question to a different pair -- the mechanism is not one hardcoded pair', () => {
    const result = matchIntent('show a hint on hover', graph) as IntentMatch;
    expect(result.use.id).toBe('tooltip');
    expect(result.not.id).toBe('alert');
    expect(result.because).toBe('tooltip is hint/hover; alert is attention');
  });

  it('the because string is assembled from the diverging tag vocabulary', () => {
    const result = matchIntent(
      'what do I use when it needs to be above everything',
      graph,
    ) as IntentMatch;
    expect(result.because).toBe('modal is blocking/above-all; alert is inline/passive');
  });

  it('falls through cleanly when no axis matches', () => {
    const noMatch = matchIntent('what color is the sky', graph) as IntentNoMatch;
    expect(noMatch.note).toContain('describe(components)');
  });

  it('an empty query returns a clean no-match, never throws', () => {
    expect(() => matchIntent('', graph)).not.toThrow();
    expect((matchIntent('', graph) as IntentNoMatch).note).toContain('describe(components)');
  });

  it('use and not are real #2072 layer-0 NodeResults, not intent-local stand-ins', () => {
    const result = matchIntent(
      'what do I use when it needs to be above everything',
      graph,
    ) as IntentMatch;
    expect(result.use).toEqual(describe('modal', graph));
    expect(result.not).toEqual(describe('alert', graph));
  });

  it('a node with no formable counter-example falls through rather than returning a half-pair', () => {
    // A graph with ONLY modal has no near-miss to compute, so the door stays
    // shut. IntentMatch.not is non-optional, so IntentNoMatch is the sole
    // type-legal result -- a deviation from the spec's two listed no-match paths,
    // documented in the implementation header.
    const soloNodes = new Map<string, GraphNode>([
      [
        'modal',
        {
          id: 'modal',
          kind: 'component',
          intel: { dos: [], nevers: [] },
          props: {},
          vocab: {},
          composesWith: [],
        },
      ],
    ]);
    const solo: Graph = { nodes: soloNodes };
    const result = matchIntent('put it above everything', solo) as IntentNoMatch;
    expect(result.note).toContain('describe(components)');
  });
});

vdescribe('isNaturalLanguageQuery -- the dispatcher disambiguation rule', () => {
  it('a dot-address is not a natural-language query', () => {
    expect(isNaturalLanguageQuery('button.props.variant')).toBe(false);
  });

  it('a query with whitespace is a natural-language query', () => {
    expect(isNaturalLanguageQuery('what do I use when it needs to be above everything')).toBe(true);
  });
});
