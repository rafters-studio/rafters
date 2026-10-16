/**
 * Web Component performance of the field score. A light-DOM enhancer: the
 * author supplies the markup, the element defers one microtask and calls
 * bindField. `field.element.ts` self-registers `rafters-field` on import.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fieldBehavior } from '../../../src/components/field/field.behavior';
import { RaftersField } from '../../../src/components/field/field.element';

interface Scenario {
  name: string;
  hostAttrs: string;
  description: boolean;
  error: boolean;
  required: boolean;
}

const basic: Scenario = {
  name: 'basic',
  hostAttrs: '',
  description: false,
  error: false,
  required: false,
};
const withDescription: Scenario = { ...basic, name: 'description', description: true };
const withError: Scenario = { ...basic, name: 'error', error: true };
const withBoth: Scenario = {
  ...basic,
  name: 'description and error',
  description: true,
  error: true,
};
const required: Scenario = {
  ...basic,
  name: 'required',
  hostAttrs: 'data-required',
  required: true,
};

const scenarios: ReadonlyArray<Scenario> = [basic, withDescription, withError, withBoth, required];

const defaultControl = '<input id="email" name="email" type="email" value="a@b.c">';

function markup(s: Scenario, control: string = defaultControl): string {
  return `<rafters-field ${s.hostAttrs}>
    <label data-part="label">Email</label>
    ${control}
    ${s.description ? '<div data-part="description" id="email-description">We never share it</div>' : ''}
    ${s.error ? '<div data-part="error" id="email-error" role="alert">Email is required</div>' : ''}
  </rafters-field>`;
}

async function mount(html: string): Promise<HTMLElement> {
  document.body.innerHTML = html;
  await Promise.resolve();
  return document.body.querySelector('rafters-field') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('field [wc]', () => {
  const bare =
    '<rafters-field><label data-part="label">Email</label><input id="email" type="email"></rafters-field>';

  it('upgrades to RaftersField and stays in light DOM', async () => {
    const host = await mount(bare);
    expect(host).toBeInstanceOf(RaftersField);
    expect(host.shadowRoot).toBeNull();
  });

  it('points the label at the control and stamps the bare input', async () => {
    const host = await mount(bare);
    expect(host.querySelector('[data-part="label"]')?.getAttribute('for')).toBe('email');
    expect(host.querySelector('input')?.getAttribute('data-part')).toBe('control');
  });

  for (const s of scenarios) {
    it(`control aria equals the score projection: ${s.name}`, async () => {
      const host = await mount(markup(s));
      const control = host.querySelector('[data-part="control"]') as HTMLElement;
      const ids = {
        label: '',
        control: 'email',
        description: s.description ? 'email-description' : '',
        error: s.error ? 'email-error' : '',
      };
      const aria: Record<string, unknown> =
        fieldBehavior.aria({}, { required: s.required }, ids).control ?? {};
      for (const name of ['aria-describedby', 'aria-invalid', 'aria-required']) {
        const expected = aria[name];
        expect(control.getAttribute(name)).toBe(expected === undefined ? null : String(expected));
      }
    });
  }

  it('lists the error id before the description id', async () => {
    const host = await mount(markup(withBoth));
    expect(host.querySelector('input')?.getAttribute('aria-describedby')).toBe(
      'email-error email-description',
    );
  });

  it('marks the control invalid and keeps role=alert on the error', async () => {
    const host = await mount(markup(withError));
    expect(host.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('[data-part="error"]')?.getAttribute('role')).toBe('alert');
  });

  it('replaces an author-supplied aria-describedby with the projection', async () => {
    const host = await mount(
      markup(withDescription, '<input id="email" type="email" aria-describedby="stale other">'),
    );
    expect(host.querySelector('input')?.getAttribute('aria-describedby')).toBe('email-description');
  });

  it('disables the control from data-disabled', async () => {
    const host = await mount(
      '<rafters-field data-disabled><label data-part="label">Email</label><input id="email"></rafters-field>',
    );
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('resolves getByLabelText to the control', async () => {
    await mount(markup(basic));
    const el = page.getByLabelText('Email').element();
    expect(el.tagName).toBe('INPUT');
  });

  it('contributes exactly one FormData entry for a named control', async () => {
    document.body.innerHTML = `<form>${markup(required)}</form>`;
    await Promise.resolve();
    const data = new FormData(document.querySelector('form') as HTMLFormElement);
    expect(data.getAll('email')).toEqual(['a@b.c']);
    expect([...data.keys()]).toEqual(['email']);
  });

  it('upgrades a host with no control without throwing', async () => {
    const host = await mount(
      '<rafters-field><label data-part="label">Email</label></rafters-field>',
    );
    expect(host).toBeInstanceOf(RaftersField);
  });

  it('removes cleanly after binding', async () => {
    const host = await mount(markup(basic));
    expect(() => host.remove()).not.toThrow();
  });

  it('wires author markup inside a form (the issue functional test, as written)', async () => {
    document.body.innerHTML = `<form>
  <rafters-field data-required>
    <label data-part="label">Email</label>
    <input id="email" name="email" type="email" value="a@b.c">
    <div data-part="description" id="email-description">We never share it</div>
    <div data-part="error" id="email-error" role="alert">Email is required</div>
  </rafters-field>
</form>`;
    await Promise.resolve();
    const control = document.querySelector<HTMLInputElement>('[data-part="control"]')!;
    const ids = {
      label: '',
      control: 'email',
      description: 'email-description',
      error: 'email-error',
    };
    for (const [k, v] of Object.entries(
      fieldBehavior.aria({}, { required: true }, ids).control ?? {},
    )) {
      expect(control.getAttribute(k)).toBe(v === undefined ? null : String(v));
    }
    expect(control.getAttribute('aria-describedby')).toBe('email-error email-description');
    expect(document.querySelector('[data-part="label"]')!.getAttribute('for')).toBe('email');
    expect(new FormData(document.querySelector('form')!).getAll('email')).toEqual(['a@b.c']);
  });
});
