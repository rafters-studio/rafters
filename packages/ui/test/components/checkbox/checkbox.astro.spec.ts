/**
 * Astro performance of the Checkbox score, driven end to end. AstroContainer
 * renders the SSR `<button role="checkbox">` with the score's initial
 * projection already applied, but does NOT run the <script>, so the test calls
 * bindCheckbox directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Checkbox from '../../../src/components/checkbox/checkbox.astro';
import { bindCheckbox } from '../../../src/components/checkbox/checkbox.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function renderHtml(props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Checkbox, {
    props: { id: 'c', 'aria-label': 'Accept terms', ...props },
  });
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  document.body.innerHTML = await renderHtml(props);
  const root = document.body.querySelector('button[data-part="root"]') as HTMLElement;
  bindCheckbox(root); // the <script> does this per instance on the real page
  return root;
}

describe('checkbox conformance [astro]', () => {
  it('toggles aria-checked false -> true -> false across clicks', async () => {
    const user = userEvent.setup();
    const root = await mount();
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(root.getAttribute('data-state')).toBe('unchecked');
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('checked');
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
  });

  it('an indeterminate box is projected mixed and toggles to checked', async () => {
    const user = userEvent.setup();
    const root = await mount({ checked: 'indeterminate' });
    expect(root.getAttribute('aria-checked')).toBe('mixed');
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('true');
  });

  it('required is projected on the SSR markup', async () => {
    const root = await mount({ required: true });
    expect(root.getAttribute('aria-required')).toBe('true');
  });

  it('disabled gates the toggle: aria-checked does not change on click', async () => {
    const user = userEvent.setup();
    const root = await mount({ disabled: true });
    expect(root.hasAttribute('disabled')).toBe(true);
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
  });

  it('a named box submits its value only while checked (FormData contract)', async () => {
    const user = userEvent.setup();
    document.body.innerHTML = `<form>${await renderHtml({ name: 'terms' })}</form>`;
    const form = document.body.querySelector('form')!;
    const root = document.body.querySelector('button[data-part="root"]') as HTMLElement;
    bindCheckbox(root);

    expect(new FormData(form).get('terms')).toBeNull();
    await user.click(root);
    expect(new FormData(form).get('terms')).toBe('on');
    await user.click(root);
    expect(new FormData(form).get('terms')).toBeNull();
  });
});
