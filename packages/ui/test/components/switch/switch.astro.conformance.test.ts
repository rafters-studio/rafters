/**
 * Astro performance of the Switch score, driven end to end. AstroContainer
 * renders the SSR <button role="switch"> with the score's initial projection
 * already applied, but does NOT run the <script>, so the test calls bindSwitch
 * directly -- that IS the script's job -- then drives the same score the React
 * and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Switch from '../../../src/components/switch/switch.astro';
import { bindSwitch } from '../../../src/components/switch/switch.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Switch, {
    props: { id: 's', 'aria-label': 'Enable notifications', ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('button[data-part="root"]') as HTMLElement;
  bindSwitch(root); // the <script> does this per instance on the real page
  return root;
}

describe('switch conformance [astro]', () => {
  it('unchecked SSR: aria-checked false, data-state unchecked, role switch', async () => {
    const root = await mount();
    expect(root.getAttribute('role')).toBe('switch');
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(root.getAttribute('data-state')).toBe('unchecked');
    expect(root.querySelector('[data-part="thumb"]')?.getAttribute('data-state')).toBe('unchecked');
  });

  it('checked SSR: aria-checked true, data-state checked', async () => {
    const root = await mount({ checked: true });
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('checked');
  });

  it('click toggles aria-checked and both data-states false -> true -> false', async () => {
    const user = userEvent.setup();
    const root = await mount();
    const thumb = root.querySelector('[data-part="thumb"]');
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(thumb?.getAttribute('data-state')).toBe('checked');
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(thumb?.getAttribute('data-state')).toBe('unchecked');
  });

  it('required SSR projects aria-required', async () => {
    const root = await mount({ required: true });
    expect(root.getAttribute('aria-required')).toBe('true');
  });

  it('disabled: native disabled only, and the click does not toggle', async () => {
    const user = userEvent.setup();
    const root = await mount({ disabled: true });
    expect(root.hasAttribute('disabled')).toBe(true);
    expect(root.hasAttribute('aria-disabled')).toBe(false);
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
  });
});
