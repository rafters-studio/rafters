/**
 * Ported conformance for Field, React target. A container that pairs a label
 * with a slotted control and optional helper/error text, wiring the
 * id-association + validity ARIA the score projects.
 */
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Field } from '../../../src/components/field/field';

function part(host: ParentNode, name: string): HTMLElement | null {
  return host.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

test('basic: associates label<->control, no validity aria', async () => {
  const { container } = await render(
    <Field label="Email">
      <input type="email" />
    </Field>,
  );
  expect(part(container, 'label'), 'declared part "label" must be rendered').not.toBeNull();
  const control = part(container, 'control') as HTMLInputElement;
  expect(control, 'declared part "control" must be rendered').not.toBeNull();
  const label = part(container, 'label') as HTMLLabelElement;
  expect(label.getAttribute('for')).toBe(control.id);
  expect(control.id.length).toBeGreaterThan(0);
  expect(control.hasAttribute('aria-invalid')).toBe(false);
  expect(control.hasAttribute('aria-required')).toBe(false);
  expect(control.hasAttribute('aria-describedby')).toBe(false);
});

test('description: control describedby wired to the description id', async () => {
  const { container } = await render(
    <Field label="Email" description="We never share your email">
      <input type="email" />
    </Field>,
  );
  expect(part(container, 'label')).not.toBeNull();
  const control = part(container, 'control') as HTMLInputElement;
  expect(control).not.toBeNull();
  const description = part(container, 'description');
  expect(description, 'declared part "description" must be rendered').not.toBeNull();
  expect(control.getAttribute('aria-describedby')).toBe(description?.id);
  expect(control.hasAttribute('aria-invalid')).toBe(false);
  expect(control.hasAttribute('aria-required')).toBe(false);
});

test('error: aria-invalid true, describedby to the error id, role=alert, description hidden', async () => {
  const { container } = await render(
    <Field label="Email" description="We never share your email" error="Email is required">
      <input type="email" />
    </Field>,
  );
  expect(part(container, 'label')).not.toBeNull();
  const control = part(container, 'control') as HTMLInputElement;
  expect(control).not.toBeNull();
  const error = part(container, 'error');
  expect(error, 'declared part "error" must be rendered').not.toBeNull();
  expect(control.getAttribute('aria-invalid')).toBe('true');
  expect(control.getAttribute('aria-describedby')).toBe(error?.id);
  expect(error?.getAttribute('role')).toBe('alert');
  expect(control.hasAttribute('aria-required')).toBe(false);
  // description-hidden-while-error: only one helper node is rendered.
  expect(part(container, 'description')).toBeNull();
});

test('required: aria-required on the control and an aria-hidden marker', async () => {
  const { container } = await render(
    <Field label="Email" required>
      <input type="email" />
    </Field>,
  );
  expect(part(container, 'label')).not.toBeNull();
  const control = part(container, 'control') as HTMLInputElement;
  expect(control).not.toBeNull();
  expect(control.getAttribute('aria-required')).toBe('true');
  expect(control.hasAttribute('aria-invalid')).toBe(false);
  expect(control.hasAttribute('aria-describedby')).toBe(false);
  const marker = (part(container, 'label') as HTMLLabelElement).querySelector(
    '[aria-hidden="true"]',
  );
  expect(marker?.textContent).toBe('*');
});

test('disabled: propagates to the control (native)', async () => {
  const { container } = await render(
    <Field label="Email" disabled>
      <input type="email" />
    </Field>,
  );
  expect((part(container, 'control') as HTMLInputElement).disabled).toBe(true);
});

test('respects an author-supplied control id: the label tracks it', async () => {
  const { container } = await render(
    <Field label="Email">
      <input id="signup-email" type="email" />
    </Field>,
  );
  expect((part(container, 'control') as HTMLInputElement).id).toBe('signup-email');
  expect((part(container, 'label') as HTMLLabelElement).getAttribute('for')).toBe('signup-email');
});
