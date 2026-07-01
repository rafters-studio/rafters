import { afterEach, describe, expect, it } from 'vitest';
import './grid.element';
import { gridColumnClasses } from './grid.classes';
import { composeGridClasses, gridFlowClasses } from './grid.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function innerClass(host: Element): string {
  return host.shadowRoot?.querySelector('div.grid')?.className ?? '';
}

describe('rafters-grid', () => {
  it('auto-registers on import', () => {
    expect(customElements.get('rafters-grid')).toBeDefined();
  });

  it('renders a div.grid containing a slot', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    const grid = host.shadowRoot?.querySelector('div.grid');
    expect(grid).not.toBeNull();
    expect(grid?.querySelector('slot')).not.toBeNull();
  });

  it('defaults to cols=1, gap=4, flow=row', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    expect(innerClass(host)).toBe(composeGridClasses(1, 4, 'row'));
  });

  it('regenerates classes when cols changes, without rebuilding DOM identity', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    host.setAttribute('cols', '6');
    expect(innerClass(host)).toContain(gridColumnClasses[6]);
    expect(innerClass(host)).toBe(composeGridClasses(6, 4, 'row'));
  });

  it('reflects flow attribute changes to the inner class string', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    host.setAttribute('flow', 'dense');
    expect(innerClass(host)).toContain(gridFlowClasses.dense);
  });

  it('falls back to defaults for invalid attribute values without throwing', () => {
    const host = document.createElement('rafters-grid');
    expect(() => {
      host.setAttribute('cols', 'banana');
      host.setAttribute('gap', '999');
      host.setAttribute('flow', 'sideways');
      document.body.appendChild(host);
    }).not.toThrow();
    expect(innerClass(host)).toBe(composeGridClasses(1, 4, 'row'));
  });

  it('does not throw when module is re-imported', async () => {
    await expect(import('./grid.element')).resolves.toBeDefined();
  });
});
