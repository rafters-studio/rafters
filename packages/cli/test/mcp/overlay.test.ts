import { describe as vdescribe, expect, it } from 'vitest';
import { assembleGraph, describe } from '../../src/mcp/graph.js';
import {
  buildInstalledSet,
  describeWithOverlay,
  type OverlayContext,
  type OverlayNodeResult,
} from '../../src/mcp/overlay.js';
import type { Facet, RegistryItem } from '../../src/registry/types.js';

// One RegistryItem[] feeds assembleGraph; the graph node carries each item's
// per-target facets, so the overlay reads rendersForTarget straight off the node.
//   button (ui): facets for astro + wc, but NO vue (the real manifest gap).
//   modal  (ui): no facets at all.
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
  { name: 'modal', type: 'ui', primitives: [], files: [], rules: [], composites: [], facets: {} },
];

const graph = assembleGraph(items);

const ctxAstroInstalled: OverlayContext = {
  target: 'astro',
  installed: { components: new Set(['button']), composites: new Set() },
};

vdescribe('describeWithOverlay -- single-node stamping', () => {
  it('stamps installed presence, echoed target, and a matching facet', () => {
    const button = describeWithOverlay('button', graph, ctxAstroInstalled) as OverlayNodeResult;
    expect(button.presence).toBe('installed');
    expect(button.target).toBe('astro');
    expect(button.rendersForTarget).toBe(true);
  });

  it('reports available presence and no facet for an uninstalled, facet-less node', () => {
    const modal = describeWithOverlay('modal', graph, ctxAstroInstalled) as OverlayNodeResult;
    expect(modal.presence).toBe('available');
    expect(modal.rendersForTarget).toBe(false); // no astro facet on modal
  });

  it('installed but NOT rendersForTarget when the target facet is missing (vue gap)', () => {
    const ctxVue: OverlayContext = {
      target: 'vue',
      installed: { components: new Set(['button']), composites: new Set() },
    };
    const button = describeWithOverlay('button', graph, ctxVue) as OverlayNodeResult;
    expect(button.presence).toBe('installed');
    expect(button.rendersForTarget).toBe(false); // button has astro + wc, no vue
  });

  it('degraded mode: no configured target echoes undefined and never renders', () => {
    const ctxNoTarget: OverlayContext = {
      target: undefined,
      installed: { components: new Set(), composites: new Set() },
    };
    const button = describeWithOverlay('button', graph, ctxNoTarget) as OverlayNodeResult;
    expect(button.target).toBeUndefined();
    expect(button.rendersForTarget).toBe(false);
  });
});

vdescribe('describeWithOverlay -- roster tagging', () => {
  it('tags each entry with per-kind presence', () => {
    expect(describeWithOverlay('components', graph, ctxAstroInstalled)).toEqual(
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
    const ctx: OverlayContext = {
      target: 'astro',
      installed: { components: new Set(), composites: new Set(['stack']) },
    };
    expect(describeWithOverlay('composites', composed, ctx)).toEqual([
      { id: 'stack', presence: 'installed' },
    ]);
  });
});

vdescribe('describeWithOverlay -- no shared mutable state', () => {
  it('two contexts against the same graph disagree correctly', () => {
    const ctxOther: OverlayContext = {
      target: 'astro',
      installed: { components: new Set(), composites: new Set() },
    };
    expect((describeWithOverlay('button', graph, ctxOther) as OverlayNodeResult).presence).toBe(
      'available',
    );
    expect(
      (describeWithOverlay('button', graph, ctxAstroInstalled) as OverlayNodeResult).presence,
    ).toBe('installed');
  });

  it('never mutates graph-owned objects: the presence-free path stays clean', () => {
    describeWithOverlay('button', graph, ctxAstroInstalled);
    expect(describe('button', graph, 'astro')).not.toHaveProperty('presence');
    expect(describe('button', graph, 'astro')).not.toHaveProperty('rendersForTarget');
    expect(describe('button', graph, 'astro')).not.toHaveProperty('target');
    expect(describe('components', graph)).toContainEqual({ id: 'button' }); // roster still untagged
  });
});

vdescribe('describeWithOverlay -- passthrough shapes', () => {
  it('describe("") passes through unstamped', () => {
    expect(describeWithOverlay('', graph, ctxAstroInstalled)).toEqual(describe('', graph, 'astro'));
  });

  it('a bad address passes the structured error through unchanged', () => {
    expect(describeWithOverlay('unknown-node', graph, ctxAstroInstalled)).toEqual({
      error: 'unknown node: unknown-node',
    });
  });
});

vdescribe('buildInstalledSet', () => {
  it('reads per-kind arrays from config.installed', () => {
    const set = buildInstalledSet({ installed: { components: ['button'], composites: ['stack'] } });
    expect(set.components.has('button')).toBe(true);
    expect(set.composites.has('stack')).toBe(true);
  });

  it('absent installed means nothing installed, never a crash', () => {
    const set = buildInstalledSet({});
    expect(set.components.size).toBe(0);
    expect(set.composites.size).toBe(0);
  });
});
