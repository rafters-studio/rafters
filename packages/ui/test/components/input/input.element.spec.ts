/**
 * Web Component performance of the Input score. The element renders the native
 * light-DOM field from its attributes and calls wrapInputIcons then bindInput.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { inputBehavior, type InputConfig } from '../../../src/components/input/input.behavior';
import { RaftersInput } from '../../../src/components/input/input.element';
import { inputClassSet } from '../../../src/components/input/input.classes';

const ICON = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M2 4h20v16H2z"/></svg>';
const START = `<span slot="start-icon">${ICON}</span>`;
const END = `<span slot="end-icon">${ICON}</span>`;

async function mount(attrs: string, children = ''): Promise<RaftersInput> {
  document.body.innerHTML = `<form><rafters-input aria-label="Name" ${attrs}>${children}</rafters-input></form>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-input') as RaftersInput;
}

const field = (host: Element) => host.querySelector<HTMLInputElement>('[data-part="input"]');
const formData = () => new FormData(document.querySelector('form') as HTMLFormElement);

afterEach(() => {
  document.body.innerHTML = '';
});

interface Scenario {
  name: string;
  attrs: string;
  children: string;
  config: InputConfig;
}
const scenarios: Scenario[] = [
  { name: 'bare', attrs: '', children: '', config: {} },
  { name: 'invalid', attrs: 'invalid', children: '', config: { invalid: true } },
  { name: 'required', attrs: 'required', children: '', config: { required: true } },
  { name: 'disabled', attrs: 'disabled', children: '', config: { disabled: true } },
  { name: 'readonly', attrs: 'readonly', children: '', config: { readonly: true } },
  { name: 'seeded', attrs: 'value="Ada"', children: '', config: {} },
  { name: 'start icon', attrs: '', children: START, config: { startIcon: true } },
  { name: 'end icon', attrs: '', children: END, config: { endIcon: true } },
  {
    name: 'both icons',
    attrs: '',
    children: START + END,
    config: { startIcon: true, endIcon: true },
  },
];

describe('input [wc]', () => {
  it('upgrades to RaftersInput and renders one light-DOM field', async () => {
    const host = await mount('');
    expect(host).toBeInstanceOf(RaftersInput);
    expect(host.shadowRoot).toBeNull();
    expect(host.querySelectorAll('input[data-part="input"]')).toHaveLength(1);
  });

  for (const s of scenarios) {
    it(`${s.name}: class and ARIA come from the score`, async () => {
      const el = field(await mount(s.attrs, s.children)) as HTMLInputElement;
      const hasIcon = s.config.startIcon === true || s.config.endIcon === true;
      const state = { value: el.value };
      const classes = inputClassSet(s.config, state);
      expect(el.className).toBe(hasIcon ? classes.rowInput : classes.input);
      const ids = { input: '', error: '', startIcon: '', endIcon: '' };
      const aria = inputBehavior.aria(state, s.config, ids).input ?? {};
      for (const [k, v] of Object.entries(aria)) {
        expect(el.getAttribute(k)).toBe(v === undefined ? null : String(v));
      }
      expect(el.hasAttribute('required')).toBe(false);
    });
  }

  it('a valid field reads aria-invalid=false and seeds from the value attribute', async () => {
    const el = field(await mount('value="Ada"')) as HTMLInputElement;
    expect(el.getAttribute('aria-invalid')).toBe('false');
    expect(el.value).toBe('Ada');
  });

  it('renders the row, addons and aria-hidden icon wrappers', async () => {
    const host = await mount('', START + END);
    const classes = inputClassSet({ startIcon: true, endIcon: true }, { value: '' });
    const row = host.querySelector('[data-part="row"]') as HTMLElement;
    expect(row.className).toBe(classes.row);
    expect(row.parentElement).toBe(host);
    expect(row.contains(field(host))).toBe(true);
    expect(host.querySelector('[data-part="addonStart"]')?.className).toBe(classes.addonStart);
    expect(host.querySelector('[data-part="addonEnd"]')?.className).toBe(classes.addonEnd);
    for (const part of ['startIcon', 'endIcon'] as const) {
      const wrapper = host.querySelector(`[data-part="${part}"]`);
      expect(wrapper?.className).toBe(classes[part]);
      expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('invalid with an error child references its id; without it, none', async () => {
    const withErr = await mount('invalid', '<div data-part="error" id="err">Required</div>');
    expect(field(withErr)?.getAttribute('aria-describedby')).toBe('err');
    const without = await mount('invalid');
    expect(field(without)?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('required is aria-required only', async () => {
    const el = field(await mount('required')) as HTMLInputElement;
    expect(el.getAttribute('aria-required')).toBe('true');
    expect(el.hasAttribute('required')).toBe(false);
  });

  it('typing changes the value; a readonly field does not change', async () => {
    const host = await mount('name="email"');
    await userEvent.type(page.getByRole('textbox', { name: 'Name' }), 'a@b.c');
    expect(field(host)?.value).toBe('a@b.c');
    const ro = field(await mount('readonly value="x"')) as HTMLInputElement;
    await userEvent.type(page.getByRole('textbox', { name: 'Name' }), 'zzz');
    expect(ro.value).toBe('x');
  });

  it('a disabled field is native-disabled and keeps its value', async () => {
    const dis = field(await mount('disabled value="x"')) as HTMLInputElement;
    expect(dis.disabled).toBe(true);
    expect(dis.value).toBe('x');
  });

  it('submits exactly the field value; readonly submits; disabled does not; no hidden mirror', async () => {
    const host = await mount('name="email"');
    await userEvent.type(page.getByRole('textbox', { name: 'Name' }), 'a@b.c');
    expect(formData().getAll('email')).toEqual(['a@b.c']);
    expect(host.querySelector('input[type="hidden"]')).toBeNull();

    await mount('name="email" readonly value="r"');
    expect(formData().getAll('email')).toEqual(['r']);
    await mount('name="email" disabled value="d"');
    expect(formData().getAll('email')).toEqual([]);
  });

  it('removing and re-adding leaves one field and one row, and typing still works', async () => {
    const host = await mount('', START);
    const form = host.parentElement as HTMLFormElement;
    host.remove();
    form.appendChild(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="input"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="row"]')).toHaveLength(1);
    await userEvent.type(page.getByRole('textbox', { name: 'Name' }), 'hi');
    expect(field(host)?.value).toBe('hi');
  });
});
