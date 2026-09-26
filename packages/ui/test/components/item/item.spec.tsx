/**
 * Browser-project performance of the Item score (React target). Item is a
 * static score with a CONFIG-DRIVEN projection -- role="option" plus the
 * selected/disabled semantics are computed once by `item.aria` and applied by
 * every performance, so this asserts the projection lands correctly on real
 * rendered React DOM.
 */
import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import { Item } from '../../../src/components/item/item';
import {
  item,
  type ItemConfig,
  type ItemPart,
  type ItemState,
} from '../../../src/components/item/item.behavior';

afterEach(async () => {
  await cleanup();
});

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/**
 * Fulfils the contract: the declared part renders, and the FULL aria
 * projection (role, aria-selected, aria-disabled, tabindex, data-selected,
 * data-disabled) matches what `item.aria` computes for the same config --
 * including every attribute a projected `undefined` says must be ABSENT.
 */
function assertAriaContract(root: HTMLElement, state: ItemState, config: ItemConfig): void {
  const el = partElement(root, 'root');
  expect(el, 'declared part "root" must be rendered').not.toBeNull();
  if (!el) return;
  const ids = { root: el.id } as Record<ItemPart, string>;
  const projection = item.aria(state, config, ids).root ?? {};
  for (const [attr, value] of Object.entries(projection)) {
    if (value === undefined) {
      expect(el.hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
    } else {
      expect(el.getAttribute(attr)).toBe(String(value));
    }
  }
}

/** An option must live inside a listbox (axe aria-required-parent). */
function Listbox({ children }: { children: React.ReactNode }) {
  return (
    <div role="listbox" aria-label="Options">
      {children}
    </div>
  );
}

describe('item [react]', () => {
  it('default row projects role=option, aria-selected=false, tabindex 0', async () => {
    const { container } = await render(
      <Listbox>
        <Item>Settings</Item>
      </Listbox>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    assertAriaContract(container, {}, {});
    expect(root.getAttribute('role')).toBe('option');
    expect(root.getAttribute('aria-selected')).toBe('false');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('selected row projects aria-selected=true + data-selected', async () => {
    const { container } = await render(
      <Listbox>
        <Item selected>Dashboard</Item>
      </Listbox>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    assertAriaContract(container, {}, { selected: true });
    expect(root.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-selected')).toBe(true);
  });

  it('disabled row projects aria-disabled + data-disabled + tabindex -1', async () => {
    const { container } = await render(
      <Listbox>
        <Item disabled>Admin Panel</Item>
      </Listbox>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    assertAriaContract(container, {}, { disabled: true });
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.getAttribute('tabindex')).toBe('-1');
  });

  it('renders icon (aria-hidden), label, and description, passing content through', async () => {
    const { container } = await render(
      <Listbox>
        <Item icon={<svg data-testid="glyph" />} description="Manage your account">
          Profile
        </Item>
      </Listbox>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    const icon = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.querySelector('[data-testid="glyph"]')).not.toBeNull();
    expect(root.textContent).toContain('Profile');
    expect(root.textContent).toContain('Manage your account');
  });

  it('only the row is a declared part -- the wrappers carry classes, no data-part', async () => {
    const { container } = await render(
      <Listbox>
        <Item icon={<span />} description="d">
          Label
        </Item>
      </Listbox>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('consumer className merges via classy', async () => {
    const { container } = await render(
      <Listbox>
        <Item className="mt-4">Row</Item>
      </Listbox>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('flex items-center');
    expect(root.className).toContain('mt-4');
  });

  it('has no keyboard contract -- the score claims no keys', () => {
    expect(item.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
