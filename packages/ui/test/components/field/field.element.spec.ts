/**
 * Spec for Field, Web Component target, driven end to end
 * against light-DOM markup. Field is a light-DOM enhancer: the author
 * supplies the label / control / helper markup and the element only wires
 * it -- proves the id-association and the ARIA projection through the
 * DOM-native client.
 */
import { afterEach, beforeAll, expect, test } from 'vitest';
import { RaftersField } from '../../../src/components/field/field.element';

beforeAll(() => {
  if (!customElements.get('rafters-field')) customElements.define('rafters-field', RaftersField);
});

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('rafters-field') as HTMLElement;
}

const control = () => document.body.querySelector<HTMLInputElement>('[data-part="control"]')!;
const label = () => document.body.querySelector<HTMLLabelElement>('[data-part="label"]')!;

afterEach(() => {
  document.body.innerHTML = '';
});

test('basic: associates label<->control, no validity aria', async () => {
  const root = await mount(
    `<rafters-field>
      <label data-part="label">Email</label>
      <input data-part="control" id="email" type="email" />
    </rafters-field>`,
  );
  expect(root.querySelector('[data-part="label"]'), 'declared part "label"').not.toBeNull();
  expect(root.querySelector('[data-part="control"]'), 'declared part "control"').not.toBeNull();
  expect(label().getAttribute('for')).toBe('email');
  expect(control().hasAttribute('aria-invalid')).toBe(false);
  expect(control().hasAttribute('aria-required')).toBe(false);
  expect(control().hasAttribute('aria-describedby')).toBe(false);
});

test('locates and stamps a bare slotted control (no data-part authored)', async () => {
  await mount(
    `<rafters-field>
      <label data-part="label">Email</label>
      <input id="email" type="email" />
    </rafters-field>`,
  );
  // bindField found the input by tag and stamped the part marker.
  expect(control().getAttribute('data-part')).toBe('control');
  expect(label().getAttribute('for')).toBe('email');
});

test('description: control describedby wired to the description id', async () => {
  const root = await mount(
    `<rafters-field>
      <label data-part="label">Email</label>
      <input data-part="control" id="email" type="email" />
      <div data-part="description" id="email-description">We never share your email</div>
    </rafters-field>`,
  );
  expect(
    root.querySelector('[data-part="description"]'),
    'declared part "description"',
  ).not.toBeNull();
  expect(control().getAttribute('aria-describedby')).toBe('email-description');
  expect(control().hasAttribute('aria-invalid')).toBe(false);
  expect(control().hasAttribute('aria-required')).toBe(false);
});

test('error: aria-invalid true, describedby to the error id, role=alert', async () => {
  const root = await mount(
    `<rafters-field>
      <label data-part="label">Email</label>
      <input data-part="control" id="email" type="email" />
      <div data-part="error" id="email-error" role="alert">Email is required</div>
    </rafters-field>`,
  );
  expect(root.querySelector('[data-part="error"]'), 'declared part "error"').not.toBeNull();
  expect(control().getAttribute('aria-invalid')).toBe('true');
  expect(control().getAttribute('aria-describedby')).toBe('email-error');
  expect(root.querySelector('[data-part="error"]')?.getAttribute('role')).toBe('alert');
  expect(control().hasAttribute('aria-required')).toBe(false);
});

test('required host signal projects aria-required onto the control', async () => {
  await mount(
    `<rafters-field data-required>
      <label data-part="label">Email</label>
      <input data-part="control" id="email" type="email" />
    </rafters-field>`,
  );
  expect(control().getAttribute('aria-required')).toBe('true');
  expect(control().hasAttribute('aria-invalid')).toBe(false);
  expect(control().hasAttribute('aria-describedby')).toBe(false);
});

test('disabled host signal propagates to the control (native)', async () => {
  await mount(
    `<rafters-field data-disabled>
      <label data-part="label">Email</label>
      <input data-part="control" id="email" type="email" />
    </rafters-field>`,
  );
  expect(control().disabled).toBe(true);
});
