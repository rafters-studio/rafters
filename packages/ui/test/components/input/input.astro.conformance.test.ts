/**
 * Astro performance of the Input score, driven end to end. AstroContainer
 * renders the SSR <input> with the validity projection already applied, but
 * does NOT run the <script>, so the test calls bindInput directly on the
 * input's parent (the binding root the script uses) -- that IS the script's
 * job -- then drives the same score the React and WC performances drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Input from '../../../src/components/input/input.astro';
import { bindInput } from '../../../src/components/input/input.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLInputElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Input, { props: { id: 'i', ...props } });
  // Wrap so the input's parent (the binding root) is a fresh element per test;
  // binding document.body directly would leak the input listener across tests.
  document.body.innerHTML = `<div>${html}</div>`;
  const inputEl = document.body.querySelector<HTMLInputElement>('input[data-part="input"]')!;
  bindInput(inputEl.parentElement as HTMLElement);
  return inputEl;
}

describe('input conformance [astro]', () => {
  it('valid field reflects aria-invalid as the literal string "false" (NOT coerced away)', async () => {
    const inputEl = await mount();
    expect(inputEl.getAttribute('aria-invalid')).toBe('false');
  });

  it('invalid field projects aria-invalid="true" and describedby wiring', async () => {
    const inputEl = await mount({ invalid: true, error: 'Required' });
    expect(inputEl.getAttribute('aria-invalid')).toBe('true');
    expect(inputEl.getAttribute('aria-describedby')).toBe('i-error');
  });

  it('typing updates the value through the setValue dispatch', async () => {
    const user = userEvent.setup();
    const inputEl = await mount();
    await user.type(inputEl, 'hello');
    expect(inputEl.value).toBe('hello');
  });

  it('disabled gates edits: typing does not change the value', async () => {
    const user = userEvent.setup();
    const inputEl = await mount({ disabled: true, defaultValue: 'seed' });
    await user.type(inputEl, 'more');
    expect(inputEl.value).toBe('seed');
  });

  it('readonly gates edits: typing does not change the value', async () => {
    const user = userEvent.setup();
    const inputEl = await mount({ readonly: true, defaultValue: 'seed' });
    await user.type(inputEl, 'more');
    expect(inputEl.value).toBe('seed');
  });
});
