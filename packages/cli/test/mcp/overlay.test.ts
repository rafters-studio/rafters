import { describe as vdescribe, expect, it } from 'vitest';
import { describe } from '../../src/mcp/graph.js';
import { assembleGraph } from '../../src/mcp/graph.js';
import {
  buildFacetTargetIndex,
  buildInstalledSet,
  describeWithOverlay,
  type OverlayContext,
  type OverlayNodeResult,
} from '../../src/mcp/overlay.js';
import type { Facet, RegistryItem } from '../../src/registry/types.js';

// One RegistryItem[] feeds BOTH assembleGraph and buildFacetTargetIndex -- the
// spec's usage example and the proof the index is built once alongside the graph.
//   button (ui): facets for astro + wc, but NO vue (the real manifest gap).
//   modal  (ui): no facets at all (pending #2073 extraction on that node).
const facet: Facet = { props: {}, snippet: '' };

const items: RegistryItem[] = [
  {
    name: 'button',
    type: 'ui',
    primitives: [],
    files: [],
    rules: [],
    composites: [],
    facets: { astro: facet, wc: facet },
  },
  {
    name: 'modal',
    type: 'ui',
    primitives: [],
    files: [],
    rules: [],
    composites: [],
    facets: {},
  },
];

const graph = assembleGraph(items);
const facetIndex = buildFacetTargetIndex(items);

const ctxAstroInstalled: OverlayContext = {
  target: 'astro',
  installed: { components: new Set(['button']), composites: new Set() },
};

vdescribe('describeWithOverlay -- single-node stamping', () => {
  it('stamps installed presence, echoed target, and a matching facet', () => {
    const button = describeWithOverlay(
      'button',
      graph,
      facetIndex,
      ctxAstroInstalled,
    ) as OverlayNodeResult;
    expect(button.presence).toBe('installed');
    expect(button.target).toBe('astro');
    expect(button.rendersForTarget).toBe(true);
  });

  it('reports available presence and no facet for an uninstalled, facet-less node', () => {
    const modal = describeWithOverlay(
      'modal',
      graph,
      facetIndex,
      ctxAstroInstalled,
    ) as OverlayNodeResult;
    expect(modal.presence).toBe('available');
    expect(modal.rendersForTarget).toBe(false); // no astro facet on modal
  });

  it('installed but NOT rendersForTarget when the target facet is missing (vue gap)', () => {
    const ctxVue: OverlayContext = {
      target: 'vue',
      installed: { components: new Set(['button']), composites: new Set() },
    };
    const button = describeWithOverlay('button', graph, facetIndex, ctxVue) as OverlayNodeResult;
    expect(button.presence).toBe('installed');
    expect(button.rendersForTarget).toBe(false); // button has astro + wc, no vue
  });

  it('degraded mode: no configured target echoes undefined and never renders', () => {
    const ctxNoTarget: OverlayContext = {
      target: undefined,
      installed: { components: new Set(), composites: new Set() },
    };
    const button = describeWithOverlay(
      'button',
      graph,
      facetIndex,
      ctxNoTarget,
    ) as OverlayNodeResult;
    expect(button.target).toBeUndefined();
    expect(button.rendersForTarget).toBe(false);
  });
});

vdescribe('describeWithOverlay -- roster tagging', () => {
  it('tags each entry with per-kind presence', () => {
    expect(describeWithOverlay('components', graph, facetIndex, ctxAstroInstalled)).toEqual(
      expect.arrayContaining([
        { id: 'button', presence: 'installed' },
        { id: 'modal', presence: 'available' },
      ]),
    );
  });

  it('checks the composites installed set for the composites roster', () => {
    // stack is a composite; installed.composites holds it, installed.components does not.
    const composed = assembleGraph([
      ...items,
      {
        name: 'stack',
        type: 'composite',
        primitives: [],
        files: [],
        rules: [],
        composites: [],
        facets: {},
      },
    ]);
    const idx = buildFacetTargetIndex([
      ...items,
      {
        name: 'stack',
        type: 'composite',
        primitives: [],
        files: [],
        rules: [],
        composites: [],
        facets: {},
      },
    ]);
    const ctx: OverlayContext = {
      target: 'astro',
      installed: { components: new Set(), composites: new Set(['stack']) },
    };
    expect(describeWithOverlay('composites', composed, idx, ctx)).toEqual([
      { id: 'stack', presence: 'installed' },
    ]);
  });
});

vdescribe('describeWithOverlay -- no shared mutable state', () => {
  it('two contexts against the same graph/index disagree correctly', () => {
    const ctxOther: OverlayContext = {
      target: 'astro',
      installed: { components: new Set(), composites: new Set() },
    };
    expect(
      (describeWithOverlay('button', graph, facetIndex, ctxOther) as OverlayNodeResult).presence,
    ).toBe('available');
    expect(
      (describeWithOverlay('button', graph, facetIndex, ctxAstroInstalled) as OverlayNodeResult)
        .presence,
    ).toBe('installed');
  });

  it('never mutates graph-owned objects: the presence-free path stays clean', () => {
    describeWithOverlay('button', graph, facetIndex, ctxAstroInstalled);
    expect(describe('button', graph)).not.toHaveProperty('presence');
    expect(describe('button', graph)).not.toHaveProperty('rendersForTarget');
    expect(describe('button', graph)).not.toHaveProperty('target');
    expect(describe('components', graph)).toContainEqual({ id: 'button' }); // roster still untagged
  });
});

vdescribe('describeWithOverlay -- passthrough shapes', () => {
  it('describe("") passes through unstamped', () => {
    expect(describeWithOverlay('', graph, facetIndex, ctxAstroInstalled)).toEqual(
      describe('', graph),
    );
  });

  it('a bad address passes the structured error through unchanged', () => {
    expect(describeWithOverlay('unknown-node', graph, facetIndex, ctxAstroInstalled)).toEqual({
      error: 'unknown node: unknown-node',
    });
  });
});

vdescribe('buildInstalledSet', () => {
  it('reads per-kind arrays from config.installed', () => {
    const set = buildInstalledSet({
      installed: { components: ['button'], composites: ['stack'] },
    });
    expect(set.components.has('button')).toBe(true);
    expect(set.composites.has('stack')).toBe(true);
  });

  it('absent installed means nothing installed, never a crash', () => {
    const set = buildInstalledSet({});
    expect(set.components.size).toBe(0);
    expect(set.composites.size).toBe(0);
  });
});

vdescribe('buildFacetTargetIndex', () => {
  it('indexes each item to its recognized facet targets', () => {
    expect(facetIndex.get('button')).toEqual(new Set(['astro', 'wc']));
    expect(facetIndex.get('modal')).toEqual(new Set());
  });

  it('ignores unrecognized target keys, never crashes', () => {
    const idx = buildFacetTargetIndex([
      {
        name: 'weird',
        facets: { astro: facet, bogus: facet } as Partial<Record<'astro', unknown>>,
      },
    ]);
    expect(idx.get('weird')).toEqual(new Set(['astro']));
  });
});
