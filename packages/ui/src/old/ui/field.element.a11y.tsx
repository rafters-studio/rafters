/**
 * Accessibility tests for <rafters-field>.
 *
 * Field wires ARIA attributes onto the slotted control (aria-describedby,
 * aria-invalid, aria-required) and associates the label via for/id. axe-core
 * >= 4 descends into open shadow roots, so mounting into a scoped container
 * div exercises both the shadow label element and the light-DOM control.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import 'vitest-axe/extend-expect';
import './field.element';

let container: HTMLElement;

function mountContainer(): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function buildField(
  attrs: Record<string, string> = {},
  controlTag: 'input' | 'textarea' | 'select' = 'input',
): { host: HTMLElement; control: HTMLElement } {
  const host = document.createElement('rafters-field');
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v);
  const control = document.createElement(controlTag);
  if (controlTag === 'input') {
    (control as HTMLInputElement).type = 'text';
  }
  host.appendChild(control);
  container.appendChild(host);
  return { host, control };
}

describe('<rafters-field> - Accessibility', () => {
  it('has no violations with a basic label + input', async () => {
    mountContainer();
    buildField({ label: 'Email' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a description', async () => {
    mountContainer();
    buildField({ label: 'Email', description: 'We never share your email' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in an error state', async () => {
    mountContainer();
    buildField({ label: 'Email', error: 'Email is required' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when required', async () => {
    mountContainer();
    buildField({ label: 'Email', required: '' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    mountContainer();
    buildField({ label: 'Email', disabled: '' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a textarea control', async () => {
    mountContainer();
    buildField({ label: 'Bio', description: 'A short introduction' }, 'textarea');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with a select control', async () => {
    mountContainer();
    const { control } = buildField({ label: 'Country' }, 'select');
    const option = document.createElement('option');
    option.textContent = 'United States';
    control.appendChild(option);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple fields stacked', async () => {
    mountContainer();
    buildField({ label: 'Name' });
    buildField({ label: 'Email', description: 'Used for notifications' });
    buildField({ label: 'Password', required: '', error: 'Too short' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when field is nested inside a form', async () => {
    mountContainer();
    const form = document.createElement('form');
    container.appendChild(form);

    const host = document.createElement('rafters-field');
    host.setAttribute('label', 'Email');
    host.setAttribute('description', 'We never share your email');
    const input = document.createElement('input');
    input.type = 'email';
    host.appendChild(input);
    form.appendChild(host);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
