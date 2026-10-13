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

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Input, { props: { id: 'i', ...props }, slots });
}

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLInputElement> {
  const html = await render(props, slots);
  // Wrap so the input's parent (the binding root) is a fresh element per test;
  // binding document.body directly would leak the input listener across tests.
  document.body.innerHTML = `<div>${html}</div>`;
  const inputEl = document.body.querySelector<HTMLInputElement>('input[data-part="input"]')!;
  bindInput((inputEl.closest('[data-part="row"]') ?? inputEl).parentElement as HTMLElement);
  return inputEl;
}

describe('input [astro]', () => {
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

describe('input icons [astro]', () => {
  it('the server markup already hides each wrapper, before any script runs', async () => {
    const html = await render(
      {},
      { 'start-icon': '<svg><title>Magnifier</title></svg>', 'end-icon': '<svg></svg>' },
    );
    document.body.innerHTML = html; // no bindInput: the SSR render alone
    const start = document.querySelector('[data-part="addonStart"] > [data-part="startIcon"]');
    const end = document.querySelector('[data-part="addonEnd"] > [data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    const order = [...document.querySelectorAll('[data-part]')].map((el) =>
      el.getAttribute('data-part'),
    );
    expect(order).toEqual(['row', 'addonStart', 'startIcon', 'input', 'addonEnd', 'endIcon']);
  });

  it('start-only and end-only render one wrapper', async () => {
    document.body.innerHTML = await render({}, { 'start-icon': '<svg></svg>' });
    expect(document.querySelector('[data-part="startIcon"]')).not.toBeNull();
    expect(document.querySelector('[data-part="endIcon"]')).toBeNull();
    document.body.innerHTML = await render({}, { 'end-icon': '<svg></svg>' });
    expect(document.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(document.querySelector('[data-part="endIcon"]')).not.toBeNull();
  });

  it('no row and no wrapper when no icon slot is given', async () => {
    await mount();
    expect(document.querySelector('[data-part="row"]')).toBeNull();
    expect(document.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(document.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('the error sibling stays wired when the field sits in a row', async () => {
    const inputEl = await mount(
      { invalid: true, error: 'Required' },
      { 'start-icon': '<svg></svg>' },
    );
    expect(inputEl.getAttribute('aria-describedby')).toBe('i-error');
  });
});
