import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { RaftersTextarea } from '../../../src/components/textarea/textarea.element';
import {
  textareaBehavior,
  type TextareaConfig,
} from '../../../src/components/textarea/textarea.behavior';
import { textareaClassSet } from '../../../src/components/textarea/textarea.classes';

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

async function mount(attrs = '', inner = ''): Promise<HTMLTextAreaElement> {
  document.body.innerHTML = `<form><rafters-textarea name="msg" aria-label="Message" ${attrs}>${inner}</rafters-textarea></form>`;
  await Promise.resolve();
  return must(
    document.querySelector<HTMLTextAreaElement>('rafters-textarea [data-part="textarea"]'),
    'textarea field',
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

const scenarios: Array<[string, string, TextareaConfig, string]> = [
  ['bare', '', {}, ''],
  ['invalid', 'invalid', { invalid: true }, ''],
  ['required', 'required', { required: true }, ''],
  ['disabled', 'disabled', { disabled: true }, ''],
  ['readonly', 'readonly', { readonly: true }, ''],
  ['seeded value', 'value="hi"', {}, 'hi'],
];

describe('textarea [wc]', () => {
  it('upgrades and renders one textarea part', async () => {
    document.body.innerHTML = '<rafters-textarea aria-label="Message"></rafters-textarea>';
    await Promise.resolve();
    const host = must(document.querySelector('rafters-textarea'), 'host');
    expect(host).toBeInstanceOf(RaftersTextarea);
    expect(host.querySelectorAll('textarea[data-part="textarea"]')).toHaveLength(1);
  });

  for (const [label, attrs, config, seed] of scenarios) {
    it(`class and ARIA match the score: ${label}`, async () => {
      const field = await mount(attrs);
      const state = { value: seed };
      expect(field.className).toBe(textareaClassSet(config, state).textarea);
      const projection = textareaBehavior.aria(state, config, { textarea: '', error: '' });
      const expected = projection.textarea ?? {};
      for (const [k, v] of Object.entries(expected)) {
        expect(field.getAttribute(k)).toBe(v === undefined ? null : String(v));
      }
    });
  }

  it('valid field reads aria-invalid=false', async () => {
    const field = await mount();
    expect(field.getAttribute('aria-invalid')).toBe('false');
  });

  it('seeded value shows before typing', async () => {
    const field = await mount('value="hi"');
    expect(field.value).toBe('hi');
  });

  it('invalid with an error child references its id; without, no describedby', async () => {
    const withError = await mount('invalid', '<div data-part="error" id="err">Bad</div>');
    expect(withError.getAttribute('aria-describedby')).toBe('err');
    const without = await mount('invalid');
    expect(without.hasAttribute('aria-describedby')).toBe(false);
  });

  it('required is aria-required only, never native', async () => {
    const field = await mount('required');
    expect(field.getAttribute('aria-required')).toBe('true');
    expect(field.hasAttribute('required')).toBe(false);
  });

  it('typing changes the value and Enter inserts a newline without submitting', async () => {
    const field = await mount();
    let submitted = false;
    must(document.querySelector('form'), 'form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitted = true;
    });
    await userEvent.type(page.getByRole('textbox', { name: 'Message' }), 'hi{Enter}x');
    expect(field.value).toBe('hi\nx');
    expect(submitted).toBe(false);
  });

  it('a disabled field does not change and submits nothing', async () => {
    const field = await mount('disabled value="a"');
    expect(field.value).toBe('a');
    expect(new FormData(must(document.querySelector('form'), 'form')).getAll('msg')).toEqual([]);
  });

  it('a readonly field does not change but still submits', async () => {
    const field = await mount('readonly value="a"');
    await userEvent.type(field, 'zz');
    expect(field.value).toBe('a');
    expect(new FormData(must(document.querySelector('form'), 'form')).getAll('msg')).toEqual(['a']);
  });

  it('FormData holds exactly the typed value and no hidden input exists', async () => {
    await mount();
    await userEvent.type(page.getByRole('textbox', { name: 'Message' }), 'hi');
    const form = must(document.querySelector('form'), 'form');
    expect(new FormData(form).getAll('msg')).toEqual(['hi']);
    expect(form.querySelector('input')).toBeNull();
  });

  it('remove and re-add leaves one field and typing still works', async () => {
    const field = await mount();
    const host = must(field.closest('rafters-textarea'), 'host');
    const parent = must(host.parentElement, 'parent');
    host.remove();
    parent.appendChild(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="textarea"]')).toHaveLength(1);
    await userEvent.type(page.getByRole('textbox', { name: 'Message' }), 'ok');
    expect(field.value).toBe('ok');
  });
});
