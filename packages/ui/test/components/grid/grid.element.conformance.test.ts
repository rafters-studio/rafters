/**
 * WC render adapter + the shared grid conformance suite (~10 lines,
 * test/harness/conformance.ts header). Importing grid.element.ts registers
 * <rafters-grid> and <rafters-grid-item> idempotently (guarded internally).
 */
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/grid/grid.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runGridConformance,
  type GridAdapter,
  type GridChildSpec,
  type GridScenarioProps,
} from './conformance-suite';

function buildChild(spec: GridChildSpec): HTMLElement {
  if (spec.priority === undefined && spec.colSpan === undefined && spec.rowSpan === undefined) {
    const span = document.createElement('span');
    span.textContent = spec.text;
    return span;
  }
  const item = document.createElement('rafters-grid-item');
  if (spec.priority) item.setAttribute('priority', spec.priority);
  if (spec.colSpan) item.setAttribute('col-span', String(spec.colSpan));
  if (spec.rowSpan) item.setAttribute('row-span', String(spec.rowSpan));
  item.textContent = spec.text;
  return item;
}

function renderGrid(props: GridScenarioProps, children: GridChildSpec[]): RenderResult {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const element = document.createElement('rafters-grid');
  if (props.preset) element.setAttribute('preset', props.preset);
  if (props.pattern) element.setAttribute('pattern', props.pattern);
  if (props.columns !== undefined) element.setAttribute('columns', String(props.columns));
  if (props.gap) element.setAttribute('gap', props.gap);
  if (props.padding) element.setAttribute('padding', props.padding);
  if (props.role) element.setAttribute('grid-role', props.role);
  if (props.ariaLabel) element.setAttribute('aria-label', props.ariaLabel);
  for (const spec of children) element.appendChild(buildChild(spec));
  host.appendChild(element);
  const root = element.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('wc adapter: no [data-part="root"] rendered');
  return { host, root, cleanup: () => host.remove() };
}

const wcAdapter: GridAdapter = {
  name: 'wc',
  render: renderGrid,
};

afterEach(() => {
  document.body.replaceChildren();
});

runGridConformance(wcAdapter);

describe('grid conformance [wc] framework-specific', () => {
  it('reordering the tree does not change which item is the hero', () => {
    const result = renderGrid({ preset: 'golden' }, [
      { text: 'Rail', priority: 'secondary' },
      { text: 'Hero', priority: 'primary' },
    ]);
    const hero = result.host.querySelector('[data-priority="primary"]');
    expect(hero?.textContent).toBe('Hero');
    result.cleanup();
  });

  it('role=grid: arrow keys rove in two dimensions inside the shadow tree', () => {
    const result = renderGrid({ role: 'grid', columns: 2, ariaLabel: 'Cells' }, [
      { text: 'a' },
      { text: 'b' },
      { text: 'c' },
      { text: 'd' },
    ]);
    const cells = Array.from(result.root.querySelectorAll<HTMLElement>('[role="gridcell"]'));
    expect(cells[0]?.getAttribute('tabindex')).toBe('0');
    expect(cells[1]?.getAttribute('tabindex')).toBe('-1');

    const grid = result.host.querySelector('rafters-grid') as HTMLElement;
    const shadowActive = () => (grid.shadowRoot as ShadowRoot).activeElement;

    const press = (key: string) => {
      shadowActive()?.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, composed: true }),
      );
    };

    cells[0]?.focus();
    expect(shadowActive()).toBe(cells[0]);
    press('ArrowRight');
    expect(shadowActive()).toBe(cells[1]);
    press('ArrowDown');
    expect(shadowActive()).toBe(cells[3]);
    press('ArrowLeft');
    expect(shadowActive()).toBe(cells[2]);
    press('ArrowUp');
    expect(shadowActive()).toBe(cells[0]);
    press('End');
    expect(shadowActive()).toBe(cells[3]);
    press('Home');
    expect(shadowActive()).toBe(cells[0]);

    result.cleanup();
  });

  it('consumer class attribute merges via classy onto the root', () => {
    const result = renderGrid({}, [{ text: 'x' }]);
    result.host.querySelector('rafters-grid')?.setAttribute('class', 'min-h-screen');
    const root = result.host
      .querySelector('rafters-grid')
      ?.shadowRoot?.querySelector('[data-part="root"]');
    expect(root?.className).toContain('grid');
    expect(root?.className).toContain('min-h-screen');
    result.cleanup();
  });
});
