import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Item } from '../../../src/components/item/item';
import { item } from '../../../src/components/item/item.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

/** An option must live inside a listbox (axe aria-required-parent), and page
 *  content must sit inside a landmark (axe best-practice `region`); every
 *  scenario renders the row inside a listbox inside a `<main>`. */
function Listbox({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div role="listbox" aria-label="Options">
        {children}
      </div>
    </main>
  );
}

describe('item conformance [react]', () => {
  it('fulfills the contract: default row projects role=option, aria-selected=false, tabindex 0', async () => {
    render(
      <Listbox>
        <Item data-testid="i">Settings</Item>
      </Listbox>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    assertContractFulfillment(item, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBe('option');
    expect(root.getAttribute('tabindex')).toBe('0');
    await assertAxeClean(body());
  });

  it('selected row projects aria-selected=true + data-selected, axe-clean', async () => {
    render(
      <Listbox>
        <Item selected>Dashboard</Item>
      </Listbox>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    assertContractFulfillment(item, root, {}, { selected: true }, ['root']);
    expect(root.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-selected')).toBe(true);
    await assertAxeClean(body());
  });

  it('disabled row projects aria-disabled + data-disabled + tabindex -1, axe-clean', async () => {
    render(
      <Listbox>
        <Item disabled>Admin Panel</Item>
      </Listbox>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    assertContractFulfillment(item, root, {}, { disabled: true }, ['root']);
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.getAttribute('tabindex')).toBe('-1');
    await assertAxeClean(body());
  });

  it('renders icon (aria-hidden), label, and description, passing content through', () => {
    render(
      <Listbox>
        <Item icon={<svg data-testid="glyph" />} description="Manage your account">
          Profile
        </Item>
      </Listbox>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    const icon = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.querySelector('[data-testid="glyph"]')).not.toBeNull();
    expect(root.textContent).toContain('Profile');
    expect(root.textContent).toContain('Manage your account');
  });

  it('only the row is a declared part -- the wrappers carry classes, no data-part', () => {
    render(
      <Listbox>
        <Item icon={<span />} description="d">
          Label
        </Item>
      </Listbox>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('consumer className merges via classy', () => {
    render(
      <Listbox>
        <Item className="mt-4">Row</Item>
      </Listbox>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.className).toContain('flex items-center');
    expect(root.className).toContain('mt-4');
  });

  it('has no keyboard contract -- the score claims no keys', () => {
    expect(item.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
