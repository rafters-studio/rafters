/**
 * WC performance of the input score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves value-sync and
 * the validity projection (including the aria-invalid="false" that only lands
 * because the bind applies with {validate:false}) through the DOM binding.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersInput } from '../../../src/components/input/input.element';

beforeAll(() => {
  if (!customElements.get('rafters-input')) customElements.define('rafters-input', RaftersInput);
});

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('rafters-input') as HTMLElement;
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-part="input"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('input conformance [wc]', () => {
  it('valid: projects aria-invalid="false" literally (validate:false, not coerced truthy)', async () => {
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" /></rafters-input>`,
    );
    expect(input().getAttribute('aria-invalid')).toBe('false');
    expect(input().getAttribute('data-state')).toBe('default');
    expect(input().hasAttribute('aria-describedby')).toBe(false);
  });

  it('invalid: aria-invalid true, wired to the error id', async () => {
    await mount(
      `<rafters-input>
        <input data-part="input" id="i" aria-label="Name" aria-invalid="true" value="" />
        <div data-part="error" id="i-error">Required</div>
      </rafters-input>`,
    );
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('i-error');
    expect(input().getAttribute('data-state')).toBe('invalid');
  });

  it('typing moves the value (native input owns the caret)', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" /></rafters-input>`,
    );
    await user.type(input(), 'abc');
    expect(input().value).toBe('abc');
  });

  it('disabled: typing is refused', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" disabled /></rafters-input>`,
    );
    await user.type(input(), 'x');
    expect(input().value).toBe('');
  });

  it('read-only: typing is refused', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="seed" readonly /></rafters-input>`,
    );
    await user.type(input(), 'x');
    expect(input().value).toBe('seed');
  });
});
