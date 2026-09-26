/**
 * Spec for Field, Astro target, driven end to end.
 * AstroContainer renders the SSR markup (label + `<slot/>` control +
 * helper/error) but does NOT run the `<script>`, so the test calls bindField
 * directly on the rafters-field root -- that IS the script's job -- then
 * asserts the same projection the React and WC performances drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, expect, test } from 'vitest';
import Field from '../../../src/components/field/field.astro';
import { bindField } from '../../../src/components/field/field.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Field, {
    props: { id: 'email', label: 'Email', ...props },
    // The slotted control carries the same id the field prop declares.
    slots: { default: '<input id="email" type="email" />' },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-field') as HTMLElement;
  bindField(root); // the <script> does this per instance on the real page
  return root;
}

const control = () => document.body.querySelector<HTMLInputElement>('[data-part="control"]')!;
const label = () => document.body.querySelector<HTMLLabelElement>('[data-part="label"]')!;

test('basic: SSR associates label<->control, no validity aria', async () => {
  const root = await mount();
  expect(root.querySelector('[data-part="label"]'), 'declared part "label"').not.toBeNull();
  expect(root.querySelector('[data-part="control"]'), 'declared part "control"').not.toBeNull();
  expect(label().getAttribute('for')).toBe('email');
  expect(control().getAttribute('data-part')).toBe('control');
  expect(control().hasAttribute('aria-invalid')).toBe(false);
  expect(control().hasAttribute('aria-required')).toBe(false);
  expect(control().hasAttribute('aria-describedby')).toBe(false);
});

test('description: control describedby wired to the description id', async () => {
  const root = await mount({ description: 'We never share your email' });
  expect(root.querySelector('[data-part="label"]'), 'declared part "label"').not.toBeNull();
  expect(root.querySelector('[data-part="control"]'), 'declared part "control"').not.toBeNull();
  expect(
    root.querySelector('[data-part="description"]'),
    'declared part "description"',
  ).not.toBeNull();
  expect(control().getAttribute('aria-describedby')).toBe('email-description');
  expect(control().hasAttribute('aria-invalid')).toBe(false);
  expect(control().hasAttribute('aria-required')).toBe(false);
});

test('error: aria-invalid true, describedby to the error id, role=alert, description hidden', async () => {
  const root = await mount({
    description: 'We never share your email',
    error: 'Email is required',
  });
  expect(root.querySelector('[data-part="label"]'), 'declared part "label"').not.toBeNull();
  expect(root.querySelector('[data-part="control"]'), 'declared part "control"').not.toBeNull();
  expect(root.querySelector('[data-part="error"]'), 'declared part "error"').not.toBeNull();
  expect(control().getAttribute('aria-invalid')).toBe('true');
  expect(control().getAttribute('aria-describedby')).toBe('email-error');
  expect(root.querySelector('[data-part="error"]')?.getAttribute('role')).toBe('alert');
  expect(control().hasAttribute('aria-required')).toBe(false);
  expect(root.querySelector('[data-part="description"]')).toBeNull();
});

test('required host signal projects aria-required onto the control', async () => {
  const root = await mount({ required: true });
  expect(root.querySelector('[data-part="label"]'), 'declared part "label"').not.toBeNull();
  expect(root.querySelector('[data-part="control"]'), 'declared part "control"').not.toBeNull();
  expect(control().getAttribute('aria-required')).toBe('true');
  expect(control().hasAttribute('aria-invalid')).toBe(false);
  expect(control().hasAttribute('aria-describedby')).toBe(false);
});

test('disabled host signal propagates to the control (native)', async () => {
  await mount({ disabled: true });
  expect(control().disabled).toBe(true);
});
