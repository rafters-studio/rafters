/**
 * Accessibility tests for <rafters-button>.
 *
 * Rendering path is plain DOM -- the component lives in its shadow root,
 * so we create host elements inside a scoped container div and run
 * vitest-axe against that container. axe-core >= 4 descends into open
 * shadow roots automatically.
 *
 * Scoping to a container (rather than document.body) avoids axe's
 * document-level "region" rule from firing on every component test.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
// Side-effect import: augments `Assertion` with axe matchers (toHaveNoViolations).
import 'vitest-axe/extend-expect';
import './button.element';

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

/**
 * Helper: build a <rafters-button> with attributes and default slot text,
 * appended to the current scoped container. Returns the host element.
 */
function buildButton(attrs: Record<string, string> = {}, text = 'Action'): HTMLElement {
  const host = document.createElement('rafters-button');
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v);
  host.textContent = text;
  container.appendChild(host);
  return host;
}

const VARIANTS = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
] as const;

const SIZES = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const;

describe('<rafters-button> - Accessibility', () => {
  it('has no violations with default configuration', async () => {
    mountContainer();
    buildButton();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations across every variant', async () => {
    for (const variant of VARIANTS) {
      mountContainer();
      buildButton({ variant }, 'Action');
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  });

  it('has no violations across every size', async () => {
    for (const size of SIZES) {
      mountContainer();
      const isIcon = size.startsWith('icon');
      if (isIcon) {
        buildButton({ size, 'aria-label': 'Close dialog' }, 'X');
      } else {
        buildButton({ size }, 'Action');
      }
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  });

  it('has no violations when disabled', async () => {
    mountContainer();
    buildButton({ disabled: '' }, 'Disabled');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with type=submit inside a form', async () => {
    mountContainer();
    const form = document.createElement('form');

    const label = document.createElement('label');
    label.setAttribute('for', 'email');
    label.textContent = 'Email';
    form.appendChild(label);

    const input = document.createElement('input');
    input.id = 'email';
    input.type = 'email';
    form.appendChild(input);

    const host = document.createElement('rafters-button');
    host.setAttribute('type', 'submit');
    host.textContent = 'Submit';
    form.appendChild(host);

    container.appendChild(form);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations for icon button with aria-label', async () => {
    mountContainer();
    buildButton({ size: 'icon', 'aria-label': 'Close dialog' }, 'X');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when combining variants and sizes', async () => {
    mountContainer();
    const configs: Array<{ variant: string; size: string; label: string }> = [
      { variant: 'default', size: 'sm', label: 'Small Default' },
      { variant: 'secondary', size: 'lg', label: 'Large Secondary' },
      { variant: 'outline', size: 'default', label: 'Outline' },
      { variant: 'ghost', size: 'sm', label: 'Ghost' },
    ];
    for (const c of configs) {
      const host = document.createElement('rafters-button');
      host.setAttribute('variant', c.variant);
      host.setAttribute('size', c.size);
      host.textContent = c.label;
      container.appendChild(host);
    }
    const icon = document.createElement('rafters-button');
    icon.setAttribute('variant', 'destructive');
    icon.setAttribute('size', 'icon');
    icon.setAttribute('aria-label', 'Delete');
    icon.textContent = 'X';
    container.appendChild(icon);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations inside an aria-labelled group', async () => {
    mountContainer();
    const group = document.createElement('div');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Actions');

    const save = document.createElement('rafters-button');
    save.setAttribute('variant', 'default');
    save.textContent = 'Save';
    group.appendChild(save);

    const cancel = document.createElement('rafters-button');
    cancel.setAttribute('variant', 'outline');
    cancel.textContent = 'Cancel';
    group.appendChild(cancel);

    const del = document.createElement('rafters-button');
    del.setAttribute('variant', 'destructive');
    del.textContent = 'Delete';
    group.appendChild(del);

    container.appendChild(group);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
