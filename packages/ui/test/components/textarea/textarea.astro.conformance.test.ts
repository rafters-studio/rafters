/**
 * Astro performance of the Textarea score, driven end to end. AstroContainer
 * renders the SSR <textarea> with the validity projection already applied, but
 * does NOT run the <script>, so the test calls bindTextarea directly on the
 * textarea's parent (the binding root the script uses) -- that IS the script's
 * job -- then drives the same score the React and WC performances drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Textarea from '../../../src/components/textarea/textarea.astro';
import { bindTextarea } from '../../../src/components/textarea/textarea.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLTextAreaElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Textarea, { props: { id: 't', ...props } });
  // Wrap so the textarea's parent (the binding root) is a fresh element per
  // test; binding document.body directly would leak the input listener across
  // tests.
  document.body.innerHTML = `<div>${html}</div>`;
  const areaEl = document.body.querySelector<HTMLTextAreaElement>(
    'textarea[data-part="textarea"]',
  )!;
  bindTextarea(areaEl.parentElement as HTMLElement);
  return areaEl;
}

describe('textarea conformance [astro]', () => {
  it('valid field reflects aria-invalid as the literal string "false" (NOT coerced away)', async () => {
    const areaEl = await mount();
    expect(areaEl.getAttribute('aria-invalid')).toBe('false');
  });

  it('invalid field projects aria-invalid="true" and describedby wiring', async () => {
    const areaEl = await mount({ invalid: true, error: 'Required' });
    expect(areaEl.getAttribute('aria-invalid')).toBe('true');
    expect(areaEl.getAttribute('aria-describedby')).toBe('t-error');
  });

  it('seeds the initial value from child text (the textarea value quirk)', async () => {
    const areaEl = await mount({ defaultValue: 'seeded body' });
    expect(areaEl.value).toBe('seeded body');
  });

  it('typing updates the value through the setValue dispatch', async () => {
    const user = userEvent.setup();
    const areaEl = await mount();
    await user.type(areaEl, 'one{Enter}two');
    expect(areaEl.value).toBe('one\ntwo');
  });

  it('disabled gates edits: typing does not change the value', async () => {
    const user = userEvent.setup();
    const areaEl = await mount({ disabled: true, defaultValue: 'seed' });
    await user.type(areaEl, 'more');
    expect(areaEl.value).toBe('seed');
  });

  it('readonly gates edits: typing does not change the value', async () => {
    const user = userEvent.setup();
    const areaEl = await mount({ readonly: true, defaultValue: 'seed' });
    await user.type(areaEl, 'more');
    expect(areaEl.value).toBe('seed');
  });
});
