/**
 * Astro performance of the Button score, driven end to end. AstroContainer
 * renders the SSR <button> with the score's initial projection already
 * applied, but does NOT run the <script>, so the test calls bindButton
 * directly -- that IS the script's job -- then drives the same score the React
 * and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Button from '../../../src/components/button/button.astro';
import { bindButton } from '../../../src/components/button/button.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Button, { props: { id: 'b', label: 'Go', ...props }, slots });
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const html = await render(props);
  document.body.innerHTML = html;
  const root = document.body.querySelector('button[data-part="root"]') as HTMLElement;
  bindButton(root); // the <script> does this per instance on the real page
  return root;
}

describe('button [astro]', () => {
  it('toggle: aria-pressed toggles false -> true -> false across clicks', async () => {
    const user = userEvent.setup();
    const root = await mount({ toggle: true });
    expect(root.getAttribute('aria-pressed')).toBe('false');
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('true');
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('a non-toggle button projects NO aria-pressed', async () => {
    const root = await mount();
    expect(root.hasAttribute('aria-pressed')).toBe(false);
  });

  it('loading: aria-busy is projected on the SSR markup', async () => {
    const root = await mount({ loading: true });
    expect(root.getAttribute('aria-busy')).toBe('true');
  });

  it('soft-disabled gates the press: aria-pressed does not change on click', async () => {
    const user = userEvent.setup();
    const root = await mount({ toggle: true, softDisabled: true });
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.getAttribute('aria-pressed')).toBe('false');
    await user.click(root);
    // The press gate rejected the activation; state is unchanged.
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('icons: the server markup already hides each wrapper, before any script runs', async () => {
    const html = await render(
      {},
      { 'start-icon': '<svg><title>Mail</title></svg>', 'end-icon': '<svg></svg>' },
    );
    document.body.innerHTML = html; // no bindButton: the SSR render alone
    const start = document.querySelector('[data-part="startIcon"]');
    const end = document.querySelector('[data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    const order = [...document.querySelectorAll('[data-part]')].map((el) =>
      el.getAttribute('data-part'),
    );
    expect(order).toEqual(['root', 'startIcon', 'label', 'endIcon']);
  });

  it('icons: no wrapper when no icon slot is given', async () => {
    const root = await mount();
    expect(root.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(root.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
