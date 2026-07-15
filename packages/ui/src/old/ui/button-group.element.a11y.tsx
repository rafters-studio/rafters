/**
 * Accessibility tests for <rafters-button-group>.
 *
 * The group is a layout composition element (role="group") -- it arranges
 * whatever is slotted inside and holds no internal state. axe-core >= 4
 * descends into open shadow roots so we can assert on the host + projected
 * children directly.
 *
 * Scoping to a container (rather than document.body) avoids axe's
 * document-level "region" rule from firing on every component test.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
// Side-effect import: augments `Assertion` with axe matchers.
import 'vitest-axe/extend-expect';
import './button-group.element';
import './button.element';

let container: HTMLElement;

function mountContainer(): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Build a <rafters-button-group> populated with the given buttons. The group
 * receives an aria-label per WAI-ARIA APG guidance for role="group".
 */
function buildGroup(
  attrs: Record<string, string>,
  buttons: Array<{ variant?: string; label: string }>,
): HTMLElement {
  const host = document.createElement('rafters-button-group');
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v);
  for (const b of buttons) {
    const btn = document.createElement('rafters-button');
    if (b.variant) btn.setAttribute('variant', b.variant);
    btn.textContent = b.label;
    host.appendChild(btn);
  }
  container.appendChild(host);
  return host;
}

describe('<rafters-button-group> - Accessibility', () => {
  it('has no violations with a default horizontal group', async () => {
    mountContainer();
    buildGroup({ 'aria-label': 'Document actions' }, [
      { variant: 'outline', label: 'Cancel' },
      { variant: 'default', label: 'Save' },
    ]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a vertical group', async () => {
    mountContainer();
    buildGroup({ 'aria-label': 'View options', orientation: 'vertical' }, [
      { variant: 'ghost', label: 'Grid' },
      { variant: 'ghost', label: 'List' },
      { variant: 'ghost', label: 'Table' },
    ]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with native <button> children', async () => {
    mountContainer();
    const host = document.createElement('rafters-button-group');
    host.setAttribute('aria-label', 'Pagination');
    for (const label of ['Prev', '1', '2', '3', 'Next']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      host.appendChild(btn);
    }
    container.appendChild(host);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a mix of variants', async () => {
    mountContainer();
    buildGroup({ 'aria-label': 'Actions' }, [
      { variant: 'default', label: 'Save' },
      { variant: 'outline', label: 'Cancel' },
      { variant: 'destructive', label: 'Delete' },
    ]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('reflects role=group on the host for assistive tech', () => {
    mountContainer();
    const host = buildGroup({ 'aria-label': 'Toolbar actions' }, [
      { label: 'One' },
      { label: 'Two' },
    ]);
    expect(host.getAttribute('role')).toBe('group');
  });

  it('reflects data-orientation for consumer styling', () => {
    mountContainer();
    const horizontal = buildGroup({ 'aria-label': 'H' }, [{ label: 'A' }, { label: 'B' }]);
    expect(horizontal.getAttribute('data-orientation')).toBe('horizontal');
    const vertical = buildGroup({ 'aria-label': 'V', orientation: 'vertical' }, [
      { label: 'A' },
      { label: 'B' },
    ]);
    expect(vertical.getAttribute('data-orientation')).toBe('vertical');
  });
});
