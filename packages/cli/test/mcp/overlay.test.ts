import { describe as vdescribe, expect, it } from 'vitest';
import { assembleGraph, describe } from '../../src/mcp/graph.js';
import {
  buildInstalledSet,
  describeWithOverlay,
  type OverlayContext,
  type OverlayExpandedNodeResult,
  type OverlayNodeResult,
} from '../../src/mcp/overlay.js';
import type { Facet, RegistryItem } from '../../src/registry/types.js';

// One RegistryItem[] feeds assembleGraph; the graph node carries each item's
// per-target facets, so the overlay reads rendersForTarget straight off the node.
//   button (ui): facets for astro + wc, but NO vue (the real manifest gap).
//   modal  (ui): no facets at all.
// astro and wc carry DIFFERENT props -- proof that the expanded payload is
// target-lensed, not just that the stamp landed on a shared empty fixture.
const astroFacet: Facet = {
  props: { size: { type: 'enum', values: ['sm', 'md', 'lg'] } },
  snippet: '<Button size="md" />',
};
const wcFacet: Facet = {
  props: { variant: { type: 'enum', values: ['solid', 'outline'] } },
  snippet: '<raf-button variant="solid"></raf-button>',
};

const items: RegistryItem[] = [
  {
    name: 'button',
    type: 'ui',
    primitives: [],
    files: [],
    rules: [],
    composites: [],
    facets: { astro: astroFacet, wc: wcFacet },
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

vdescribe('describeWithOverlay -- known gap: bare-id probe (#2074)', () => {
  it('button.? re-resolves to a NodeResult but is address-gated out and stays unstamped', () => {
    // Pins the KNOWN GAP documented in overlay.ts's file header: `<id>.?` peels
    // the probe and re-resolves to the same NodeResult shape `describe(<id>)`
    // returns, but `!addr.includes('.')` gates it OUT of the single-node
    // stamping branch (the address still contains a dot). Contrast with
    // `button.*.?` below, which the expanded-node branch stamps because that
    // branch is structural, not address-gated. An unwitting "fix" to the
    // single-node guard would silently flip this -- this test is the tripwire.
    const button = describeWithOverlay('button.?', graph, ctxAstroInstalled);
    expect(button).not.toHaveProperty('presence');
    expect(button).not.toHaveProperty('rendersForTarget');
    expect(button).not.toHaveProperty('target');
    expect(button).toMatchObject({ id: 'button', kind: 'component' });
  });
});

vdescribe('describeWithOverlay -- expanded-node stamping (#2101)', () => {
  it('stamps installed presence, echoed target, and rendersForTarget on button.*', () => {
    const button = describeWithOverlay(
      'button.*',
      graph,
      ctxAstroInstalled,
    ) as OverlayExpandedNodeResult;
    expect(button.presence).toBe('installed');
    expect(button.target).toBe('astro');
    expect(button.rendersForTarget).toBe(true);
    // Target-lensed: astro's facet ('size'), never wc's ('variant').
    expect(button.props).toHaveProperty('size');
    expect(button.props).not.toHaveProperty('variant');
  });

  it('reports available presence and rendersForTarget false for an uninstalled, facet-less node', () => {
    const modal = describeWithOverlay(
      'modal.*',
      graph,
      ctxAstroInstalled,
    ) as OverlayExpandedNodeResult;
    expect(modal.presence).toBe('available');
    expect(modal.rendersForTarget).toBe(false);
  });

  it('checks the composites installed set on the expanded path (stack.*)', () => {
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
    const stack = describeWithOverlay('stack.*', composed, ctx) as OverlayExpandedNodeResult;
    expect(stack.presence).toBe('installed');
    expect(stack.rendersForTarget).toBe(false); // stack has no astro facet
  });

  it('probing an expanded node (button.*.?) still stamps -- structural, not address-gated', () => {
    const button = describeWithOverlay(
      'button.*.?',
      graph,
      ctxAstroInstalled,
    ) as OverlayExpandedNodeResult;
    expect(button.presence).toBe('installed');
    expect(button.rendersForTarget).toBe(true);
  });

  it('describe(<id>.props.*) has no node identity and stays unstamped', () => {
    const props = describeWithOverlay('button.props.*', graph, ctxAstroInstalled);
    expect(props).toEqual({
      expanded: true,
      props: { size: { type: 'enum', values: ['sm', 'md', 'lg'] } },
    });
    expect(props).not.toHaveProperty('presence');
  });

  it('a probe miss (nope.?) passes through as null, unstamped', () => {
    expect(describeWithOverlay('nope.?', graph, ctxAstroInstalled)).toBeNull();
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
