/**
 * Astro performance of the Item score. Item ships NO <script> and has NO
 * bindItem -- the server markup carries the shared classes, the named slots,
 * and the SAME config-driven `item.aria` projection. This suite renders the
 * SSR markup and asserts the projection and slot structure agree with React
 * and the Web Component. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Item from '../../../src/components/item/item.astro';
import {
  item,
  type ItemConfig,
  type ItemPart,
  type ItemState,
} from '../../../src/components/item/item.behavior';

afterEach(() => {
  document.body.innerHTML = '';
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

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Item, { props, slots });
  document.body.innerHTML = `<div role="listbox" aria-label="Options">${html}</div>`;
  return document.body;
}

describe('item [astro]', () => {
  it('renders a root row part carrying the shared item classes', async () => {
    const body = await render({}, { default: 'Settings' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('flex items-center');
    expect(root.className).toContain('rounded-md');
  });

  it('default projects role=option, aria-selected=false, tabindex 0', async () => {
    const body = await render({}, { default: 'Settings' });
    const root = partElement(body, 'root') as HTMLElement;
    assertAriaContract(body, {}, {});
    expect(root.getAttribute('role')).toBe('option');
    expect(root.getAttribute('aria-selected')).toBe('false');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('selected projects aria-selected=true + data-selected', async () => {
    const body = await render({ selected: true }, { default: 'Dashboard' });
    const root = partElement(body, 'root') as HTMLElement;
    assertAriaContract(body, {}, { selected: true });
    expect(root.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-selected')).toBe(true);
  });

  it('disabled projects aria-disabled + data-disabled + tabindex -1', async () => {
    const body = await render({ disabled: true }, { default: 'Admin' });
    const root = partElement(body, 'root') as HTMLElement;
    assertAriaContract(body, {}, { disabled: true });
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

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const body = await render({ class: 'mt-4' }, { default: 'Settings' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('flex items-center');
    expect(root.className).not.toContain('mt-4');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('only the row is a declared part -- wrappers carry classes, no data-part', async () => {
    const body = await render({}, { default: 'Row' });
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });
});
