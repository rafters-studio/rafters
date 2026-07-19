/**
 * Astro performance of the Item score. Item ships NO <script> and has NO
 * bindItem -- the server markup carries the shared classes, the named slots,
 * and the SAME config-driven `item.aria` projection. This suite renders the
 * SSR markup and asserts the projection and slot structure agree with React
 * and the Web Component. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Item from '../../../src/components/item/item.astro';
import { item } from '../../../src/components/item/item.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

/** An option needs a listbox ancestor (axe aria-required-parent), and page
 *  content needs a landmark (axe best-practice `region`); wrap the SSR markup. */
async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Item, { props, slots });
  document.body.innerHTML = `<main><div role="listbox" aria-label="Options">${html}</div></main>`;
  return document.body;
}

describe('item conformance [astro]', () => {
  it('renders a root row part carrying the shared item classes', async () => {
    const body = await render({}, { default: 'Settings' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('flex items-center');
    expect(root.className).toContain('rounded-md');
  });

  it('fulfills the contract: default projects role=option, aria-selected=false, tabindex 0', async () => {
    const body = await render({}, { default: 'Settings' });
    const root = partElement(body, 'root') as HTMLElement;
    assertContractFulfillment(item, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBe('option');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('selected projects aria-selected=true + data-selected', async () => {
    const body = await render({ selected: true }, { default: 'Dashboard' });
    const root = partElement(body, 'root') as HTMLElement;
    assertContractFulfillment(item, root, {}, { selected: true }, ['root']);
    expect(root.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-selected')).toBe(true);
  });

  it('disabled projects aria-disabled + data-disabled + tabindex -1', async () => {
    const body = await render({ disabled: true }, { default: 'Admin' });
    const root = partElement(body, 'root') as HTMLElement;
    assertContractFulfillment(item, root, {}, { disabled: true }, ['root']);
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.getAttribute('tabindex')).toBe('-1');
  });

  it('renders the icon slot (aria-hidden) and the description', async () => {
    const body = await render(
      { description: 'Manage your account' },
      { default: 'Profile', icon: '<svg data-testid="glyph"></svg>' },
    );
    const root = partElement(body, 'root') as HTMLElement;
    const icon = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(root.textContent).toContain('Profile');
    expect(root.textContent).toContain('Manage your account');
  });

  it('only the row is a declared part -- wrappers carry classes, no data-part', async () => {
    const body = await render({}, { default: 'Row' });
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('is axe-clean inside a listbox', async () => {
    const body = await render({ selected: true }, { default: 'Dashboard' });
    await assertAxeClean(body);
  });
});
