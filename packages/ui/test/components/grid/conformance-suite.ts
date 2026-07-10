/**
 * Grid conformance suite -- one suite, run per render adapter. Portable
 * scenarios only: class-string checks, structure/aria, axe. Interaction
 * (arrow-key roving) stays framework-specific -- React's existing
 * userEvent test targets `document.activeElement` correctly; the WC
 * equivalent must dispatch on the actually-focused shadow-DOM element and
 * assert against `shadowRoot.activeElement` instead (same split container
 * used for its grid/columns-nesting and className-merge cases).
 */
import { describe, expect, it } from 'vitest';
import {
  grid,
  type ContentPriority,
  type GridConfig,
} from '../../../src/components/grid/grid.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  type RenderResult,
} from '../../harness/conformance';

export interface GridScenarioProps {
  preset?: GridConfig['preset'];
  pattern?: GridConfig['pattern'];
  /** Concrete numbers or 'auto' only -- the portable subset both render
   *  adapters accept (the WC attribute surface does not parse the
   *  responsive breakpoint object, same disposition Container's WC took). */
  columns?: GridConfig['columns'];
  gap?: GridConfig['gap'];
  padding?: GridConfig['padding'];
  role?: GridConfig['role'];
  ariaLabel?: string;
}

export interface GridChildSpec {
  text: string;
  priority?: ContentPriority;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3;
}

export interface GridAdapter {
  name: string;
  render(props: GridScenarioProps, children: GridChildSpec[]): RenderResult | Promise<RenderResult>;
}

function configFor(props: GridScenarioProps): GridConfig {
  return {
    preset: props.preset,
    pattern: props.pattern,
    columns: props.columns,
    gap: props.gap,
    padding: props.padding,
    role: props.role,
    ariaLabel: props.ariaLabel,
  };
}

export function runGridConformance(adapter: GridAdapter): void {
  describe(`grid conformance [${adapter.name}]`, () => {
    it('presentation grid: silent furniture, priority projected onto items', async () => {
      const result = await adapter.render({ preset: 'bento', pattern: 'dashboard' }, [
        { text: 'Metric', priority: 'primary' },
        { text: 'Chart', priority: 'secondary' },
        { text: 'Feed', priority: 'tertiary' },
      ]);
      try {
        expect(result.root.hasAttribute('role')).toBe(false);
        expect(result.root.getAttribute('data-preset')).toBe('bento');
        // Query from `host`, not `root`: items self-project data-priority
        // on their OWN node (light DOM in the WC case), which a query
        // rooted INSIDE a shadow tree cannot see across into slotted
        // content -- `host` is the one scope both adapters share.
        const items = result.host.querySelectorAll('[data-priority]');
        expect(items).toHaveLength(3);
        expect(items[0]?.getAttribute('data-priority')).toBe('primary');
        const config = configFor({ preset: 'bento', pattern: 'dashboard' });
        const state = grid.initialState(config);
        assertContractFulfillment(grid, result.root, state, config, ['root']);
        await assertAxeClean(result.host);
      } finally {
        result.cleanup();
      }
    });

    it('golden preset: placement class string carried on root', async () => {
      const result = await adapter.render({ preset: 'golden' }, [
        { text: 'Rail', priority: 'secondary' },
        { text: 'Hero', priority: 'primary' },
      ]);
      try {
        expect(result.root.className).toContain('[&>[data-priority=primary]]:col-span-2');
      } finally {
        result.cleanup();
      }
    });

    it('fixed linear columns carry the grid-cols class', async () => {
      const result = await adapter.render({ columns: 4 }, [{ text: 'x' }]);
      try {
        expect(result.root.className).toContain('grid-cols-4');
      } finally {
        result.cleanup();
      }
    });

    it('explicit gap/padding override the auto-scaling default', async () => {
      const result = await adapter.render({ gap: '6', padding: '4' }, [{ text: 'x' }]);
      try {
        expect(result.root.className).toContain('gap-6');
        expect(result.root.className).toContain('p-4');
        expect(result.root.className).not.toContain('@md:gap-4');
      } finally {
        result.cleanup();
      }
    });

    it('item spans project as class strings on the item', async () => {
      const result = await adapter.render({ columns: 4 }, [
        { text: 'Wide', priority: 'primary', colSpan: 2, rowSpan: 2 },
      ]);
      try {
        const item = result.host.querySelector('[data-priority="primary"]');
        expect(item?.className).toContain('col-span-2');
        expect(item?.className).toContain('row-span-2');
      } finally {
        result.cleanup();
      }
    });

    it('role=grid: rows and gridcells rendered, structure axe-clean', async () => {
      const result = await adapter.render({ role: 'grid', columns: 2, ariaLabel: 'Photo picker' }, [
        { text: 'One' },
        { text: 'Two' },
        { text: 'Three' },
      ]);
      try {
        expect(result.root.getAttribute('role')).toBe('grid');
        expect(result.root.getAttribute('aria-label')).toBe('Photo picker');
        expect(result.root.querySelectorAll('[role="row"]')).toHaveLength(2);
        expect(result.root.querySelectorAll('[role="gridcell"]')).toHaveLength(3);
        const config = configFor({ role: 'grid', columns: 2, ariaLabel: 'Photo picker' });
        const state = grid.initialState(config);
        assertContractFulfillment(grid, result.root, state, config, ['root', 'row', 'cell']);
        await assertAxeClean(result.host);
      } finally {
        result.cleanup();
      }
    });
  });
}
