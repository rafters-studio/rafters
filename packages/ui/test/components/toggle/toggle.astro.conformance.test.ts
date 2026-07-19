/**
 * Astro performance of the Toggle score, driven end to end. AstroContainer
 * renders the SSR <button> with the score's initial projection already
 * applied, but does NOT run the <script>, so the test calls bindToggle
 * directly -- that IS the script's job -- then drives the same score the React
 * and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Toggle from '../../../src/components/toggle/toggle.astro';
import { bindToggle } from '../../../src/components/toggle/toggle.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Toggle, {
    props: { id: 't', label: 'Bold', ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('button[data-part="root"]') as HTMLElement;
  bindToggle(root); // the <script> does this per instance on the real page
  return root;
}

describe('toggle conformance [astro]', () => {
  it('aria-pressed and data-state swap off -> on -> off across clicks', async () => {
    const user = userEvent.setup();
    const root = await mount();
    expect(root.getAttribute('aria-pressed')).toBe('false');
    expect(root.getAttribute('data-state')).toBe('off');
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('on');
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
    expect(root.getAttribute('data-state')).toBe('off');
  });

  it('defaultPressed server-renders aria-pressed true and data-state on', async () => {
    const root = await mount({ defaultPressed: true });
    expect(root.getAttribute('aria-pressed')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('on');
  });

  it('hard disabled gates the press: aria-pressed does not change on click', async () => {
    const user = userEvent.setup();
    const root = await mount({ disabled: true });
    expect(root.hasAttribute('disabled')).toBe(true);
    expect(root.hasAttribute('aria-disabled')).toBe(false);
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });
});
