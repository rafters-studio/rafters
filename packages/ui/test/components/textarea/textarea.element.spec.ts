/**
 * WC performance of the textarea score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves value-sync and
 * the validity projection (including the aria-invalid="false" that only lands
 * because the bind applies with {validate:false}) through the DOM binding.
 *
 * A <textarea> holds its initial value as CHILD TEXT, so seeded markup places
 * the value between the tags rather than in a `value` attribute.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersTextarea } from '../../../src/components/textarea/textarea.element';

beforeAll(() => {
  if (!customElements.get('rafters-textarea')) {
    customElements.define('rafters-textarea', RaftersTextarea);
  }
});

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('rafters-textarea') as HTMLElement;
}

const area = () => document.body.querySelector<HTMLTextAreaElement>('[data-part="textarea"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('textarea conformance [wc]', () => {
  it('valid: projects aria-invalid="false" literally (validate:false, not coerced truthy)', async () => {
    await mount(
      `<rafters-textarea><textarea data-part="textarea" id="t" aria-label="Message"></textarea></rafters-textarea>`,
    );
    expect(area().getAttribute('aria-invalid')).toBe('false');
    expect(area().getAttribute('data-state')).toBe('default');
    expect(area().hasAttribute('aria-describedby')).toBe(false);
  });

  it('invalid: aria-invalid true, wired to the error id', async () => {
    await mount(
      `<rafters-textarea>
        <textarea data-part="textarea" id="t" aria-label="Message" aria-invalid="true"></textarea>
        <div data-part="error" id="t-error">Required</div>
      </rafters-textarea>`,
    );
    expect(area().getAttribute('aria-invalid')).toBe('true');
    expect(area().getAttribute('aria-describedby')).toBe('t-error');
    expect(area().getAttribute('data-state')).toBe('invalid');
  });

  it('typing moves the value, including newlines (native textarea owns the caret)', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-textarea><textarea data-part="textarea" id="t" aria-label="Message"></textarea></rafters-textarea>`,
    );
    await user.type(area(), 'one{Enter}two');
    expect(area().value).toBe('one\ntwo');
  });

  it('disabled: typing is refused', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-textarea><textarea data-part="textarea" id="t" aria-label="Message" disabled></textarea></rafters-textarea>`,
    );
    await user.type(area(), 'x');
    expect(area().value).toBe('');
  });

  it('read-only: typing is refused, seeded child text is preserved', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-textarea><textarea data-part="textarea" id="t" aria-label="Message" readonly>seed</textarea></rafters-textarea>`,
    );
    await user.type(area(), 'x');
    expect(area().value).toBe('seed');
  });
});
